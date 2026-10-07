'use server';

import { revalidatePath } from 'next/cache';
import { requireMember } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { NOTE_MAX } from '@/lib/line-options';

export type CartResult = { error?: string };
export type AddToCartInput = { quantity: number; size: string; colour: string; note: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function refresh() {
  // Updates the store, the cart page and the cart count in the shell bar
  revalidatePath('/', 'layout');
}

export async function addToCart(itemId: string, input: AddToCartInput): Promise<CartResult> {
  const member = await requireMember();
  if (!UUID_RE.test(itemId)) return { error: 'This item could not be found.' };

  const quantity = Number(input.quantity);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
    return { error: 'Choose a quantity from 1 to 99.' };
  }
  const note = String(input.note ?? '').trim();
  if (note.length > NOTE_MAX) return { error: `Keep the note to ${NOTE_MAX} characters.` };

  // The database checks that the size and colour are available for this item
  const { error } = await supabaseAdmin().rpc('add_to_cart', {
    p_member_id: member.id,
    p_item_id: itemId,
    p_quantity: quantity,
    p_size: String(input.size ?? ''),
    p_colour: String(input.colour ?? ''),
    p_note: note,
  });

  if (error) {
    const m = error.message;
    if (m.includes('ITEM_NOT_AVAILABLE')) return { error: 'This item is no longer available.' };
    if (m.includes('SIZE_REQUIRED')) return { error: 'Choose a size.' };
    if (m.includes('COLOUR_REQUIRED')) return { error: 'Choose a colour.' };
    return { error: `The item could not be added: ${m}` };
  }
  refresh();
  return {};
}

/** Sets the quantity of one cart line. 0 removes it. */
export async function setCartQuantity(lineId: string, quantity: number): Promise<CartResult> {
  const member = await requireMember();
  if (!UUID_RE.test(lineId)) return { error: 'This cart line could not be found.' };
  if (!Number.isInteger(quantity) || quantity < 0 || quantity > 99) {
    return { error: 'Choose a quantity from 1 to 99.' };
  }

  const table = supabaseAdmin().from('cart_items');
  const { error } = quantity === 0
    ? await table.delete().eq('member_id', member.id).eq('id', lineId)
    : await table.update({ quantity, updated_at: new Date().toISOString() })
        .eq('member_id', member.id).eq('id', lineId);

  if (error) return { error: `The cart could not be updated: ${error.message}` };
  refresh();
  return {};
}
