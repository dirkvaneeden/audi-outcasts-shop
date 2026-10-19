import { formatMoney } from '@/lib/format';

/** Price, with the regular price struck through and a badge when a promotion discount applies. */
export function Price({
  price, regular, discount, className = '',
}: { price: number; regular?: number | null; discount?: number | null; className?: string }) {
  const onSale = !!discount && discount > 0 && regular != null && regular > price;
  if (!onSale) return <span className={className}>{formatMoney(price)}</span>;
  return (
    <span className={`price ${className}`}>
      <span className="price__now">{formatMoney(price)}</span>{' '}
      <s className="price__was" aria-label={`was ${formatMoney(regular!)}`}>{formatMoney(regular!)}</s>{' '}
      <span className="price__badge">−{Number(Number(discount).toFixed(2))}%</span>
    </span>
  );
}
