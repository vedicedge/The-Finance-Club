'use server';

import { requireOrganiser } from '@/lib/auth/organiser';
import { serviceDb } from '@/lib/db/server';
import { audit } from '@/lib/audit';
import { dbMessage } from '@/lib/round1/server';

/** "The anchor clicks Next; the server writes a reveals row." */
export async function nextReveal(): Promise<{ ok: true; envelope: string } | { ok: false; error: string }> {
  const me = await requireOrganiser('reveal');
  const { data, error } = await serviceDb().rpc('zh_next_reveal', { p_actor: me.userId });
  if (error) return { ok: false, error: dbMessage(error) };
  await audit(me, 'zh.reveal', { envelope: data });
  return { ok: true, envelope: data as string };
}
