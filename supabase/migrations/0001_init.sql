-- ReadFluent — initial schema
--
-- Three tables. Everything a reader does is stored on their device first
-- (CLAUDE.md, "Accounts and money": reading needs no account), so the server
-- holds only what has to outlive a device: who they are, what they pay for,
-- and a copy of their documents (0003_sync.sql) for their next phone. Content
-- (books, photos, audio) is not in the database at all; it is files in
-- object storage (SPEC.md §9).

create extension if not exists "pgcrypto";

-- ── users ────────────────────────────────────────────────────────────────────
-- Mirrors auth.users. The id is the SAME uuid, so upgrading an anonymous
-- device to a signed-in account (auth.updateUser / linking an identity) keeps
-- every foreign key intact: progress made before signing in is not lost.
-- `plan` and the three columns beside it are written only by the server
-- (0002_plan.sql), never by a reader.
create table if not exists public.users (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text,
  is_anonymous boolean not null default true,
  -- Preferences a reader may write themselves (autoplay, slow audio, ...).
  settings     jsonb not null default '{}'::jsonb,
  plan         text not null default 'free',
  -- When the paid plan stops. Null means it does not: a subscription renewed
  -- elsewhere, or a hand-set grant.
  plan_until   timestamptz,
  -- Kept for reporting: which product (monthly / yearly) and RevenueCat's
  -- period type (TRIAL during a free trial).
  plan_product text,
  plan_period  text,
  created_at   timestamptz not null default now()
);

-- ── events ───────────────────────────────────────────────────────────────────
-- Product analytics (SPEC.md §12). Write-only from the client; read
-- server-side. user_id is nulled, not cascaded, when an account is deleted:
-- the counts survive, the person does not.
create table if not exists public.events (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.users(id) on delete set null,
  name       text not null,
  props      jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists events_name_created_idx on public.events (name, created_at);

-- ── row level security ───────────────────────────────────────────────────────
-- Rule: a reader reads and writes only their own rows.
alter table public.users  enable row level security;
alter table public.events enable row level security;

-- No insert policy on users: rows are created by the on_auth_user_created
-- trigger below, which is security definer. A client can never invent a user.
drop policy if exists users_select_own on public.users;
create policy users_select_own on public.users
  for select using (id = (select auth.uid()));

-- Broad on purpose: RLS cannot say "every column except plan". 0002_plan.sql
-- narrows it to the one column a reader may write, and puts a trigger behind it.
drop policy if exists users_update_own on public.users;
create policy users_update_own on public.users
  for update using (id = (select auth.uid())) with check (id = (select auth.uid()));

drop policy if exists events_insert_own on public.events;
create policy events_insert_own on public.events
  for insert with check (user_id = (select auth.uid()));

-- ── keeping public.users in step with auth.users ─────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, is_anonymous)
  values (new.id, new.email, coalesce(new.is_anonymous, false))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Upgrading anonymous -> signed in keeps the same auth.users row, so mirror the
-- change rather than creating anything.
create or replace function public.handle_user_updated()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.users
     set email = new.email,
         is_anonymous = coalesce(new.is_anonymous, false)
   where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
  after update of email, is_anonymous on auth.users
  for each row execute function public.handle_user_updated();
