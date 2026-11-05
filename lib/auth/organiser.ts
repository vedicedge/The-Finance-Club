import 'server-only';
import { redirect } from 'next/navigation';
import { serviceDb } from '@/lib/db/server';
import { bootstrapAdminEmails } from '@/lib/env';
import { supabaseAuthClient } from '@/lib/auth/supabase-auth';
import { canAccess, isRole, type Area, type Role } from '@/lib/auth/roles';

export type Organiser = {
  userId: string;
  email: string;
  displayName: string | null;
  roles: Role[];
};

/**
 * The signed-in organiser, or null. Identity comes from a verified Supabase Auth token;
 * roles come from the organisers table (read with the service client).
 * An email listed in BOOTSTRAP_ADMIN_EMAILS gets an admin row on first sign-in.
 */
export async function getOrganiser(): Promise<Organiser | null> {
  const auth = await supabaseAuthClient();
  const { data, error } = await auth.auth.getClaims();
  const claims = data?.claims;
  if (error || !claims?.sub || typeof claims.email !== 'string') return null;

  const userId = claims.sub;
  const email = claims.email.toLowerCase();
  const db = serviceDb();

  const { data: row, error: rowError } = await db
    .from('organisers')
    .select('user_id, email, display_name, roles, active')
    .eq('user_id', userId)
    .maybeSingle();
  if (rowError) throw rowError;

  if (!row) {
    if (!bootstrapAdminEmails().includes(email)) return null;
    const { error: insertError } = await db
      .from('organisers')
      .insert({ user_id: userId, email, roles: ['admin'] });
    if (insertError) throw insertError;
    await db.from('audit_log').insert({
      actor: userId,
      actor_email: email,
      action: 'organiser.bootstrap_admin',
      payload: { email },
    });
    return { userId, email, displayName: null, roles: ['admin'] };
  }

  if (!row.active) return null;
  return {
    userId,
    email,
    displayName: row.display_name,
    roles: (row.roles as string[]).filter(isRole),
  };
}

/**
 * Use at the top of every organiser page and server action.
 * Not signed in → login page. Signed in without the role → the command centre with a notice.
 */
export async function requireOrganiser(area: Area): Promise<Organiser> {
  const organiser = await getOrganiser();
  if (!organiser) redirect('/admin/login');
  if (!canAccess(organiser.roles, area)) redirect(`/admin?denied=${area}`);
  return organiser;
}
