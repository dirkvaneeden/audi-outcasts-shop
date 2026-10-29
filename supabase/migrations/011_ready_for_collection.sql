-- =====================================================================
-- Stage 11: "Ready for collection" status
-- Paid -> Ordered -> Ready for collection -> Delivered
-- Run in Supabase -> SQL Editor
-- =====================================================================

alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check
  check (status in ('awaiting_payment', 'paid', 'ordered', 'ready_for_collection', 'delivered', 'rejected', 'cancelled'));

alter table public.orders
  add column if not exists ready_at                  timestamptz,
  add column if not exists collection_contact        jsonb,        -- admin the member must contact: {name, email, phone}
  add column if not exists collection_email_sent_at  timestamptz,
  add column if not exists collection_email_error    text;

-- set_order_status: same as stage 5, with the new step in the middle
create or replace function public.set_order_status(
  p_order_id uuid, p_status text, p_admin_id uuid, p_note text default null
)
returns text
language plpgsql
set search_path = ''
as $$
declare
  v_from     text;
  v_allowed  text[];
begin
  select status into v_from from public.orders where id = p_order_id for update;
  if v_from is null then
    raise exception 'ORDER_NOT_FOUND';
  end if;
  if v_from = p_status then
    return v_from;
  end if;

  v_allowed := case v_from
    when 'awaiting_payment'     then array['paid', 'rejected']
    when 'paid'                 then array['ordered', 'rejected', 'awaiting_payment']
    when 'ordered'              then array['ready_for_collection', 'paid']
    when 'ready_for_collection' then array['delivered', 'ordered']
    when 'delivered'            then array['ready_for_collection']
    when 'rejected'             then array['awaiting_payment']
    else array[]::text[]
  end;
  if not (p_status = any (v_allowed)) then
    raise exception 'INVALID_TRANSITION from % to %', v_from, p_status;
  end if;

  update public.orders set
    status       = p_status,
    paid_at      = case when p_status = 'paid' and v_from = 'awaiting_payment' then now()
                        when p_status = 'awaiting_payment' then null else paid_at end,
    ordered_at   = case when p_status = 'ordered' and v_from = 'paid' then now()
                        when p_status = 'paid' then null else ordered_at end,
    ready_at     = case when p_status = 'ready_for_collection' and v_from = 'ordered' then now()
                        when p_status = 'ordered' then null else ready_at end,
    delivered_at = case when p_status = 'delivered' then now()
                        when v_from = 'delivered' then null else delivered_at end,
    rejected_at  = case when p_status = 'rejected' then now()
                        when v_from = 'rejected' then null else rejected_at end,
    status_note  = case when p_status = 'rejected' then nullif(trim(p_note), '') else null end
  where id = p_order_id;

  insert into public.order_status_log (order_id, from_status, to_status, note, changed_by)
  values (p_order_id, v_from, p_status, nullif(trim(p_note), ''), p_admin_id);

  return p_status;
end;
$$;

revoke execute on function public.set_order_status(uuid, text, uuid, text) from public, anon, authenticated;
grant  execute on function public.set_order_status(uuid, text, uuid, text) to service_role;
