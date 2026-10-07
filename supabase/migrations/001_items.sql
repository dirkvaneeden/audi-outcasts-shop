-- =====================================================================
-- Stage 1: Items
-- Run this in the Supabase dashboard -> SQL Editor (or via supabase CLI)
-- =====================================================================

-- ---------- Table ----------------------------------------------------
create table if not exists public.items (
  id              uuid primary key default gen_random_uuid(),
  name            text not null check (char_length(name) between 1 and 120),
  description     text,
  image_url       text,
  image_path      text,                               -- path inside the storage bucket
  purchase_price  numeric(12,2) not null default 0 check (purchase_price >= 0),
  markup_percent  numeric(9,4)  not null default 0 check (markup_percent > -100),
  selling_price   numeric(12,2) not null default 0 check (selling_price >= 0),
  is_deleted      boolean not null default false,     -- deletion indicator (soft delete)
  deleted_at      timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Fast lookups of active items only
create index if not exists items_active_created_idx
  on public.items (created_at desc)
  where is_deleted = false;

-- ---------- Trigger: single source of truth for pricing ---------------
-- Selling price is ALWAYS derived from purchase price + markup,
-- so it can never drift out of sync, whatever client writes the row.
create or replace function public.items_before_write()
returns trigger
language plpgsql
as $$
begin
  new.updated_at    := now();
  new.selling_price := round(new.purchase_price * (1 + new.markup_percent / 100), 2);

  if new.is_deleted then
    if tg_op = 'INSERT' then
      new.deleted_at := now();
    elsif not old.is_deleted then
      new.deleted_at := now();
    end if;
  else
    new.deleted_at := null;
  end if;

  return new;
end;
$$;

drop trigger if exists items_before_write on public.items;
create trigger items_before_write
  before insert or update on public.items
  for each row execute function public.items_before_write();

-- ---------- View: the ONLY source apps read from ----------------------
-- Every app/page queries items_active, never items directly,
-- so items marked for deletion can never show up.
-- Note: if you add columns to items later, add them here too.
create or replace view public.items_active
with (security_invoker = true) as
  select id, name, description, image_url, image_path,
         purchase_price, markup_percent, selling_price,
         created_at, updated_at
  from public.items
  where is_deleted = false;

-- ---------- Row Level Security ---------------------------------------
-- RLS on with NO policies = the public (anon) key can't read or write.
-- The Next.js server uses the service-role key, which bypasses RLS.
-- In the storefront stage we'll add a customer-facing view that exposes
-- only the selling price (never purchase price / markup).
alter table public.items enable row level security;

-- ---------- Storage bucket for item images ---------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'item-images', 'item-images', true, 5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;
