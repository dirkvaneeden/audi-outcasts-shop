import 'server-only';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

/**
 * Supabase client tied to the signed-in user's session (stored in cookies).
 * Use it for auth only (sign in, sign out, who is signed in).
 * Database reads/writes still go through supabaseAdmin() in server.ts.
 */
export async function supabaseSession() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Called from a Server Component, where cookies are read-only.
            // proxy.ts refreshes the session, so this is safe to ignore.
          }
        },
      },
    },
  );
}
