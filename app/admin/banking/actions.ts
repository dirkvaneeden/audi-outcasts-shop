'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { ACCOUNT_TYPES } from '@/lib/banks';

type Field = 'account_holder' | 'bank_name' | 'branch_code' | 'account_number' | 'account_type' | 'swift_code' | 'pop_email';

export type BankFormState = {
  message?: string;
  saved?: boolean;
  fieldErrors?: Partial<Record<Field, string>>;
};

const text = (fd: FormData, key: string) => String(fd.get(key) ?? '').trim();

export async function saveBankDetails(_prev: BankFormState, formData: FormData): Promise<BankFormState> {
  const admin = await requireAdmin();
  const fieldErrors: BankFormState['fieldErrors'] = {};

  const account_holder = text(formData, 'account_holder');
  const bank_name = text(formData, 'bank_name');
  const branch_name = text(formData, 'branch_name') || null;
  const branch_code = text(formData, 'branch_code').replace(/[\s-]/g, '');
  const account_number = text(formData, 'account_number').replace(/[\s-]/g, '');
  const account_type = text(formData, 'account_type');
  const swift_code = text(formData, 'swift_code').replace(/\s/g, '').toUpperCase() || null;
  const pop_email = text(formData, 'pop_email').toLowerCase() || null;
  const payment_instructions = text(formData, 'payment_instructions') || null;

  if (account_holder.length < 2) fieldErrors.account_holder = 'Enter the name the account is registered in.';
  if (bank_name.length < 2) fieldErrors.bank_name = 'Choose or enter the bank.';
  if (!/^\d{6}$/.test(branch_code)) fieldErrors.branch_code = 'A branch code has 6 digits, e.g. 250655.';
  if (!/^\d{6,16}$/.test(account_number)) fieldErrors.account_number = 'Use digits only (6 to 16), no spaces needed.';
  if (!(ACCOUNT_TYPES as readonly string[]).includes(account_type)) fieldErrors.account_type = 'Choose an account type.';
  if (swift_code && !/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(swift_code))
    fieldErrors.swift_code = 'A SWIFT code has 8 or 11 characters, e.g. FIRNZAJJ.';
  if (pop_email && !/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(pop_email))
    fieldErrors.pop_email = 'Enter a valid email address.';

  if (Object.keys(fieldErrors).length) {
    return { fieldErrors, message: 'Check the highlighted fields and save again.' };
  }

  const { error } = await supabaseAdmin().from('bank_details').upsert({
    id: true,
    account_holder, bank_name, branch_name, branch_code, account_number,
    account_type, swift_code, pop_email, payment_instructions,
    updated_by: admin.id,
  });

  if (error) return { message: `The banking details could not be saved: ${error.message}` };

  revalidatePath('/admin/banking');
  return { saved: true, message: 'Banking details saved. New orders will use these details.' };
}
