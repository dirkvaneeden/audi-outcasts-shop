'use client';

import { useState, useTransition } from 'react';
import { TRANSITIONS, type OrderStatus, type Transition } from '@/lib/order-status';
import { setOrderStatus, type AdminActionResult } from '@/app/admin/orders/actions';

export function OrderStatusActions({ orderId, status }: { orderId: string; status: OrderStatus }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<AdminActionResult>({});
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');

  const transitions = TRANSITIONS[status];

  function run(t: Transition, note?: string) {
    if (t.kind === 'undo' && !window.confirm(`${t.label}?`)) return;
    startTransition(async () => {
      const r = await setOrderStatus([orderId], t.to, note);
      setResult(r);
      if (!r.error) { setRejecting(false); setReason(''); }
    });
  }

  if (!transitions.length) return null;

  return (
    <div className="status-actions">
      {(result.error || result.info) && (
        <div className={`message-strip ${result.error ? 'message-strip--error' : 'message-strip--success'}`}
          role={result.error ? 'alert' : 'status'}>{result.error ?? result.info}</div>
      )}

      {!rejecting && (
        <div className="status-actions__buttons">
          {transitions.map((t) => (
            <button key={t.to} type="button" disabled={pending}
              className={`btn ${t.kind === 'primary' ? 'btn--emphasized' : t.kind === 'negative' ? 'btn--negative' : 'btn--transparent'}`}
              onClick={() => (t.to === 'rejected' ? setRejecting(true) : run(t))}>
              {pending ? 'Updating…' : t.label}
            </button>
          ))}
        </div>
      )}

      {rejecting && (
        <div className="status-actions__reject">
          <label htmlFor="reject-reason" className="login__label">Reason for rejecting</label>
          <textarea id="reject-reason" className="input textarea" rows={3} maxLength={300}
            value={reason} onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. No payment received after 7 days" autoFocus />
          <div className="status-actions__buttons">
            <button type="button" className="btn btn--emphasized btn--danger" disabled={pending}
              onClick={() => run({ to: 'rejected', label: 'Reject', kind: 'negative' }, reason)}>
              {pending ? 'Rejecting…' : 'Reject Order'}
            </button>
            <button type="button" className="btn" disabled={pending} onClick={() => setRejecting(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
