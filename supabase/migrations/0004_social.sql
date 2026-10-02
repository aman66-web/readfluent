-- ─────────────────────────────────────────────────────────────────────────────
-- Friends and the monthly league.
--
-- Reading needs no account; playing with other people does, so everything here
-- is for a signed-in reader (an anonymous session is refused). Nothing in these
-- tables is readable or writable directly: the app talks to them only through
-- the functions at the foot of this file, each of which decides who is asking
-- and shows them only what they may see. What other people see of a reader is
-- their chosen display name, their level, their streak, their friend code and
-- the XP they have earned in a month — never an email, never an id.
--
-- XP is reported by the reader's own device (the ledger lives there until M8),
-- so a league is a friendly competition, not a verified one: the per-day figure
-- is capped, and nothing here pays out or unlocks anything.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.profiles (
  user_id      uuid primary key references public.users(id) on delete cascade,
  -- What a friend types to add this reader. Unambiguous characters only.
  friend_code  text not null unique,
  display_name text not null default '' check (char_length(display_name) <= 40),
  level_code   text not null default 'A1.1' check (level_code ~ '^[A-C][1-2](\.[1-3])?$'),
  total_xp     integer not null default 0 check (total_xp >= 0),
  streak       integer not null default 0 check (streak >= 0),
  updated_at   timestamptz not null default now()
);

-- XP by day (UTC), as the device reports it: what a month's league is added up from.
create table if not exists public.xp_days (
  user_id uuid not null references public.users(id) on delete cascade,
  day     date not null,
  xp      integer not null check (xp >= 0 and xp <= 20000),
  primary key (user_id, day)
);
create index if not exists xp_days_day_idx on public.xp_days (day);

create table if not exists public.friendships (
  id         uuid primary key default gen_random_uuid(),
  requester  uuid not null references public.users(id) on delete cascade,
  addressee  uuid not null references public.users(id) on delete cascade,
  status     text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  check (requester <> addressee)
);
-- One friendship (or request) between two readers, whichever of them asked first.
create unique index if not exists friendships_pair_idx
  on public.friendships (least(requester, addressee), greatest(requester, addressee));
create index if not exists friendships_addressee_idx on public.friendships (addressee);

-- A league is up to 30 readers of one tier in one month (tier 0 Bronze … 4 Diamond).
create table if not exists public.leagues (
  id         uuid primary key default gen_random_uuid(),
  period     text not null check (period ~ '^\d{4}-\d{2}$'),
  tier       smallint not null check (tier between 0 and 4),
  created_at timestamptz not null default now()
);
create index if not exists leagues_period_tier_idx on public.leagues (period, tier);

create table if not exists public.league_members (
  league_id uuid not null references public.leagues(id) on delete cascade,
  user_id   uuid not null references public.users(id) on delete cascade,
  period    text not null,
  primary key (league_id, user_id),
  -- A reader is in one league a month.
  unique (user_id, period)
);

-- No policies at all: with row level security on, a reader's own browser can read and write none of
-- this. The functions below are the only way in, and they run as the table's owner.
alter table public.profiles       enable row level security;
alter table public.xp_days        enable row level security;
alter table public.friendships    enable row level security;
alter table public.leagues        enable row level security;
alter table public.league_members enable row level security;
revoke all on public.profiles, public.xp_days, public.friendships, public.leagues, public.league_members from anon, authenticated;

-- ── who is asking ────────────────────────────────────────────────────────────
create or replace function public.social_me()
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid  uuid := auth.uid();
  anon boolean;
begin
  if uid is null then
    raise exception 'sign_in_required' using errcode = '28000';
  end if;
  select is_anonymous into anon from public.users where id = uid;
  if anon is distinct from false then
    raise exception 'sign_in_required' using errcode = '28000';
  end if;
  return uid;
end;
$$;

create or replace function public.new_friend_code()
returns text
language plpgsql
volatile
set search_path = public
as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  code text;
begin
  loop
    code := '';
    for i in 1..8 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.profiles where friend_code = code);
  end loop;
  return code;
end;
$$;

-- ── reporting oneself ────────────────────────────────────────────────────────
-- Called by the app now and then while signed in. `p_days` is [{"day": "2026-10-02", "xp": 140}, ...]
-- for the last couple of months. Returns the reader's friend code.
create or replace function public.sync_profile(p_name text, p_level text, p_xp integer, p_streak integer, p_days jsonb)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  uid   uuid := public.social_me();
  today date := (now() at time zone 'utc')::date;
  code  text;
  e     jsonb;
  d     date;
  n     integer := 0;
begin
  insert into public.profiles (user_id, friend_code, display_name, level_code, total_xp, streak)
  values (
    uid,
    public.new_friend_code(),
    left(btrim(coalesce(p_name, '')), 40),
    case when coalesce(p_level, '') ~ '^[A-C][1-2](\.[1-3])?$' then p_level else 'A1.1' end,
    least(greatest(coalesce(p_xp, 0), 0), 100000000),
    least(greatest(coalesce(p_streak, 0), 0), 100000)
  )
  on conflict (user_id) do update
     set display_name = excluded.display_name,
         level_code   = excluded.level_code,
         total_xp     = excluded.total_xp,
         streak       = excluded.streak,
         updated_at   = now()
  returning friend_code into code;

  if p_days is not null and jsonb_typeof(p_days) = 'array' then
    for e in select * from jsonb_array_elements(p_days) loop
      exit when n >= 70;
      n := n + 1;
      begin
        d := (e ->> 'day')::date;
      exception when others then
        continue;
      end;
      continue when d < today - 70 or d > today + 1;
      insert into public.xp_days (user_id, day, xp)
      values (uid, d, least(greatest(coalesce((e ->> 'xp')::integer, 0), 0), 20000))
      on conflict (user_id, day) do update set xp = excluded.xp;
    end loop;
  end if;
  return code;
end;
$$;

-- ── friends ──────────────────────────────────────────────────────────────────
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
  code   text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  target uuid;
  f      public.friendships%rowtype;
begin
  if not exists (select 1 from public.profiles where user_id = uid) then
    return 'no_profile';
  end if;
  select user_id into target from public.profiles where friend_code = code;
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

create or replace function public.respond_friend(p_id uuid, p_accept boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare uid uuid := public.social_me();
begin
  if p_accept then
    update public.friendships set status = 'accepted' where id = p_id and addressee = uid and status = 'pending';
  else
    delete from public.friendships where id = p_id and addressee = uid and status = 'pending';
  end if;
end;
$$;

-- Removes a friend, or takes back a request you sent.
create or replace function public.remove_friend(p_friendship uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare uid uuid := public.social_me();
begin
  delete from public.friendships
   where id = p_friendship
     and (status = 'accepted' and uid in (requester, addressee) or status = 'pending' and requester = uid);
end;
$$;

-- Friends, and the requests in either direction. XP is shown for friends only.
create or replace function public.my_friends()
returns table (friendship_id uuid, friend_code text, relation text, display_name text, level_code text, streak integer, xp_week integer, xp_month integer)
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
              then coalesce((select sum(x.xp) from public.xp_days x where x.user_id = p.user_id and x.day >= month_start), 0)::integer else 0 end
    from public.friendships f
    join public.profiles p on p.user_id = case when f.requester = uid then f.addressee else f.requester end
   where uid in (f.requester, f.addressee)
   order by (f.status = 'accepted'), f.created_at desc;
end;
$$;

-- ── the league ───────────────────────────────────────────────────────────────
-- Puts the reader in this month's league if they are not in one (their tier is last month's, moved up
-- for a top-five finish and down for a bottom-five one), and returns the standings, most XP first.
create or replace function public.my_league()
returns table (rank integer, friend_code text, display_name text, level_code text, xp integer, is_me boolean, tier integer, period text, size integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  uid          uuid := public.social_me();
  this_month   date := date_trunc('month', now() at time zone 'utc')::date;
  next_month   date := (date_trunc('month', now() at time zone 'utc') + interval '1 month')::date;
  last_month   date := (date_trunc('month', now() at time zone 'utc') - interval '1 month')::date;
  per          text := to_char(this_month, 'YYYY-MM');
  last_per     text := to_char(last_month, 'YYYY-MM');
  lid          uuid;
  want_tier    integer := 0;
  prev_league  uuid;
  prev_tier    integer;
  prev_rank    integer;
  prev_size    integer;
  prev_xp      integer;
begin
  if not exists (select 1 from public.profiles where user_id = uid) then
    raise exception 'no_profile' using errcode = '28000';
  end if;

  select m.league_id into lid from public.league_members m where m.user_id = uid and m.period = per;

  if lid is null then
    select m.league_id, l.tier into prev_league, prev_tier
      from public.league_members m join public.leagues l on l.id = m.league_id
     where m.user_id = uid and m.period = last_per;
    if prev_league is not null then
      want_tier := prev_tier;
      select r.rk, r.sz, r.xp into prev_rank, prev_size, prev_xp from (
        select m.user_id,
               rank() over (order by coalesce(sum(x.xp), 0) desc) as rk,
               count(*) over () as sz,
               coalesce(sum(x.xp), 0)::integer as xp
          from public.league_members m
          left join public.xp_days x on x.user_id = m.user_id and x.day >= last_month and x.day < this_month
         where m.league_id = prev_league
         group by m.user_id
      ) r where r.user_id = uid;
      if prev_xp > 0 and prev_size >= 10 and prev_rank <= 5 then want_tier := least(prev_tier + 1, 4);
      elsif prev_size >= 20 and prev_rank > prev_size - 5 then want_tier := greatest(prev_tier - 1, 0);
      end if;
    end if;

    perform pg_advisory_xact_lock(hashtext('league:' || per || ':' || want_tier));
    select l.id into lid from public.leagues l
     where l.period = per and l.tier = want_tier
       and (select count(*) from public.league_members m where m.league_id = l.id) < 30
     order by l.created_at limit 1;
    if lid is null then
      insert into public.leagues (period, tier) values (per, want_tier) returning id into lid;
    end if;
    insert into public.league_members (league_id, user_id, period) values (lid, uid, per);
  end if;

  return query
  select (rank() over (order by s.xp desc))::integer, s.friend_code, s.display_name, s.level_code, s.xp, s.user_id = uid,
         (select l.tier from public.leagues l where l.id = lid)::integer, per, (count(*) over ())::integer
    from (
      select p.user_id, p.friend_code, p.display_name, p.level_code,
             coalesce((select sum(x.xp) from public.xp_days x where x.user_id = p.user_id and x.day >= this_month and x.day < next_month), 0)::integer as xp
        from public.league_members m join public.profiles p on p.user_id = m.user_id
       where m.league_id = lid
    ) s
   order by 1, s.display_name;
end;
$$;

-- Only a signed-in reader's browser may call these.
revoke execute on function public.social_me(), public.new_friend_code(), public.sync_profile(text, text, integer, integer, jsonb),
  public.add_friend(text), public.respond_friend(uuid, boolean), public.remove_friend(uuid), public.my_friends(), public.my_league()
  from public, anon, authenticated;
grant execute on function public.sync_profile(text, text, integer, integer, jsonb), public.add_friend(text),
  public.respond_friend(uuid, boolean), public.remove_friend(uuid), public.my_friends(), public.my_league() to authenticated;
