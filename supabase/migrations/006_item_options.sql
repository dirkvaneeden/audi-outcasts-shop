-- =====================================================================
-- Stage 6: Sizes and colours per item, options + note per cart/order line
-- Run in Supabase -> SQL Editor
-- =====================================================================

-- ---------- Items: available sizes and colours ------------------------
alter table public.items
  add column if not exists sizes   text[] not null default '{}',
  add column if not exists colours text[] not null default '{}';

-- Views get the new columns (added at the end, existing columns unchanged)
create or replace view public.items_active
with (security_invoker = true) as
  select id, name, description, image_url, image_path,
         purchase_price, markup_percent, selling_price,
         created_at, updated_at,
         sizes, colours
  from public.items
  where is_deleted = false;

create or replace view public.catalogue
with (security_invoker = true) as
  select id, name, description, image_url, selling_price, sizes, colours
  from public.items_active;

-- ---------- Cart: one line per item + size + colour + note -------------
alter table public.cart_items
  add column if not exists id     uuid not null default gen_random_uuid(),
  add column if not exists size   text not null default '',
  add column if not exists colour text not null default '',
  add column if not exists note   text not null default '';

do $$
begin
  -- The old key (member, item) allowed only one line per item
  if exists (select 1 from pg_constraint where conname = 'cart_items_pkey'
             and conrelid = 'public.cart_items'::regclass
             and array_length(conkey, 1) = 2) then
    alter table public.cart_items drop constraint cart_items_pkey;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'cart_items_pkey'
                 and conrelid = 'public.cart_items'::regclass) then
    alter table public.cart_items add constraint cart_items_pkey primary key (id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'cart_items_line_key') then
    alter table public.cart_items
      add constraint cart_items_line_key unique (member_id, item_id, size, colour, note);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'cart_items_note_length') then
    alter table public.cart_items
      add constraint cart_items_note_length check (char_length(note) <= 200);
  end if;
end $$;

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
         round(i.selling_price * c.quantity, 2) as line_total,
         c.id as line_id,
         c.size,
         c.colour,
         c.note
  from public.cart_items c
  join public.items_active i on i.id = c.item_id;

-- ---------- Add to cart, with size / colour / note --------------------
drop function if exists public.add_to_cart(uuid, uuid, int);

create or replace function public.add_to_cart(
  p_member_id uuid, p_item_id uuid, p_quantity int,
  p_size text, p_colour text, p_note text
)
returns int
language plpgsql
set search_path = ''
as $$
declare
  v_sizes    text[];
  v_colours  text[];
  v_size     text := coalesce(trim(p_size), '');
  v_colour   text := coalesce(trim(p_colour), '');
  v_note     text := left(coalesce(trim(p_note), ''), 200);
  v_quantity int;
begin
  select sizes, colours into v_sizes, v_colours
    from public.items
   where id = p_item_id and is_deleted = false;
  if not found then
    raise exception 'ITEM_NOT_AVAILABLE';
  end if;

  -- A size/colour is required when the item has options, and must be one of them
  if cardinality(v_sizes) > 0 then
    if not (v_size = any (v_sizes)) then raise exception 'SIZE_REQUIRED'; end if;
  else
    v_size := '';
  end if;
  if cardinality(v_colours) > 0 then
    if not (v_colour = any (v_colours)) then raise exception 'COLOUR_REQUIRED'; end if;
  else
    v_colour := '';
  end if;

  -- Same item, size, colour and note: add to that line's quantity
  insert into public.cart_items (member_id, item_id, quantity, size, colour, note)
  values (p_member_id, p_item_id, least(greatest(coalesce(p_quantity, 1), 1), 99), v_size, v_colour, v_note)
  on conflict on constraint cart_items_line_key do update
    set quantity   = least(public.cart_items.quantity + excluded.quantity, 99),
        updated_at = now()
  returning quantity into v_quantity;

  return v_quantity;
end;
$$;

revoke execute on function public.add_to_cart(uuid, uuid, int, text, text, text) from public, anon, authenticated;
grant  execute on function public.add_to_cart(uuid, uuid, int, text, text, text) to service_role;

-- ---------- Order lines keep the chosen options and note --------------
alter table public.order_lines
  add column if not exists size   text not null default '',
  add column if not exists colour text not null default '',
  add column if not exists note   text not null default '';

-- place_order: same as stage 4, now copying size, colour and note
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
    (order_id, line_no, item_id, name, image_url, unit_price, quantity, line_total, size, colour, note)
  select v_order_id,
         row_number() over (order by added_at, name, size, colour),
         item_id, name, image_url, selling_price, quantity, line_total, size, colour, note
    from public.cart_lines
   where member_id = p_member_id;

  delete from public.cart_items where member_id = p_member_id;

  return v_number;
end;
$$;

revoke execute on function public.place_order(uuid) from public, anon, authenticated;
grant  execute on function public.place_order(uuid) to service_role;
