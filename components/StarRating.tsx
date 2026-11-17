/** Read-only stars, e.g. 4.3 -> four full stars and a part-filled fifth. */
export function Stars({ value, size = 'md' }: { value: number; size?: 'sm' | 'md' | 'lg' }) {
  const pct = Math.max(0, Math.min(5, value)) / 5 * 100;
  return (
    <span className={`stars stars--${size}`} role="img" aria-label={`${value} out of 5 stars`}>
      <span className="stars__empty" aria-hidden="true">★★★★★</span>
      <span className="stars__full" aria-hidden="true" style={{ width: `${pct}%` }}>★★★★★</span>
    </span>
  );
}
