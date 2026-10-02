-- Proves 0004_social.sql against a database that has 0001-0004 applied (a real PostgreSQL 16 with
-- Supabase's roles and default grants, or a live project's SQL editor). It creates throw-away readers,
-- runs the friends and league flow as the `authenticated` role, tries what a curious reader would, and
-- rolls everything back. Silence is a pass: every check raises an exception when it fails.
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/checks/social.sql

begin;

insert into auth.users (id, email, is_anonymous) values
  ('00000000-0000-0000-0000-00000000000a', 'a@example.test', false),
  ('00000000-0000-0000-0000-00000000000b', 'b@example.test', false),
  ('00000000-0000-0000-0000-00000000000c', 'c@example.test', false),
  ('00000000-0000-0000-0000-00000000000d', null, true);

create or replace function pg_temp.as_user(uid text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', uid, true);
  execute 'set local role authenticated';
end $$;
create or replace function pg_temp.assert(ok boolean, what text) returns void language plpgsql as $$
begin if not ok then raise exception 'FAILED: %', what; end if; end $$;

-- 1. An anonymous reader cannot use any of it; neither can nobody.
select pg_temp.as_user('00000000-0000-0000-0000-00000000000d');
do $$ begin
  begin perform public.sync_profile('x', 'A1.1', 0, 0, '[]'); raise exception 'FAILED: anonymous synced'; exception when sqlstate '28000' then null; end;
  begin perform * from public.my_league(); raise exception 'FAILED: anonymous joined a league'; exception when sqlstate '28000' then null; end;
end $$;
reset role;
select set_config('request.jwt.claim.sub', '', true);
do $$ begin
  begin set local role authenticated; perform public.add_friend('AAAAAAAA'); raise exception 'FAILED: nobody added a friend'; exception when sqlstate '28000' then null; end;
end $$;
reset role;

-- 2. A reader's browser can read or write none of the tables directly.
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
do $$ begin
  begin perform 1 from public.profiles; raise exception 'FAILED: profiles readable directly'; exception when insufficient_privilege then null; end;
  begin insert into public.xp_days values ('00000000-0000-0000-0000-00000000000a', current_date, 5); raise exception 'FAILED: xp_days writable directly'; exception when insufficient_privilege then null; end;
  begin perform 1 from public.friendships; raise exception 'FAILED: friendships readable directly'; exception when insufficient_privilege then null; end;
end $$;

-- 3. Three readers report themselves.
do $$ declare code text; begin
  code := public.sync_profile('Ada', 'B1.2', 5200, 4, jsonb_build_array(
    jsonb_build_object('day', (now() at time zone 'utc')::date::text, 'xp', 300),
    jsonb_build_object('day', ((now() at time zone 'utc')::date - 1)::text, 'xp', 900000),   -- capped
    jsonb_build_object('day', 'not a date', 'xp', 5)));                                       -- skipped
  perform pg_temp.assert(code ~ '^[A-HJKMNP-Z2-9]{8}$', 'friend code shape');
  perform pg_temp.assert(public.sync_profile('Ada', 'B1.2', 5200, 4, '[]') = code, 'the friend code does not change');
end $$;
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select public.sync_profile('Ben', 'A2.1', 100, 1, jsonb_build_array(jsonb_build_object('day', (now() at time zone 'utc')::date::text, 'xp', 800)));
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
select public.sync_profile('', 'Z9', -50, -3, '[]');   -- a bad level and negative numbers are put right, not stored
reset role;

do $$ begin
  perform pg_temp.assert((select level_code from public.profiles where display_name = '' and user_id = '00000000-0000-0000-0000-00000000000c') = 'A1.1', 'bad level replaced');
  perform pg_temp.assert((select total_xp from public.profiles where user_id = '00000000-0000-0000-0000-00000000000c') = 0, 'negative xp clamped');
  perform pg_temp.assert((select max(xp) from public.xp_days where user_id = '00000000-0000-0000-0000-00000000000a') = 20000, 'a day is capped');
  perform pg_temp.assert((select count(*) from public.xp_days where user_id = '00000000-0000-0000-0000-00000000000a') = 2, 'a malformed day is skipped');
end $$;

-- 4. Friends: ask, ask again, ask yourself, ask a stranger, be asked back.
reset role;
select set_config('rf.ada', (select friend_code from public.profiles where display_name = 'Ada'), true),
       set_config('rf.ben', (select friend_code from public.profiles where display_name = 'Ben'), true);
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
do $$ begin
  perform pg_temp.assert(public.add_friend(current_setting('rf.ada')) = 'self', 'cannot add yourself');
  perform pg_temp.assert(public.add_friend('ZZZZZZZZ') = 'not_found', 'unknown code');
  perform pg_temp.assert(public.add_friend(lower(current_setting('rf.ben'))) = 'sent', 'a code is matched whatever its case');
  perform pg_temp.assert(public.add_friend(current_setting('rf.ben')) = 'already_sent', 'asking twice');
  perform pg_temp.assert((select relation from public.my_friends()) = 'outgoing', 'the request is outgoing for the asker');
  perform pg_temp.assert((select xp_month from public.my_friends()) = 0, 'a request does not show XP');
end $$;
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
do $$ begin
  perform pg_temp.assert((select count(*) from public.my_friends()) = 0, 'a stranger sees nobody else request');
  begin perform public.respond_friend((select id from public.friendships limit 1), true); exception when others then null; end;
end $$;
reset role;
do $$ begin
  perform pg_temp.assert((select status from public.friendships limit 1) = 'pending', 'someone who is not the addressee cannot accept');
end $$;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
do $$ begin
  perform pg_temp.assert((select relation from public.my_friends()) = 'incoming', 'the request is incoming for the addressee');
  perform public.respond_friend((select friendship_id from public.my_friends()), true);
  perform pg_temp.assert((select relation from public.my_friends()) = 'friend', 'accepted');
  perform pg_temp.assert((select xp_week from public.my_friends()) = 20300, 'a friend shows what they earned this week (the capped day and today)');
  perform pg_temp.assert(public.add_friend(current_setting('rf.ada')) = 'already_friends', 'already friends');
end $$;
reset role;

-- 5. The league: everyone lands in a Bronze league of this month, ranked by XP.
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
do $$ declare r record; n int := 0; begin
  for r in select * from public.my_league() loop n := n + 1; end loop;
  perform pg_temp.assert(n = 1, 'alone in the league at first');
  perform pg_temp.assert((select tier from public.my_league() limit 1) = 0, 'new readers start in Bronze');
end $$;
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b'); select count(*) from public.my_league(); reset role;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c'); select count(*) from public.my_league(); reset role;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
do $$ begin
  perform pg_temp.assert((select count(*) from public.my_league()) = 3, 'three in one league');
  perform pg_temp.assert((select display_name from public.my_league() where rank = 1) = 'Ada', 'Ada leads on XP');
  perform pg_temp.assert((select is_me from public.my_league() where display_name = 'Ben'), 'the caller is marked');
end $$;
reset role;
do $$ begin
  perform pg_temp.assert((select count(*) from public.leagues) = 1, 'one league was made, not one each');
end $$;

rollback;
select 'social checks passed' as result;
