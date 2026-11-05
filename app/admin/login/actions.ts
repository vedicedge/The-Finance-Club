'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { supabaseAuthClient } from '@/lib/auth/supabase-auth';

export type LoginState = { kind: 'idle' | 'sent' | 'error'; message?: string };

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

async function origin() {
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host');
  const proto = h.get('x-forwarded-proto') ?? 'https';
  return `${proto}://${host}`;
}

export async function sendLoginLink(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  if (!EMAIL.test(email)) return { kind: 'error', message: 'That does not look like an email address.' };

  const supabase = await supabaseAuthClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false, emailRedirectTo: `${await origin()}/auth/confirm?next=/admin` },
  });
  // Same answer whether or not the address belongs to the crew, so the form can't be used
  // to discover who the organisers are.
  if (error && error.status === 429) {
    return { kind: 'error', message: 'Too many links requested. Wait a minute, or sign in with your password.' };
  }
  return { kind: 'sent', message: `If ${email} is on the crew list, a sign-in link is on its way.` };
}

export async function signInWithPassword(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');
  if (!EMAIL.test(email) || password.length === 0) {
    return { kind: 'error', message: 'Enter your crew email and password.' };
  }
  const supabase = await supabaseAuthClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { kind: 'error', message: 'Access denied. Check the email and password.' };
  redirect('/admin');
}

export async function signOut() {
  const supabase = await supabaseAuthClient();
  await supabase.auth.signOut();
  redirect('/admin/login');
}
