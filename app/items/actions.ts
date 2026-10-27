'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { supabaseAdmin, ITEMS_TABLE, IMAGE_BUCKET } from '@/lib/supabase/server';
import { parseAmount, round } from '@/lib/pricing';
import { requireAdmin } from '@/lib/auth';
import { cleanOptions } from '@/lib/line-options';

export type FormState = {
  message?: string;
  fieldErrors?: Partial<Record<'name' | 'purchase_price' | 'markup_percent' | 'image', string>>;
};

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;   // Vercel accepts requests up to 4.5 MB
const IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

function readForm(formData: FormData) {
  const fieldErrors: NonNullable<FormState['fieldErrors']> = {};

  const name = String(formData.get('name') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim() || null;
  const purchase = parseAmount(formData.get('purchase_price'));
  const markup = parseAmount(formData.get('markup_percent'));

  if (!name) fieldErrors.name = 'Enter an item name.';
  else if (name.length > 120) fieldErrors.name = 'Use 120 characters or fewer.';

  if (!Number.isFinite(purchase) || purchase < 0)
    fieldErrors.purchase_price = 'Enter a purchase price of 0 or more.';

  if (!Number.isFinite(markup) || markup <= -100)
    fieldErrors.markup_percent = 'Enter a markup greater than -100 %.';

  const raw = formData.get('image');
  const file = raw instanceof File && raw.size > 0 ? raw : null;
  if (file) {
    if (!IMAGE_TYPES[file.type]) fieldErrors.image = 'Use a JPG, PNG, WebP or GIF image.';
    else if (file.size > MAX_IMAGE_BYTES) fieldErrors.image = 'Use an image of 4 MB or less.';
  }

  // Available options; members must pick one when an item has any
  const supplierRaw = String(formData.get('supplier_id') ?? '');
  const supplier_id = /^[0-9a-f-]{36}$/i.test(supplierRaw) ? supplierRaw : null;   // '' = no supplier
  const sizes = cleanOptions(formData.getAll('sizes').map(String), 20);
  const colours = cleanOptions(formData.getAll('colours').map(String), 30);

  return {
    fieldErrors,
    file,
    values: {
      name,
      description,
      sizes,
      colours,
      supplier_id,
      purchase_price: round(purchase, 2),
      markup_percent: round(markup, 4),
      // selling_price is calculated by the database trigger
    },
  };
}

async function uploadImage(file: File) {
  const supabase = supabaseAdmin();
  const path = `${crypto.randomUUID()}.${IMAGE_TYPES[file.type]}`;
  const { error } = await supabase.storage
    .from(IMAGE_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new Error(`Image upload failed: ${error.message}`);
  const { data } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path);
  return { image_path: path, image_url: data.publicUrl };
}

async function removeImage(path: string | null | undefined) {
  if (path) await supabaseAdmin().storage.from(IMAGE_BUCKET).remove([path]);
}

// ---------------------------------------------------------------------
export async function createItem(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const { fieldErrors, values, file } = readForm(formData);
  if (Object.keys(fieldErrors).length) {
    return { fieldErrors, message: 'Check the highlighted fields and save again.' };
  }

  let image: { image_path: string | null; image_url: string | null } = { image_path: null, image_url: null };
  if (file) {
    try {
      image = await uploadImage(file);
    } catch (e) {
      return { message: (e as Error).message };
    }
  }

  const { error } = await supabaseAdmin()
    .from(ITEMS_TABLE)
    .insert({ ...values, ...image, is_deleted: false });

  if (error) {
    await removeImage(image.image_path); // don't leave orphan files behind
    return { message: `The item could not be saved: ${error.message}` };
  }

  revalidatePath('/items');
  redirect('/items?msg=created');
}

// ---------------------------------------------------------------------
export async function updateItem(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const { fieldErrors, values, file } = readForm(formData);
  if (Object.keys(fieldErrors).length) {
    return { fieldErrors, message: 'Check the highlighted fields and save again.' };
  }

  const supabase = supabaseAdmin();
  const { data: current, error: readError } = await supabase
    .from(ITEMS_TABLE)
    .select('image_path')
    .eq('id', id)
    .eq('is_deleted', false)
    .maybeSingle();

  if (readError) return { message: `The item could not be loaded: ${readError.message}` };
  if (!current) return { message: 'This item no longer exists or was marked for deletion.' };

  const markDeleted = formData.get('is_deleted') === 'on';
  const dropImage = formData.get('remove_image') === 'on';

  let imagePatch: { image_path?: string | null; image_url?: string | null } = {};
  if (file) {
    try {
      imagePatch = await uploadImage(file);
    } catch (e) {
      return { message: (e as Error).message };
    }
  } else if (dropImage) {
    imagePatch = { image_path: null, image_url: null };
  }

  const { error } = await supabase
    .from(ITEMS_TABLE)
    .update({ ...values, ...imagePatch, is_deleted: markDeleted })
    .eq('id', id)
    .eq('is_deleted', false);

  if (error) {
    if (file) await removeImage(imagePatch.image_path);
    return { message: `The item could not be saved: ${error.message}` };
  }

  // Old image was replaced or removed -> clean it up from storage
  if (file || dropImage) await removeImage(current.image_path);

  revalidatePath('/items');
  revalidatePath(`/items/${id}`);
  redirect(`/items?msg=${markDeleted ? 'deleted' : 'saved'}`);
}

// ---------------------------------------------------------------------
/** Soft delete: sets the deletion indicator. The row and image are kept. */
export async function markItemDeleted(id: string): Promise<{ error?: string }> {
  await requireAdmin();
  const { error } = await supabaseAdmin()
    .from(ITEMS_TABLE)
    .update({ is_deleted: true })
    .eq('id', id);

  if (error) return { error: `The item could not be deleted: ${error.message}` };
  revalidatePath('/items');
  return {};
}
