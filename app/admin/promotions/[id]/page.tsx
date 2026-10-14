import { notFound } from 'next/navigation';
import { PromotionForm } from '@/components/PromotionForm';
import { getPromotion } from '@/lib/promotions';
import { updatePromotion } from '../actions';
import { promotionItemChoices } from '../items';

export const dynamic = 'force-dynamic';

export default async function EditPromotionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [promotion, items] = await Promise.all([getPromotion(id), promotionItemChoices()]);
  if (!promotion) notFound();
  return <PromotionForm promotion={promotion} items={items} action={updatePromotion.bind(null, id)} />;
}
