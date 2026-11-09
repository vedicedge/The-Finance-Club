import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { publicEnv } from '@/lib/env';

/**
 * The service-role client. It bypasses Row Level Security and can read the secret tables
 * (answer keys, card multipliers, X-Ray log, unrevealed news, tips, PIN hashes), so:
 *   - it exists only in server code (`server-only` makes a client import fail the build);
 *   - nothing it returns is passed to a browser without picking safe fields first.
 */
let cached: SupabaseClient | null = null;

export class MissingConfigError extends Error {
  constructor(what: string) {
    super(`Server is missing configuration: ${what}. See README → "Environment variables".`);
    this.name = 'MissingConfigError';
  }
}

export function serviceDb(): SupabaseClient {
  if (cached) return cached;
  const env = publicEnv();
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!env) throw new MissingConfigError('NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
  if (!secretKey) throw new MissingConfigError('SUPABASE_SECRET_KEY');
  cached = createClient(env.supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    // Never let Next.js cache a database read: scores, funds and quiz state must always be live.
    global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }) },
  });
  return cached;
}
