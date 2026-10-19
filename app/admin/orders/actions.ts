'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { getOpenOrders } from '@/lib/admin-orders';
import { sendOrderEmail } from '@/lib/orders';
import { buildOpenOrdersEmail } from '@/lib/email/open-orders-email';
import { sendEmail } from '@/lib/email/send';
import { ORDER_STATUS_LABEL, type OrderStatus } from '@/lib/order-status';

export type AdminActionResult = { error?: string; info?: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Changes the status of one or more orders. Each order is checked by the database. */
export async function setOrderStatus(orderIds: string[], status: OrderStatus, note?: string): Promise<AdminActionResult> {
  const admin = await requireAdmin();
  if (!(status in ORDER_STATUS_LABEL)) return { error: 'Unknown status.' };
  const ids = orderIds.filter((id) => UUID_RE.test(id)).slice(0, 200);
  if (!ids.length) return { error: 'Select at least one order.' };

  const supabase = supabaseAdmin();
  const failed: string[] = [];
  for (const id of ids) {
    const { error } = await supabase.rpc('set_order_status', {
      p_order_id: id, p_status: status, p_admin_id: admin.id, p_note: note?.trim() || null,
    });
    if (error) failed.push(error.message.replace(/^INVALID_TRANSITION /, ''));
  }

  revalidatePath('/admin/orders', 'layout');
  revalidatePath('/orders', 'layout');

  const done = ids.length - failed.length;
  const label = ORDER_STATUS_LABEL[status];
  if (failed.length) {
    return { error: `${done} of ${ids.length} updated. The rest could not change to ${label}: ${failed[0]}` };
  }
  return { info: done === 1 ? `Order updated to ${label}.` : `${done} orders updated to ${label}.` };
}

/** Emails the signed-in admin a supplier list of all paid and ordered (not delivered) orders. */
export async function emailOpenOrdersSummary(): Promise<AdminActionResult> {
  const admin = await requireAdmin();
  try {
    const open = await getOpenOrders();
    if (!open.length) return { info: 'There are no paid or ordered orders waiting for delivery, so no email was sent.' };
    // Sent to the admin, ready to forward to the supplier. Replies go to the admin.
    const email = buildOpenOrdersEmail(open, { name: admin.name, email: admin.email });
    await sendEmail({ to: admin.email, replyTo: admin.email, ...email });
    return { info: `Supplier list for ${open.length} ${open.length === 1 ? 'order' : 'orders'} sent to ${admin.email}. Forward it to the supplier.` };
  } catch (e) {
    return { error: `The summary could not be sent: ${(e as Error).message}` };
  }
}

/** Emails a payment reminder for each selected unpaid order. */
export async function sendPaymentReminders(orderIds: string[]): Promise<AdminActionResult> {
  await requireAdmin();
  const ids = orderIds.filter((id) => UUID_RE.test(id)).slice(0, 100);
  if (!ids.length) return { error: 'Select at least one order.' };

  const { data, error } = await supabaseAdmin()
    .from('orders').select('order_number, status').in('id', ids);
  if (error) return { error: error.message };

  const unpaid = (data ?? []).filter((o) => o.status === 'awaiting_payment');
  const skipped = (data ?? []).length - unpaid.length;
  const failed: string[] = [];
  for (const o of unpaid) {
    const r = await sendOrderEmail(o.order_number as string, 'reminder');
    if (r.error) failed.push(`${o.order_number}: ${r.error}`);
  }

  revalidatePath('/admin/orders', 'layout');
  const sent = unpaid.length - failed.length;
  const parts = [`${sent} payment ${sent === 1 ? 'reminder' : 'reminders'} sent.`];
  if (skipped) parts.push(`${skipped} skipped because ${skipped === 1 ? 'it is' : 'they are'} not unpaid.`);
  if (failed.length) return { error: `${parts.join(' ')} Failed: ${failed[0]}${failed.length > 1 ? ` (and ${failed.length - 1} more)` : ''}` };
  return { info: parts.join(' ') };
}
