import Link from 'next/link';
import { requireMember } from '@/lib/auth';
import { getOpenReviewRequests } from '@/lib/reviews';
import { ReviewForm } from '@/components/ReviewForm';

export const dynamic = 'force-dynamic';

export default async function ReviewsPage() {
  const member = await requireMember();
  const requests = await getOpenReviewRequests(member.id);
  const parts = member.name.trim().split(/\s+/);
  const publicName = member.nickname?.trim() || `${parts[0]}${parts[1] ? ` ${parts[1][0]}.` : ''}`;

  return (
    <>
      <div className="page-header">
        <nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/" className="breadcrumbs__link">Store</Link></nav>
        <h1 className="page-header__title">Write a Review</h1>
        <p className="page-header__subtitle">Rate the products from your orders. Reviews appear on the store.</p>
      </div>
      <div className="page-body">
        {requests.length === 0 ? (
          <section className="panel no-data">
            <p>There’s nothing waiting for a review. Thank you!</p>
            <Link href="/" className="btn btn--emphasized">Back to the store</Link>
          </section>
        ) : (
          <div className="review-list">
            {requests.map((r) => (
              <ReviewForm key={r.id} requestId={r.id} itemName={r.item_name} image={r.item_image}
                orderNumber={r.order?.order_number ?? null} memberName={publicName} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
