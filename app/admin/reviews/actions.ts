'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/server';

/** Hides (deletion indicator) or restores a review on the store. */
export async function setReviewHidden(id: string, hidden: boolean): Promise<{ error?: string }> {
  await requireAdmin();
  const { data, error } = await supabaseAdmin().from('reviews').update({ is_deleted: hidden }).eq('id', id).select('item_id').maybeSingle();
  if (error) return { error: error.message };
  revalidatePath('/admin/reviews');
  revalidatePath('/');
  if (data?.item_id) revalidatePath(`/products/${data.item_id}`);
  return {};
}
