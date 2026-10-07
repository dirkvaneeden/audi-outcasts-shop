'use client';

import { useState, useTransition } from 'react';
import { emailOpenOrdersSummary, type AdminActionResult } from '@/app/admin/orders/actions';

export function EmailSummaryButton() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<AdminActionResult>({});

  return (
    <div className="email-summary">
      <button type="button" className="btn" disabled={pending}
        onClick={() => startTransition(async () => setResult(await emailOpenOrdersSummary()))}>
        {pending ? 'Sending…' : 'Email Me Supplier List'}
      </button>
      {result.info && <span className="hint" role="status">{result.info}</span>}
      {result.error && <span className="field-error" role="alert">{result.error}</span>}
    </div>
  );
}
