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

export type SupplierChoice = 'all' | 'none' | string;   // 'none' = items without a supplier
export type ListRecipient = 'me' | 'supplier' | 'supplier_cc_me';

/**
 * Builds the supplier list (paid and ordered, not delivered) for one supplier
 * or for everything, and emails it to the admin or straight to the supplier.
 */
export async function sendSupplierList(supplierChoice: SupplierChoice, recipient: ListRecipient): Promise<AdminActionResult> {
  const admin = await requireAdmin();
  try {
    const { data: suppliers } = await supabaseAdmin()
      .from('suppliers_active').select('id, name, contact_person, email');
    const active = new Map((suppliers ?? []).map((s) => [s.id as string, s]));

    type SupplierRow = { id: string; name: string; contact_person: string | null; email: string | null };
    let supplier: SupplierRow | null = null;
    if (supplierChoice !== 'all' && supplierChoice !== 'none') {
      supplier = (active.get(supplierChoice) as SupplierRow | undefined) ?? null;
      if (!supplier) return { error: 'This supplier no longer exists.' };
    }
    if (recipient !== 'me' && !supplier) return { error: 'Choose one supplier to send the list to the supplier.' };
    if (recipient !== 'me' && !supplier!.email) {
      return { error: `${supplier!.name} has no email address. Add one under Suppliers, or send the list to yourself.` };
    }

    // Keep only the lines for the chosen supplier; drop orders left with no lines
    const lineSupplier = (id: string | null | undefined) => (id && active.has(id) ? id : null);
    const open = (await getOpenOrders())
      .map(({ order, lines }) => ({
        order,
        lines: supplierChoice === 'all' ? lines
          : lines.filter((l) => lineSupplier(l.supplier_id) === (supplierChoice === 'none' ? null : supplierChoice)),
      }))
      .filter((o) => o.lines.length > 0);

    const label = supplier ? supplier.name : supplierChoice === 'none' ? 'items without a supplier' : 'all suppliers';
    if (!open.length) return { info: `Nothing paid or ordered is waiting for ${label}, so no email was sent.` };

    const email = buildOpenOrdersEmail(open, { name: admin.name, email: admin.email }, supplier);
    const to = recipient === 'me' ? admin.email : supplier!.email!;
    await sendEmail({ to, cc: recipient === 'supplier_cc_me' ? admin.email : null, replyTo: admin.email, ...email });

    revalidatePath('/admin/orders', 'layout');
    const orders = `${open.length} ${open.length === 1 ? 'order' : 'orders'}`;
    return {
      info: recipient === 'me'
        ? `List for ${label} (${orders}) sent to you at ${admin.email}.`
        : `List for ${label} (${orders}) sent to ${to}${recipient === 'supplier_cc_me' ? `, with a copy to ${admin.email}` : ''}.`,
    };
  } catch (e) {
    return { error: `The supplier list could not be sent: ${(e as Error).message}` };
  }
}

/** Earlier "Email Me Supplier List" button: everything, to the admin. */
export async function emailOpenOrdersSummary(): Promise<AdminActionResult> {
  return sendSupplierList('all', 'me');
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
