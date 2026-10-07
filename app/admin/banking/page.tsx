import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase/server';
import { formatDateTime } from '@/lib/format';
import type { BankDetails } from '@/lib/types';
import { BankDetailsForm } from '@/components/BankDetailsForm';

export const dynamic = 'force-dynamic';

export default async function BankingPage() {
  const { data, error } = await supabaseAdmin()
    .from('bank_details')
    .select('*, editor:members (name)')
    .eq('id', true)
    .maybeSingle();

  const bank = (data ?? null) as (BankDetails & { updated_at: string; editor: { name: string } | null }) | null;

  return (
    <>
      <div className="page-header">
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          <Link href="/" className="breadcrumbs__link">Store</Link>
        </nav>
        <h1 className="page-header__title">Banking Details</h1>
        <p className="page-header__subtitle">
          {bank
            ? `Last changed ${formatDateTime(bank.updated_at)}${bank.editor ? ` by ${bank.editor.name}` : ''}`
            : 'Not set up yet: members can’t place orders until these are saved.'}
        </p>
      </div>
      {error && (
        <div className="page-body">
          <div className="message-strip message-strip--error" role="alert">
            The banking details could not be loaded: {error.message}
          </div>
        </div>
      )}
      <BankDetailsForm bank={bank} />
    </>
  );
}
