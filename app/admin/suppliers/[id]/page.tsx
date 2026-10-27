import { notFound } from 'next/navigation';
import { SupplierForm } from '@/components/SupplierForm';
import { getSupplier, itemCountsBySupplier } from '@/lib/suppliers';
import { updateSupplier } from '../actions';

export const dynamic = 'force-dynamic';

export default async function EditSupplierPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [supplier, counts] = await Promise.all([getSupplier(id), itemCountsBySupplier()]);
  if (!supplier) notFound();
  return <SupplierForm supplier={supplier} itemCount={counts.get(id) ?? 0} action={updateSupplier.bind(null, id)} />;
}
