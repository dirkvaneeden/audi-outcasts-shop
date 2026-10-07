-- =====================================================================
-- Stage 3: Store catalogue + cart
-- Run in Supabase -> SQL Editor
-- =====================================================================

-- ---------- Catalogue: what members may see ---------------------------
-- Built on items_active, so deleted items never appear.
-- Only customer-facing columns: no purchase price or markup.
create or replace view public.catalogue
with (security_invoker = true) as
  select id, name, description, image_url, selling_price
  from public.items_active;

-- ---------- Cart ------------------------------------------------------
-- Stored per member, so the cart follows them between phone and PC.
create table if not exists public.cart_items (
  member_id   uuid not null references public.members (id) on delete cascade,
  item_id     uuid not null references public.items (id) on delete cascade,
  quantity    int  not null check (quantity between 1 and 99),
  added_at    timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (member_id, item_id)
);

alter table public.cart_items enable row level security;  -- server-only access

-- ---------- Cart lines: cart joined to ACTIVE items only --------------
-- If an item is marked for deletion after being added to a cart,
-- it drops out of the cart and its total automatically.
create or replace view public.cart_lines
with (security_invoker = true) as
  select c.member_id,
         c.item_id,
         c.quantity,
         c.added_at,
         i.name,
         i.description,
         i.image_url,
         i.selling_price,
         round(i.selling_price * c.quantity, 2) as line_total
  from public.cart_items c
  join public.items_active i on i.id = c.item_id;

-- ---------- Add to cart (adds to the quantity if already there) -------
create or replace function public.add_to_cart(p_member_id uuid, p_item_id uuid, p_quantity int default 1)
returns int
language plpgsql
set search_path = ''
as $$
declare
  v_quantity int;
begin
  if not exists (select 1 from public.items where id = p_item_id and is_deleted = false) then
    raise exception 'Item not available';
  end if;

  insert into public.cart_items (member_id, item_id, quantity)
  values (p_member_id, p_item_id, least(greatest(p_quantity, 1), 99))
  on conflict (member_id, item_id) do update
    set quantity   = least(public.cart_items.quantity + excluded.quantity, 99),
        updated_at = now()
  returning quantity into v_quantity;

  return v_quantity;
end;
$$;

-- Only the app's server (service role) may call it
revoke execute on function public.add_to_cart(uuid, uuid, int) from public, anon, authenticated;
grant  execute on function public.add_to_cart(uuid, uuid, int) to service_role;
