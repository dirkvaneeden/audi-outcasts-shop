import 'server-only';
import { cache } from 'react';
import { supabaseAdmin } from '@/lib/supabase/server';
import type { CartLine } from '@/lib/types';

/** The member's cart (active items only). Cached for one request. */
export const getCartLines = cache(async (memberId: string): Promise<{ lines: CartLine[]; error?: string }> => {
  const { data, error } = await supabaseAdmin()
    .from('cart_lines')
    .select('line_id, item_id, quantity, name, description, image_url, selling_price, line_total, size, colour, note, regular_price, discount_percent')
    .eq('member_id', memberId)
    .order('added_at', { ascending: true });

  if (error) return { lines: [], error: error.message };

  const lines = (data ?? []).map((l) => ({
    ...l,
    quantity: Number(l.quantity),
    selling_price: Number(l.selling_price),
    line_total: Number(l.line_total),
    regular_price: Number(l.regular_price ?? l.selling_price),
    discount_percent: Number(l.discount_percent ?? 0),
  })) as CartLine[];
  return { lines };
});

export function cartTotals(lines: CartLine[]) {
  const count = lines.reduce((n, l) => n + l.quantity, 0);
  const total = Math.round(lines.reduce((s, l) => s + l.line_total, 0) * 100) / 100;
  return { count, total };
}
