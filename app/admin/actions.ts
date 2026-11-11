'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireOrganiser } from '@/lib/auth/organiser';
import { serviceDb } from '@/lib/db/server';
import { audit } from '@/lib/audit';
import { isPhase } from '@/lib/phases';
import { getEventState } from '@/lib/event-state';
import { serializeSettings } from '@/lib/settings';
import { NEXT_PHASE, canAdvance, isNextPhase } from '@/lib/phase-flow';
import { loadFlowState } from '@/lib/phase-flow-server';
import { isProjectorMode } from '@/lib/projector';

/** Moves the event to another phase (admin only). Later milestones add the round-specific checks. */
export async function setPhase(formData: FormData): Promise<void> {
  const me = await requireOrganiser('settings');
  const phase = String(formData.get('phase') ?? '');
  if (!isPhase(phase)) redirect('/admin?error=' + encodeURIComponent('Unknown phase.'));
  if (formData.get('confirm') !== 'on') {
    redirect('/admin?error=' + encodeURIComponent('Tick “I’m sure” next to the phase, then press Switch phase again.'));
  }
  const { error } = await serviceDb()
    .from('event_state')
    .update({ phase, step: null, updated_at: new Date().toISOString(), updated_by: me.userId })
    .eq('id', true);
  if (error) throw error;
  await audit(me, 'event.phase', { phase });
  revalidatePath('/', 'layout');
}

/** The "Start <next round>" button on a console: moves on only when the current round is finished. */
export async function goToPhase(to: string): Promise<void> {
  const me = await requireOrganiser('settings');
  if (!isNextPhase(to)) redirect('/admin?error=' + encodeURIComponent('Unknown phase.'));
  const state = await loadFlowState();
  if (!canAdvance(to, state)) {
    redirect(`${NEXT_PHASE[to].href}?error=${encodeURIComponent('Not ready to move on yet (or already moved). Reload the page.')}`);
  }
  const { error } = await serviceDb()
    .from('event_state')
    .update({ phase: to, step: null, updated_at: new Date().toISOString(), updated_by: me.userId })
    .eq('id', true)
    .eq('phase', NEXT_PHASE[to].from);
  if (error) throw error;
  await audit(me, 'event.phase', { phase: to, from: NEXT_PHASE[to].from });
  revalidatePath('/', 'layout');
  redirect(NEXT_PHASE[to].href);
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

/** Dry run mode on/off (admin): name-only test agencies for rehearsals. */
export async function setDryRun(enabled: boolean): Promise<void> {
  const me = await requireOrganiser('settings');
  const { settings } = await getEventState();
  const { error } = await serviceDb()
    .from('event_state')
    .update({
      settings: serializeSettings({ ...settings, dryRun: { enabled } }),
      updated_at: new Date().toISOString(),
      updated_by: me.userId,
    })
    .eq('id', true);
  if (error) throw error;
  await audit(me, enabled ? 'event.dry_run_on' : 'event.dry_run_off', {});
  revalidatePath('/', 'layout');
}

/** What the projector shows: 'auto' follows the phase; anything else pins that screen. */
export async function setProjector(mode: string): Promise<void> {
  const me = await requireOrganiser('projector');
  if (!isProjectorMode(mode)) redirect('/admin?error=' + encodeURIComponent('Unknown projector screen.'));
  const { error } = await serviceDb()
    .from('event_state')
    .update({ projector: mode, updated_at: new Date().toISOString(), updated_by: me.userId })
    .eq('id', true);
  if (error) {
    redirect(
      '/admin?error=' +
        encodeURIComponent('Could not switch the projector. Run the newest database update (8 November) in the Supabase SQL editor first.'),
    );
  }
  await audit(me, 'projector.mode', { mode });
  revalidatePath('/admin');
}
