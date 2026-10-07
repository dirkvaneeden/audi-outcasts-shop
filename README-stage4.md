# Stage 4: Checkout, orders, order email, banking details

1. Run `supabase/migrations/004_orders.sql` in the Supabase SQL Editor.
2. Add RESEND_API_KEY, ORDER_EMAIL_FROM (and optionally ORDER_EMAIL_BCC) to .env.local.
3. Extract this zip into the project and restart `npm run dev`.
4. As admin, open Banking Details and save the store's account.

New: app/orders/*, app/admin/*, lib/orders.ts, lib/banks.ts, lib/email/*,
components/PlaceOrderButton.tsx, ResendEmailButton.tsx, BankDetailsForm.tsx
Updated: app/cart/page.tsx, app/page.tsx, components/ShellBar.tsx, lib/format.ts, lib/types.ts, app/globals.css
