import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/server';
import type { Supplier } from '@/lib/types';

/** Active suppliers (deleted ones never appear), by name. */
export async function listSuppliers(): Promise<Supplier[]> {
  const { data } = await supabaseAdmin()
    .from('suppliers_active')
    .select('id, name, contact_person, email, phone, notes')
    .order('name');
  return (data ?? []) as Supplier[];
}

export async function getSupplier(id: string): Promise<Supplier | null> {
  const { data } = await supabaseAdmin()
    .from('suppliers_active')
    .select('id, name, contact_person, email, phone, notes')
    .eq('id', id)
    .maybeSingle();
  return (data as Supplier | null) ?? null;
}

/** Number of active items per supplier id. */
export async function itemCountsBySupplier() {
  const { data } = await supabaseAdmin().from('items_active').select('supplier_id');
  const counts = new Map<string, number>();
  for (const r of data ?? []) {
    if (r.supplier_id) counts.set(r.supplier_id as string, (counts.get(r.supplier_id as string) ?? 0) + 1);
  }
  return counts;
}
