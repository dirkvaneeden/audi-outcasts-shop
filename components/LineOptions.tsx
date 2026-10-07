import { describeOptions } from '@/lib/line-options';
import type { LineOptions as Options } from '@/lib/types';

/** Size, colour and note under an item name in the cart and on orders. */
export function LineOptions({ size, colour, note }: Options) {
  const options = describeOptions({ size, colour });
  if (!options && !note) return null;
  return (
    <div className="line-options">
      {options && <span className="line-options__chosen">{options}</span>}
      {note && <span className="line-options__note">Note: {note}</span>}
    </div>
  );
}
