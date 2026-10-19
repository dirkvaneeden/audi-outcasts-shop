# Stage 9: Promotion discounts + payment reminders

1. Run `supabase/migrations/009_discounts_reminders.sql` in the Supabase SQL Editor.
2. Extract with `tar -xf`, run `npm run build`, then commit and push.

New: lib/discount.ts, components/Price.tsx, components/PaymentReminderButton.tsx
Updated: promotions (form, actions, list, lib), store page, Add to Cart dialog, promotion pop-up,
cart page, order pages (member + admin), Manage Orders table + actions, order email,
lib/types.ts, lib/cart.ts, lib/orders.ts, lib/admin-orders.ts, app/globals.css
