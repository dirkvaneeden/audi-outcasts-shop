# Stage 2: Member login

Members sign in with their email address and a one-time code (no passwords).
Only **active** members in the `members` table can sign in. Admins also get **Manage Items**.

## Files in this package
New: `proxy.ts`, `lib/auth.ts`, `lib/supabase/session.ts`, `app/login/page.tsx`,
`app/login/actions.ts`, `components/LoginForm.tsx`, `app/items/layout.tsx`,
`supabase/migrations/002_members.sql`, `supabase/seed/members_seed.sql`
Updated: `app/page.tsx`, `app/items/actions.ts`, `components/ShellBar.tsx`,
`app/globals.css`, `.env.local.example`

`members_seed.sql` contains members' personal data. Keep it out of public git repos.
