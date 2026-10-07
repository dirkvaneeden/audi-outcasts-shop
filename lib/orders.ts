import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/server';
import { buildOrderEmail } from '@/lib/email/order-email';
import { sendEmail } from '@/lib/email/send';
import type { Order, OrderLine } from '@/lib/types';

const ORDER_COLUMNS = 'id, order_number, status, item_count, total, bank_details, email_sent_at, email_error, created_at';

function toOrder(row: Record<string, unknown>): Order {
  return { ...(row as Order), total: Number(row.total), item_count: Number(row.item_count) };
}

function toLines(rows: Record<string, unknown>[] | null): OrderLine[] {
  return (rows ?? [])
    .map((l) => ({
      ...(l as OrderLine),
      unit_price: Number(l.unit_price),
      quantity: Number(l.quantity),
      line_total: Number(l.line_total),
    }))
    .sort((a, b) => a.line_no - b.line_no);
}

/** The member's orders, newest first. */
export async function listOrders(memberId: string) {
  const { data, error } = await supabaseAdmin()
    .from('orders')
    .select(ORDER_COLUMNS)
    .eq('member_id', memberId)
    .order('created_at', { ascending: false });
  return { orders: (data ?? []).map(toOrder), error: error?.message };
}

/** One order with its lines, only if it belongs to the member. */
export async function getOrder(orderNumber: string, memberId: string) {
  const { data, error } = await supabaseAdmin()
    .from('orders')
    .select(`${ORDER_COLUMNS}, order_lines (line_no, item_id, name, image_url, unit_price, quantity, line_total, size, colour, note)`)
    .eq('order_number', orderNumber)
    .eq('member_id', memberId)
    .maybeSingle();

  if (error || !data) return null;
  const { order_lines, ...order } = data as unknown as Record<string, unknown> & { order_lines: Record<string, unknown>[] };
  return { order: toOrder(order), lines: toLines(order_lines) };
}

/**
 * Emails the order summary and banking details to the member.
 * Never throws: the result is recorded on the order (email_sent_at / email_error).
 */
export async function sendOrderEmail(orderNumber: string): Promise<{ error?: string }> {
  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from('orders')
    .select(`${ORDER_COLUMNS}, member:members (name, nickname, email),
             order_lines (line_no, item_id, name, image_url, unit_price, quantity, line_total, size, colour, note)`)
    .eq('order_number', orderNumber)
    .maybeSingle();

  if (error || !data) return { error: error?.message ?? 'Order not found.' };

  const { member, order_lines, ...rest } = data as unknown as Record<string, unknown> & {
    member: { name: string; nickname: string | null; email: string };
    order_lines: Record<string, unknown>[];
  };
  const order = toOrder(rest);
  const lines = toLines(order_lines);

  try {
    const email = buildOrderEmail({ order, lines, member });
    await sendEmail({ to: member.email, ...email, replyTo: order.bank_details.pop_email });
    await supabase.from('orders')
      .update({ email_sent_at: new Date().toISOString(), email_error: null })
      .eq('id', order.id);
    return {};
  } catch (e) {
    const message = (e as Error).message;
    await supabase.from('orders').update({ email_error: message }).eq('id', order.id);
    return { error: message };
  }
}
