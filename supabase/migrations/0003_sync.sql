-- ─────────────────────────────────────────────────────────────────────────────
-- Sync: one row per local document.
--
-- The app is local-first. Reading progress, the words a reader has met and
-- their flashcards are written to the device and read from it; that is what
-- lets somebody read with no account and no network. This table is the copy
-- that follows a reader to their next device.
--
-- Documents, not relational tables. A document per row is lossless by
-- construction, needs no migration when a field is added, and gives conflict
-- resolution a natural unit: the document. What this is not: a merge engine.
-- Two devices editing the same document offline resolve last-write-wins, per
-- document, on `updated_at`. For a reading app that is the right trade — the
-- common case is one device at a time.
--
-- Who decides "newer", and who decides "since": `updated_at` is the client's
-- (what "newer" means), `synced_at` is the server's (what "since" means), set
-- by the guard trigger below. A pull is paged on `synced_at`, so a row written
-- offline hours ago can never be skipped by a device whose cursor has moved
-- past its client-stamped time. A push carrying an older copy than the row
-- already holds is refused by the database itself, because by the time a
-- client writes, whatever it read is already old.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.sync_docs (
  user_id    uuid not null references public.users(id) on delete cascade,
  -- The store this came from. Checked rather than free text so a typo in a
  -- client cannot quietly create a kind nothing ever reads back. Provisional:
  -- M8 (SPEC.md §10) wires the stores and may extend this list in a new
  -- migration.
  kind       text not null check (kind in ('progress','word','card','review')),
  -- The document's own id, as the app writes it. Text, because that is what
  -- the app's ids are ("<slug>/<level>-<length>" for progress, a headword for
  -- a word, ...).
  doc_id     text not null,
  -- The document verbatim. Null once deleted — the row is kept as a tombstone
  -- so the deletion travels; without it, a delete on one device is undone by
  -- the next pull from another.
  doc        jsonb,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  synced_at  timestamptz not null default now(),
  primary key (user_id, kind, doc_id)
);

-- Every pull is "my rows, changed since I last looked".
create index if not exists sync_docs_user_synced
  on public.sync_docs (user_id, synced_at);

alter table public.sync_docs enable row level security;

-- Own rows, all four verbs. Nothing here is public or shared.
drop policy if exists sync_docs_select_own on public.sync_docs;
create policy sync_docs_select_own on public.sync_docs
  for select using (user_id = (select auth.uid()));

drop policy if exists sync_docs_insert_own on public.sync_docs;
create policy sync_docs_insert_own on public.sync_docs
  for insert with check (user_id = (select auth.uid()));

drop policy if exists sync_docs_update_own on public.sync_docs;
create policy sync_docs_update_own on public.sync_docs
  for update using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- A delete is a tombstone (doc = null), not a DELETE, so this exists only for
-- "forget me": it lets the app wipe the server copy too rather than pulling it
-- all back on the next sync.
drop policy if exists sync_docs_delete_own on public.sync_docs;
create policy sync_docs_delete_own on public.sync_docs
  for delete using (user_id = (select auth.uid()));

/*
 * One trigger, both jobs, because they have an order and two triggers would
 * leave it to whichever name sorts first.
 *
 * Returning null from a BEFORE UPDATE skips that row and leaves what is there,
 * which is exactly "your copy is older than mine, keep mine". An upsert's
 * conflict path runs as an UPDATE, so this catches the push.
 *
 * Equal stamps are allowed through: a tie is the same write arriving twice,
 * and refusing it would mean a device that pushed, lost its answer and pushed
 * again could never repair the row.
 */
create or replace function public.sync_docs_before_write()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.updated_at < old.updated_at then
    return null;
  end if;
  -- Never the client's clock. This is the only thing pagination trusts.
  new.synced_at := now();
  return new;
end $$;

drop trigger if exists sync_docs_guard on public.sync_docs;
create trigger sync_docs_guard
  before insert or update on public.sync_docs
  for each row
  execute function public.sync_docs_before_write();
