'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState, useTransition } from 'react';
import type { CatalogueItem } from '@/lib/types';
import { formatMoney } from '@/lib/format';
import { addToCart } from '@/app/cart/actions';
import { Price } from '@/components/Price';
import { ItemOptionPicker, initialOptions, missingOption, type OptionValues } from '@/components/ItemOptionPicker';

export function AddToCartDialog({ item, inCart }: { item: CatalogueItem; inCart: number }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const uid = useId();
  const sizes = item.sizes ?? [];
  const colours = item.colours ?? [];
  const [options, setOptions] = useState<OptionValues>(() => initialOptions(sizes, colours));
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!added) return;
    const t = setTimeout(() => setAdded(false), 2000);
    return () => clearTimeout(t);
  }, [added]);

  function open() {
    setError(null);
    dialogRef.current?.showModal();
  }
  const close = () => dialogRef.current?.close();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const missing = missingOption(sizes, colours, options);
    if (missing) return setError(missing);
    setError(null);
    startTransition(async () => {
      const result = await addToCart(item.id, options);
      if (result.error) { setError(result.error); return; }
      close();
      setAdded(true);
      setOptions(initialOptions(sizes, colours));
    });
  }

  return (
    <>
      <div className="product__actions">
        <button type="button" className="btn btn--emphasized product__add" onClick={open}
          aria-label={`Add ${item.name} to cart`}>
          {added ? 'Added' : 'Add to Cart'}
        </button>
        <span aria-live="polite" className="product__status">
          {inCart > 0 && <Link href="/cart" className="link">In cart: {inCart}</Link>}
        </span>
      </div>

      <dialog ref={dialogRef} className="dialog" aria-labelledby={`${uid}-title`}
        onClick={(e) => { if (e.target === dialogRef.current) close(); }}>
        <form className="dialog__form" onSubmit={submit} noValidate>
          <header className="dialog__header">
            <h2 id={`${uid}-title`} className="dialog__title">Add to Cart</h2>
            <button type="button" className="dialog__close" onClick={close} aria-label="Close">×</button>
          </header>

          <div className="dialog__body">
            <div className="dialog__item">
              <div className="dialog__image">
                {item.image_url
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={item.image_url} alt="" />
                  : <span className="product__noimage">No image</span>}
              </div>
              <div>
                <p className="dialog__name">{item.name}</p>
                <p className="dialog__price">
                  <Price price={item.selling_price} regular={item.regular_price} discount={item.discount_percent} />
                </p>
              </div>
            </div>

            <ItemOptionPicker idPrefix={uid} sizes={sizes} colours={colours} value={options}
              onChange={(next) => setOptions((o) => ({ ...o, ...next }))} />

            {error && <div className="message-strip message-strip--error" role="alert">{error}</div>}
          </div>

          <footer className="dialog__footer">
            <button type="submit" className="btn btn--emphasized" disabled={pending}>
              {pending ? 'Adding…' : `Add to Cart · ${formatMoney(item.selling_price * options.quantity)}`}
            </button>
            <button type="button" className="btn" onClick={close} disabled={pending}>Cancel</button>
          </footer>
        </form>
      </dialog>
    </>
  );
}
