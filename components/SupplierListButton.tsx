'use client';

import Link from 'next/link';
import { useId, useRef, useState, useTransition } from 'react';
import { sendSupplierList, type AdminActionResult, type ListRecipient } from '@/app/admin/orders/actions';

type SupplierOption = { id: string; name: string; email: string | null };

/** "Send Supplier List": choose a supplier, then send to yourself or straight to the supplier. */
export function SupplierListButton({ suppliers }: { suppliers: SupplierOption[] }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const uid = useId();
  const [supplierId, setSupplierId] = useState<string>(suppliers[0]?.id ?? 'all');
  const [recipient, setRecipient] = useState<ListRecipient>('me');
  const [result, setResult] = useState<AdminActionResult>({});
  const [pending, startTransition] = useTransition();

  const supplier = suppliers.find((s) => s.id === supplierId);
  const canSendToSupplier = !!supplier?.email;
  const effectiveRecipient: ListRecipient = canSendToSupplier ? recipient : 'me';

  function open() { setResult({}); dialogRef.current?.showModal(); }
  const close = () => dialogRef.current?.close();

  function send(e: React.FormEvent) {
    e.preventDefault();
    if (effectiveRecipient !== 'me' && !window.confirm(`Email this list directly to ${supplier!.name} (${supplier!.email})?`)) return;
    startTransition(async () => setResult(await sendSupplierList(supplierId, effectiveRecipient)));
  }

  return (
    <>
      <button type="button" className="btn" onClick={open}>Send Supplier List</button>

      <dialog ref={dialogRef} className="dialog" aria-labelledby={`${uid}-title`}
        onClick={(e) => { if (e.target === dialogRef.current) close(); }}>
        <form className="dialog__form" onSubmit={send} noValidate>
          <header className="dialog__header">
            <h2 id={`${uid}-title`} className="dialog__title">Send Supplier List</h2>
            <button type="button" className="dialog__close" onClick={close} aria-label="Close">×</button>
          </header>

          <div className="dialog__body">
            <p className="hint" style={{ margin: 0 }}>
              Lists every paid and ordered item that isn’t delivered yet, with sizes, colours, notes, cost prices and the
              total to pay. Prices members paid are never included.
            </p>

            <div className="choice">
              <label htmlFor={`${uid}-supplier`} className="choice__legend">Supplier</label>
              <select id={`${uid}-supplier`} className="input" value={supplierId}
                onChange={(e) => { setSupplierId(e.target.value); setResult({}); }}>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                <option value="none">Items without a supplier</option>
                <option value="all">All suppliers (one combined list)</option>
              </select>
              {suppliers.length === 0 && (
                <p className="hint">No suppliers yet. <Link href="/admin/suppliers/new" className="link">Create one</Link> and link it to items.</p>
              )}
            </div>

            <fieldset className="choice">
              <legend className="choice__legend">Send to</legend>
              <label className="checkbox">
                <input type="radio" name={`${uid}-to`} checked={effectiveRecipient === 'me'} onChange={() => setRecipient('me')} />
                <span>Me, to check or forward</span>
              </label>
              <label className={`checkbox${canSendToSupplier ? '' : ' is-disabled'}`}>
                <input type="radio" name={`${uid}-to`} disabled={!canSendToSupplier}
                  checked={effectiveRecipient === 'supplier'} onChange={() => setRecipient('supplier')} />
                <span>The supplier{supplier?.email ? ` (${supplier.email})` : ''}</span>
              </label>
              <label className={`checkbox${canSendToSupplier ? '' : ' is-disabled'}`}>
                <input type="radio" name={`${uid}-to`} disabled={!canSendToSupplier}
                  checked={effectiveRecipient === 'supplier_cc_me'} onChange={() => setRecipient('supplier_cc_me')} />
                <span>The supplier, with a copy to me</span>
              </label>
              {!supplier && <p className="hint">Combined lists and items without a supplier can only be sent to you.</p>}
              {supplier && !supplier.email && (
                <p className="hint">{supplier.name} has no email address. <Link href={`/admin/suppliers/${supplier.id}`} className="link">Add one</Link> to send directly.</p>
              )}
            </fieldset>

            {result.error && <div className="message-strip message-strip--error" role="alert">{result.error}</div>}
            {result.info && <div className="message-strip message-strip--success" role="status">{result.info}</div>}
          </div>

          <footer className="dialog__footer">
            <button type="submit" className="btn btn--emphasized" disabled={pending}>
              {pending ? 'Sending…' : 'Send'}
            </button>
            <button type="button" className="btn" onClick={close} disabled={pending}>Close</button>
          </footer>
        </form>
      </dialog>
    </>
  );
}
