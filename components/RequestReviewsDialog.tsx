'use client';

import { useId, useRef, useState, useTransition } from 'react';
import {
  getReviewCandidates, sendReviewRequests, type ReviewCandidate,
} from '@/app/admin/orders/review-actions';

const STATE_LABEL = { new: '', requested: 'Asked before', reviewed: 'Reviewed' } as const;

/** Pick members (orders) and the products on each order, then email review requests. */
export function RequestReviewsDialog({
  orderIds, label = 'Request Reviews', className = 'btn',
}: { orderIds: string[]; label?: string; className?: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const uid = useId();
  const [candidates, setCandidates] = useState<ReviewCandidate[] | null>(null);
  const [picked, setPicked] = useState<Map<string, Set<string>>>(new Map());
  const [result, setResult] = useState<{ error?: string; info?: string }>({});
  const [pending, startTransition] = useTransition();

  function open() {
    setResult({}); setCandidates(null);
    dialogRef.current?.showModal();
    startTransition(async () => {
      const r = await getReviewCandidates(orderIds);
      if (r.error) setResult({ error: r.error });
      setCandidates(r.candidates);
      // Pre-tick every product not reviewed or asked before
      setPicked(new Map(r.candidates.map((c) => [c.orderId, new Set(c.items.filter((i) => i.state === 'new').map((i) => i.itemId))])));
    });
  }
  const close = () => dialogRef.current?.close();

  function toggle(orderId: string, itemId: string) {
    setPicked((prev) => {
      const next = new Map(prev);
      const set = new Set(next.get(orderId) ?? []);
      if (set.has(itemId)) set.delete(itemId); else set.add(itemId);
      next.set(orderId, set);
      return next;
    });
  }

  const selections = [...picked].map(([orderId, s]) => ({ orderId, itemIds: [...s] })).filter((s) => s.itemIds.length);
  const memberCount = selections.length;

  function send(e: React.FormEvent) {
    e.preventDefault();
    if (!memberCount) return setResult({ error: 'Tick at least one product.' });
    startTransition(async () => {
      const r = await sendReviewRequests(selections);
      setResult(r);
      if (!r.error) setPicked(new Map());
    });
  }

  return (
    <>
      <button type="button" className={className} onClick={open} disabled={!orderIds.length}>{label}</button>
      <dialog ref={dialogRef} className="dialog" aria-labelledby={`${uid}-t`}
        onClick={(e) => { if (e.target === dialogRef.current) close(); }}>
        <form className="dialog__form" onSubmit={send} noValidate>
          <header className="dialog__header">
            <h2 id={`${uid}-t`} className="dialog__title">Request Reviews</h2>
            <button type="button" className="dialog__close" onClick={close} aria-label="Close">×</button>
          </header>
          <div className="dialog__body">
            <p className="hint" style={{ margin: 0 }}>
              Each member gets one email asking for a star rating and a short description of the products you tick.
            </p>
            {candidates === null && <p className="hint">Loading…</p>}
            {candidates?.length === 0 && !result.error && <p className="hint">No orders found.</p>}
            {candidates?.map((c) => (
              <fieldset key={c.orderId} className="review-pick">
                <legend className="review-pick__who">
                  <strong>{c.memberName}</strong> <span className="hint">· {c.orderNumber}</span>
                </legend>
                {c.items.length === 0 && <p className="hint">No products that can be reviewed.</p>}
                {c.items.map((i) => (
                  <label key={i.itemId} className={`checkbox review-pick__item${i.state === 'reviewed' ? ' is-disabled' : ''}`}>
                    <input type="checkbox" disabled={i.state === 'reviewed'}
                      checked={picked.get(c.orderId)?.has(i.itemId) ?? false}
                      onChange={() => toggle(c.orderId, i.itemId)} />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {i.image ? <img src={i.image} alt="" className="review-pick__img" /> : <span className="review-pick__img" />}
                    <span>{i.name}</span>
                    {STATE_LABEL[i.state] && <span className="review-pick__state">{STATE_LABEL[i.state]}</span>}
                  </label>
                ))}
              </fieldset>
            ))}
            {result.error && <div className="message-strip message-strip--error" role="alert">{result.error}</div>}
            {result.info && <div className="message-strip message-strip--success" role="status">{result.info}</div>}
          </div>
          <footer className="dialog__footer">
            <button type="submit" className="btn btn--emphasized" disabled={pending || !memberCount}>
              {pending ? 'Please wait…' : `Send to ${memberCount} ${memberCount === 1 ? 'member' : 'members'}`}
            </button>
            <button type="button" className="btn" onClick={close} disabled={pending}>Close</button>
          </footer>
        </form>
      </dialog>
    </>
  );
}
