-- Proves 0007_usernames_week.sql against a database with 0001-0007 applied (scripts/prove-sql.sh runs it on a
-- throw-away PostgreSQL 16 with Supabase's roles). Throw-away readers, everything as `authenticated`, all rolled back.
-- Silence is a pass: every check raises an exception when it fails.
begin;

insert into auth.users (id, email, is_anonymous) values
  ('00000000-0000-0000-0000-0000000000a1', 'u1@example.test', false),
  ('00000000-0000-0000-0000-0000000000a2', 'u2@example.test', false),
  ('00000000-0000-0000-0000-0000000000a3', 'u3@example.test', false),
  ('00000000-0000-0000-0000-0000000000a4', null, true);
insert into public.users (id, email, is_anonymous) values
  ('00000000-0000-0000-0000-0000000000a1', 'u1@example.test', false),
  ('00000000-0000-0000-0000-0000000000a2', 'u2@example.test', false),
  ('00000000-0000-0000-0000-0000000000a3', 'u3@example.test', false),
  ('00000000-0000-0000-0000-0000000000a4', null, true)
on conflict (id) do nothing;

create or replace function pg_temp.as_user(uid text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', uid, true);
  execute 'set local role authenticated';
end $$;
create or replace function pg_temp.assert(ok boolean, what text) returns void language plpgsql as $$
begin if not ok then raise exception 'FAILED: %', what; end if; end $$;

-- 1. Nobody anonymous may choose a name or see a board.
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a4');
do $$ begin
  begin perform public.set_username('ghost'); raise exception 'FAILED: anonymous set a username'; exception when sqlstate '28000' then null; end;
  begin perform * from public.my_board('week'); raise exception 'FAILED: anonymous saw a board'; exception when sqlstate '28000' then null; end;
end $$;
reset role;

-- 2. Choosing a username: shape, reserved words, code look-alikes, uniqueness, and changing it.
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
do $$ begin
  perform pg_temp.assert(public.set_username('maria') = 'no_profile', 'a profile comes first');
  perform public.sync_profile('Maria', 'A2.1', 900, 3, jsonb_build_array(jsonb_build_object('day', (now() at time zone 'utc')::date, 'xp', 120)));
  perform pg_temp.assert(public.set_username('ma') = 'invalid', 'too short');
  perform pg_temp.assert(public.set_username('maria lopez') = 'invalid', 'no spaces');
  perform pg_temp.assert(public.set_username('_maria') = 'invalid', 'must start with a letter or digit');
  perform pg_temp.assert(public.set_username('maria..x') = 'invalid', 'no double dots');
  perform pg_temp.assert(public.set_username('kp7qm2xa') = 'invalid', 'cannot look like a friend code');
  perform pg_temp.assert(public.set_username('pluto') = 'taken', 'reserved');
  perform pg_temp.assert(public.set_username('@Maria.Reads') = 'ok', 'a good one, @ and capitals tidied');
  perform pg_temp.assert(public.my_username() = 'maria.reads', 'kept in lower case');
  perform pg_temp.assert(public.set_username('maria.reads') = 'ok', 'setting the same name again is fine');
end $$;
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a2');
do $$ begin
  perform public.sync_profile('Ben', 'A2.2', 400, 1, jsonb_build_array(jsonb_build_object('day', (now() at time zone 'utc')::date, 'xp', 60)));
  perform pg_temp.assert(public.set_username('MARIA.READS') = 'taken', 'a name somebody has is taken, whatever its case');
  perform pg_temp.assert(public.set_username('ben_reads') = 'ok', 'Ben picks his own');
  perform pg_temp.assert(public.my_username() = 'ben_reads', 'and sees it');
end $$;
reset role;

-- 3. Adding a friend by username (with or without @), and a code still works.
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a2');
do $$ begin
  perform pg_temp.assert(public.add_friend('@nobody_here') = 'not_found', 'an unknown name');
  perform pg_temp.assert(public.add_friend('@ben_reads') = 'self', 'not yourself');
  perform pg_temp.assert(public.add_friend('@Maria.Reads') = 'sent', 'by @username');
  perform pg_temp.assert(public.add_friend('maria.reads') = 'already_sent', 'without the @ too');
  perform pg_temp.assert((select username from public.my_friends()) = 'maria.reads', 'friends come with their username');
end $$;
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a3');
do $$ begin perform public.sync_profile('Chen', 'B1.1', 2000, 9, '[]'); end $$;
do $$ begin
  begin perform 1 from public.profiles; raise exception 'FAILED: profiles readable directly'; exception when insufficient_privilege then null; end;
end $$;
reset role;
do $$ declare ben_code text; begin
  ben_code := (select p.friend_code from public.profiles p where p.user_id = '00000000-0000-0000-0000-0000000000a2');
  perform set_config('rf.ben', ben_code, true);
end $$;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a3');
do $$ begin
  perform pg_temp.assert(public.add_friend(current_setting('rf.ben')) = 'sent', 'a friend code still works');
  perform pg_temp.assert(public.add_friend('@' || lower(current_setting('rf.ben'))) = 'not_found', 'a code typed as a username is not a username');
end $$;
reset role;

-- 4. The weekly and monthly boards: the league, ranked by XP in the period, usernames shown, the caller marked.
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1'); select count(*) from public.my_board('month'); reset role;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a3'); select count(*) from public.my_board('week'); reset role;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a2');
do $$ begin
  perform pg_temp.assert((select count(*) from public.my_board('week')) = 3, 'three in the league this week');
  perform pg_temp.assert((select username from public.my_board('week') where rank = 1) = 'maria.reads', 'Maria leads the week');
  perform pg_temp.assert((select xp from public.my_board('week') where is_me) = 60, 'my XP this week');
  perform pg_temp.assert((select period from public.my_board('week') limit 1) ~ '^\d{4}-W\d{2}$', 'a week is labelled by its ISO week');
  perform pg_temp.assert((select period from public.my_board('month') limit 1) ~ '^\d{4}-\d{2}$', 'a month by its month');
  perform pg_temp.assert((select count(*) from public.my_board('month') where is_me) = 1, 'the caller is marked once');
end $$;
reset role;

-- 5. Still nothing readable or writable directly.
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a2');
do $$ begin
  begin update public.profiles set username = 'hacker'; raise exception 'FAILED: profiles writable directly'; exception when insufficient_privilege then null; end;
end $$;
reset role;

rollback;
select 'username checks passed' as result;
