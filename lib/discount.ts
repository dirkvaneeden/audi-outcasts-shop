/** Promotion discount rules. Safe in client and server code. */

/** Highest discount (% of the selling price) that keeps the price at or above cost, i.e. the markup. */
export function maxDiscountPercent(sellingPrice: number, purchasePrice: number) {
  if (sellingPrice <= 0 || sellingPrice <= purchasePrice) return 0;
  return Math.floor(((sellingPrice - purchasePrice) / sellingPrice) * 10000) / 100;
}

/** Selling price after a discount, never below cost. Mirrors the item_prices view. */
export function discountedPrice(sellingPrice: number, purchasePrice: number, discountPercent: number) {
  if (!discountPercent) return sellingPrice;
  const p = Math.round(sellingPrice * (1 - discountPercent / 100) * 100) / 100;
  return Math.max(p, purchasePrice);
}
