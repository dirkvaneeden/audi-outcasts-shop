-- =====================================================================
-- Stage 7: cost price on order lines (for the supplier list)
-- Run in Supabase -> SQL Editor
-- =====================================================================

-- Cost price per unit at the time of ordering (admin-only, never shown to members)
alter table public.order_lines
  add column if not exists unit_cost numeric(12,2);

-- Existing orders: fill in from the item's current purchase price
update public.order_lines ol
   set unit_cost = i.purchase_price
  from public.items i
 where i.id = ol.item_id
   and ol.unit_cost is null;

-- place_order: same as stage 6, now also copying the purchase price
create or replace function public.place_order(p_member_id uuid)
returns text
language plpgsql
set search_path = ''
as $$
declare
  v_order_id  uuid;
  v_number    text;
  v_bank      jsonb;
  v_count     int;
  v_total     numeric(12,2);
begin
  perform 1 from public.cart_items where member_id = p_member_id for update;

  select to_jsonb(b) - 'id' - 'updated_at' - 'updated_by'
    into v_bank
    from public.bank_details b
   where b.id;
  if v_bank is null then
    raise exception 'BANK_DETAILS_MISSING';
  end if;

  select coalesce(sum(quantity), 0), coalesce(sum(line_total), 0)
    into v_count, v_total
    from public.cart_lines
   where member_id = p_member_id;
  if v_count = 0 then
    raise exception 'CART_EMPTY';
  end if;

  insert into public.orders (member_id, item_count, total, bank_details)
  values (p_member_id, v_count, v_total, v_bank)
  returning id, order_number into v_order_id, v_number;

  insert into public.order_lines
    (order_id, line_no, item_id, name, image_url, unit_price, quantity, line_total,
     size, colour, note, unit_cost)
  select v_order_id,
         row_number() over (order by cl.added_at, cl.name, cl.size, cl.colour),
         cl.item_id, cl.name, cl.image_url, cl.selling_price, cl.quantity, cl.line_total,
         cl.size, cl.colour, cl.note, i.purchase_price
    from public.cart_lines cl
    join public.items i on i.id = cl.item_id
   where cl.member_id = p_member_id;

  delete from public.cart_items where member_id = p_member_id;

  return v_number;
end;
$$;

revoke execute on function public.place_order(uuid) from public, anon, authenticated;
grant  execute on function public.place_order(uuid) to service_role;
