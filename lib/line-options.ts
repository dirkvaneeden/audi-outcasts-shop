/** "Size L, Black". Empty when the line has no size or colour. Safe in client and server code. */
export function describeOptions({ size, colour }: { size?: string | null; colour?: string | null }) {
  return [size ? `Size ${size}` : '', colour ?? ''].filter(Boolean).join(', ');
}

/** Cleans a list of sizes/colours typed by an admin: trimmed, no blanks, no duplicates. */
export function cleanOptions(values: string[], maxLength: number, maxCount = 20) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const v = raw.trim().replace(/\s+/g, ' ').slice(0, maxLength);
    if (!v || seen.has(v.toLowerCase())) continue;
    seen.add(v.toLowerCase());
    out.push(v);
    if (out.length >= maxCount) break;
  }
  return out;
}

export const SIZE_PRESETS = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'];
export const COLOUR_PRESETS = ['Black', 'White', 'Grey', 'Navy', 'Red', 'Blue'];
export const NOTE_MAX = 200;
