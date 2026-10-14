'use server';

import { revalidatePath } from 'next/cache';
import { requireMember } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { getLivePromotionItem } from '@/lib/promotions';
import { addToCart, type AddToCartInput } from '@/app/cart/actions';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function record(promotionId: string, memberId: string, response: 'added' | 'ignored') {
  await supabaseAdmin().from('promotion_responses').upsert(
    { promotion_id: promotionId, member_id: memberId, response, responded_at: new Date().toISOString() },
    { onConflict: 'promotion_id,member_id' },
  );
}

/** Member chose "Ignore": the pop-up won't show again for this promotion. */
export async function ignorePromotion(promotionId: string): Promise<{ error?: string }> {
  const member = await requireMember();
  if (!UUID_RE.test(promotionId)) return { error: 'Promotion not found.' };
  await record(promotionId, member.id, 'ignored');
  revalidatePath('/');
  return {};
}

/** Member chose "Add to Cart" in the pop-up. */
export async function addPromotionToCart(promotionId: string, input: AddToCartInput): Promise<{ error?: string }> {
  const member = await requireMember();
  if (!UUID_RE.test(promotionId)) return { error: 'Promotion not found.' };

  const itemId = await getLivePromotionItem(promotionId);
  if (!itemId) return { error: 'Sorry, this promotion has ended.' };

  const result = await addToCart(itemId, input);   // same checks as the store (size, colour, note)
  if (result.error) return result;

  await record(promotionId, member.id, 'added');
  return {};
}
