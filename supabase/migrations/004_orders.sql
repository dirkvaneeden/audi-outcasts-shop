-- =====================================================================
-- Stage 4: Banking details, orders, checkout
-- Run in Supabase -> SQL Editor
-- =====================================================================

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------- Store banking details (one record) ------------------------
create table if not exists public.bank_details (
  id                    boolean primary key default true check (id),  -- only one row allowed
  account_holder        text not null check (char_length(account_holder) between 2 and 100),
  bank_name             text not null check (char_length(bank_name) between 2 and 60),
  branch_name           text,
  branch_code           text not null check (branch_code ~ '^[0-9]{6}$'),
  account_number        text not null check (account_number ~ '^[0-9]{6,16}$'),
  account_type          text not null check (account_type in ('Cheque / Current', 'Savings', 'Transmission', 'Business')),
  swift_code            text check (swift_code is null or swift_code ~ '^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$'),
  pop_email             text,          -- where members send proof of payment
  payment_instructions  text,
  updated_at            timestamptz not null default now(),
  updated_by            uuid references public.members (id) on delete set null
);

drop trigger if exists bank_details_touch on public.bank_details;
create trigger bank_details_touch before update on public.bank_details
  for each row execute function public.touch_updated_at();

alter table public.bank_details enable row level security;  -- server-only access

-- ---------- Orders ----------------------------------------------------
-- Order number doubles as the EFT payment reference: ORD100001, ORD100002, ...
create sequence if not exists public.order_number_seq start 100001;

create table if not exists public.orders (
  id             uuid primary key default gen_random_uuid(),
  order_number   text not null unique default ('ORD' || nextval('public.order_number_seq')::text),
  member_id      uuid not null references public.members (id),
  status         text not null default 'awaiting_payment'
                 check (status in ('awaiting_payment', 'paid', 'cancelled')),
  item_count     int not null check (item_count > 0),
  total          numeric(12,2) not null check (total >= 0),
  bank_details   jsonb not null,       -- copy of the banking details at the time of ordering
  email_sent_at  timestamptz,
  email_error    text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists orders_member_created_idx on public.orders (member_id, created_at desc);

drop trigger if exists orders_touch on public.orders;
create trigger orders_touch before update on public.orders
  for each row execute function public.touch_updated_at();

-- Order lines keep a copy of name, image and price, so an order never changes
-- when an item is edited or marked for deletion later.
create table if not exists public.order_lines (
  order_id    uuid not null references public.orders (id) on delete cascade,
  line_no     int  not null,
  item_id     uuid references public.items (id) on delete set null,
  name        text not null,
  image_url   text,
  unit_price  numeric(12,2) not null,
  quantity    int not null check (quantity > 0),
  line_total  numeric(12,2) not null,
  primary key (order_id, line_no)
);

alter table public.orders      enable row level security;  -- server-only access
alter table public.order_lines enable row level security;

-- ---------- Place order: cart -> order in one transaction -------------
-- Returns the new order number. Errors: CART_EMPTY, BANK_DETAILS_MISSING
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
  -- Lock this member's cart so a double-click can't create two orders
  perform 1 from public.cart_items where member_id = p_member_id for update;

  select to_jsonb(b) - 'id' - 'updated_at' - 'updated_by'
    into v_bank
    from public.bank_details b
   where b.id;
  if v_bank is null then
    raise exception 'BANK_DETAILS_MISSING';
  end if;

  -- cart_lines only includes active (not deleted) items
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

  insert into public.order_lines (order_id, line_no, item_id, name, image_url, unit_price, quantity, line_total)
  select v_order_id,
         row_number() over (order by added_at, name),
         item_id, name, image_url, selling_price, quantity, line_total
    from public.cart_lines
   where member_id = p_member_id;

  delete from public.cart_items where member_id = p_member_id;

  return v_number;
end;
$$;

revoke execute on function public.place_order(uuid) from public, anon, authenticated;
grant  execute on function public.place_order(uuid) to service_role;
