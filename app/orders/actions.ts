'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireMember } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { getOrder, sendOrderEmail } from '@/lib/orders';

export type OrderActionState = { error?: string; info?: string };

/** Turns the cart into an order, emails the member and opens the order page. */
export async function placeOrder(_prev: OrderActionState): Promise<OrderActionState> {
  const member = await requireMember();

  const { data: orderNumber, error } = await supabaseAdmin()
    .rpc('place_order', { p_member_id: member.id });

  if (error || !orderNumber) {
    const msg = error?.message ?? '';
    if (msg.includes('CART_EMPTY')) return { error: 'Your cart is empty, or its items are no longer available.' };
    if (msg.includes('BANK_DETAILS_MISSING')) return { error: 'Orders can’t be placed yet: the store’s banking details haven’t been set up. Contact the club admin.' };
    return { error: `The order could not be placed: ${msg}` };
  }

  // The order is saved even if the email fails; the order page offers a resend.
  await sendOrderEmail(orderNumber as string);

  revalidatePath('/', 'layout');
  redirect(`/orders/${orderNumber}?placed=1`);
}

export async function resendOrderEmail(orderNumber: string, _prev: OrderActionState): Promise<OrderActionState> {
  const member = await requireMember();
  if (!(await getOrder(orderNumber, member.id))) return { error: 'Order not found.' };

  const result = await sendOrderEmail(orderNumber);
  revalidatePath(`/orders/${orderNumber}`);
  return result.error
    ? { error: `The email could not be sent: ${result.error}` }
    : { info: `The email was sent to ${member.email}.` };
}
