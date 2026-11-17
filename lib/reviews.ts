import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/server';
import type { PublicReview, RatingStats } from '@/lib/types';

/** Statuses for which a member can be asked for a review (payment received). */
export const REVIEWABLE_STATUSES = ['paid', 'ordered', 'ready_for_collection', 'delivered'] as const;

/** Average rating and number of reviews per item id. */
export async function getRatingStats(): Promise<Map<string, RatingStats>> {
  const { data } = await supabaseAdmin().from('item_rating_stats').select('item_id, avg_rating, review_count');
  return new Map((data ?? []).map((r) => [
    r.item_id as string,
    { avg_rating: Number(r.avg_rating), review_count: Number(r.review_count) },
  ]));
}

export async function getItemReviews(itemId: string): Promise<PublicReview[]> {
  const { data } = await supabaseAdmin()
    .from('reviews_public')
    .select('id, item_id, rating, comment, created_at, reviewer_name')
    .eq('item_id', itemId)
    .order('created_at', { ascending: false });
  return (data ?? []) as PublicReview[];
}

/** Open review requests for a member (not yet reviewed, item still active). */
export async function getOpenReviewRequests(memberId: string) {
  const { data } = await supabaseAdmin()
    .from('review_requests')
    .select('id, item_id, item_name, item_image, sent_at, order:orders (order_number), item:items (is_deleted)')
    .eq('member_id', memberId)
    .is('completed_at', null)
    .order('sent_at', { ascending: false });
  return ((data ?? []) as unknown as {
    id: string; item_id: string; item_name: string; item_image: string | null; sent_at: string;
    order: { order_number: string } | null; item: { is_deleted: boolean } | null;
  }[]).filter((r) => r.item && !r.item.is_deleted);
}

/** The store's public address, for links in emails. */
export function siteUrl() {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/+$/, '');
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  return vercel ? `https://${vercel}` : 'http://localhost:3000';
}
