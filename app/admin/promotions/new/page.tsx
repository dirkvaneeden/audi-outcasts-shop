import { PromotionForm } from '@/components/PromotionForm';
import { createPromotion } from '../actions';
import { promotionItemChoices } from '../items';

export const dynamic = 'force-dynamic';

export default async function NewPromotionPage() {
  const items = await promotionItemChoices();
  return <PromotionForm items={items} action={createPromotion} />;
}
