# Stage 3: Store catalogue + cart

Run `supabase/migrations/003_cart.sql` in the Supabase SQL Editor, then extract this zip into the project.

New: `app/cart/page.tsx`, `app/cart/actions.ts`, `lib/cart.ts`,
`components/AddToCartButton.tsx`, `components/CartQuantity.tsx`, `supabase/migrations/003_cart.sql`
Updated: `app/page.tsx` (now the store), `components/ShellBar.tsx` (cart button),
`lib/types.ts`, `app/globals.css`
