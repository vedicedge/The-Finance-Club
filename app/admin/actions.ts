'use server';

import { revalidatePath } from 'next/cache';
import { requireOrganiser } from '@/lib/auth/organiser';
import { serviceDb } from '@/lib/db/server';
import { audit } from '@/lib/audit';
import { isPhase } from '@/lib/phases';

/** Moves the event to another phase (admin only). Later milestones add the round-specific checks. */
export async function setPhase(formData: FormData): Promise<void> {
  const me = await requireOrganiser('settings');
  const phase = String(formData.get('phase') ?? '');
  if (!isPhase(phase)) throw new Error('Unknown phase.');
  if (formData.get('confirm') !== 'on') throw new Error('Tick the confirmation box to change the phase.');
  const { error } = await serviceDb()
    .from('event_state')
    .update({ phase, step: null, updated_at: new Date().toISOString(), updated_by: me.userId })
    .eq('id', true);
  if (error) throw error;
  await audit(me, 'event.phase', { phase });
  revalidatePath('/', 'layout');
}

/** Shows (or clears) the red alert banner on every public page. */
export async function setAlert(formData: FormData): Promise<void> {
  const me = await requireOrganiser('settings');
  const clear = formData.get('clear') === '1';
  const alert = clear ? null : String(formData.get('alert') ?? '').trim().slice(0, 200) || null;
  const { error } = await serviceDb()
    .from('event_state')
    .update({ alert, updated_at: new Date().toISOString(), updated_by: me.userId })
    .eq('id', true);
  if (error) throw error;
  await audit(me, 'event.alert', { alert });
  revalidatePath('/', 'layout');
}
