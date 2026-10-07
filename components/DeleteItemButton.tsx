'use client';

import { useTransition } from 'react';
import { markItemDeleted } from '@/app/items/actions';

export function DeleteItemButton({ id, name }: { id: string; name: string }) {
  const [pending, startTransition] = useTransition();

  function onDelete() {
    const ok = window.confirm(`Delete "${name}"?\n\nThe item is marked for deletion and no longer appears in any app.`);
    if (!ok) return;
    startTransition(async () => {
      const result = await markItemDeleted(id);
      if (result.error) window.alert(result.error);
    });
  }

  return (
    <button
      type="button"
      className="btn btn--transparent btn--negative"
      onClick={onDelete}
      disabled={pending}
      aria-label={`Delete ${name}`}
    >
      {pending ? 'Deleting…' : 'Delete'}
    </button>
  );
}
