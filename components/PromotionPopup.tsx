'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState, useTransition } from 'react';
import type { LivePromotion } from '@/lib/types';
import { formatDay, formatMoney } from '@/lib/format';
import { addPromotionToCart, ignorePromotion } from '@/app/promotions/actions';
import { ItemOptionPicker, initialOptions, missingOption, type OptionValues } from '@/components/ItemOptionPicker';

/**
 * Shows the member's open promotions one after the other.
 * The list is captured once, so refreshing the page data after "Add to Cart"
 * doesn't close the pop-up before the member sees the confirmation.
 */
export function PromotionQueue({ promotions }: { promotions: LivePromotion[] }) {
  const [queue] = useState(promotions);
  const [index, setIndex] = useState(0);
  const current = queue[index];
  if (!current) return null;
  return <PromotionPopup key={current.id} promo={current} onDone={() => setIndex((i) => i + 1)} />;
}

function PromotionPopup({ promo, onDone }: { promo: LivePromotion; onDone: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const uid = useId();
  const [options, setOptions] = useState<OptionValues>(() => initialOptions(promo.sizes, promo.colours));
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const d = dialogRef.current;
    if (d && !d.open) d.showModal();
  }, []);

  function finish() {
    dialogRef.current?.close();
    onDone();
  }

  function ignore() {
    startTransition(async () => {
      await ignorePromotion(promo.id);
      finish();
    });
  }

  function add(e: React.FormEvent) {
    e.preventDefault();
    const missing = missingOption(promo.sizes, promo.colours, options);
    if (missing) return setError(missing);
    setError(null);
    startTransition(async () => {
      const result = await addPromotionToCart(promo.id, options);
      if (result.error) { setError(result.error); return; }
      setAdded(true);
    });
  }

  return (
    <dialog ref={dialogRef} className="dialog promo" aria-labelledby={`${uid}-title`}
      // Esc counts as "Ignore" before adding, and as "Continue" after adding
      onCancel={(e) => { e.preventDefault(); if (pending) return; if (added) finish(); else ignore(); }}>
      <form className="dialog__form" onSubmit={add} noValidate>
        <header className="promo__banner">
          <span className="promo__badge">Promotion</span>
          <h2 id={`${uid}-title`} className="promo__title">{promo.title}</h2>
          <p className="promo__dates">Until {formatDay(promo.ends_on)}</p>
        </header>

        <div className="dialog__body">
          {!added ? (
            <>
              <p className="promo__message">{promo.message}</p>

              <div className="promo__item">
                <div className="promo__image">
                  {promo.image_url
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={promo.image_url} alt={promo.item_name} />
                    : <span className="product__noimage">No image</span>}
                </div>
                <div>
                  <p className="dialog__name">{promo.item_name}</p>
                  {promo.item_description && <p className="hint promo__desc">{promo.item_description}</p>}
                  <p className="dialog__price">{formatMoney(promo.selling_price)}</p>
                </div>
              </div>

              <ItemOptionPicker idPrefix={uid} sizes={promo.sizes} colours={promo.colours} value={options}
                onChange={(next) => setOptions((o) => ({ ...o, ...next }))} />

              {error && <div className="message-strip message-strip--error" role="alert">{error}</div>}
            </>
          ) : (
            <div className="promo__added" role="status">
              <span className="promo__tick" aria-hidden="true">✓</span>
              <p><strong>{options.quantity} × {promo.item_name}</strong> added to your cart.</p>
            </div>
          )}
        </div>

        <footer className="dialog__footer">
          {!added ? (
            <>
              <button type="submit" className="btn btn--emphasized" disabled={pending}>
                {pending ? 'Please wait…' : `Add to Cart · ${formatMoney(promo.selling_price * options.quantity)}`}
              </button>
              <button type="button" className="btn" onClick={ignore} disabled={pending}>Ignore</button>
            </>
          ) : (
            <>
              <Link href="/cart" className="btn btn--emphasized" onClick={finish}>View Cart</Link>
              <button type="button" className="btn" onClick={finish}>Continue Shopping</button>
            </>
          )}
        </footer>
      </form>
    </dialog>
  );
}
