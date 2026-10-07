# Stage 5: Admin order management

1. Run `supabase/migrations/005_order_admin.sql` in the Supabase SQL Editor.
2. Extract this zip into the project with `tar -xf` (handles the [orderNumber] folder) and restart `npm run dev`.

New: app/admin/orders/*, lib/admin-orders.ts, lib/order-status.ts, lib/email/open-orders-email.ts,
components/AdminOrdersTable.tsx, EmailSummaryButton.tsx, OrderStatusActions.tsx
Updated: lib/format.ts, lib/types.ts, components/ShellBar.tsx, app/page.tsx, app/globals.css
