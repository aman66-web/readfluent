-- ─────────────────────────────────────────────────────────────────────────────
-- Usernames, and the weekly board (owner, 4 Oct 2026).
--
-- A reader can choose a username (3 to 20 of a-z, 0-9, _ and ., kept in lower case, one per
-- reader), and friends can be added by it as well as by the friend code. The league's standings
-- can be asked for this week (Monday to Sunday, UTC) as well as this month. As in 0004, nothing is
-- readable or writable directly: these functions are the only way in, and each one decides who is
-- asking. A username is shown to friends and to the reader's league, never an email or an id.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.profiles add column if not exists username text;
do $$ begin
  alter table public.profiles add constraint profiles_username_shape
    check (username is null or username ~ '^[a-z0-9][a-z0-9_.]{2,19}$');
exception when duplicate_object then null;
end $$;
create unique index if not exists profiles_username_idx on public.profiles (username);

-- Sets (or changes) the reader's username. Returns 'ok', 'taken', 'invalid' or 'no_profile'.
-- A username may not look like a friend code (8 characters of the code alphabet), so that typing a
-- code can never reach somebody who chose a name to catch it.
create or replace function public.set_username(p_username text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  uid  uuid := public.social_me();
  name text := lower(btrim(regexp_replace(coalesce(p_username, ''), '^@', '')));
begin
  if not exists (select 1 from public.profiles where user_id = uid) then
    return 'no_profile';
  end if;
  if name !~ '^[a-z0-9][a-z0-9_.]{2,19}$' or name ~ '\.\.' or name ~ '\.$' then
    return 'invalid';
  end if;
  if upper(name) ~ '^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$' then
    return 'invalid';
  end if;
  if name in ('admin', 'administrator', 'support', 'help', 'readfluent', 'pluto', 'dewey', 'moderator', 'mod', 'official',
              'staff', 'team', 'root', 'system', 'null', 'undefined', 'me', 'you', 'everyone', 'anonymous') then
    return 'taken';
  end if;
  if exists (select 1 from public.profiles where username = name and user_id <> uid) then
    return 'taken';
  end if;
  update public.profiles set username = name, updated_at = now() where user_id = uid;
  return 'ok';
exception when unique_violation then
  return 'taken';
end;
$$;

-- add_friend now also takes a username ("@maria" or "maria"). A friend code is looked up first.
-- Returns 'sent', 'accepted' (they had already asked you), 'already_friends', 'already_sent',
-- 'not_found', 'self', 'no_profile' or 'too_many'. None of these is an error.
create or replace function public.add_friend(p_code text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  uid    uuid := public.social_me();
  raw    text := btrim(coalesce(p_code, ''));
  code   text := upper(regexp_replace(raw, '[^A-Za-z0-9]', '', 'g'));
  uname  text := lower(regexp_replace(raw, '^@', ''));
  target uuid;
  f      public.friendships%rowtype;
begin
  if not exists (select 1 from public.profiles where user_id = uid) then
    return 'no_profile';
  end if;
  if raw !~ '^@' then
    select user_id into target from public.profiles where friend_code = code;
  end if;
  if target is null and uname ~ '^[a-z0-9][a-z0-9_.]{2,19}$' then
    select user_id into target from public.profiles where username = uname;
  end if;
  if target is null then return 'not_found'; end if;
  if target = uid then return 'self'; end if;

  select * into f from public.friendships
   where least(requester, addressee) = least(uid, target) and greatest(requester, addressee) = greatest(uid, target);
  if found then
    if f.status = 'accepted' then return 'already_friends'; end if;
    if f.requester = uid then return 'already_sent'; end if;
    update public.friendships set status = 'accepted' where id = f.id;
    return 'accepted';
  end if;

  if (select count(*) from public.friendships where requester = uid and status = 'pending') >= 50 then
    return 'too_many';
  end if;
  insert into public.friendships (requester, addressee) values (uid, target);
  return 'sent';
end;
$$;

-- The reader's own username (null until chosen), alongside their friend code.
create or replace function public.my_username()
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare uid uuid := public.social_me();
begin
  return (select p.username from public.profiles p where p.user_id = uid);
end;
$$;

-- Friends, with their usernames. The return type grows a column, so the function is made again.
drop function if exists public.my_friends();
create function public.my_friends()
returns table (friendship_id uuid, friend_code text, relation text, display_name text, level_code text, streak integer, xp_week integer, xp_month integer, username text)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid         uuid := public.social_me();
  today       date := (now() at time zone 'utc')::date;
  month_start date := date_trunc('month', now() at time zone 'utc')::date;
begin
  return query
  select f.id,
         p.friend_code,
         case when f.status = 'accepted' then 'friend'
              when f.addressee = uid then 'incoming' else 'outgoing' end,
         p.display_name,
         p.level_code,
         case when f.status = 'accepted' then p.streak else 0 end,
         case when f.status = 'accepted'
              then coalesce((select sum(x.xp) from public.xp_days x where x.user_id = p.user_id and x.day > today - 7), 0)::integer else 0 end,
         case when f.status = 'accepted'
              then coalesce((select sum(x.xp) from public.xp_days x where x.user_id = p.user_id and x.day >= month_start), 0)::integer else 0 end,
         p.username
    from public.friendships f
    join public.profiles p on p.user_id = case when f.requester = uid then f.addressee else f.requester end
   where uid in (f.requester, f.addressee)
   order by (f.status = 'accepted'), f.created_at desc;
end;
$$;

-- The standings of the reader's league (joining this month's first, as my_league() does) for 'week' or 'month'.
create or replace function public.my_board(p_period text)
returns table (rank integer, friend_code text, username text, display_name text, level_code text, xp integer, is_me boolean, tier integer, period text, size integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  uid      uuid := public.social_me();
  month_id text := to_char(date_trunc('month', now() at time zone 'utc'), 'YYYY-MM');
  is_week  boolean := coalesce(p_period, '') = 'week';
  from_day date;
  to_day   date;
  lid      uuid;
  lt       integer;
  label    text;
begin
  perform * from public.my_league();
  select m.league_id, l.tier into lid, lt
    from public.league_members m join public.leagues l on l.id = m.league_id
   where m.user_id = uid and m.period = month_id;
  if is_week then
    from_day := date_trunc('week', now() at time zone 'utc')::date;
    to_day   := from_day + 7;
    label    := to_char(from_day, 'IYYY-"W"IW');
  else
    from_day := date_trunc('month', now() at time zone 'utc')::date;
    to_day   := (date_trunc('month', now() at time zone 'utc') + interval '1 month')::date;
    label    := month_id;
  end if;

  return query
  select (rank() over (order by s.xp desc))::integer, s.friend_code, s.username, s.display_name, s.level_code, s.xp, s.user_id = uid,
         lt, label, (count(*) over ())::integer
    from (
      select p.user_id, p.friend_code, p.username, p.display_name, p.level_code,
             coalesce((select sum(x.xp) from public.xp_days x where x.user_id = p.user_id and x.day >= from_day and x.day < to_day), 0)::integer as xp
        from public.league_members m join public.profiles p on p.user_id = m.user_id
       where m.league_id = lid
    ) s
   order by 1, s.display_name;
end;
$$;

revoke execute on function public.set_username(text), public.my_username(), public.my_friends(), public.my_board(text), public.add_friend(text)
  from public, anon, authenticated;
grant execute on function public.set_username(text), public.my_username(), public.my_friends(), public.my_board(text), public.add_friend(text)
  to authenticated;
