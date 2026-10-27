'use client';

/** Opens the browser's print dialog, where members can also choose "Save as PDF". */
export function PrintButton({ label = 'Print or Save as PDF' }: { label?: string }) {
  return (
    <button type="button" className="btn btn--emphasized" onClick={() => window.print()}>
      {label}
    </button>
  );
}
