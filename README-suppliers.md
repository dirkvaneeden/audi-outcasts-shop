# Suppliers
1. Run supabase/migrations/010_suppliers.sql in the Supabase SQL Editor.
2. Extract with `tar -xf`, run `npm run build`, then commit and push.
New: app/admin/suppliers/*, lib/suppliers.ts, components/SupplierForm.tsx, components/SupplierListButton.tsx
Updated: item form, item actions (4 MB image limit kept), item list and item pages, Manage Orders page + actions,
lib/admin-orders.ts, lib/email/open-orders-email.ts, lib/email/send.ts, lib/types.ts, ShellBar, store page, app/globals.css
components/EmailSummaryButton.tsx is no longer used and can be deleted.
