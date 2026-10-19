'use client';

import { useState, useTransition } from 'react';
import { sendPaymentReminders, type AdminActionResult } from '@/app/admin/orders/actions';

/** Admin order page: email a payment reminder for this unpaid order. */
export function PaymentReminderButton({ orderId }: { orderId: string }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<AdminActionResult>({});
  return (
    <div className="resend">
      <button type="button" className="btn" disabled={pending}
        onClick={() => {
          if (!window.confirm('Email a payment reminder to this member?')) return;
          startTransition(async () => setResult(await sendPaymentReminders([orderId])));
        }}>
        {pending ? 'Sending…' : 'Send Payment Reminder'}
      </button>
      {result.info && <p className="hint" role="status">{result.info}</p>}
      {result.error && <p className="field-error" role="alert">{result.error}</p>}
    </div>
  );
}
