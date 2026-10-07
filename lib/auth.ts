import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { supabaseSession } from '@/lib/supabase/session';
import { supabaseAdmin } from '@/lib/supabase/server';

export const ACTIVE_MEMBERS_VIEW = 'members_active';

export type CurrentMember = {
  id: string;
  member_number: string;
  name: string;
  nickname: string | null;
  email: string;
  role: 'member' | 'admin';
};

/** The signed-in, active member, or null. Cached for the duration of one request. */
export const getCurrentMember = cache(async (): Promise<CurrentMember | null> => {
  const supabase = await supabaseSession();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabaseAdmin()
    .from(ACTIVE_MEMBERS_VIEW)
    .select('id, member_number, name, nickname, email, role')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  return (data as CurrentMember) ?? null;
});

/** Use at the top of any page or server action that needs a signed-in member. */
export async function requireMember(): Promise<CurrentMember> {
  const member = await getCurrentMember();
  if (!member) redirect('/login');
  return member;
}

/** Use at the top of any admin page or server action. */
export async function requireAdmin(): Promise<CurrentMember> {
  const member = await requireMember();
  if (member.role !== 'admin') redirect('/');
  return member;
}

export function displayName(m: Pick<CurrentMember, 'name' | 'nickname'>) {
  return m.nickname?.trim() || m.name.split(' ')[0];
}
