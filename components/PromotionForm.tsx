'use client';

import Link from 'next/link';
import { useActionState, useState, startTransition, useTransition } from 'react';
import type { Promotion } from '@/lib/types';
import { formatDay, formatMoney, todayISO } from '@/lib/format';
import type { PromotionFormState } from '@/app/admin/promotions/actions';
import { resetPromotionResponses } from '@/app/admin/promotions/actions';

type ItemChoice = { id: string; name: string; image_url: string | null; selling_price: number };

export function PromotionForm({
  promotion, items, action,
}: {
  promotion?: Promotion;
  items: ItemChoice[];
  action: (state: PromotionFormState, formData: FormData) => Promise<PromotionFormState>;
}) {
  const isEdit = Boolean(promotion);
  const [state, formAction, pending] = useActionState(action, {});
  const today = todayISO();

  const [itemId, setItemId] = useState(promotion?.item_id ?? '');
  const [title, setTitle] = useState(promotion?.title ?? '');
  const [message, setMessage] = useState(promotion?.message ?? '');
  const [startsOn, setStartsOn] = useState(promotion?.starts_on ?? today);
  const [endsOn, setEndsOn] = useState(promotion?.ends_on ?? '');
  const [markDeleted, setMarkDeleted] = useState(false);
  const item = items.find((i) => i.id === itemId);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => formAction(fd));   // keeps typed values on validation errors
  }

  const err = state.fieldErrors ?? {};

  return (
    <form onSubmit={onSubmit} noValidate>
      <div className="page-header">
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          <Link href="/admin/promotions" className="breadcrumbs__link">Promotions</Link>
        </nav>
        <h1 className="page-header__title">{isEdit ? promotion!.title : 'New Promotion'}</h1>
        {isEdit && (
          <p className="page-header__subtitle">
            {promotion!.added} added to cart · {promotion!.ignored} ignored
          </p>
        )}
      </div>

      <div className="page-body">
        {state.message && <div className="message-strip message-strip--error" role="alert">{state.message}</div>}

        <div className="cart">
          <div className="stack">
            <section className="panel form-group" aria-labelledby="sec-promo">
              <h2 id="sec-promo" className="form-group__title">Promotion</h2>

              <div className="form-row">
                <label htmlFor="item_id" className="form-label form-label--required">Item</label>
                <div className="form-field">
                  <select id="item_id" name="item_id" className="input" value={itemId}
                    onChange={(e) => setItemId(e.target.value)} aria-invalid={!!err.item_id}>
                    <option value="">Select an item…</option>
                    {items.map((i) => <option key={i.id} value={i.id}>{i.name} ({formatMoney(i.selling_price)})</option>)}
                  </select>
                  {err.item_id && <p className="field-error">{err.item_id}</p>}
                </div>
              </div>

              <div className="form-row">
                <label htmlFor="title" className="form-label form-label--required">Title</label>
                <div className="form-field">
                  <input id="title" name="title" className="input" maxLength={80} value={title}
                    onChange={(e) => setTitle(e.target.value)} placeholder="e.g. New Club Tee is here!"
                    aria-invalid={!!err.title} />
                  {err.title && <p className="field-error">{err.title}</p>}
                </div>
              </div>

              <div className="form-row">
                <label htmlFor="message" className="form-label form-label--required">Message</label>
                <div className="form-field">
                  <textarea id="message" name="message" className="input textarea" rows={5} maxLength={1000}
                    value={message} onChange={(e) => setMessage(e.target.value)}
                    placeholder="Tell members why they'll want this…" aria-invalid={!!err.message} />
                  <p className="hint dialog__counter">{message.length}/1000</p>
                  {err.message && <p className="field-error">{err.message}</p>}
                </div>
              </div>

              <div className="form-row">
                <label htmlFor="starts_on" className="form-label form-label--required">Start Date</label>
                <div className="form-field">
                  <input id="starts_on" name="starts_on" type="date" className="input input--medium"
                    value={startsOn} onChange={(e) => setStartsOn(e.target.value)} aria-invalid={!!err.starts_on} />
                  {err.starts_on && <p className="field-error">{err.starts_on}</p>}
                </div>
              </div>

              <div className="form-row">
                <label htmlFor="ends_on" className="form-label form-label--required">End Date</label>
                <div className="form-field">
                  <input id="ends_on" name="ends_on" type="date" className="input input--medium" min={startsOn}
                    value={endsOn} onChange={(e) => setEndsOn(e.target.value)} aria-invalid={!!err.ends_on} />
                  <p className="hint">The pop-up shows from the start date up to and including the end date.</p>
                  {err.ends_on && <p className="field-error">{err.ends_on}</p>}
                </div>
              </div>

              <div className="form-row">
                <span className="form-label">Active</span>
                <div className="form-field">
                  <label className="checkbox">
                    <input type="checkbox" name="is_active" defaultChecked={promotion?.is_active ?? true} />
                    <span>Show this promotion between the dates above</span>
                  </label>
                </div>
              </div>
            </section>

            {isEdit && (
              <section className="panel form-group" aria-labelledby="sec-status">
                <h2 id="sec-status" className="form-group__title">Status</h2>
                <div className="form-row">
                  <span className="form-label">Show Again</span>
                  <div className="form-field"><ResetResponses id={promotion!.id} /></div>
                </div>
                <div className="form-row">
                  <span className="form-label">Deletion Indicator</span>
                  <div className="form-field">
                    <label className="checkbox">
                      <input type="checkbox" name="is_deleted" checked={markDeleted}
                        onChange={(e) => setMarkDeleted(e.target.checked)} />
                      <span>Mark for deletion</span>
                    </label>
                    {markDeleted && (
                      <div className="message-strip message-strip--warning">When you save, this promotion is removed and no longer shown.</div>
                    )}
                  </div>
                </div>
              </section>
            )}
          </div>

          {/* Preview of what members will see */}
          <aside className="panel promo-preview" aria-label="Preview">
            <p className="hint promo-preview__label">Preview</p>
            <div className="promo__banner">
              <span className="promo__badge">Promotion</span>
              <p className="promo__title">{title || 'Promotion title'}</p>
              <p className="promo__dates">{endsOn ? `Until ${formatDay(endsOn)}` : 'Until …'}</p>
            </div>
            <div className="promo-preview__body">
              <p className="promo__message">{message || 'Your message to members appears here.'}</p>
              <div className="promo__item">
                <div className="promo__image">
                  {item?.image_url
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={item.image_url} alt="" />
                    : <span className="product__noimage">No image</span>}
                </div>
                <div>
                  <p className="dialog__name">{item?.name ?? 'Choose an item'}</p>
                  {item && <p className="dialog__price">{formatMoney(item.selling_price)}</p>}
                </div>
              </div>
              <div className="promo-preview__buttons">
                <span className="btn btn--emphasized">Add to Cart</span>
                <span className="btn">Ignore</span>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <footer className="footer-bar">
        <span className="toolbar__spacer" />
        <button type="submit" className="btn btn--emphasized" disabled={pending}>
          {pending ? 'Saving…' : isEdit ? 'Save' : 'Create'}
        </button>
        <Link href="/admin/promotions" className="btn">Cancel</Link>
      </footer>
    </form>
  );
}

function ResetResponses({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ error?: string; info?: string }>({});
  return (
    <div className="email-summary">
      <button type="button" className="btn" disabled={pending}
        onClick={() => {
          if (!window.confirm('Show this promotion again to members who already added or ignored it?')) return;
          start(async () => setResult(await resetPromotionResponses(id)));
        }}>
        {pending ? 'Resetting…' : 'Show Pop-up Again to Everyone'}
      </button>
      {result.info && <span className="hint" role="status">{result.info}</span>}
      {result.error && <span className="field-error" role="alert">{result.error}</span>}
    </div>
  );
}
