export function round(value: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * f) / f;
}

/** Selling price = purchase price x (1 + markup %). Mirrors the DB trigger. */
export function sellingFromMarkup(purchase: number, markupPercent: number): number {
  return round(purchase * (1 + markupPercent / 100), 2);
}

/** Markup % needed to reach a target selling price. */
export function markupFromSelling(purchase: number, selling: number): number {
  if (purchase <= 0) return 0;
  return round((selling / purchase - 1) * 100, 4);
}

/** Parses user input, accepting both "12.50" and "12,50". Returns NaN if empty/invalid. */
export function parseAmount(value: unknown): number {
  if (value === null || value === undefined) return NaN;
  const s = String(value).trim().replace(',', '.');
  return s === '' ? NaN : Number(s);
}
