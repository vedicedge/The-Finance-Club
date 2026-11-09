'use server';

import { redirect } from 'next/navigation';
import { hasRole, requireOrganiser } from '@/lib/auth/organiser';
import { serviceDb } from '@/lib/db/server';
import { audit } from '@/lib/audit';
import { dbMessage } from '@/lib/round1/server';
import { parseBuildTime } from '@/lib/round2/tower-board';
import { loadRound2 } from '@/lib/round2/server';
import type { Role } from '@/lib/auth/roles';

const back = (params: Record<string, string>): never => redirect(`/admin/round2?${new URLSearchParams(params)}`);

async function who(roles: Role[]) {
  const me = await requireOrganiser('round2');
  if (!hasRole(me, ...roles)) back({ error: `Only the ${roles.join(' or ').replace('_', ' ')} can do that.` });
  return me;
}

export async function drawPairings() {
  const me = await who(['social_lead']);
  const { data, error } = await serviceDb().rpc('r2_draw_pairings');
  if (error) back({ error: dbMessage(error) });
  await audit(me, 'r2.pairings', { duels: data });
  back({ ok: `Pairings drawn: ${data} duels.` });
}

export async function saveVotes(duel: number, formData: FormData) {
  const me = await who(['social_lead']);
  // A blank box is "not entered", never 0 votes.
  const count = (v: FormDataEntryValue | null) => (v === null || String(v).trim() === '' ? null : Number(v));
  const a = count(formData.get('votes_a'));
  const b = count(formData.get('votes_b'));
  const tiebreak = String(formData.get('tiebreak') ?? '') || null;
  const { error } = await serviceDb().rpc('r2_set_votes', { p_duel: duel, p_votes_a: a, p_votes_b: b, p_tiebreak: tiebreak });
  // On a refusal, send back what was typed so it stays in the boxes.
  if (error) back({ error: dbMessage(error), duel: String(duel), votes_a: String(formData.get('votes_a') ?? ''), votes_b: String(formData.get('votes_b') ?? '') });
  await audit(me, 'r2.votes', { duel, a, b, tiebreak });
  back({ ok: 'Votes saved.' });
}

export async function saveTower(agency: string, formData: FormData) {
  const me = await who(['scorer']);
  const n = (k: string) => Number(String(formData.get(k) ?? '').trim());
  const build = parseBuildTime(String(formData.get('build_time') ?? ''));
  // On a refusal, send back what was typed so the scorer only fixes the wrong box.
  const typed = Object.fromEntries(['correct', 'reference', 'build_time', 'fallen', 'frozen'].map((k) => [k, String(formData.get(k) ?? '')]));
  const refuse = (error: string): never => back({ error, row: agency, ...typed });
  const vals = { correct: n('correct'), reference: n('reference'), frozen: n('frozen'), fallen: n('fallen') };
  if (build === null || Object.values(vals).some((v) => !Number.isInteger(v) || v < 0)) {
    refuse(`${agency}: enter whole block counts and a build time like 6:05 (or DNF).`);
  }
  const { error } = await serviceDb().rpc('r2_save_tower', {
    p_agency: agency, p_correct: vals.correct, p_reference: vals.reference, p_build_time_s: build,
    p_frozen: vals.frozen, p_fallen: vals.fallen, p_actor: me.userId,
  });
  if (error) refuse(`${agency}: ${dbMessage(error).replace(/new row for relation "tower_results" violates check constraint.*/, 'check the block counts (correct ≤ reference, fallen ≤ frozen).')}`);
  await audit(me, 'r2.tower', { agency, ...vals, build });
  back({ ok: `${agency} saved.` });
}

export async function saveCutoff(formData: FormData) {
  const me = await who(['scorer']);
  const entries = [...formData.entries()].filter(([k]) => k.startsWith('rank_')).map(([k, v]) => [k.slice(5), Number(v)] as const);
  const ranks = entries.map(([, r]) => r);
  if (entries.length < 2 || new Set(ranks).size !== ranks.length || ranks.some((r) => !Number.isInteger(r) || r < 1 || r > entries.length)) {
    back({ error: `Give each tied agency a different place, 1 to ${entries.length}.` });
  }
  const db = serviceDb();
  for (const [agency, rank] of entries) {
    const { error } = await db.from('tower_results').update({ cutoff_rank: rank }).eq('agency_id', agency).eq('published', false);
    if (error) back({ error: error.message });
  }
  await audit(me, 'r2.cutoff', { entries });
  back({ ok: 'Cutoff order saved.' });
}

export async function publishRound2(formData: FormData) {
  const me = await who(['scorer']);
  if (formData.get('confirm') !== 'on') back({ error: 'Tick the confirmation to publish.' });
  const top = formData.get('top') === '10' ? 10 : 8; // the spec's 8, or 10 if the organisers choose
  const r2 = await loadRound2(top);
  if (!r2.board.qualifiers) back({ error: `Settle the tie at ${top}th place first.` });
  const { error } = await serviceDb().rpc('r2_publish', { p_qualifiers: r2.board.qualifiers, p_actor: me.userId, p_top: top });
  if (error) back({ error: dbMessage(error) });
  await audit(me, 'r2.publish', { qualifiers: r2.board.qualifiers, top });
  back({ ok: `Round 2 published. The top ${top} go to the Vault; poster bonuses credited.` });
}
