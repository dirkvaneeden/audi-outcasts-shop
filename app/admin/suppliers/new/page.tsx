import { SupplierForm } from '@/components/SupplierForm';
import { createSupplier } from '../actions';

export default function NewSupplierPage() {
  return <SupplierForm action={createSupplier} />;
}
