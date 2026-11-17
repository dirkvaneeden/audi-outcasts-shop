import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase/server';
import { formatDate } from '@/lib/format';
import { Stars } from '@/components/StarRating';
import { ReviewHideButton } from '@/components/ReviewHideButton';

export const dynamic = 'force-dynamic';

type Row = {
  id: string; rating: number; comment: string; hide_name: boolean; is_deleted: boolean; created_at: string;
  item: { name: string } | null; member: { name: string; member_number: string } | null; order: { order_number: string } | null;
};

export default async function AdminReviewsPage() {
  const supabase = supabaseAdmin();
  const [{ data, error }, { count: waiting }] = await Promise.all([
    supabase.from('reviews')
      .select('id, rating, comment, hide_name, is_deleted, created_at, item:items (name), member:members (name, member_number), order:orders (order_number)')
      .order('created_at', { ascending: false }).limit(300),
    supabase.from('review_requests').select('id', { count: 'exact', head: true }).is('completed_at', null),
  ]);
  const reviews = (data ?? []) as unknown as Row[];

  return (
    <>
      <div className="page-header">
        <nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/" className="breadcrumbs__link">Store</Link></nav>
        <h1 className="page-header__title">Reviews</h1>
        <p className="page-header__subtitle">
          {reviews.length} reviews · {waiting ?? 0} requested and not answered yet. Ask for reviews from Manage Orders (Ready or Delivered tab).
        </p>
      </div>
      <div className="page-body">
        {error && <div className="message-strip message-strip--error" role="alert">{error.message}</div>}
        <section className="panel">
          {reviews.length === 0 ? (
            <div className="no-data"><p>No reviews yet.</p></div>
          ) : (
            <table className="rtable rtable--reviews">
              <thead><tr><th>Product</th><th>Rating</th><th>Review</th><th>Member</th><th>Date</th>
                <th className="rtable__actions"><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>
                {reviews.map((r) => (
                  <tr key={r.id} className={r.is_deleted ? 'is-muted' : undefined}>
                    <td className="rtable__name">{r.item?.name ?? '–'}{r.is_deleted && <span className="rtable__desc">Hidden from store</span>}</td>
                    <td data-label="Rating"><Stars value={r.rating} size="sm" /></td>
                    <td data-label="Review" className="rtable__review">{r.comment}</td>
                    <td data-label="Member">
                      {r.member?.name ?? '–'}
                      <span className="rtable__desc">{r.member?.member_number}{r.hide_name ? ' · name hidden' : ''}{r.order ? ` · ${r.order.order_number}` : ''}</span>
                    </td>
                    <td data-label="Date">{formatDate(r.created_at)}</td>
                    <td className="rtable__actions"><ReviewHideButton id={r.id} hidden={r.is_deleted} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </>
  );
}
