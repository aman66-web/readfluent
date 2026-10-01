-- ─────────────────────────────────────────────────────────────────────────────
-- Is the paid column actually locked?
--
-- Paste this into the Supabase SQL editor after running the migrations. It
-- reads and changes nothing. Every column must come back `t`.
--
-- It exists because the first version of the plan migration looked right and was not: it
-- revoked UPDATE on two columns from roles that held UPDATE on the whole
-- table, which PostgreSQL documents as having no effect, and nothing anywhere
-- said so. Proved on PostgreSQL 16 with Supabase's default grants: after that
-- migration, `set role authenticated; update public.users set plan='full';`
-- succeeded at the privilege layer and only a trigger stood in the way — and
-- the same trigger, keyed on a PostgREST setting that is unset on a direct
-- connection, silently reverted the service role and the SQL editor too. So
-- nobody could be sold anything, and the file said the opposite.
--
--   plan_locked          a learner's role cannot write `plan` at all
--   until_locked         nor `plan_until`
--   settings_writable    they CAN still write their own settings, which is the
--                        thing the revoke must not take with it
--   guard_present        the trigger is on the table
--   guard_runs_as_caller it is NOT security definer — under it, current_user
--                        is the function's owner every time and the guard
--                        never fires for anybody
-- ─────────────────────────────────────────────────────────────────────────────
select
  not has_column_privilege('authenticated', 'public.users', 'plan', 'update')       as plan_locked,
  not has_column_privilege('authenticated', 'public.users', 'plan_until', 'update') as until_locked,
  has_column_privilege('authenticated', 'public.users', 'settings', 'update')       as settings_writable,
  exists (
    select 1 from pg_trigger
    where tgname = 'users_plan_guard' and tgrelid = 'public.users'::regclass and not tgisinternal
  )                                                                                 as guard_present,
  exists (
    select 1 from pg_proc
    where proname = 'users_plan_is_not_yours' and pronamespace = 'public'::regnamespace and not prosecdef
  )                                                                                 as guard_runs_as_caller;
