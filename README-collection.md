# Ready for collection
1. Run supabase/migrations/011_ready_for_collection.sql in the Supabase SQL Editor.
2. Extract with `tar -xf`, run `npm run build`, then commit and push.
New: lib/collection.ts, lib/email/collection-email.ts, components/CollectionEmailButton.tsx
Updated: lib/order-status.ts, lib/types.ts, lib/admin-orders.ts, lib/orders.ts, lib/invoice.ts,
app/admin/orders/actions.ts, app/admin/orders/[orderNumber]/page.tsx, app/orders/[orderNumber]/page.tsx,
components/AdminOrdersTable.tsx, app/globals.css
