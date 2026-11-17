'use client';

import { useId, useState, useTransition } from 'react';
import { submitReview } from '@/app/reviews/actions';

const WORDS = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'];

export function ReviewForm({ requestId, itemName, image, orderNumber, memberName }: {
  requestId: string; itemName: string; image: string | null; orderNumber: string | null; memberName: string;
}) {
  const uid = useId();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [hideName, setHideName] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();
  const shown = hover || rating;

  if (done) {
    return (
      <section className="panel review-card review-card--done" role="status">
        <span className="promo__tick" aria-hidden="true">✓</span>
        <p><strong>Thank you!</strong> Your review of {itemName} is now on the store.</p>
      </section>
    );
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!rating) return setError('Choose 1 to 5 stars.');
    startTransition(async () => {
      const r = await submitReview(requestId, rating, comment, hideName);
      if (r.error) setError(r.error); else setDone(true);
    });
  }

  return (
    <form className="panel review-card" onSubmit={submit} noValidate>
      <div className="review-card__item">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {image ? <img src={image} alt="" className="review-card__img" /> : <span className="review-card__img" />}
        <div>
          <h2 className="review-card__name">{itemName}</h2>
          {orderNumber && <p className="hint" style={{ margin: 0 }}>From order {orderNumber}</p>}
        </div>
      </div>

      <fieldset className="choice">
        <legend className="choice__legend form-label--required">Your rating</legend>
        <div className="star-input" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className={`star-input__star${n <= shown ? ' is-on' : ''}`} onMouseEnter={() => setHover(n)}>
              <input type="radio" name={`${uid}-rating`} value={n} checked={rating === n}
                onChange={() => { setRating(n); setError(null); }} className="sr-only" />
              <span aria-hidden="true">★</span>
              <span className="sr-only">{n} {n === 1 ? 'star' : 'stars'}</span>
            </label>
          ))}
          <span className="star-input__word">{WORDS[shown]}</span>
        </div>
      </fieldset>

      <div className="choice">
        <label htmlFor={`${uid}-comment`} className="choice__legend form-label--required">Description</label>
        <textarea id={`${uid}-comment`} className="input textarea" rows={4} maxLength={1000} value={comment}
          onChange={(e) => setComment(e.target.value)} placeholder="What did you like? How is the fit and quality?" />
        <p className="hint dialog__counter">{comment.length}/1000</p>
      </div>

      <label className="checkbox">
        <input type="checkbox" checked={hideName} onChange={(e) => setHideName(e.target.checked)} />
        <span>Hide my name. The review shows as “Club member” instead of “{memberName}”.</span>
      </label>

      {error && <div className="message-strip message-strip--error" role="alert">{error}</div>}
      <div><button type="submit" className="btn btn--emphasized" disabled={pending}>{pending ? 'Saving…' : 'Submit Review'}</button></div>
    </form>
  );
}
