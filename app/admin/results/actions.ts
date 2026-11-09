'use server';

import { redirect } from 'next/navigation';
import { requireOrganiser } from '@/lib/auth/organiser';
import { serviceDb } from '@/lib/db/server';
import { audit } from '@/lib/audit';
import { dbMessage } from '@/lib/round1/server';
import { RESULT_BUTTON, RESULT_STEPS, resultStage } from '@/lib/zero-hour';
import { loadReveal } from '@/lib/zero-hour-server';

const back = (p: Record<string, string>): never => redirect(`/admin/results?${new URLSearchParams(p)}`);

/** Opens every card at once (privately) so the site can rank the finalists. */
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
  if (st.data?.phase !== 'zero_hour') back({ error: 'The results are announced at Zero Hour.' });
  return resultStage('zero_hour', st.data!.step as string | null);
}

async function go(me: Awaited<ReturnType<typeof requireOrganiser>>, to: number, ok: string) {
  const { error } = await serviceDb().from('event_state').update({ step: RESULT_STEPS[to] }).eq('id', true).eq('phase', 'zero_hour');
  if (error) back({ error: dbMessage(error) });
  await audit(me, 'zh.announce', { stage: RESULT_STEPS[to] });
  back({ ok });
}

/** The next press: 3rd, 2nd, 1st, the final leaderboard, then the Doomsday cover. */
export async function announceNext() {
  const me = await requireOrganiser('reveal');
  const n = await current();
  if (n >= RESULT_STEPS.length - 1) back({ error: 'The Doomsday cover is already up.' });
  if (!(await loadReveal()).final) back({ error: 'Calculate the results first.' });
  await go(me, n + 1, `${RESULT_BUTTON[n]}: done.`);
}

/** Goes back one press. */
export async function undoAnnounce() {
  const me = await requireOrganiser('reveal');
  const n = await current();
  if (n === 0) back({ error: 'Nothing is announced yet.' });
  await go(me, n - 1, `Undone: ${RESULT_BUTTON[n - 1]}.`);
}
