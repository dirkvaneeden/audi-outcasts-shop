'use client';

import { useActionState } from 'react';
import { resendOrderEmail, type OrderActionState } from '@/app/orders/actions';

export function ResendEmailButton({ orderNumber }: { orderNumber: string }) {
  const [state, formAction, pending] = useActionState<OrderActionState>(
    resendOrderEmail.bind(null, orderNumber), {},
  );

  return (
    <form action={formAction} className="resend">
      <button type="submit" className="btn" disabled={pending}>
        {pending ? 'Sending…' : 'Resend Email'}
      </button>
      {state.error && <p className="field-error" role="alert">{state.error}</p>}
      {state.info && <p className="hint" role="status">{state.info}</p>}
    </form>
  );
}
