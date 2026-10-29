'use client';

import { useState, useTransition } from 'react';
import { resendCollectionEmail, type AdminActionResult } from '@/app/admin/orders/actions';

/** Admin order page: send the "ready for collection" email again. */
export function CollectionEmailButton({ orderId }: { orderId: string }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<AdminActionResult>({});
  return (
    <div className="resend">
      <button type="button" className="btn" disabled={pending}
        onClick={() => startTransition(async () => setResult(await resendCollectionEmail(orderId)))}>
        {pending ? 'Sending…' : 'Resend Collection Email'}
      </button>
      {result.info && <p className="hint" role="status">{result.info}</p>}
      {result.error && <p className="field-error" role="alert">{result.error}</p>}
    </div>
  );
}
