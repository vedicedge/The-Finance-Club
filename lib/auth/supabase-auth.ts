import 'server-only';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { publicEnv } from '@/lib/env';
import { MissingConfigError } from '@/lib/db/server';

/**
 * Supabase Auth client bound to the request cookies, for organiser sign-in only.
 * It uses the publishable key and the organiser's own session; it is never used to read
 * event data (all event data goes through the service client after a role check).
 */
export async function supabaseAuthClient() {
  // Read cookies first: it marks the page as per-request even when configuration is missing.
  const cookieStore = await cookies();
  const env = publicEnv();
  if (!env) throw new MissingConfigError('NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
  return createServerClient(env.supabaseUrl, env.supabasePublishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options);
        } catch {
          // Called from a Server Component, where cookies are read-only. proxy.ts refreshes
          // the session on every organiser request, so this is safe to ignore.
        }
      },
    },
  });
}
