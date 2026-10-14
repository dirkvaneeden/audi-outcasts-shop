-- =====================================================================
-- Stage 8: Promotions (pop-up offer shown to members after signing in)
-- Run in Supabase -> SQL Editor
-- =====================================================================

create table if not exists public.promotions (
  id          uuid primary key default gen_random_uuid(),
  item_id     uuid not null references public.items (id),
  title       text not null check (char_length(title) between 2 and 80),
  message     text not null check (char_length(message) between 1 and 1000),
  starts_on   date not null,
  ends_on     date not null,
  is_active   boolean not null default true,   -- switch a promotion off without deleting it
  is_deleted  boolean not null default false,  -- deletion indicator (soft delete)
  created_by  uuid references public.members (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint promotions_dates_check check (ends_on >= starts_on)
);

drop trigger if exists promotions_touch on public.promotions;
create trigger promotions_touch before update on public.promotions
  for each row execute function public.touch_updated_at();

-- What each member did with each promotion, so it only pops up until they respond
create table if not exists public.promotion_responses (
  promotion_id  uuid not null references public.promotions (id) on delete cascade,
  member_id     uuid not null references public.members (id) on delete cascade,
  response      text not null check (response in ('added', 'ignored')),
  responded_at  timestamptz not null default now(),
  primary key (promotion_id, member_id)
);

alter table public.promotions          enable row level security;  -- server-only access
alter table public.promotion_responses enable row level security;

-- ---------- Live promotions ------------------------------------------
-- Running today (South African date), switched on, not deleted,
-- and the item is still active (deleted items never appear).
create or replace view public.promotions_live
with (security_invoker = true) as
  select p.id,
         p.item_id,
         p.title,
         p.message,
         p.starts_on,
         p.ends_on,
         i.name          as item_name,
         i.description   as item_description,
         i.image_url,
         i.selling_price,
         i.sizes,
         i.colours
  from public.promotions p
  join public.items_active i on i.id = p.item_id
  where p.is_deleted = false
    and p.is_active = true
    and (now() at time zone 'Africa/Johannesburg')::date between p.starts_on and p.ends_on;
