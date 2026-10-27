'use client';

import Link from 'next/link';
import { useActionState, useState, startTransition } from 'react';
import type { Supplier } from '@/lib/types';
import type { SupplierFormState } from '@/app/admin/suppliers/actions';

export function SupplierForm({
  supplier, itemCount = 0, action,
}: {
  supplier?: Supplier;
  itemCount?: number;
  action: (state: SupplierFormState, fd: FormData) => Promise<SupplierFormState>;
}) {
  const isEdit = Boolean(supplier);
  const [state, formAction, pending] = useActionState(action, {});
  const [markDeleted, setMarkDeleted] = useState(false);
  const err = state.fieldErrors ?? {};

  return (
    <form noValidate onSubmit={(e) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      startTransition(() => formAction(fd));   // keeps typed values on validation errors
    }}>
      <div className="page-header">
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          <Link href="/admin/suppliers" className="breadcrumbs__link">Suppliers</Link>
        </nav>
        <h1 className="page-header__title">{isEdit ? supplier!.name : 'New Supplier'}</h1>
        {isEdit && <p className="page-header__subtitle">{itemCount} {itemCount === 1 ? 'item' : 'items'} linked</p>}
      </div>

      <div className="page-body">
        {state.message && <div className="message-strip message-strip--error" role="alert">{state.message}</div>}

        <section className="panel form-group" aria-labelledby="sec-supplier">
          <h2 id="sec-supplier" className="form-group__title">Supplier</h2>
          <Field id="name" label="Name" required error={err.name}>
            <input id="name" name="name" className="input" maxLength={100} defaultValue={supplier?.name ?? ''} aria-invalid={!!err.name} />
          </Field>
          <Field id="contact_person" label="Contact Person">
            <input id="contact_person" name="contact_person" className="input" maxLength={100} defaultValue={supplier?.contact_person ?? ''} />
          </Field>
          <Field id="email" label="Email" error={err.email} hint="Supplier lists are sent here when you choose “Send to supplier”.">
            <input id="email" name="email" type="email" inputMode="email" className="input" defaultValue={supplier?.email ?? ''} aria-invalid={!!err.email} />
          </Field>
          <Field id="phone" label="Phone">
            <input id="phone" name="phone" type="tel" inputMode="tel" className="input input--medium" defaultValue={supplier?.phone ?? ''} />
          </Field>
          <Field id="notes" label="Notes">
            <textarea id="notes" name="notes" className="input textarea" rows={3} defaultValue={supplier?.notes ?? ''}
              placeholder="e.g. Lead time 2 weeks, minimum order 10 shirts" />
          </Field>
        </section>

        {isEdit && (
          <section className="panel form-group" aria-labelledby="sec-status">
            <h2 id="sec-status" className="form-group__title">Status</h2>
            <div className="form-row">
              <span className="form-label">Deletion Indicator</span>
              <div className="form-field">
                <label className="checkbox">
                  <input type="checkbox" name="is_deleted" checked={markDeleted} onChange={(e) => setMarkDeleted(e.target.checked)} />
                  <span>Mark for deletion</span>
                </label>
                {markDeleted && (
                  <div className="message-strip message-strip--warning">
                    When you save, this supplier is hidden everywhere. Its {itemCount} linked items will show “No supplier”.
                  </div>
                )}
              </div>
            </div>
          </section>
        )}
      </div>

      <footer className="footer-bar">
        <span className="toolbar__spacer" />
        <button type="submit" className="btn btn--emphasized" disabled={pending}>
          {pending ? 'Saving…' : isEdit ? 'Save' : 'Create'}
        </button>
        <Link href="/admin/suppliers" className="btn">Cancel</Link>
      </footer>
    </form>
  );
}

function Field({ id, label, required, error, hint, children }: {
  id: string; label: string; required?: boolean; error?: string; hint?: string; children: React.ReactNode;
}) {
  return (
    <div className="form-row">
      <label htmlFor={id} className={`form-label${required ? ' form-label--required' : ''}`}>{label}</label>
      <div className="form-field">
        {children}
        {hint && <p className="hint">{hint}</p>}
        {error && <p className="field-error">{error}</p>}
      </div>
    </div>
  );
}
