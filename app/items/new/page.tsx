import { ItemForm } from '@/components/ItemForm';
import { listSuppliers } from '@/lib/suppliers';
import { createItem } from '../actions';

export const dynamic = 'force-dynamic';

export default async function NewItemPage() {
  const suppliers = await listSuppliers();
  return <ItemForm suppliers={suppliers} action={createItem} />;
}
