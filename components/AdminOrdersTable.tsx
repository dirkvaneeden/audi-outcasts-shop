'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import type { AdminOrder } from '@/lib/types';
import { ORDER_STATUS_LABEL, primaryTransition, type OrderStatus } from '@/lib/order-status';
import { formatDate, formatMoney } from '@/lib/format';
import { setOrderStatus, type AdminActionResult } from '@/app/admin/orders/actions';

const DATE_COLUMN: Record<string, { label: string; field: keyof AdminOrder }> = {
  awaiting_payment: { label: 'Placed', field: 'created_at' },
  paid: { label: 'Paid', field: 'paid_at' },
  ordered: { label: 'Ordered', field: 'ordered_at' },
  delivered: { label: 'Delivered', field: 'delivered_at' },
  rejected: { label: 'Rejected', field: 'rejected_at' },
  all: { label: 'Placed', field: 'created_at' },
};

export function AdminOrdersTable({ orders, tab }: { orders: AdminOrder[]; tab: OrderStatus | 'all' }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<AdminActionResult>({});

  const bulk = tab === 'all' ? undefined : primaryTransition(tab);
  const dateCol = DATE_COLUMN[tab];
  const allSelected = orders.length > 0 && selected.size === orders.length;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function run(ids: string[], to: OrderStatus, label: string) {
    if (ids.length > 1 && !window.confirm(`${label}: ${ids.length} orders?`)) return;
    startTransition(async () => {
      const r = await setOrderStatus(ids, to);
      setResult(r);
      if (!r.error) setSelected(new Set());
    });
  }

  return (
    <>
      {bulk && (
        <div className="bulkbar">
          <span className="bulkbar__count">{selected.size ? `${selected.size} selected` : 'Select orders to update several at once'}</span>
          <button type="button" className="btn btn--emphasized" disabled={pending || selected.size === 0}
            onClick={() => run([...selected], bulk.to, bulk.label)}>
            {pending ? 'Updating…' : `${bulk.label}${selected.size ? ` (${selected.size})` : ''}`}
          </button>
        </div>
      )}
      {(result.error || result.info) && (
        <div className={`message-strip message-strip--inset ${result.error ? 'message-strip--error' : 'message-strip--success'}`}
          role={result.error ? 'alert' : 'status'}>
          {result.error ?? result.info}
        </div>
      )}

      <table className="rtable rtable--admin-orders">
        <thead>
          <tr>
            {bulk && (
              <th className="rtable__check">
                <input type="checkbox" aria-label="Select all orders" checked={allSelected}
                  onChange={() => setSelected(allSelected ? new Set() : new Set(orders.map((o) => o.id)))} />
              </th>
            )}
            <th>Order</th>
            <th>Member</th>
            <th>{dateCol.label}</th>
            <th className="num">Items</th>
            <th className="num">Total</th>
            <th>Status</th>
            <th className="rtable__actions"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => {
            const next = primaryTransition(o.status);
            const date = o[dateCol.field] as string | null;
            return (
              <tr key={o.id} className={selected.has(o.id) ? 'is-selected' : undefined}>
                {bulk && (
                  <td className="rtable__check">
                    <input type="checkbox" aria-label={`Select ${o.order_number}`}
                      checked={selected.has(o.id)} onChange={() => toggle(o.id)} />
                  </td>
                )}
                <td className="rtable__name">
                  <Link href={`/admin/orders/${o.order_number}`} className="link">{o.order_number}</Link>
                </td>
                <td data-label="Member">
                  {o.member.name}
                  <span className="rtable__desc">{o.member.member_number}</span>
                </td>
                <td data-label={dateCol.label}>{date ? formatDate(date) : '–'}</td>
                <td className="num" data-label="Items">{o.item_count}</td>
                <td className="num" data-label="Total">{formatMoney(o.total)}</td>
                <td data-label="Status"><span className={`status status--${o.status}`}>{ORDER_STATUS_LABEL[o.status]}</span></td>
                <td className="rtable__actions">
                  {next && (
                    <button type="button" className="btn btn--transparent" disabled={pending}
                      onClick={() => run([o.id], next.to, next.label)}>
                      {next.label}
                    </button>
                  )}
                  <Link href={`/admin/orders/${o.order_number}`} className="btn btn--transparent">Open</Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}
