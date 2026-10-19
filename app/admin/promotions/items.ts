import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/server';

export type PromotionItemChoice = {
  id: string; name: string; image_url: string | null; selling_price: number; purchase_price: number;
};

/** Active items to choose from (deleted items never appear), with prices for the discount limit. */
export async function promotionItemChoices(): Promise<PromotionItemChoice[]> {
  const { data } = await supabaseAdmin()
    .from('items_active')
    .select('id, name, image_url, selling_price, purchase_price')
    .order('name');
  return (data ?? []).map((i) => ({
    ...i,
    selling_price: Number(i.selling_price),
    purchase_price: Number(i.purchase_price),
  })) as PromotionItemChoice[];
}
