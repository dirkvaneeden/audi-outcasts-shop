'use client';

import { useActionState, useState, startTransition } from 'react';
import type { BankDetails } from '@/lib/types';
import { ACCOUNT_TYPES, SA_BANKS, groupDigits } from '@/lib/banks';
import { saveBankDetails, type BankFormState } from '@/app/admin/banking/actions';

export function BankDetailsForm({ bank }: { bank: BankDetails | null }) {
  const [state, formAction, pending] = useActionState<BankFormState, FormData>(saveBankDetails, {});
  const [bankName, setBankName] = useState(bank?.bank_name ?? '');
  const [branchCode, setBranchCode] = useState(bank?.branch_code ?? '');
  const [accountNumber, setAccountNumber] = useState(bank?.account_number ?? '');

  // Choosing a known bank fills in its universal branch code
  function onBankChange(value: string) {
    setBankName(value);
    const match = SA_BANKS.find((b) => b.name.toLowerCase() === value.trim().toLowerCase());
    if (match) setBranchCode(match.branchCode);
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => formAction(fd));   // no automatic form reset
  }

  const err = state.fieldErrors ?? {};
  const digits = accountNumber.replace(/\D/g, '');

  return (
    <form onSubmit={onSubmit} noValidate>
      <div className="page-body">
        {state.message && (
          <div className={`message-strip ${state.saved ? 'message-strip--success' : 'message-strip--error'}`}
            role={state.saved ? 'status' : 'alert'}>
            {state.message}
          </div>
        )}

        <section className="panel form-group" aria-labelledby="sec-account">
          <h2 id="sec-account" className="form-group__title">Bank Account</h2>

          <div className="form-row">
            <label htmlFor="account_holder" className="form-label form-label--required">Account Holder</label>
            <div className="form-field">
              <input id="account_holder" name="account_holder" className="input" maxLength={100}
                defaultValue={bank?.account_holder ?? ''} aria-invalid={!!err.account_holder} />
              {err.account_holder && <p className="field-error">{err.account_holder}</p>}
            </div>
          </div>

          <div className="form-row">
            <label htmlFor="bank_name" className="form-label form-label--required">Bank</label>
            <div className="form-field">
              <input id="bank_name" name="bank_name" className="input" list="sa-banks" maxLength={60}
                value={bankName} onChange={(e) => onBankChange(e.target.value)} aria-invalid={!!err.bank_name}
                autoComplete="off" />
              <datalist id="sa-banks">
                {SA_BANKS.map((b) => <option key={b.name} value={b.name} />)}
              </datalist>
              <p className="hint">Pick from the list or type another bank.</p>
              {err.bank_name && <p className="field-error">{err.bank_name}</p>}
            </div>
          </div>

          <div className="form-row">
            <label htmlFor="branch_name" className="form-label">Branch Name</label>
            <div className="form-field">
              <input id="branch_name" name="branch_name" className="input" maxLength={60}
                defaultValue={bank?.branch_name ?? ''} />
            </div>
          </div>

          <div className="form-row">
            <label htmlFor="branch_code" className="form-label form-label--required">Branch Code</label>
            <div className="form-field">
              <input id="branch_code" name="branch_code" className="input input--short" inputMode="numeric"
                maxLength={7} value={branchCode} onChange={(e) => setBranchCode(e.target.value)}
                aria-invalid={!!err.branch_code} />
              <p className="hint">Filled in with the bank’s universal branch code. Check it against your bank’s confirmation letter.</p>
              {err.branch_code && <p className="field-error">{err.branch_code}</p>}
            </div>
          </div>

          <div className="form-row">
            <label htmlFor="account_number" className="form-label form-label--required">Account Number</label>
            <div className="form-field">
              <input id="account_number" name="account_number" className="input input--medium" inputMode="numeric"
                maxLength={20} value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)}
                aria-invalid={!!err.account_number} />
              {digits.length >= 6 && <p className="hint">Shown to members as {groupDigits(digits)}</p>}
              {err.account_number && <p className="field-error">{err.account_number}</p>}
            </div>
          </div>

          <div className="form-row">
            <label htmlFor="account_type" className="form-label form-label--required">Account Type</label>
            <div className="form-field">
              <select id="account_type" name="account_type" className="input input--medium"
                defaultValue={bank?.account_type ?? ''} aria-invalid={!!err.account_type}>
                <option value="" disabled>Select…</option>
                {ACCOUNT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              {err.account_type && <p className="field-error">{err.account_type}</p>}
            </div>
          </div>

          <div className="form-row">
            <label htmlFor="swift_code" className="form-label">SWIFT Code</label>
            <div className="form-field">
              <input id="swift_code" name="swift_code" className="input input--short" maxLength={11}
                defaultValue={bank?.swift_code ?? ''} aria-invalid={!!err.swift_code}
                style={{ textTransform: 'uppercase' }} />
              <p className="hint">Only needed for payments from outside South Africa.</p>
              {err.swift_code && <p className="field-error">{err.swift_code}</p>}
            </div>
          </div>
        </section>

        <section className="panel form-group" aria-labelledby="sec-payment">
          <h2 id="sec-payment" className="form-group__title">Payment Instructions</h2>

          <div className="form-row">
            <label htmlFor="pop_email" className="form-label">Proof of Payment Email</label>
            <div className="form-field">
              <input id="pop_email" name="pop_email" type="email" className="input" inputMode="email"
                defaultValue={bank?.pop_email ?? ''} aria-invalid={!!err.pop_email} />
              <p className="hint">Members are asked to send proof of payment here. Replies to order emails also go here.</p>
              {err.pop_email && <p className="field-error">{err.pop_email}</p>}
            </div>
          </div>

          <div className="form-row">
            <label htmlFor="payment_instructions" className="form-label">Extra Instructions</label>
            <div className="form-field">
              <textarea id="payment_instructions" name="payment_instructions" className="input textarea" rows={3}
                maxLength={500} defaultValue={bank?.payment_instructions ?? ''}
                placeholder="e.g. Orders are held for 7 days. Collect at the next club meet." />
            </div>
          </div>

          <p className="hint">The payment reference is always the order number, e.g. ORD100001.</p>
        </section>
      </div>

      <footer className="footer-bar">
        <span className="toolbar__spacer" />
        <button type="submit" className="btn btn--emphasized" disabled={pending}>
          {pending ? 'Saving…' : 'Save'}
        </button>
      </footer>
    </form>
  );
}
