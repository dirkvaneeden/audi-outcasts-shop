import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email/send';
import { buildCollectionEmail } from '@/lib/email/collection-email';
import type { CollectionContact, OrderLine } from '@/lib/types';

/**
 * Emails the member that their order is ready for collection, with the admin to contact.
 * Saves the contact on the order (shown on the member's order page) and records the result.
 * Never throws.
 */
export async function sendCollectionEmail(orderId: string, contact: CollectionContact): Promise<{ error?: string; orderNumber?: string }> {
  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from('orders')
    .select(`order_number, status, member:members (name, nickname, email),
      order_lines (line_no, name, quantity, size, colour, note)`)
    .eq('id', orderId)
    .maybeSingle();
  if (error || !data) return { error: error?.message ?? 'Order not found.' };

  const { member, order_lines, order_number, status } = data as unknown as {
    order_number: string; status: string;
    member: { name: string; nickname: string | null; email: string };
    order_lines: OrderLine[];
  };
  if (status !== 'ready_for_collection') return { error: `${order_number} is not ready for collection.`, orderNumber: order_number };

  await supabase.from('orders').update({ collection_contact: contact }).eq('id', orderId);

  try {
    const lines = [...(order_lines ?? [])].sort((a, b) => a.line_no - b.line_no);
    const email = buildCollectionEmail({ orderNumber: order_number, lines, member, contact });
    await sendEmail({ to: member.email, replyTo: contact.email, ...email });
    await supabase.from('orders')
      .update({ collection_email_sent_at: new Date().toISOString(), collection_email_error: null })
      .eq('id', orderId);
    return { orderNumber: order_number };
  } catch (e) {
    const message = (e as Error).message;
    await supabase.from('orders').update({ collection_email_error: message }).eq('id', orderId);
    return { error: message, orderNumber: order_number };
  }
}
