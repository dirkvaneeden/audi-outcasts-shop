'use client';

import { NOTE_MAX } from '@/lib/line-options';
import { Swatch } from '@/components/TagInput';

export type OptionValues = { size: string; colour: string; quantity: number; note: string };

/** Size, colour, quantity and note fields. Used by the Add to Cart dialog and the promotion pop-up. */
export function ItemOptionPicker({
  idPrefix, sizes, colours, value, onChange,
}: {
  idPrefix: string;
  sizes: string[];
  colours: string[];
  value: OptionValues;
  onChange: (next: Partial<OptionValues>) => void;
}) {
  return (
    <>
      {sizes.length > 0 && (
        <fieldset className="choice">
          <legend className="choice__legend form-label--required">Size</legend>
          <div className="choice__options">
            {sizes.map((s) => (
              <label key={s} className={`choice__option${value.size === s ? ' is-selected' : ''}`}>
                <input type="radio" name={`${idPrefix}-size`} value={s} checked={value.size === s}
                  onChange={() => onChange({ size: s })} className="sr-only" />
                {s}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {colours.length > 0 && (
        <fieldset className="choice">
          <legend className="choice__legend form-label--required">Colour</legend>
          <div className="choice__options">
            {colours.map((c) => (
              <label key={c} className={`choice__option${value.colour === c ? ' is-selected' : ''}`}>
                <input type="radio" name={`${idPrefix}-colour`} value={c} checked={value.colour === c}
                  onChange={() => onChange({ colour: c })} className="sr-only" />
                <Swatch colour={c} />{c}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <div className="choice">
        <span className="choice__legend" id={`${idPrefix}-qty`}>Quantity</span>
        <div className="stepper" role="group" aria-labelledby={`${idPrefix}-qty`}>
          <button type="button" className="stepper__btn" onClick={() => onChange({ quantity: Math.max(1, value.quantity - 1) })}
            disabled={value.quantity <= 1} aria-label="Decrease quantity">−</button>
          <span className="stepper__value" aria-live="polite">{value.quantity}</span>
          <button type="button" className="stepper__btn" onClick={() => onChange({ quantity: Math.min(99, value.quantity + 1) })}
            disabled={value.quantity >= 99} aria-label="Increase quantity">+</button>
        </div>
      </div>

      <div className="choice">
        <label htmlFor={`${idPrefix}-note`} className="choice__legend">Note (optional)</label>
        <textarea id={`${idPrefix}-note`} className="input textarea" rows={2} maxLength={NOTE_MAX}
          value={value.note} onChange={(e) => onChange({ note: e.target.value })}
          placeholder="e.g. Name or number to print, fit preference" />
        <p className="hint dialog__counter">{value.note.length}/{NOTE_MAX}</p>
      </div>
    </>
  );
}

/** Returns an error message when a required size or colour hasn't been chosen. */
export function missingOption(sizes: string[], colours: string[], v: OptionValues) {
  if (sizes.length && !v.size) return 'Choose a size.';
  if (colours.length && !v.colour) return 'Choose a colour.';
  return null;
}

export const initialOptions = (sizes: string[], colours: string[]): OptionValues => ({
  size: sizes.length === 1 ? sizes[0] : '',
  colour: colours.length === 1 ? colours[0] : '',
  quantity: 1,
  note: '',
});
