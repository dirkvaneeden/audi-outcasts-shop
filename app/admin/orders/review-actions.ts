'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email/send';
import { buildReviewEmail } from '@/lib/email/review-email';
import { REVIEWABLE_STATUSES, siteUrl } from '@/lib/reviews';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ReviewCandidate = {
  orderId: string;
  orderNumber: string;
  memberName: string;
  status: string;
  items: {
    itemId: string;
    name: string;
    image: string | null;
    state: 'new' | 'requested' | 'reviewed';
  }[];
};

/** For the chosen orders: each member and the products they can be asked to review. */
export async function getReviewCandidates(orderIds: string[]): Promise<{ error?: string; candidates: ReviewCandidate[] }> {
  await requireAdmin();
  const ids = orderIds.filter((id) => UUID_RE.test(id)).slice(0, 100);
  if (!ids.length) return { error: 'Select at least one order.', candidates: [] };

  const supabase = supabaseAdmin();
  const [{ data: orders, error }, { data: requests }] = await Promise.all([
    supabase.from('orders')
      .select('id, order_number, status, member:members (name), order_lines (line_no, item_id, name, image_url, item:items (is_deleted))')
      .in('id', ids),
    supabase.from('review_requests').select('order_id, item_id, completed_at').in('order_id', ids),
  ]);
  if (error) return { error: error.message, candidates: [] };

  const reqState = new Map((requests ?? []).map((r) => [`${r.order_id}|${r.item_id}`, r.completed_at ? 'reviewed' : 'requested']));

  const candidates = ((orders ?? []) as unknown as {
    id: string; order_number: string; status: string; member: { name: string };
    order_lines: { line_no: number; item_id: string | null; name: string; image_url: string | null; item: { is_deleted: boolean } | null }[];
  }[]).map((o) => {
    const seen = new Set<string>();
    const items: ReviewCandidate['items'] = [];
    for (const l of [...o.order_lines].sort((a, b) => a.line_no - b.line_no)) {
      // One review per product per order (several sizes/colours count once); deleted items can't be reviewed
      if (!l.item_id || !l.item || l.item.is_deleted || seen.has(l.item_id)) continue;
      seen.add(l.item_id);
      items.push({
        itemId: l.item_id, name: l.name, image: l.image_url,
        state: (reqState.get(`${o.id}|${l.item_id}`) as 'requested' | 'reviewed' | undefined) ?? 'new',
      });
    }
    return { orderId: o.id, orderNumber: o.order_number, memberName: o.member.name, status: o.status, items };
  });

  return { candidates: candidates.sort((a, b) => a.orderNumber.localeCompare(b.orderNumber)) };
}

/** Sends one review email per order, for the products the admin ticked. */
export async function sendReviewRequests(
  selections: { orderId: string; itemIds: string[] }[],
): Promise<{ error?: string; info?: string }> {
  const admin = await requireAdmin();
  const chosen = selections
    .filter((s) => UUID_RE.test(s.orderId))
    .map((s) => ({ orderId: s.orderId, itemIds: [...new Set(s.itemIds.filter((i) => UUID_RE.test(i)))] }))
    .filter((s) => s.itemIds.length > 0);
  if (!chosen.length) return { error: 'Tick at least one product.' };

  const supabase = supabaseAdmin();
  const link = `${siteUrl()}/reviews`;
  const failed: string[] = [];
  let sent = 0;

  for (const sel of chosen) {
    const { data } = await supabase.from('orders')
      .select('id, order_number, status, member_id, member:members (name, nickname, email, active), order_lines (item_id, name, image_url)')
      .eq('id', sel.orderId).maybeSingle();
    const order = data as unknown as {
      id: string; order_number: string; status: string; member_id: string;
      member: { name: string; nickname: string | null; email: string; active: boolean };
      order_lines: { item_id: string | null; name: string; image_url: string | null }[];
    } | null;
    if (!order) { failed.push('Order not found'); continue; }
    if (!(REVIEWABLE_STATUSES as readonly string[]).includes(order.status)) { failed.push(`${order.order_number}: not paid yet`); continue; }
    if (!order.member.active) { failed.push(`${order.order_number}: member is inactive`); continue; }

    // Only products that are on this order and not reviewed yet
    const { data: existing } = await supabase.from('review_requests')
      .select('item_id, completed_at, send_count').eq('order_id', order.id);
    const done = new Set((existing ?? []).filter((r) => r.completed_at).map((r) => r.item_id as string));
    const items = sel.itemIds
      .map((id) => order.order_lines.find((l) => l.item_id === id))
      .filter((l): l is { item_id: string; name: string; image_url: string | null } => !!l && !done.has(l.item_id!));
    if (!items.length) { failed.push(`${order.order_number}: already reviewed`); continue; }

    try {
      const email = buildReviewEmail({
        member: order.member, orderNumber: order.order_number,
        items: items.map((i) => ({ name: i.name, image: i.image_url })), link,
      });
      await sendEmail({ to: order.member.email, replyTo: admin.email, ...email });

      const counts = new Map((existing ?? []).map((r) => [r.item_id as string, Number(r.send_count)]));
      const { error } = await supabase.from('review_requests').upsert(items.map((i) => ({
        order_id: order.id, member_id: order.member_id, item_id: i.item_id,
        item_name: i.name, item_image: i.image_url, sent_by: admin.id,
        sent_at: new Date().toISOString(), send_count: (counts.get(i.item_id) ?? 0) + 1,
      })), { onConflict: 'order_id,item_id' });
      if (error) throw new Error(error.message);
      sent++;
    } catch (e) {
      failed.push(`${order.order_number}: ${(e as Error).message}`);
    }
  }

  revalidatePath('/admin/orders', 'layout');
  const msg = `Review email sent to ${sent} ${sent === 1 ? 'member' : 'members'}.`;
  return failed.length
    ? { error: `${msg} Not sent for ${failed.length}: ${failed[0]}${failed.length > 1 ? ` (and ${failed.length - 1} more)` : ''}` }
    : { info: msg };
}
