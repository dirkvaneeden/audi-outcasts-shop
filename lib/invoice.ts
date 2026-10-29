import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/server';
import type { Order, OrderLine } from '@/lib/types';

/** Orders get an invoice once payment has been received. */
export const INVOICE_STATUSES = ['paid', 'ordered', 'ready_for_collection', 'delivered'] as const;
export const hasInvoice = (status: string) => (INVOICE_STATUSES as readonly string[]).includes(status);

/** ORD100001 -> INV100001: the invoice number follows the order number. */
export const invoiceNumber = (orderNumber: string) => orderNumber.replace(/^ORD/, 'INV');

export type InvoiceData = {
  order: Order & { paid_at: string | null };
  lines: OrderLine[];
  member: { name: string; member_number: string; email: string; phone: string | null };
};

/**
 * Loads an order for its invoice. Pass memberId to restrict it to that member's
 * own orders (member pages); pass null for admins.
 */
export async function getInvoice(orderNumber: string, memberId: string | null): Promise<InvoiceData | null> {
  let query = supabaseAdmin()
    .from('orders')
    .select(`id, order_number, status, item_count, total, bank_details, email_sent_at, email_error,
      created_at, paid_at,
      member:members (name, member_number, email, phone),
      order_lines (line_no, item_id, name, image_url, unit_price, quantity, line_total,
        size, colour, note, regular_price, discount_percent)`)
    .eq('order_number', orderNumber);
  if (memberId) query = query.eq('member_id', memberId);

  const { data } = await query.maybeSingle();
  if (!data) return null;

  const { member, order_lines, ...rest } = data as unknown as Record<string, unknown> & {
    member: InvoiceData['member'];
    order_lines: Record<string, unknown>[];
  };

  const lines = (order_lines ?? [])
    .map((l) => ({
      ...(l as unknown as OrderLine),
      unit_price: Number(l.unit_price),
      quantity: Number(l.quantity),
      line_total: Number(l.line_total),
      regular_price: l.regular_price == null ? null : Number(l.regular_price),
      discount_percent: Number(l.discount_percent ?? 0),
    }))
    .sort((a, b) => a.line_no - b.line_no);

  return {
    order: { ...(rest as unknown as InvoiceData['order']), total: Number(rest.total), item_count: Number(rest.item_count) },
    lines,
    member,
  };
}
