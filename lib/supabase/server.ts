import 'server-only';
import { createClient } from '@supabase/supabase-js';

export const ITEMS_TABLE = 'items';              // write here
export const ACTIVE_ITEMS_VIEW = 'items_active'; // ALWAYS read from here
export const IMAGE_BUCKET = 'item-images';

/** Server-side client using the service-role key. Never import this in a client component. */
export function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. See .env.local.example.');
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
