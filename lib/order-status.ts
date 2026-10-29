/** Order statuses, labels and the steps an admin may take. Safe to use in client components. */
export type OrderStatus = 'awaiting_payment' | 'paid' | 'ordered' | 'ready_for_collection' | 'delivered' | 'rejected' | 'cancelled';

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  awaiting_payment: 'Awaiting payment',
  paid: 'Paid',
  ordered: 'Ordered',
  ready_for_collection: 'Ready for collection',
  delivered: 'Delivered',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};

export type Transition = { to: OrderStatus; label: string; kind: 'primary' | 'negative' | 'undo' };

/** Must match set_order_status() in 005_order_admin.sql */
export const TRANSITIONS: Record<OrderStatus, Transition[]> = {
  awaiting_payment: [
    { to: 'paid', label: 'Mark as Paid', kind: 'primary' },
    { to: 'rejected', label: 'Reject', kind: 'negative' },
  ],
  paid: [
    { to: 'ordered', label: 'Mark as Ordered', kind: 'primary' },
    { to: 'rejected', label: 'Reject', kind: 'negative' },
    { to: 'awaiting_payment', label: 'Undo: Back to Unpaid', kind: 'undo' },
  ],
  ordered: [
    { to: 'ready_for_collection', label: 'Mark as Ready for Collection', kind: 'primary' },
    { to: 'paid', label: 'Undo: Back to Paid', kind: 'undo' },
  ],
  ready_for_collection: [
    { to: 'delivered', label: 'Mark as Delivered', kind: 'primary' },
    { to: 'ordered', label: 'Undo: Back to Ordered', kind: 'undo' },
  ],
  delivered: [{ to: 'ready_for_collection', label: 'Undo: Back to Ready for Collection', kind: 'undo' }],
  rejected: [{ to: 'awaiting_payment', label: 'Reopen as Unpaid', kind: 'undo' }],
  cancelled: [],
};

export const primaryTransition = (s: OrderStatus) => TRANSITIONS[s].find((t) => t.kind === 'primary');

export const ADMIN_TABS: { key: OrderStatus | 'all'; label: string }[] = [
  { key: 'awaiting_payment', label: 'Unpaid' },
  { key: 'paid', label: 'Paid' },
  { key: 'ordered', label: 'Ordered' },
  { key: 'ready_for_collection', label: 'Ready' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'all', label: 'All' },
];
