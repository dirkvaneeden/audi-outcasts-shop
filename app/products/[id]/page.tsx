import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireMember } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { getCartLines } from '@/lib/cart';
import { getItemReviews } from '@/lib/reviews';
import { formatDate } from '@/lib/format';
import type { CatalogueItem } from '@/lib/types';
import { AddToCartDialog } from '@/components/AddToCartDialog';
import { Price } from '@/components/Price';
import { Stars } from '@/components/StarRating';

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const member = await requireMember();
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  // catalogue only contains active items, so a deleted item returns 404
  const [{ data }, reviews, cart] = await Promise.all([
    supabaseAdmin().from('catalogue')
      .select('id, name, description, image_url, selling_price, sizes, colours, regular_price, discount_percent')
      .eq('id', id).maybeSingle(),
    getItemReviews(id),
    getCartLines(member.id),
  ]);
  if (!data) notFound();
  const item = data as CatalogueItem;
  const inCart = cart.lines.filter((l) => l.item_id === id).reduce((n, l) => n + l.quantity, 0);

  const count = reviews.length;
  const avg = count ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / count) * 10) / 10 : 0;
  const perStar = [5, 4, 3, 2, 1].map((n) => ({ n, c: reviews.filter((r) => r.rating === n).length }));

  return (
    <>
      <div className="page-header">
        <nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/" className="breadcrumbs__link">Store</Link></nav>
        <h1 className="page-header__title">{item.name}</h1>
      </div>
      <div className="page-body">
        <section className="panel product-detail">
          <div className="product-detail__image">
            {item.image_url
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={item.image_url} alt={item.name} />
              : <span className="product__noimage">No image</span>}
          </div>
          <div className="product-detail__info">
            {count > 0 && (
              <a href="#reviews" className="product__rating">
                <Stars value={avg} /> <span>{avg.toFixed(1)} from {count} {count === 1 ? 'review' : 'reviews'}</span>
              </a>
            )}
            {item.description && <p className="product-detail__desc">{item.description}</p>}
            {item.sizes?.length > 0 && <p className="hint">Sizes: {item.sizes.join(', ')}</p>}
            {item.colours?.length > 0 && <p className="hint">Colours: {item.colours.join(', ')}</p>}
            <p className="product__price product-detail__price">
              <Price price={item.selling_price} regular={item.regular_price} discount={item.discount_percent} />
            </p>
            <AddToCartDialog item={item} inCart={inCart} />
          </div>
        </section>

        <section className="panel" id="reviews" aria-labelledby="reviews-title">
          <div className="toolbar"><h2 id="reviews-title" className="toolbar__title">Reviews ({count})</h2></div>
          {count === 0 ? (
            <div className="no-data"><p>No reviews yet.</p></div>
          ) : (
            <>
              <div className="rating-summary">
                <div className="rating-summary__score">
                  <span className="rating-summary__avg">{avg.toFixed(1)}</span>
                  <Stars value={avg} size="lg" />
                  <span className="hint">{count} {count === 1 ? 'review' : 'reviews'}</span>
                </div>
                <ul className="rating-summary__bars">
                  {perStar.map(({ n, c }) => (
                    <li key={n}>
                      <span>{n} ★</span>
                      <span className="rating-summary__bar"><span style={{ width: `${(c / count) * 100}%` }} /></span>
                      <span className="hint">{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <ul className="review-items">
                {reviews.map((r) => (
                  <li key={r.id} className="review-item">
                    <div className="review-item__head">
                      <Stars value={r.rating} size="sm" />
                      <strong>{r.reviewer_name ?? 'Club member'}</strong>
                      <span className="hint">{formatDate(r.created_at)}</span>
                    </div>
                    <p className="review-item__text">{r.comment}</p>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>
    </>
  );
}
