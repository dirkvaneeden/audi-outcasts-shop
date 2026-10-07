'use client';

import { useState } from 'react';
import { cleanOptions } from '@/lib/line-options';

type Props = {
  id: string;
  name: string;                // submitted as one form value per tag
  initial: string[];
  presets?: string[];          // quick-add buttons
  maxLength: number;
  placeholder?: string;
  swatches?: boolean;          // show a colour dot for recognisable colour names
};

/** Colour dot: browsers simply ignore names they don't know (e.g. "Racing Stripe"). */
export function Swatch({ colour }: { colour: string }) {
  return <span className="swatch" style={{ background: colour.toLowerCase().replace(/\s+/g, '') }} aria-hidden="true" />;
}

export function TagInput({ id, name, initial, presets = [], maxLength, placeholder, swatches }: Props) {
  const [values, setValues] = useState<string[]>(initial);
  const [draft, setDraft] = useState('');

  function add(raw: string) {
    // Allow pasting "S, M, L"
    const next = cleanOptions([...values, ...raw.split(',')], maxLength);
    setValues(next);
    setDraft('');
  }
  const remove = (v: string) => setValues(values.filter((x) => x !== v));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= values.length) return;
    const next = [...values];
    [next[i], next[j]] = [next[j], next[i]];
    setValues(next);
  };

  const has = (v: string) => values.some((x) => x.toLowerCase() === v.toLowerCase());
  const unusedPresets = presets.filter((p) => !has(p));

  return (
    <div className="tags">
      {values.map((v) => <input key={v} type="hidden" name={name} value={v} />)}

      {values.length > 0 && (
        <ul className="tags__list" aria-label="Added">
          {values.map((v, i) => (
            <li key={v} className="tag">
              {swatches && <Swatch colour={v} />}
              <span>{v}</span>
              <button type="button" className="tag__btn" onClick={() => move(i, -1)} disabled={i === 0}
                aria-label={`Move ${v} left`}>‹</button>
              <button type="button" className="tag__btn" onClick={() => move(i, 1)} disabled={i === values.length - 1}
                aria-label={`Move ${v} right`}>›</button>
              <button type="button" className="tag__btn tag__btn--remove" onClick={() => remove(v)}
                aria-label={`Remove ${v}`}>×</button>
            </li>
          ))}
        </ul>
      )}

      <div className="tags__entry">
        <input id={id} className="input" value={draft} maxLength={maxLength * 3} placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); if (draft.trim()) add(draft); }
          }}
          onBlur={() => { if (draft.trim()) add(draft); }} />
        <button type="button" className="btn" onClick={() => add(draft)} disabled={!draft.trim()}>Add</button>
      </div>

      {unusedPresets.length > 0 && (
        <div className="tags__presets">
          <span className="hint">Quick add:</span>
          {unusedPresets.map((p) => (
            <button key={p} type="button" className="chip" onClick={() => add(p)}>
              {swatches && <Swatch colour={p} />}+ {p}
            </button>
          ))}
          {unusedPresets.length > 1 && (
            <button type="button" className="chip chip--all" onClick={() => add(unusedPresets.join(','))}>Add all</button>
          )}
        </div>
      )}
    </div>
  );
}
