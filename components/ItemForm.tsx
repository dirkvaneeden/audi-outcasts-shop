'use client';

import Link from 'next/link';
import { useActionState, useEffect, useRef, useState, startTransition } from 'react';
import type { Item } from '@/lib/types';
import type { FormState } from '@/app/items/actions';
import { markupFromSelling, parseAmount, sellingFromMarkup, round } from '@/lib/pricing';
import { CURRENCY, formatMoney, formatPercent } from '@/lib/format';
import { SIZE_PRESETS, COLOUR_PRESETS } from '@/lib/line-options';
import { TagInput } from '@/components/TagInput';

type Props = {
  item?: Item;
  action: (state: FormState, formData: FormData) => Promise<FormState>;
};

const toInput = (n: number | undefined) => (n === undefined || n === null ? '' : String(Number(n)));

export function ItemForm({ item, action }: Props) {
  const isEdit = Boolean(item);
  const [state, formAction, pending] = useActionState(action, {});

  // ---- Pricing: edit any of the three, the others follow ----------------
  const [purchase, setPurchase] = useState(toInput(item?.purchase_price));
  const [markup, setMarkup] = useState(toInput(item?.markup_percent ?? 0));
  const [selling, setSelling] = useState(toInput(item?.selling_price));

  function onPurchaseChange(v: string) {
    setPurchase(v);
    const p = parseAmount(v), m = parseAmount(markup);
    if (Number.isFinite(p) && Number.isFinite(m)) setSelling(String(sellingFromMarkup(p, m)));
  }
  function onMarkupChange(v: string) {
    setMarkup(v);
    const p = parseAmount(purchase), m = parseAmount(v);
    if (Number.isFinite(p) && Number.isFinite(m)) setSelling(String(sellingFromMarkup(p, m)));
  }
  function onSellingChange(v: string) {
    setSelling(v);
    const p = parseAmount(purchase), s = parseAmount(v);
    if (Number.isFinite(p) && p > 0 && Number.isFinite(s)) setMarkup(String(markupFromSelling(p, s)));
  }

  const p = parseAmount(purchase), s = parseAmount(selling);
  const profit = Number.isFinite(p) && Number.isFinite(s) ? round(s - p, 2) : null;
  const margin = profit !== null && s > 0 ? (profit / s) * 100 : null;

  // ---- Image -------------------------------------------------------------
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(item?.image_url ?? null);
  const [removeImage, setRemoveImage] = useState(false);

  useEffect(() => () => { if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview); }, [preview]);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setRemoveImage(false);
  }
  function onRemoveImage() {
    if (fileRef.current) fileRef.current.value = '';
    setPreview(null);
    setRemoveImage(true);
  }

  // ---- Deletion indicator --------------------------------------------------
  const [markDeleted, setMarkDeleted] = useState(false);

  // Submit without React's automatic form reset, so typed values and the
  // chosen image survive a validation error.
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => formAction(fd));
  }

  const err = state.fieldErrors ?? {};

  return (
    <form onSubmit={onSubmit} className="object-page" noValidate>
      <div className="page-header">
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          <Link href="/items" className="breadcrumbs__link">Manage Items</Link>
        </nav>
        <h1 className="page-header__title">{isEdit ? item!.name : 'New Item'}</h1>
        {isEdit && (
          <p className="page-header__subtitle">Selling price {formatMoney(item!.selling_price)}</p>
        )}
      </div>

      <div className="page-body">
        {state.message && (
          <div className="message-strip message-strip--error" role="alert">{state.message}</div>
        )}

        {/* ---------------- General ---------------- */}
        <section className="panel form-group" aria-labelledby="sec-general">
          <h2 id="sec-general" className="form-group__title">General Information</h2>

          <div className="form-row">
            <label htmlFor="name" className="form-label form-label--required">Name</label>
            <div className="form-field">
              <input id="name" name="name" className="input" defaultValue={item?.name ?? ''}
                maxLength={120} required aria-invalid={!!err.name}
                aria-describedby={err.name ? 'name-err' : undefined} />
              {err.name && <p id="name-err" className="field-error">{err.name}</p>}
            </div>
          </div>

          <div className="form-row">
            <label htmlFor="description" className="form-label">Description</label>
            <div className="form-field">
              <textarea id="description" name="description" className="input textarea" rows={3}
                defaultValue={item?.description ?? ''} />
            </div>
          </div>
        </section>

        {/* ---------------- Image ---------------- */}
        <section className="panel form-group" aria-labelledby="sec-image">
          <h2 id="sec-image" className="form-group__title">Image</h2>

          <div className="form-row">
            <span className="form-label">Item Image</span>
            <div className="form-field">
              <div className="image-field">
                <div className="image-field__preview">
                  {preview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={preview} alt="Item image preview" />
                  ) : (
                    <span className="image-field__empty">No image</span>
                  )}
                </div>
                <div className="image-field__actions">
                  <label className="btn" htmlFor="image">{preview ? 'Replace Image' : 'Upload Image'}</label>
                  <input ref={fileRef} id="image" name="image" type="file" className="sr-only"
                    accept="image/jpeg,image/png,image/webp,image/gif" onChange={onFileChange}
                    aria-invalid={!!err.image} />
                  {preview && (
                    <button type="button" className="btn btn--transparent btn--negative" onClick={onRemoveImage}>
                      Remove
                    </button>
                  )}
                  <p className="hint">JPG, PNG, WebP or GIF, up to 4 MB.</p>
                  {err.image && <p className="field-error">{err.image}</p>}
                </div>
              </div>
              {removeImage && <input type="hidden" name="remove_image" value="on" />}
            </div>
          </div>
        </section>

        {/* ---------------- Pricing ---------------- */}
        <section className="panel form-group" aria-labelledby="sec-pricing">
          <h2 id="sec-pricing" className="form-group__title">Pricing</h2>

          <div className="form-row">
            <label htmlFor="purchase_price" className="form-label form-label--required">Purchase Price</label>
            <div className="form-field">
              <div className="input-group">
                <input id="purchase_price" name="purchase_price" className="input input--num"
                  type="number" inputMode="decimal" step="0.01" min="0" required
                  value={purchase} onChange={(e) => onPurchaseChange(e.target.value)}
                  aria-invalid={!!err.purchase_price} />
                <span className="input-group__unit">{CURRENCY}</span>
              </div>
              {err.purchase_price && <p className="field-error">{err.purchase_price}</p>}
            </div>
          </div>

          <div className="form-row">
            <label htmlFor="markup_percent" className="form-label form-label--required">Markup</label>
            <div className="form-field">
              <div className="input-group">
                <input id="markup_percent" name="markup_percent" className="input input--num"
                  type="number" inputMode="decimal" step="any" required
                  value={markup} onChange={(e) => onMarkupChange(e.target.value)}
                  aria-invalid={!!err.markup_percent} />
                <span className="input-group__unit">%</span>
              </div>
              {err.markup_percent && <p className="field-error">{err.markup_percent}</p>}
            </div>
          </div>

          <div className="form-row">
            <label htmlFor="selling_price" className="form-label">Selling Price</label>
            <div className="form-field">
              <div className="input-group">
                <input id="selling_price" className="input input--num input--key"
                  type="number" inputMode="decimal" step="0.01" min="0"
                  value={selling} onChange={(e) => onSellingChange(e.target.value)} />
                <span className="input-group__unit">{CURRENCY}</span>
              </div>
              <p className="hint">
                Enter a markup or a selling price; the other is calculated.
                {profit !== null && (
                  <> Profit per item: <strong>{formatMoney(profit)}</strong>
                    {margin !== null && <> (margin {formatPercent(margin)})</>}.</>
                )}
              </p>
            </div>
          </div>
        </section>

        {/* ---------------- Options ---------------- */}
        <section className="panel form-group" aria-labelledby="sec-options">
          <h2 id="sec-options" className="form-group__title">Sizes and Colours</h2>

          <div className="form-row">
            <label htmlFor="sizes-input" className="form-label">Sizes</label>
            <div className="form-field">
              <TagInput id="sizes-input" name="sizes" initial={item?.sizes ?? []} presets={SIZE_PRESETS}
                maxLength={20} placeholder="Type a size and press Enter" />
              <p className="hint">Leave empty if the item has no sizes. Members must choose one when sizes are listed.</p>
            </div>
          </div>

          <div className="form-row">
            <label htmlFor="colours-input" className="form-label">Colours</label>
            <div className="form-field">
              <TagInput id="colours-input" name="colours" initial={item?.colours ?? []} presets={COLOUR_PRESETS}
                maxLength={30} placeholder="Type a colour and press Enter" swatches />
              <p className="hint">Leave empty if the item comes in one colour only.</p>
            </div>
          </div>
        </section>

        {/* ---------------- Status (edit only) ---------------- */}
        {isEdit && (
          <section className="panel form-group" aria-labelledby="sec-status">
            <h2 id="sec-status" className="form-group__title">Status</h2>
            <div className="form-row">
              <span className="form-label">Deletion Indicator</span>
              <div className="form-field">
                <label className="checkbox">
                  <input type="checkbox" name="is_deleted" checked={markDeleted}
                    onChange={(e) => setMarkDeleted(e.target.checked)} />
                  <span>Mark for deletion</span>
                </label>
                {markDeleted && (
                  <div className="message-strip message-strip--warning">
                    When you save, this item is hidden from every app.
                  </div>
                )}
              </div>
            </div>
          </section>
        )}
      </div>

      {/* ---------------- Floating footer ---------------- */}
      <footer className="footer-bar">
        <span className="toolbar__spacer" />
        <button type="submit" className="btn btn--emphasized" disabled={pending}>
          {pending ? 'Saving…' : isEdit ? 'Save' : 'Create'}
        </button>
        <Link href="/items" className="btn" aria-disabled={pending}>Cancel</Link>
      </footer>
    </form>
  );
}
