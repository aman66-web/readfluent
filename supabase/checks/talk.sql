-- Proves 0005_talk.sql against a database that has 0001-0005 applied. Throw-away readers, rolled back.
-- Silence is a pass.   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/checks/talk.sql

begin;

insert into auth.users (id, email, is_anonymous) values
  ('00000000-0000-0000-0000-0000000000a1', 'a@example.test', false),
  ('00000000-0000-0000-0000-0000000000a2', 'b@example.test', false),
  ('00000000-0000-0000-0000-0000000000a3', null, true);

create or replace function pg_temp.as_user(uid text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', uid, true);
  execute 'set local role authenticated';
end $$;
create or replace function pg_temp.assert(ok boolean, what text) returns void language plpgsql as $$
begin if not ok then raise exception 'FAILED: %', what; end if; end $$;

-- 1. A reader with no real account cannot take a message.
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a3');
do $$ begin
  begin perform public.talk_take(3); raise exception 'FAILED: anonymous talked'; exception when sqlstate '28000' then null; end;
end $$;
reset role;

-- 2. The allowance counts down, then refuses, and refusing takes nothing.
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
do $$ begin
  perform pg_temp.assert(public.talk_take(3) = 2, 'first message leaves 2');
  perform pg_temp.assert(public.talk_take(3) = 1, 'second leaves 1');
  perform pg_temp.assert(public.talk_take(3) = 0, 'third leaves 0');
  perform pg_temp.assert(public.talk_take(3) = -1, 'fourth is refused');
  perform pg_temp.assert(public.talk_take(3) = -1, 'and stays refused');
  begin perform public.talk_take(0); raise exception 'FAILED: a limit of 0'; exception when sqlstate '22023' then null; end;
end $$;
reset role;

-- 3. It is per reader.
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a2');
do $$ begin
  perform pg_temp.assert(public.talk_take(3) = 2, 'another reader has their own allowance');
  -- The table itself is closed.
  begin perform count(*) from public.talk_usage; raise exception 'FAILED: read the usage table'; exception when insufficient_privilege then null; end;
end $$;
reset role;

-- 4. Nobody without a session.
select set_config('request.jwt.claim.sub', '', true);
set local role anon;
do $$ begin
  begin perform public.talk_take(3); raise exception 'FAILED: anon called it'; exception when insufficient_privilege then null; end;
end $$;
reset role;

rollback;
