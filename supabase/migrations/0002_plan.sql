-- ─────────────────────────────────────────────────────────────────────────────
-- What a reader is paying for, and the rule that a reader cannot set it.
--
-- 0001's users_update_own policy is deliberately broad — a reader owns their
-- settings row and may write it freely — and RLS has no way to say "every
-- column except this one", so without what follows anybody with the anon key
-- and a devtools console could give themselves the paid plan:
--
--   update public.users set plan = 'full' where id = auth.uid();
--
-- Two defences, because one of them is quiet when it breaks.
--
--   1. Table privileges, narrowed to the one column a reader may write.
--      `revoke update (plan, plan_until)` on its own does NOTHING here:
--      PostgreSQL says outright that revoking a privilege from individual
--      columns has no effect while the role holds it on the whole table, and
--      Supabase grants exactly that to `authenticated` by default. So the
--      table-level right goes first, and only `settings` is granted back. A
--      column list also fails closed: a column added later is not writable
--      until somebody says it is.
--   2. A trigger that puts the old values back for anybody who is not the
--      service role. This is the guarantee: a later `grant all on public.users`
--      — the kind of line that gets pasted into a migration without much
--      thought — silently undoes the grant above, and nothing would say so.
--
-- Only the server, holding the service role key, moves anybody onto a plan.
-- It is the one thing in this schema that is worth money to forge. The first
-- readers can be moved by hand from the SQL editor, which is why the trigger
-- lets the database owner through.
-- ─────────────────────────────────────────────────────────────────────────────

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'users_plan_known'
  ) then
    alter table public.users
      add constraint users_plan_known check (plan in ('free', 'full'));
  end if;
end $$;

-- 1. The mechanism. The table-level right first, or the column list below is
--    decoration; then back only what a reader's own browser has any business
--    writing. `email` and `is_anonymous` are not here: they are mirrored from
--    auth.users by the security-definer triggers in 0001, which run as the
--    owner and do not need a grant.
revoke update on public.users from anon, authenticated;
grant update (settings) on public.users to authenticated;

-- 2. The guarantee.
-- NOT security definer — current_user must be the caller. Under security
-- definer it would be the function's owner every time and the guard would
-- never fire at all.
create or replace function public.users_plan_is_not_yours()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  /*
   * The service role is the server, which is the only thing allowed to sell
   * anything; the owner is a person at the SQL editor, which is how the first
   * readers are moved by hand. Everyone else gets their own row back with the
   * plan untouched.
   *
   * `current_user`, not the request's JWT claims. PostgREST sets that GUC and
   * nothing else does, so on a direct connection — the SQL editor, the table
   * editor, psql, pg_cron — it is unset, the guard fires, and a hand-grant
   * reports "UPDATE 1" while quietly reverting. Silent, and only findable by
   * selecting the row back.
   */
  if current_user not in ('service_role', 'postgres', 'supabase_admin') then
    new.plan := old.plan;
    new.plan_until := old.plan_until;
    new.plan_product := old.plan_product;
    new.plan_period := old.plan_period;
  end if;
  return new;
end $$;

drop trigger if exists users_plan_guard on public.users;
create trigger users_plan_guard
  before update on public.users
  for each row
  execute function public.users_plan_is_not_yours();

-- The app reads this rather than the raw column: a plan whose date has gone is
-- free again, and working that out in one place means a lapsed reader cannot
-- be paid-for on one screen and free on another. lib/plan.ts `effectivePlan`
-- is its TypeScript twin.
create or replace function public.effective_plan(u public.users)
returns text
language sql
stable
as $$
  select case
    when u.plan = 'full' and (u.plan_until is null or u.plan_until > now()) then 'full'
    else 'free'
  end
$$;

-- Finding everyone whose pass runs out in the next few days, which is the only
-- query this ever needs an index for.
create index if not exists users_plan_until on public.users (plan_until)
  where plan_until is not null;
