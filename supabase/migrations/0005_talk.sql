-- ─────────────────────────────────────────────────────────────────────────────
-- Talk with Dewey: a daily allowance of messages.
--
-- A conversation is the one place the app calls a language model at read time
-- (the owner asked for it by name), so each reader gets a small number of
-- messages a day. The server takes one before it answers; the count lives here
-- so it holds across devices and cannot be reset from the browser.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.talk_usage (
  user_id uuid not null references public.users(id) on delete cascade,
  day     date not null,
  n       integer not null default 0 check (n >= 0),
  primary key (user_id, day)
);
alter table public.talk_usage enable row level security;
revoke all on public.talk_usage from anon, authenticated;

-- Takes one message from today's allowance. Returns how many are left after it,
-- or -1 when the allowance is already used up (nothing is taken). A reader with
-- no real account is refused, like everything social.
create or replace function public.talk_take(p_limit integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  uid   uuid := auth.uid();
  anon  boolean;
  today date := (now() at time zone 'utc')::date;
  used  integer;
begin
  if uid is null then
    raise exception 'sign_in_required' using errcode = '28000';
  end if;
  select is_anonymous into anon from public.users where id = uid;
  if anon is distinct from false then
    raise exception 'sign_in_required' using errcode = '28000';
  end if;
  if p_limit is null or p_limit < 1 or p_limit > 1000 then
    raise exception 'bad_limit' using errcode = '22023';
  end if;

  insert into public.talk_usage (user_id, day, n) values (uid, today, 0)
    on conflict (user_id, day) do nothing;
  -- One statement, so two messages sent at once cannot both take the last place.
  update public.talk_usage set n = n + 1
   where user_id = uid and day = today and n < p_limit
  returning n into used;
  if used is null then return -1; end if;
  return p_limit - used;
end;
$$;

revoke execute on function public.talk_take(integer) from public, anon, authenticated;
grant execute on function public.talk_take(integer) to authenticated;
