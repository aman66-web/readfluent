#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Prove the schema's two guarantees, against a real PostgreSQL.
#
# The unit tests next door read the migrations and check that they say the
# right things. This runs them. It builds a throwaway cluster, recreates the
# Supabase roles and the default grant that made the first version of the plan migration a
# no-op, runs the migrations, and then tries what matters.
#
# The paid column (0002):
#   1. a reader with the anon key, from a devtools console  -> must be refused
#   2. the hand-grant from the SQL editor                    -> must work
#   3. the server, as service_role                           -> must work
#   4. a reader writing their own settings                  -> must still work
#
# Sync's ordering (0003):
#   5. a push carrying an older copy                         -> must be refused
#   6. a push carrying a newer one                           -> must land
#   7. the server's own stamp on every row, whatever the client claims
#
# Needs postgres 16 and an unprivileged user to run it as (initdb refuses root).
#
#   ./scripts/prove-sql.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PGBIN="${PGBIN:-/usr/lib/postgresql/16/bin}"
DIR="${PGTMP:-/var/tmp/readfluent-plan-proof}"
PORT="${PGPORT:-55432}"
OWNER="${PGOWNER:-postgres}"

export PATH="$PGBIN:$PATH"

cleanup() {
  su "$OWNER" -c "PATH=$PGBIN:\$PATH pg_ctl -D $DIR/data stop -m immediate" >/dev/null 2>&1 || true
  rm -rf "$DIR"
}
trap cleanup EXIT

rm -rf "$DIR"; mkdir -p "$DIR"; chown "$OWNER:$OWNER" "$DIR"
su "$OWNER" -c "PATH=$PGBIN:\$PATH initdb -D $DIR/data -U postgres --auth=trust" >/dev/null
su "$OWNER" -c "PATH=$PGBIN:\$PATH pg_ctl -D $DIR/data -o '-k $DIR -p $PORT -c listen_addresses=' -l $DIR/log start" >/dev/null
sleep 2

q() { psql -h "$DIR" -p "$PORT" -U postgres -d postgres -X -q -tAc "set client_min_messages = warning; $1"; }

# Supabase's roles, and the default grant that is the whole reason a column
# revoke does nothing on a Supabase project.
psql -h "$DIR" -p "$PORT" -U postgres -d postgres -X -q -v ON_ERROR_STOP=1 <<'SQL'
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create role supabase_admin nologin;
create schema auth;
create table auth.users (id uuid primary key, email text, is_anonymous boolean default false);
grant usage on schema public, auth to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to postgres, anon, authenticated, service_role;
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
SQL

for f in "$HERE"/supabase/migrations/*.sql; do
  PGOPTIONS='-c client_min_messages=warning' \
    psql -h "$DIR" -p "$PORT" -U postgres -d postgres -X -q -v ON_ERROR_STOP=1 -f "$f" >/dev/null
done

# The insert into auth.users fires 0001's trigger, which makes the public.users
# row; the second insert is the belt for a schema where it does not.
ID='11111111-1111-1111-1111-111111111111'
q "insert into auth.users (id, email) values ('$ID','a@b.c');" >/dev/null
q "insert into public.users (id, email, is_anonymous) values ('$ID','a@b.c', false) on conflict (id) do nothing;" >/dev/null

fail=0
say() { # name expected actual
  if [ "$2" = "$3" ]; then printf '  ok   %s\n' "$1"; else printf '  FAIL %s (wanted %s, got %s)\n' "$1" "$2" "$3"; fail=1; fi
}

echo "the privilege itself"
say "plan is not writable by authenticated" f "$(q "select has_column_privilege('authenticated','public.users','plan','update')")"
say "settings still is"                      t "$(q "select has_column_privilege('authenticated','public.users','settings','update')")"

echo "the paid plan: what each caller can actually do"
q "update public.users set plan='free' where id='$ID';" >/dev/null
q "set role authenticated; set request.jwt.claim.sub = '$ID'; update public.users set plan='full' where id='$ID';" >/dev/null 2>&1 || true
say "a reader cannot buy themselves a plan" free "$(q "select plan from public.users where id='$ID'")"

q "update public.users set plan='full' where id='$ID';" >/dev/null
say "the SQL editor can grant one by hand"   full "$(q "select plan from public.users where id='$ID'")"

q "update public.users set plan='free' where id='$ID';" >/dev/null
q "set role service_role; update public.users set plan='full' where id='$ID';" >/dev/null
say "the server can grant one"               full "$(q "select plan from public.users where id='$ID'")"

q "set role authenticated; set request.jwt.claim.sub = '$ID'; update public.users set settings='{\"autoplay\":45}'::jsonb where id='$ID';" >/dev/null
say "a reader can still write settings"     45 "$(q "select settings->>'autoplay' from public.users where id='$ID'")"

echo "sync: which copy the server keeps"
q "insert into public.sync_docs (user_id, kind, doc_id, doc, updated_at)
     values ('$ID','progress','d1','{\"v\":\"newer\"}','2026-09-16T12:00:00Z');" >/dev/null
# The other device decided against a snapshot it pulled before 12:00. Whatever
# it read is already old by the time it writes, so the database has to refuse.
q "insert into public.sync_docs (user_id, kind, doc_id, doc, updated_at)
     values ('$ID','progress','d1','{\"v\":\"older\"}','2026-09-16T10:00:00Z')
     on conflict (user_id, kind, doc_id) do update set doc = excluded.doc, updated_at = excluded.updated_at;" >/dev/null
say "a stale push does not overwrite a newer row" newer "$(q "select doc->>'v' from public.sync_docs where doc_id='d1'")"

q "insert into public.sync_docs (user_id, kind, doc_id, doc, updated_at)
     values ('$ID','progress','d1','{\"v\":\"newest\"}','2026-09-16T14:00:00Z')
     on conflict (user_id, kind, doc_id) do update set doc = excluded.doc, updated_at = excluded.updated_at;" >/dev/null
say "a genuinely newer push still lands"        newest "$(q "select doc->>'v' from public.sync_docs where doc_id='d1'")"

# A session answered offline long ago and only stored now. Paged on the
# client's stamp, a device whose cursor has passed it never asks again.
q "insert into public.sync_docs (user_id, kind, doc_id, doc, updated_at)
     values ('$ID','review','plane','{}','2020-01-01T09:00:00Z');" >/dev/null
say "the server stamps every row with its own clock" t \
  "$(q "select (updated_at < '2021-01-01' and synced_at > now() - interval '1 minute') from public.sync_docs where doc_id='plane'")"
say "so a late row sorts after a cursor that passed it" 1 \
  "$(q "select count(*) from public.sync_docs where doc_id='plane' and updated_at < '2020-06-01' and synced_at >= '2020-06-01'")"

echo "the read-only check people paste into a live project"
psql -h "$DIR" -p "$PORT" -U postgres -d postgres -X -f "$HERE/supabase/checks/plan_guard.sql" | sed 's/^/  /'

exit "$fail"
