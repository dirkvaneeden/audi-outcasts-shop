'use client';

import { useState, useTransition } from 'react';
import { setCartQuantity } from '@/app/cart/actions';

export function CartQuantity({ lineId, itemName, quantity }: { lineId: string; itemName: string; quantity: number }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function change(next: number) {
    startTransition(async () => {
      const result = await setCartQuantity(lineId, next);
      setError(result.error ?? null);
    });
  }

  return (
    <div className="cart-line__controls">
      <div className="stepper" role="group" aria-label={`Quantity of ${itemName}`}>
        <button type="button" className="stepper__btn" onClick={() => change(quantity - 1)}
          disabled={pending || quantity <= 1} aria-label="Decrease quantity">−</button>
        <span className="stepper__value" aria-live="polite">{quantity}</span>
        <button type="button" className="stepper__btn" onClick={() => change(quantity + 1)}
          disabled={pending || quantity >= 99} aria-label="Increase quantity">+</button>
      </div>
      <button type="button" className="btn btn--transparent btn--negative" onClick={() => change(0)}
        disabled={pending} aria-label={`Remove ${itemName} from cart`}>
        Remove
      </button>
      {error && <p className="field-error" role="alert">{error}</p>}
    </div>
  );
}
