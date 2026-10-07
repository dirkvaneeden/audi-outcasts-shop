'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState, useTransition } from 'react';
import type { CatalogueItem } from '@/lib/types';
import { formatMoney } from '@/lib/format';
import { NOTE_MAX } from '@/lib/line-options';
import { addToCart } from '@/app/cart/actions';
import { Swatch } from '@/components/TagInput';

export function AddToCartDialog({ item, inCart }: { item: CatalogueItem; inCart: number }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const uid = useId();
  const [size, setSize] = useState('');
  const [colour, setColour] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  const [pending, startTransition] = useTransition();

  const sizes = item.sizes ?? [];
  const colours = item.colours ?? [];

  useEffect(() => {
    if (!added) return;
    const t = setTimeout(() => setAdded(false), 2000);
    return () => clearTimeout(t);
  }, [added]);

  function open() {
    setError(null);
    // Pre-select when there is only one choice
    if (sizes.length === 1) setSize(sizes[0]);
    if (colours.length === 1) setColour(colours[0]);
    dialogRef.current?.showModal();
  }
  const close = () => dialogRef.current?.close();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (sizes.length && !size) return setError('Choose a size.');
    if (colours.length && !colour) return setError('Choose a colour.');
    setError(null);
    startTransition(async () => {
      const result = await addToCart(item.id, { quantity, size, colour, note });
      if (result.error) { setError(result.error); return; }
      close();
      setAdded(true);
      setQuantity(1);
      setNote('');
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
                <p className="dialog__price">{formatMoney(item.selling_price)}</p>
              </div>
            </div>

            {sizes.length > 0 && (
              <fieldset className="choice">
                <legend className="choice__legend form-label--required">Size</legend>
                <div className="choice__options">
                  {sizes.map((s) => (
                    <label key={s} className={`choice__option${size === s ? ' is-selected' : ''}`}>
                      <input type="radio" name={`${uid}-size`} value={s} checked={size === s}
                        onChange={() => setSize(s)} className="sr-only" />
                      {s}
                    </label>
                  ))}
                </div>
              </fieldset>
            )}

            {colours.length > 0 && (
              <fieldset className="choice">
                <legend className="choice__legend form-label--required">Colour</legend>
                <div className="choice__options">
                  {colours.map((c) => (
                    <label key={c} className={`choice__option${colour === c ? ' is-selected' : ''}`}>
                      <input type="radio" name={`${uid}-colour`} value={c} checked={colour === c}
                        onChange={() => setColour(c)} className="sr-only" />
                      <Swatch colour={c} />{c}
                    </label>
                  ))}
                </div>
              </fieldset>
            )}

            <div className="choice">
              <span className="choice__legend" id={`${uid}-qty`}>Quantity</span>
              <div className="stepper" role="group" aria-labelledby={`${uid}-qty`}>
                <button type="button" className="stepper__btn" onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1} aria-label="Decrease quantity">−</button>
                <span className="stepper__value" aria-live="polite">{quantity}</span>
                <button type="button" className="stepper__btn" onClick={() => setQuantity((q) => Math.min(99, q + 1))}
                  disabled={quantity >= 99} aria-label="Increase quantity">+</button>
              </div>
            </div>

            <div className="choice">
              <label htmlFor={`${uid}-note`} className="choice__legend">Note (optional)</label>
              <textarea id={`${uid}-note`} className="input textarea" rows={3} maxLength={NOTE_MAX}
                value={note} onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Name or number to print, fit preference" />
              <p className="hint dialog__counter">{note.length}/{NOTE_MAX}</p>
            </div>

            {error && <div className="message-strip message-strip--error" role="alert">{error}</div>}
          </div>

          <footer className="dialog__footer">
            <button type="submit" className="btn btn--emphasized" disabled={pending}>
              {pending ? 'Adding…' : `Add to Cart · ${formatMoney(item.selling_price * quantity)}`}
            </button>
            <button type="button" className="btn" onClick={close} disabled={pending}>Cancel</button>
          </footer>
        </form>
      </dialog>
    </>
  );
}
