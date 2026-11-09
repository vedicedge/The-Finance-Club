'use server';

import { redirect } from 'next/navigation';
import { requireOrganiser } from '@/lib/auth/organiser';
import { serviceDb } from '@/lib/db/server';
import { audit } from '@/lib/audit';
import { dbMessage } from '@/lib/round1/server';
import { PODIUM_STEPS, placesAnnounced } from '@/lib/zero-hour';
import { loadReveal } from '@/lib/zero-hour-server';

const back = (p: Record<string, string>): never => redirect(`/admin/results?${new URLSearchParams(p)}`);
const PLACE = ['3rd', '2nd', '1st'];

/** Opens every envelope at once (privately) so the site can rank the finalists. */
export async function calculateResults() {
  const me = await requireOrganiser('reveal');
  const db = serviceDb();
  for (let i = 0; i < 8; i++) {
    const { error } = await db.rpc('zh_next_reveal', { p_actor: me.userId });
    if (error?.message.includes('all_revealed')) break;
    if (error) back({ error: dbMessage(error) });
  }
  await audit(me, 'zh.calculate', {});
  back({ ok: 'Results calculated. Only organisers see them until you announce each place.' });
}

async function current() {
  const st = await serviceDb().from('event_state').select('phase, step').single();
  if (st.data?.phase !== 'zero_hour') back({ error: 'Places are announced at Zero Hour.' });
  return placesAnnounced('zero_hour', st.data!.step as string | null);
}

/** Puts the next place on the projector: 3rd, then 2nd, then 1st. */
export async function announceNext() {
  const me = await requireOrganiser('reveal');
  const n = await current();
  if (n >= 3) back({ error: 'All three places are announced.' });
  if (!(await loadReveal()).final) back({ error: 'Calculate the results first.' });
  const { error } = await serviceDb().from('event_state').update({ step: PODIUM_STEPS[n] }).eq('id', true).eq('phase', 'zero_hour');
  if (error) back({ error: dbMessage(error) });
  await audit(me, 'zh.announce', { place: PLACE[n] });
  back({ ok: `${PLACE[n]} place is on the projector.` });
}

/** Takes the last announced place off the projector. */
export async function undoAnnounce() {
  const me = await requireOrganiser('reveal');
  const n = await current();
  if (n === 0) back({ error: 'Nothing is announced yet.' });
  const { error } = await serviceDb().from('event_state').update({ step: n > 1 ? PODIUM_STEPS[n - 2] : null }).eq('id', true).eq('phase', 'zero_hour');
  if (error) back({ error: dbMessage(error) });
  await audit(me, 'zh.announce_undo', { place: PLACE[n - 1] });
  back({ ok: `${PLACE[n - 1]} place taken off the projector.` });
}
