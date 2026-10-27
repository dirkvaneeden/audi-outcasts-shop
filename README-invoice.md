# Invoice (no VAT) for paid orders
No database changes. Extract with `tar -xf`, run `npm run build`, then commit and push.
New: lib/invoice.ts, components/Invoice.tsx, components/PrintButton.tsx,
app/orders/[orderNumber]/invoice/page.tsx, app/admin/orders/[orderNumber]/invoice/page.tsx
Updated: app/orders/[orderNumber]/page.tsx, app/admin/orders/[orderNumber]/page.tsx, app/globals.css
