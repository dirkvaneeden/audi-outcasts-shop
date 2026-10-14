import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/server';

/** Active items to choose from (deleted items never appear). */
export async function promotionItemChoices() {
  const { data } = await supabaseAdmin()
    .from('items_active')
    .select('id, name, image_url, selling_price')
    .order('name');
  return (data ?? []).map((i) => ({ ...i, selling_price: Number(i.selling_price) })) as
    { id: string; name: string; image_url: string | null; selling_price: number }[];
}
