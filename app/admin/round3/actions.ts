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
  const map = Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8].map((i) => [`E${i}`, String(formData.get(`E${i}`) ?? '')]));
  await run([], 'r3.envelope_map', {}, (actor) => serviceDb().rpc('r3_set_envelope_contents', { p_map: map, p_actor: actor }),
    'Multiplier map saved. It stays secret until Zero Hour.');
}

export async function saveDeal(formData: FormData) {
  const map = Object.fromEntries([...formData.entries()].filter(([k]) => k.startsWith('deal_')).map(([k, v]) => [k.slice(5), String(v)]));
  await run(['ledger_keeper'], 'r3.deal', { map }, (actor) => serviceDb().rpc('r3_deal', { p_map: map, p_actor: actor }), 'Envelopes recorded.');
}

export async function setMissionStep(mission: number, step: string) {
  await run(['ledger_keeper', 'scorer'], 'r3.step', { mission, step }, () => serviceDb().rpc('r3_set_mission', { p_mission: mission, p_step: step }),
    `Mission ${mission}: ${step.replace('_', ' ')}.`);
}

export async function buyForceField(agency: string) {
  await run(['ledger_keeper'], 'r3.force_field', { agency }, (actor) => serviceDb().rpc('r3_force_field', { p_agency: agency, p_actor: actor }),
    `Force Field up for ${agency} (−₹5 Cr).`);
}

export async function setWinner(mission: number, formData: FormData) {
  const agency = String(formData.get('winner') ?? '');
  await run(['scorer'], 'r3.winner', { mission, agency: agency || null }, (actor) =>
    serviceDb().rpc('r3_set_winner', { p_mission: mission, p_agency: agency === 'none' ? null : agency, p_actor: actor }),
  agency === 'none' ? `Mission ${mission}: no correct sheet, no winner.` : `Mission ${mission} winner: ${agency}.`);
}

export async function makeChoice(mission: number, choice: 'swap' | 'xray' | 'cash', formData: FormData) {
  const target = String(formData.get('target') ?? '') || null;
  await run(['ledger_keeper'], 'r3.choice', { mission, choice, target }, (actor) =>
    serviceDb().rpc('r3_choose', { p_mission: mission, p_choice: choice, p_target: target, p_actor: actor }),
  choice === 'swap' ? `Swapped with ${target}.` : choice === 'xray' ? `X-Ray logged (secret). The marshal shows ${target}'s envelope.` : 'Cash: +₹6 Cr.');
}

export async function undoChoice(mission: number) {
  await run(['ledger_keeper'], 'r3.undo_choice', { mission }, (actor) => serviceDb().rpc('r3_undo_choice', { p_mission: mission, p_actor: actor }),
    `Mission ${mission} choice undone.`);
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
