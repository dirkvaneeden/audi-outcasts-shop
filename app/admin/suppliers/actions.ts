'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/server';

export type SupplierFormState = {
  message?: string;
  fieldErrors?: Partial<Record<'name' | 'email', string>>;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const text = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim() || null;

function readForm(fd: FormData) {
  const fieldErrors: NonNullable<SupplierFormState['fieldErrors']> = {};
  const values = {
    name: text(fd, 'name') ?? '',
    contact_person: text(fd, 'contact_person'),
    email: text(fd, 'email')?.toLowerCase() ?? null,
    phone: text(fd, 'phone'),
    notes: text(fd, 'notes'),
  };
  if (values.name.length < 2 || values.name.length > 100) fieldErrors.name = 'Enter the supplier’s name.';
  if (values.email && !EMAIL_RE.test(values.email)) fieldErrors.email = 'Enter a valid email address.';
  return { fieldErrors, values };
}

export async function createSupplier(_prev: SupplierFormState, fd: FormData): Promise<SupplierFormState> {
  await requireAdmin();
  const { fieldErrors, values } = readForm(fd);
  if (Object.keys(fieldErrors).length) return { fieldErrors, message: 'Check the highlighted fields and save again.' };
  const { error } = await supabaseAdmin().from('suppliers').insert(values);
  if (error) return { message: `The supplier could not be saved: ${error.message}` };
  revalidatePath('/admin/suppliers');
  redirect('/admin/suppliers?msg=created');
}

export async function updateSupplier(id: string, _prev: SupplierFormState, fd: FormData): Promise<SupplierFormState> {
  await requireAdmin();
  if (!UUID_RE.test(id)) return { message: 'Supplier not found.' };
  const { fieldErrors, values } = readForm(fd);
  if (Object.keys(fieldErrors).length) return { fieldErrors, message: 'Check the highlighted fields and save again.' };
  const markDeleted = fd.get('is_deleted') === 'on';
  const { error } = await supabaseAdmin()
    .from('suppliers').update({ ...values, is_deleted: markDeleted }).eq('id', id).eq('is_deleted', false);
  if (error) return { message: `The supplier could not be saved: ${error.message}` };
  revalidatePath('/admin/suppliers');
  revalidatePath('/items');
  redirect(`/admin/suppliers?msg=${markDeleted ? 'deleted' : 'saved'}`);
}
