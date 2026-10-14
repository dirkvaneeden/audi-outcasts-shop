'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/server';

export type PromotionFormState = {
  message?: string;
  fieldErrors?: Partial<Record<'item_id' | 'title' | 'message' | 'starts_on' | 'ends_on', string>>;
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function readForm(formData: FormData) {
  const fieldErrors: NonNullable<PromotionFormState['fieldErrors']> = {};
  const item_id = String(formData.get('item_id') ?? '');
  const title = String(formData.get('title') ?? '').trim();
  const message = String(formData.get('message') ?? '').trim();
  const starts_on = String(formData.get('starts_on') ?? '');
  const ends_on = String(formData.get('ends_on') ?? '');
  const is_active = formData.get('is_active') === 'on';

  if (!UUID_RE.test(item_id)) {
    fieldErrors.item_id = 'Choose the item to promote.';
  } else {
    // The item must exist and not be marked for deletion
    const { data } = await supabaseAdmin().from('items_active').select('id').eq('id', item_id).maybeSingle();
    if (!data) fieldErrors.item_id = 'This item is no longer available. Choose another one.';
  }
  if (title.length < 2 || title.length > 80) fieldErrors.title = 'Enter a title of 2 to 80 characters.';
  if (!message || message.length > 1000) fieldErrors.message = 'Enter the message members will see (up to 1000 characters).';
  if (!DATE_RE.test(starts_on)) fieldErrors.starts_on = 'Choose a start date.';
  if (!DATE_RE.test(ends_on)) fieldErrors.ends_on = 'Choose an end date.';
  else if (DATE_RE.test(starts_on) && ends_on < starts_on) fieldErrors.ends_on = 'The end date can’t be before the start date.';

  return { fieldErrors, values: { item_id, title, message, starts_on, ends_on, is_active } };
}

export async function createPromotion(_prev: PromotionFormState, formData: FormData): Promise<PromotionFormState> {
  const admin = await requireAdmin();
  const { fieldErrors, values } = await readForm(formData);
  if (Object.keys(fieldErrors).length) return { fieldErrors, message: 'Check the highlighted fields and save again.' };

  const { error } = await supabaseAdmin().from('promotions').insert({ ...values, created_by: admin.id });
  if (error) return { message: `The promotion could not be saved: ${error.message}` };

  revalidatePath('/admin/promotions');
  revalidatePath('/');
  redirect('/admin/promotions?msg=created');
}

export async function updatePromotion(id: string, _prev: PromotionFormState, formData: FormData): Promise<PromotionFormState> {
  await requireAdmin();
  if (!UUID_RE.test(id)) return { message: 'Promotion not found.' };
  const { fieldErrors, values } = await readForm(formData);
  if (Object.keys(fieldErrors).length) return { fieldErrors, message: 'Check the highlighted fields and save again.' };

  const markDeleted = formData.get('is_deleted') === 'on';
  const { error } = await supabaseAdmin()
    .from('promotions')
    .update({ ...values, is_deleted: markDeleted })
    .eq('id', id)
    .eq('is_deleted', false);
  if (error) return { message: `The promotion could not be saved: ${error.message}` };

  revalidatePath('/admin/promotions');
  revalidatePath('/');
  redirect(`/admin/promotions?msg=${markDeleted ? 'deleted' : 'saved'}`);
}

/** Lets admins show a promotion to everyone again, e.g. after changing the message. */
export async function resetPromotionResponses(id: string): Promise<{ error?: string; info?: string }> {
  await requireAdmin();
  if (!UUID_RE.test(id)) return { error: 'Promotion not found.' };
  const { error } = await supabaseAdmin().from('promotion_responses').delete().eq('promotion_id', id);
  if (error) return { error: error.message };
  revalidatePath(`/admin/promotions/${id}`);
  revalidatePath('/admin/promotions');
  return { info: 'Done. The pop-up will show again to every member while the promotion is running.' };
}
