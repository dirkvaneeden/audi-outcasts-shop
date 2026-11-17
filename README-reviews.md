# Optional collection email + product reviews
1. Run supabase/migrations/012_reviews.sql in the Supabase SQL Editor.
2. Optional: add NEXT_PUBLIC_SITE_URL=https://your-store-domain to .env.local and Vercel (used for the link in review emails;
   on Vercel the production domain is used automatically if this is not set).
3. Extract with `tar -xf`, run `npm run build`, then commit and push.
New: lib/reviews.ts, lib/email/review-email.ts, app/admin/orders/review-actions.ts, app/reviews/*, app/products/[id]/page.tsx,
app/admin/reviews/*, components/RequestReviewsDialog.tsx, ReviewForm.tsx, StarRating.tsx, ReviewHideButton.tsx
Updated: app/admin/orders/actions.ts, components/AdminOrdersTable.tsx, OrderStatusActions.tsx, CollectionEmailButton.tsx,
app/admin/orders/[orderNumber]/page.tsx, app/page.tsx, components/ShellBar.tsx, lib/types.ts, app/globals.css
