'use server';

import { redirect } from 'next/navigation';
import { hasRole, requireOrganiser } from '@/lib/auth/organiser';
import { serviceDb } from '@/lib/db/server';
import { audit } from '@/lib/audit';
import { formatCrore } from '@/lib/money';
import { dbMessage } from '@/lib/round1/server';
import type { Role } from '@/lib/auth/roles';

const back = (params: Record<string, string>): never => redirect(`/admin/round3?${new URLSearchParams(params)}`);
type Result = PromiseLike<{ error: { message: string; hint?: string | null } | null }>;

async function run(roles: Role[], action: string, payload: Record<string, unknown>, call: (actor: string) => Result, ok: string) {
  const me = await requireOrganiser('round3');
  if (!hasRole(me, ...roles)) back({ error: `Only the ${roles.join(' or ').replace('_', ' ')} can do that.` });
  const { error } = await call(me.userId);
  if (error) back({ error: dbMessage(error) });
  await audit(me, action, payload);
  back({ ok });
}

/** Admin only: the secret multiplier map from the filled envelopes. */
export async function saveEnvelopeMap(formData: FormData) {
  const map = Object.fromEntries(
    Array.from({ length: 10 }, (_, i) => [`E${i + 1}`, String(formData.get(`E${i + 1}`) ?? '')]).filter(([, v]) => v), // E9–E10 only with 10 finalists
  );
  await run([], 'r3.envelope_map', {}, (actor) => serviceDb().rpc('r3_set_envelope_contents', { p_map: map, p_actor: actor }),
    'Multiplier map saved. It stays secret until Zero Hour.');
}

/** Admin only: a random map with one each of ×3, ×2, ×0.5 and ×0.25, and two each of ×1 and ×1.5, shuffled. */
export async function randomEnvelopeMap() {
  const { data } = await serviceDb().from('battle_outcomes').select('label, multiplier');
  const label = (m: number) => (data ?? []).find((o) => Number(o.multiplier) === m)?.label as string | undefined;
  const { count } = await serviceDb().from('agencies').select('id', { count: 'exact', head: true }).eq('status', 'active');
  const picks = [3, 2, 0.5, 0.25, 1, 1, 1.5, 1.5, ...((count ?? 0) > 8 ? [1, 1.5] : [])].map(label);
  if (picks.some((l) => !l)) back({ error: 'An outcome for ×3, ×2, ×1.5, ×1, ×0.5 or ×0.25 is missing.' });
  for (let i = picks.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [picks[i], picks[j]] = [picks[j], picks[i]];
  }
  const map = Object.fromEntries(picks.map((l, i) => [`E${i + 1}`, l!]));
  await run([], 'r3.envelope_map_random', {}, (actor) => serviceDb().rpc('r3_set_envelope_contents', { p_map: map, p_actor: actor }),
    'Random multiplier map saved. It stays secret until Zero Hour.');
}

export async function saveDeal(formData: FormData) {
  const map = Object.fromEntries([...formData.entries()].filter(([k]) => k.startsWith('deal_')).map(([k, v]) => [k.slice(5), String(v)]));
  await run(['ledger_keeper', 'scorer'], 'r3.deal', { map }, (actor) => serviceDb().rpc('r3_deal', { p_map: map, p_actor: actor }), 'Envelopes recorded.');
}

/**
 * One mini game's result: the winner (or "none") and the winner's decision. Swap moves the two
 * envelopes on the site, unless the target played its Force Field (then the swap is blocked and
 * the choice is used up); X-Ray is logged; cash is +₹5 Cr.
 */
export async function recordMinigame(no: number, formData: FormData) {
  const winner = String(formData.get('winner') ?? '');
  const choice = String(formData.get('choice') ?? '');
  if (!winner) back({ error: `Pick mini game ${no}'s winner (or "No winner").` });
  const none = winner === 'none';
  if (!none && !['swap', 'xray', 'cash'].includes(choice)) back({ error: 'Pick the winner’s decision: Swap, X-Ray or ₹5 Cr.' });
  const target = choice === 'swap' ? String(formData.get('swap_target') ?? '') : choice === 'xray' ? String(formData.get('xray_target') ?? '') : '';
  if (!none && choice !== 'cash' && !target) back({ error: choice === 'swap' ? 'Pick the team to swap with.' : 'Pick the team to X-Ray.' });
  const ff = choice === 'swap' && formData.get('ff_played') === 'on';
  const ok = none
    ? `Mini game ${no}: no winner.`
    : choice === 'cash'
      ? `Mini game ${no}: +₹5 Cr to ${winner}.`
      : choice === 'xray'
        ? `Mini game ${no}: ${winner} X-Rays ${target}'s envelope. Show it to them privately.`
        : ff
          ? `Mini game ${no}: ${target} played its Force Field. The swap is blocked and ${winner}'s choice is used up.`
          : `Mini game ${no}: ${winner} and ${target} swapped envelopes.`;
  await run(['ledger_keeper', 'scorer'], 'r3.minigame', { no, winner, choice: none ? 'none' : choice, target: target || null, ff }, (actor) =>
    serviceDb().rpc('r3_record_minigame', {
      p_mission: no, p_winner: none ? null : winner, p_choice: none ? 'none' : choice, p_target: target || null, p_ff_played: ff, p_actor: actor,
    }), ok);
}

/** Takes back the last recorded mini game (its swap, Force Field use or cash). */
export async function undoMinigame(no: number) {
  await run(['ledger_keeper', 'scorer'], 'r3.minigame_undo', { no }, (actor) => serviceDb().rpc('r3_undo_minigame', { p_mission: no, p_actor: actor }),
    `Mini game ${no} undone.`);
}

export async function transfer(formData: FormData) {
  const from = String(formData.get('from') ?? '');
  const to = String(formData.get('to') ?? '');
  const amount = Number(String(formData.get('amount') ?? '').replace(',', '.'));
  const note = String(formData.get('note') ?? '');
  await run(['ledger_keeper'], 'r3.transfer', { from, to, amount, note }, (actor) =>
    serviceDb().rpc('r3_transfer', { p_from: from, p_to: to, p_amount: amount, p_note: note, p_actor: actor }),
  `Transfer recorded: ${from} → ${to}, ${formatCrore(amount)}.`);
}

export async function fine(formData: FormData) {
  const agency = String(formData.get('agency') ?? '');
  const note = String(formData.get('note') ?? '');
  await run(['ledger_keeper'], 'r3.fine', { agency, note }, (actor) => serviceDb().rpc('r3_fine', { p_agency: agency, p_note: note, p_actor: actor }),
    `Fine: ${agency} −₹5 Cr.`);
}

/** Opens the one-minute window in which finalists buy their Force Field on My Agency. */
export async function openForceFieldWindow() {
  await run(['ledger_keeper'], 'r3.ff_window', {}, (actor) => serviceDb().rpc('r3_open_ff_window', { p_seconds: 60, p_actor: actor }),
    'Force Field window open for 60 seconds. Finalists buy on My Agency.');
}

/** Marks an agency's Force Field as played (or takes that back). */
export async function setForceFieldUsed(agency: string, used: boolean) {
  await run(['ledger_keeper'], 'r3.ff_used', { agency, used }, (actor) => serviceDb().rpc('r3_set_ff_used', { p_agency: agency, p_used: used, p_actor: actor }),
    used ? `${agency}'s Force Field is used.` : `${agency}'s Force Field is ready again.`);
}
