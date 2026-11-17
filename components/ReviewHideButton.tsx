'use client';

import { useTransition } from 'react';
import { setReviewHidden } from '@/app/admin/reviews/actions';

export function ReviewHideButton({ id, hidden }: { id: string; hidden: boolean }) {
  const [pending, start] = useTransition();
  return (
    <button type="button" className={`btn btn--transparent${hidden ? '' : ' btn--negative'}`} disabled={pending}
      onClick={() => {
        if (!hidden && !window.confirm('Hide this review from the store?')) return;
        start(async () => { const r = await setReviewHidden(id, !hidden); if (r.error) window.alert(r.error); });
      }}>
      {pending ? '…' : hidden ? 'Show on Store' : 'Hide'}
    </button>
  );
}
