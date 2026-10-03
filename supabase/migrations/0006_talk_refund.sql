-- Gives back one message from today's Talk allowance, for when the model call failed after talk_take
-- had already counted it. Never goes below zero; a reader with no real account is refused.
create or replace function public.talk_refund()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid   uuid := auth.uid();
  anon  boolean;
  today date := (now() at time zone 'utc')::date;
begin
  if uid is null then
    raise exception 'sign_in_required' using errcode = '28000';
  end if;
  select is_anonymous into anon from public.users where id = uid;
  if anon is distinct from false then
    raise exception 'sign_in_required' using errcode = '28000';
  end if;
  update public.talk_usage set n = n - 1 where user_id = uid and day = today and n > 0;
end;
$$;

revoke execute on function public.talk_refund() from public, anon, authenticated;
grant execute on function public.talk_refund() to authenticated;
