import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/server';
import type { LivePromotion, Promotion } from '@/lib/types';

/** Promotions running today that this member hasn't added or ignored yet. */
export async function getPromotionsForMember(memberId: string): Promise<LivePromotion[]> {
  const supabase = supabaseAdmin();
  const [{ data: live }, { data: answered }] = await Promise.all([
    supabase.from('promotions_live').select('*').order('starts_on', { ascending: true }),
    supabase.from('promotion_responses').select('promotion_id').eq('member_id', memberId),
  ]);
  const done = new Set((answered ?? []).map((r) => r.promotion_id as string));
  return ((live ?? []) as LivePromotion[])
    .filter((p) => !done.has(p.id))
    .map((p) => ({ ...p, selling_price: Number(p.selling_price), sizes: p.sizes ?? [], colours: p.colours ?? [] }));
}

/** Is this promotion running today? Returns its item id, or null. */
export async function getLivePromotionItem(promotionId: string): Promise<string | null> {
  const { data } = await supabaseAdmin()
    .from('promotions_live').select('item_id').eq('id', promotionId).maybeSingle();
  return (data?.item_id as string | undefined) ?? null;
}

const ADMIN_COLUMNS = `id, item_id, title, message, starts_on, ends_on, is_active, created_at,
  item:items (name, image_url, is_deleted),
  promotion_responses (response)`;

function toPromotion(row: Record<string, unknown>): Promotion {
  const responses = (row.promotion_responses as { response: string }[] | null) ?? [];
  const { promotion_responses: _r, ...rest } = row;
  return {
    ...(rest as unknown as Promotion),
    added: responses.filter((r) => r.response === 'added').length,
    ignored: responses.filter((r) => r.response === 'ignored').length,
  };
}

/** All promotions not marked for deletion, newest start date first. */
export async function listPromotions() {
  const { data, error } = await supabaseAdmin()
    .from('promotions')
    .select(ADMIN_COLUMNS)
    .eq('is_deleted', false)
    .order('starts_on', { ascending: false });
  return { promotions: (data ?? []).map((r) => toPromotion(r as Record<string, unknown>)), error: error?.message };
}

export async function getPromotion(id: string) {
  const { data } = await supabaseAdmin()
    .from('promotions')
    .select(ADMIN_COLUMNS)
    .eq('id', id)
    .eq('is_deleted', false)
    .maybeSingle();
  return data ? toPromotion(data as Record<string, unknown>) : null;
}

export type PromotionState = 'live' | 'scheduled' | 'ended' | 'off' | 'item-deleted';

export function promotionState(p: Pick<Promotion, 'starts_on' | 'ends_on' | 'is_active' | 'item'>, today: string): PromotionState {
  if (!p.item || p.item.is_deleted) return 'item-deleted';
  if (!p.is_active) return 'off';
  if (today < p.starts_on) return 'scheduled';
  if (today > p.ends_on) return 'ended';
  return 'live';
}
