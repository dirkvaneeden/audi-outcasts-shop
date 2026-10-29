import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/server';
import type { AdminOrder, OrderLine, OrderStatusLogEntry } from '@/lib/types';
import type { OrderStatus } from '@/lib/order-status';

const COLUMNS = `id, order_number, status, item_count, total, bank_details, email_sent_at, email_error,
  created_at, paid_at, ordered_at, delivered_at, rejected_at, status_note, reminder_count, last_reminder_at,
  ready_at, collection_contact, collection_email_sent_at, collection_email_error,
  member:members (member_number, name, nickname, email, phone)`;
const LINE_COLUMNS = 'line_no, item_id, name, image_url, unit_price, quantity, line_total, size, colour, note, unit_cost, regular_price, discount_percent';

function toOrder(row: Record<string, unknown>): AdminOrder {
  return { ...(row as unknown as AdminOrder), total: Number(row.total), item_count: Number(row.item_count) };
}

function toLines(rows: Record<string, unknown>[] | null | undefined): OrderLine[] {
  return (rows ?? [])
    .map((l) => ({
      ...(l as unknown as OrderLine),
      unit_price: Number(l.unit_price),
      quantity: Number(l.quantity),
      line_total: Number(l.line_total),
      unit_cost: l.unit_cost == null ? null : Number(l.unit_cost),
      regular_price: l.regular_price == null ? null : Number(l.regular_price),
      discount_percent: Number(l.discount_percent ?? 0),
    }))
    .sort((a, b) => a.line_no - b.line_no);
}

/** Orders for one status tab. Work queues are oldest first; "all" is newest first. */
export async function listAdminOrders(status: OrderStatus | 'all') {
  let query = supabaseAdmin().from('orders').select(COLUMNS);
  query = status === 'all'
    ? query.order('created_at', { ascending: false }).limit(500)
    : query.eq('status', status).order('created_at', { ascending: true });

  const { data, error } = await query;
  return { orders: (data ?? []).map((r) => toOrder(r as Record<string, unknown>)), error: error?.message };
}

/** Number of orders per status, for the tab counters. */
export async function orderStatusCounts() {
  const { data } = await supabaseAdmin().from('orders').select('status');
  const counts: Record<string, number> = { all: 0 };
  for (const row of data ?? []) {
    counts[row.status] = (counts[row.status] ?? 0) + 1;
    counts.all += 1;
  }
  return counts;
}

/** One order with lines and status history. */
export async function getAdminOrder(orderNumber: string) {
  const { data, error } = await supabaseAdmin()
    .from('orders')
    .select(`${COLUMNS}, order_lines (${LINE_COLUMNS}),
      order_status_log (from_status, to_status, note, changed_at, changer:members (name))`)
    .eq('order_number', orderNumber)
    .maybeSingle();

  if (error || !data) return null;
  const { order_lines, order_status_log, ...rest } = data as unknown as Record<string, unknown> & {
    order_lines: Record<string, unknown>[];
    order_status_log: OrderStatusLogEntry[];
  };
  const log = [...(order_status_log ?? [])].sort((a, b) => a.changed_at.localeCompare(b.changed_at));
  return { order: toOrder(rest), lines: toLines(order_lines), log };
}

/** Paid and ordered orders (not delivered yet), with their lines, for the summary email. */
export async function getOpenOrders() {
  const { data, error } = await supabaseAdmin()
    .from('orders')
    .select(`${COLUMNS}, order_lines (${LINE_COLUMNS}, item:items (supplier_id))`)
    .in('status', ['paid', 'ordered'])      // never delivered, rejected or unpaid
    .is('delivered_at', null)
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? [])
    .map((row) => {
      const { order_lines, ...rest } = row as unknown as Record<string, unknown> & { order_lines: Record<string, unknown>[] };
      // Each line carries its item's current supplier
      const lines = toLines(order_lines).map((l) => {
        const { item, ...line } = l as typeof l & { item?: { supplier_id: string | null } | null };
        return { ...line, supplier_id: item?.supplier_id ?? null };
      });
      return { order: toOrder(rest), lines };
    })
    .filter(({ order }) => order.status === 'paid' || order.status === 'ordered');
}
