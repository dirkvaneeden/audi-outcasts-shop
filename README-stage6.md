# Stage 6: Sizes, colours and notes

1. Run `supabase/migrations/006_item_options.sql` in the Supabase SQL Editor.
2. Extract with `tar -xf` (handles the [orderNumber] folders) and restart `npm run dev`.

New: components/TagInput.tsx, components/AddToCartDialog.tsx, components/LineOptions.tsx, lib/line-options.ts
Updated: item form/actions/list, store page, cart (actions, page, quantity), order pages (member + admin),
both emails, lib/types.ts, lib/cart.ts, lib/orders.ts, lib/admin-orders.ts, app/globals.css
components/AddToCartButton.tsx is no longer used and can be deleted.
