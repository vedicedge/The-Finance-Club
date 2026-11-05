'use server';

import { revalidatePath } from 'next/cache';
import { requireOrganiser } from '@/lib/auth/organiser';
import { isRole, type Role } from '@/lib/auth/roles';
import { serviceDb } from '@/lib/db/server';
import { audit } from '@/lib/audit';

export type CrewState = { kind: 'idle' | 'ok' | 'error'; message?: string };

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function rolesFrom(formData: FormData): Role[] {
  return formData.getAll('roles').map(String).filter(isRole);
}

async function findUserIdByEmail(email: string): Promise<string | null> {
  const db = serviceDb();
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw error;
    const hit = data.users.find((u) => u.email?.toLowerCase() === email);
    if (hit) return hit.id;
    if (data.users.length < 100) return null;
  }
  return null;
}

export async function addCrewMember(_prev: CrewState, formData: FormData): Promise<CrewState> {
  const me = await requireOrganiser('users');
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const displayName = String(formData.get('display_name') ?? '').trim() || null;
  const password = String(formData.get('password') ?? '');
  const roles = rolesFrom(formData);

  if (!EMAIL.test(email)) return { kind: 'error', message: 'Enter a valid email.' };
  if (roles.length === 0) return { kind: 'error', message: 'Pick at least one role.' };
  if (password && password.length < 10) return { kind: 'error', message: 'Passwords need at least 10 characters.' };

  const db = serviceDb();
  const created = await db.auth.admin.createUser({ email, email_confirm: true, ...(password ? { password } : {}) });
  let userId = created.data.user?.id ?? null;
  if (!userId) {
    userId = await findUserIdByEmail(email);
    if (!userId) return { kind: 'error', message: created.error?.message ?? 'Could not create the sign-in.' };
    if (password) await db.auth.admin.updateUserById(userId, { password });
  }

  const { error } = await db
    .from('organisers')
    .upsert({ user_id: userId, email, display_name: displayName, roles, active: true }, { onConflict: 'user_id' });
  if (error) return { kind: 'error', message: error.message };

  await audit(me, 'crew.add', { email, roles, password_set: Boolean(password) });
  revalidatePath('/admin/users');
  return { kind: 'ok', message: `${email} joined the crew as ${roles.join(', ')}.` };
}

export async function updateCrewMember(userId: string, formData: FormData): Promise<void> {
  const me = await requireOrganiser('users');
  const roles = rolesFrom(formData);
  const active = formData.get('active') === 'on';
  const password = String(formData.get('password') ?? '');

  // Never let an admin lock themselves out.
  if (userId === me.userId && (!roles.includes('admin') || !active)) {
    throw new Error('You cannot remove your own admin role or deactivate yourself.');
  }

  const db = serviceDb();
  const { error } = await db.from('organisers').update({ roles, active }).eq('user_id', userId);
  if (error) throw error;
  if (password) {
    if (password.length < 10) throw new Error('Passwords need at least 10 characters.');
    const { error: pwError } = await db.auth.admin.updateUserById(userId, { password });
    if (pwError) throw pwError;
  }

  await audit(me, 'crew.update', { user_id: userId, roles, active, password_set: Boolean(password) });
  revalidatePath('/admin/users');
}
