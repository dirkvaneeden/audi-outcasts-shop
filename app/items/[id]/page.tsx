import { notFound } from 'next/navigation';
import { ItemForm } from '@/components/ItemForm';
import { supabaseAdmin, ACTIVE_ITEMS_VIEW } from '@/lib/supabase/server';
import type { Item } from '@/lib/types';
import { updateItem } from '../actions';

export const dynamic = 'force-dynamic';

export default async function EditItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Read from the active view: an item marked for deletion returns 404
  const { data } = await supabaseAdmin()
    .from(ACTIVE_ITEMS_VIEW)
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (!data) notFound();

  return <ItemForm item={data as Item} action={updateItem.bind(null, id)} />;
}
