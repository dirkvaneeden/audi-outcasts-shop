import { ItemForm } from '@/components/ItemForm';
import { createItem } from '../actions';

export default function NewItemPage() {
  return <ItemForm action={createItem} />;
}
