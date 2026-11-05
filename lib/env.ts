/**
 * Environment variables. Public ones (NEXT_PUBLIC_*) are safe in the browser; the secret key
 * is read only by lib/db/server.ts, which is server-only.
 */

export type PublicEnv = { supabaseUrl: string; supabasePublishableKey: string };

export function publicEnv(): PublicEnv | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !supabasePublishableKey) return null;
  return { supabaseUrl, supabasePublishableKey };
}

/** Emails that become admins the first time they sign in (comma-separated). */
export function bootstrapAdminEmails(): string[] {
  return (process.env.BOOTSTRAP_ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}
