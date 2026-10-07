'use server';

import { redirect } from 'next/navigation';
import { supabaseSession } from '@/lib/supabase/session';
import { supabaseAdmin } from '@/lib/supabase/server';

export type LoginState = {
  step: 'email' | 'code';
  email?: string;
  error?: string;
  info?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

async function isActiveMember(email: string) {
  const { data } = await supabaseAdmin()
    .from('members')
    .select('id')
    .eq('email', email)      // emails are stored in lower case (see 002_members.sql)
    .eq('active', true)
    .maybeSingle();
  return Boolean(data);
}

async function sendCode(email: string): Promise<LoginState> {
  if (!EMAIL_RE.test(email)) {
    return { step: 'email', email, error: 'Enter a valid email address.' };
  }
  if (!(await isActiveMember(email))) {
    return {
      step: 'email', email,
      error: 'This email isn’t registered to an active member. Use the email you joined with, or contact the club admin.',
    };
  }

  const supabase = await supabaseSession();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });
  if (error) {
    return { step: 'email', email, error: `The code could not be sent: ${error.message}` };
  }
  return { step: 'code', email, info: `We sent a sign-in code to ${email}.` };
}

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const intent = String(formData.get('intent') ?? 'send');
  const email = String(formData.get('email') ?? '').trim().toLowerCase();

  if (intent === 'change-email') return { step: 'email', email };
  if (intent === 'send' || intent === 'resend') return sendCode(email);

  // intent === 'verify'
  const token = String(formData.get('code') ?? '').replace(/\s/g, '');
  if (!/^\d{6,10}$/.test(token)) {
    return { step: 'code', email, error: 'Enter the code from the email (numbers only).' };
  }

  const supabase = await supabaseSession();
  const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
  if (error) {
    return { step: 'code', email, error: 'That code is incorrect or has expired. Check the email or send a new code.' };
  }

  redirect('/');
}

export async function signOut() {
  const supabase = await supabaseSession();
  await supabase.auth.signOut();
  redirect('/login');
}
