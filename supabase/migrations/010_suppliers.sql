-- =====================================================================
-- Stage 10: Suppliers, and a supplier per item
-- Run in Supabase -> SQL Editor
-- =====================================================================

create table if not exists public.suppliers (
  id              uuid primary key default gen_random_uuid(),
  name            text not null check (char_length(name) between 2 and 100),
  contact_person  text,
  email           text,                         -- where supplier lists are sent
  phone           text,
  notes           text,
  is_deleted      boolean not null default false,  -- deletion indicator (soft delete)
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

drop trigger if exists suppliers_touch on public.suppliers;
create trigger suppliers_touch before update on public.suppliers
  for each row execute function public.touch_updated_at();

alter table public.suppliers enable row level security;   -- server-only access

-- Suppliers apps may use (deleted ones never appear)
create or replace view public.suppliers_active
with (security_invoker = true) as
  select id, name, contact_person, email, phone, notes, created_at, updated_at
  from public.suppliers
  where is_deleted = false;

-- ---------- Each item can be linked to a supplier ---------------------
alter table public.items
  add column if not exists supplier_id uuid references public.suppliers (id) on delete set null;

create index if not exists items_supplier_idx on public.items (supplier_id);

-- items_active gets the new column at the end (existing columns unchanged)
create or replace view public.items_active
with (security_invoker = true) as
  select id, name, description, image_url, image_path,
         purchase_price, markup_percent, selling_price,
         created_at, updated_at,
         sizes, colours,
         supplier_id
  from public.items
  where is_deleted = false;
