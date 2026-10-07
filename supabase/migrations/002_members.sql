-- =====================================================================
-- Stage 2: Members + login
-- Run in Supabase -> SQL Editor, then run supabase/seed/members_seed.sql
-- =====================================================================

-- ---------- Table ----------------------------------------------------
create table if not exists public.members (
  id             uuid primary key default gen_random_uuid(),
  member_number  text not null unique,                 -- e.g. AO-001
  name           text not null,
  nickname       text,
  phone          text,
  email          text not null,
  city           text,
  province       text,
  model          text,                                 -- car model(s), free text
  year           int,
  plate          text,
  active         boolean not null default true,        -- inactive = can't log in, hidden everywhere
  role           text not null default 'member' check (role in ('member', 'admin')),
  notes          text,
  birthday       date,
  auth_user_id   uuid unique references auth.users (id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- One member per email address, regardless of upper/lower case
create unique index if not exists members_email_lower_key on public.members (lower(email));

-- ---------- Normalise on every write -----------------------------------
-- Emails are always stored trimmed and lower case, so lookups are exact.
create or replace function public.members_before_write()
returns trigger language plpgsql as $$
begin
  new.email      := lower(trim(new.email));
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists members_before_write on public.members;
create trigger members_before_write
  before insert or update on public.members
  for each row execute function public.members_before_write();

-- ---------- View: apps read active members only -----------------------
create or replace view public.members_active
with (security_invoker = true) as
  select id, member_number, name, nickname, phone, email, city, province,
         model, year, plate, role, notes, birthday, auth_user_id,
         created_at, updated_at
  from public.members
  where active = true;

-- ---------- Only active members can create a login --------------------
-- Runs when Supabase Auth creates a user (first successful sign-in).
-- Rejects anyone whose email isn't an active member, and links the
-- login to the member record.
create or replace function public.link_auth_user_to_member()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member_id uuid;
begin
  select id into v_member_id
  from public.members
  where lower(email) = lower(new.email) and active = true
  limit 1;

  if v_member_id is null then
    raise exception 'Sign-in refused: % is not an active member', new.email;
  end if;

  update public.members set auth_user_id = new.id where id = v_member_id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_link_member on auth.users;
create trigger on_auth_user_created_link_member
  after insert on auth.users
  for each row execute function public.link_auth_user_to_member();

-- ---------- Row Level Security ---------------------------------------
alter table public.members enable row level security;

-- A signed-in member may read their own record (nothing else).
drop policy if exists "Members read own record" on public.members;
create policy "Members read own record"
  on public.members for select
  to authenticated
  using (auth_user_id = auth.uid() and active = true);
