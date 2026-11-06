import 'server-only';
import { serviceDb } from '@/lib/db/server';
import { rankTower, type TowerInput } from '@/lib/round2/tower-board';

export type Duel = {
  id: number;
  agency_a: string;
  agency_b: string | null;
  votes_a: number | null;
  votes_b: number | null;
  tiebreak_winner: string | null;
  winner: string | null;
};
export type TowerRaw = {
  agency_id: string;
  correct_blocks: number;
  reference_blocks: number;
  build_time_s: number;
  frozen_blocks: number;
  blocks_fallen: number;
  cutoff_rank: number | null;
};

export async function loadRound2() {
  const db = serviceDb();
  const [st, agencies, duels, raw, scores] = await Promise.all([
    db.from('event_state').select('phase, round2_published_at').single(),
    db.from('agencies').select('id, name, status, eliminated_in').order('id'),
    db.from('poster_duels').select('id, agency_a, agency_b, votes_a, votes_b, tiebreak_winner, winner').order('id'),
    db.from('tower_results').select('agency_id, correct_blocks, reference_blocks, build_time_s, frozen_blocks, blocks_fallen, cutoff_rank'),
    db.from('v_tower_scores').select('agency_id, accuracy, speed, destruction, tower_score'),
  ]);
  for (const r of [st, agencies, duels, raw, scores]) if (r.error) throw r.error;
  const names = new Map((agencies.data ?? []).map((a) => [a.id as string, a.name as string]));
  const published = Boolean(st.data?.round2_published_at);
  // Round 2 field: in the game now, or knocked out in Round 2.
  const field = (agencies.data ?? []).filter((a) => a.status === 'active' || a.eliminated_in === 'round2');
  const rawOf = new Map((raw.data ?? []).map((t) => [t.agency_id as string, t as TowerRaw]));
  const input: TowerInput[] = (scores.data ?? []).map((s) => ({
    agencyId: s.agency_id,
    name: names.get(s.agency_id) ?? s.agency_id,
    score: Number(s.tower_score),
    accuracy: Number(s.accuracy),
    speed: Number(s.speed),
    destruction: Number(s.destruction),
    cutoffRank: rawOf.get(s.agency_id)?.cutoff_rank ?? null,
  }));
  return {
    phase: st.data?.phase as string,
    published,
    names,
    field: field.map((a) => ({ id: a.id as string, name: a.name as string, status: a.status as string })),
    duels: (duels.data ?? []) as Duel[],
    raw: rawOf,
    board: rankTower(input),
  };
}

/** Most story votes at the cutoff (Best Launch Poster, recognition only). */
export function bestPoster(duels: Duel[]): { id: string; votes: number }[] {
  const all = duels.flatMap((d) => [
    { id: d.agency_a, votes: d.votes_a },
    ...(d.agency_b ? [{ id: d.agency_b, votes: d.votes_b }] : []),
  ]).filter((x): x is { id: string; votes: number } => typeof x.votes === 'number');
  const top = Math.max(-1, ...all.map((x) => x.votes));
  return top < 0 ? [] : all.filter((x) => x.votes === top);
}
