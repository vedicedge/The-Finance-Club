import { NextResponse, type NextRequest } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { supabaseAuthClient } from '@/lib/auth/supabase-auth';

/**
 * Where organiser sign-in links land. Handles both link styles Supabase can send:
 *   ?code=…                     (default PKCE link; open it in the same browser that asked for it)
 *   ?token_hash=…&type=email    (works on any device; needs the email template change in README)
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const next = url.searchParams.get('next');
  const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : '/admin';
  const supabase = await supabaseAuthClient();

  const code = url.searchParams.get('code');
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type') as EmailOtpType | null;

  let ok = false;
  if (code) {
    ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  } else if (tokenHash && type) {
    ok = !(await supabase.auth.verifyOtp({ token_hash: tokenHash, type })).error;
  }

  return NextResponse.redirect(new URL(ok ? safeNext : '/admin/login?link=expired', url.origin));
}
