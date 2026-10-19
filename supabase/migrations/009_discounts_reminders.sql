-- =====================================================================
-- Stage 9: Promotion discounts + payment reminders
-- Run in Supabase -> SQL Editor
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Promotion discount (% off the selling price)
--    A discount may never take the price below the purchase (cost) price,
--    i.e. it can be at most the item's markup.
-- ---------------------------------------------------------------------
alter table public.promotions
  add column if not exists discount_percent numeric(5,2) not null default 0;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'promotions_discount_range') then
    alter table public.promotions
      add constraint promotions_discount_range check (discount_percent >= 0 and discount_percent < 100);
  end if;
end $$;

create or replace function public.promotions_check_discount()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_selling numeric;
  v_cost    numeric;
begin
  -- Only check when the discount or the item changes (so a promotion can always be deleted)
  if new.discount_percent > 0 and (
       tg_op = 'INSERT'
       or new.discount_percent is distinct from old.discount_percent
       or new.item_id is distinct from old.item_id) then
    select selling_price, purchase_price into v_selling, v_cost
      from public.items where id = new.item_id;
    if round(v_selling * (1 - new.discount_percent / 100), 2) < v_cost then
      raise exception 'DISCOUNT_ABOVE_MARKUP';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists promotions_check_discount on public.promotions;
create trigger promotions_check_discount
  before insert or update on public.promotions
  for each row execute function public.promotions_check_discount();

-- ---------------------------------------------------------------------
-- 2. Current price per active item
--    During a live promotion with a discount, the item is cheaper everywhere
--    (store, pop-up, cart, order). If the item's prices change later, the
--    price is still never allowed below cost.
-- ---------------------------------------------------------------------
create or replace view public.item_prices
with (security_invoker = true) as
  select i.id as item_id,
         i.selling_price as regular_price,
         coalesce(d.discount_percent, 0)::numeric(5,2) as discount_percent,
         (case when coalesce(d.discount_percent, 0) > 0
               then greatest(round(i.selling_price * (1 - d.discount_percent / 100), 2), i.purchase_price)
               else i.selling_price
          end)::numeric(12,2) as price
  from public.items_active i
  left join lateral (
    select max(p.discount_percent) as discount_percent
    from public.promotions p
    where p.item_id = i.id
      and p.is_deleted = false
      and p.is_active = true
      and p.discount_percent > 0
      and (now() at time zone 'Africa/Johannesburg')::date between p.starts_on and p.ends_on
  ) d on true;

-- Store catalogue: selling_price is now the price members pay today;
-- regular_price and discount_percent are added for the "was" price.
create or replace view public.catalogue
with (security_invoker = true) as
  select i.id, i.name, i.description, i.image_url,
         ip.price as selling_price,
         i.sizes, i.colours,
         ip.regular_price, ip.discount_percent
  from public.items_active i
  join public.item_prices ip on ip.item_id = i.id;

-- Cart lines priced at today's price
create or replace view public.cart_lines
with (security_invoker = true) as
  select c.member_id,
         c.item_id,
         c.quantity,
         c.added_at,
         i.name,
         i.description,
         i.image_url,
         ip.price as selling_price,
         round(ip.price * c.quantity, 2) as line_total,
         c.id as line_id,
         c.size,
         c.colour,
         c.note,
         ip.regular_price,
         ip.discount_percent
  from public.cart_items c
  join public.items_active i on i.id = c.item_id
  join public.item_prices ip on ip.item_id = c.item_id;

-- Live promotions with their prices
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
         ip.price        as selling_price,
         i.sizes,
         i.colours,
         ip.regular_price,
         ip.discount_percent
  from public.promotions p
  join public.items_active i  on i.id = p.item_id
  join public.item_prices  ip on ip.item_id = p.item_id
  where p.is_deleted = false
    and p.is_active = true
    and (now() at time zone 'Africa/Johannesburg')::date between p.starts_on and p.ends_on;

-- Order lines remember the discount they were bought with
alter table public.order_lines
  add column if not exists regular_price    numeric(12,2),
  add column if not exists discount_percent numeric(5,2) not null default 0;

-- place_order: same as before, now also copying the regular price and discount
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
     size, colour, note, unit_cost, regular_price, discount_percent)
  select v_order_id,
         row_number() over (order by cl.added_at, cl.name, cl.size, cl.colour),
         cl.item_id, cl.name, cl.image_url, cl.selling_price, cl.quantity, cl.line_total,
         cl.size, cl.colour, cl.note, i.purchase_price, cl.regular_price, cl.discount_percent
    from public.cart_lines cl
    join public.items i on i.id = cl.item_id
   where cl.member_id = p_member_id;

  delete from public.cart_items where member_id = p_member_id;

  return v_number;
end;
$$;

revoke execute on function public.place_order(uuid) from public, anon, authenticated;
grant  execute on function public.place_order(uuid) to service_role;

-- ---------------------------------------------------------------------
-- 3. Payment reminders
-- ---------------------------------------------------------------------
alter table public.orders
  add column if not exists reminder_count    int not null default 0,
  add column if not exists last_reminder_at  timestamptz;
