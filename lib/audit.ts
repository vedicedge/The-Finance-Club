import 'server-only';
import { serviceDb } from '@/lib/db/server';
import type { Organiser } from '@/lib/auth/organiser';

/** Every organiser write records who did it (spec: Security rules). */
export async function audit(actor: Organiser, action: string, payload: Record<string, unknown> = {}) {
  const { error } = await serviceDb()
    .from('audit_log')
    .insert({ actor: actor.userId, actor_email: actor.email, action, payload });
  if (error) throw error;
}
