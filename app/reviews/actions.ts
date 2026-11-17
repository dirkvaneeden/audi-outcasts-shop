'use server';

import { revalidatePath } from 'next/cache';
import { requireMember } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/server';

export type ReviewResult = { error?: string; done?: boolean };

/** Saves the member's review for one requested product. */
export async function submitReview(requestId: string, rating: number, comment: string, hideName: boolean): Promise<ReviewResult> {
  const member = await requireMember();
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { error: 'Choose 1 to 5 stars.' };
  const text = String(comment ?? '').trim();
  if (text.length < 3) return { error: 'Write a few words about the product.' };
  if (text.length > 1000) return { error: 'Keep the description to 1000 characters.' };

  const supabase = supabaseAdmin();
  const { data: req } = await supabase.from('review_requests')
    .select('id, order_id, item_id, completed_at')
    .eq('id', requestId).eq('member_id', member.id).maybeSingle();    // only the member's own requests
  if (!req) return { error: 'This review request was not found.' };
  if (req.completed_at) return { error: 'You have already reviewed this product. Thank you!' };

  const { error } = await supabase.from('reviews').insert({
    request_id: req.id, item_id: req.item_id, order_id: req.order_id, member_id: member.id,
    rating, comment: text, hide_name: !!hideName,
  });
  if (error) return { error: `Your review could not be saved: ${error.message}` };

  await supabase.from('review_requests').update({ completed_at: new Date().toISOString() }).eq('id', req.id);
  revalidatePath('/reviews');
  revalidatePath('/');
  revalidatePath(`/products/${req.item_id}`);
  return { done: true };
}
