'use client';

import { useActionState } from 'react';
import { placeOrder, type OrderActionState } from '@/app/orders/actions';

export function PlaceOrderButton() {
  const [state, formAction, pending] = useActionState<OrderActionState>(placeOrder, {});

  return (
    <form action={formAction} className="place-order">
      {state.error && <div className="message-strip message-strip--error" role="alert">{state.error}</div>}
      <button type="submit" className="btn btn--emphasized cart__checkout" disabled={pending}>
        {pending ? 'Placing order…' : 'Place Order'}
      </button>
      <p className="hint">You’ll pay by EFT. We’ll email you the banking details and your payment reference.</p>
    </form>
  );
}
