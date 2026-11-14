import 'server-only';
import { serviceDb } from '@/lib/db/server';
import { parseSettings } from '@/lib/settings';
import { loadBoard } from '@/lib/quiz/server';
import { loadRound2, bestPoster } from '@/lib/round2/server';
import { loadReveal } from '@/lib/zero-hour-server';
import { placesAnnounced } from '@/lib/zero-hour';

/**
 * The public leaderboard (spec: "What everyone sees on the public leaderboard"). Only public
 * facts: never X-Ray targets, multipliers before the reveal, unrevealed news, or other agencies'
 * funds before Round 1 locks (unless the setting allows).
 */
export type Leaderboard = Awaited<ReturnType<typeof loadLeaderboard>>;

export async function loadLeaderboard() {
  const db = serviceDb();
  const { data: st, error } = await db
    .from('event_state')
    .select('phase, step, prelim_published_at, prelim_frozen_at, round1_locked_at, round2_published_at, settings')
    .single();
  if (error || !st) throw error;
  const settings = parseSettings(st.settings);
  const phase = st.phase as string;

  // The sections are independent: load them side by side.
  const [prelim, round1, round2, round3, zeroHour] = await Promise.all([
    st.prelim_published_at ? loadPrelim() : null,
    st.prelim_frozen_at && ['round1', 'round2', 'round3', 'zero_hour', 'ended'].includes(phase)
      ? loadRound1Board(Boolean(st.round1_locked_at) || settings.round1.showFundPublicly, Boolean(st.round1_locked_at))
      : null,
    st.round2_published_at ? loadRound2Board() : null,
    ['round3', 'zero_hour', 'ended'].includes(phase) ? loadRound3Board() : null,
    // Nothing from Zero Hour is public until the anchor has announced 1st place.
    placesAnnounced(phase, st.step as string | null) === 3 ? loadZeroHour() : null,
  ]);
  return { phase, prelim, round1, round2, round3, zeroHour, updatedAt: new Date().toISOString() };
}

async function loadPrelim() {
  return (await loadBoard()).rows.map((r) => ({ rank: r.rank, id: r.agencyId, name: r.name, points: r.total }));
}

async function loadRound1Board(showFunds: boolean, locked: boolean) {
  const db = serviceDb();
  const [agencies, power, funds] = await Promise.all([
    db.from('agencies').select('id, name, status, eliminated_in').or('status.eq.active,eliminated_in.neq.prelim'),
    db.from('v_power_level').select('agency_id, power_level, cards'),
    db.from('v_fund_left').select('agency_id, fund_left'),
  ]);
  const p = new Map((power.data ?? []).map((x) => [x.agency_id as string, x]));
  const f = new Map((funds.data ?? []).map((x) => [x.agency_id as string, Number(x.fund_left)]));
  return {
    locked,
    showFunds,
    rows: (agencies.data ?? [])
      .filter((a) => a.status === 'active' || a.status === 'eliminated')
      .map((a) => ({
        id: a.id as string,
        name: a.name as string,
        status: a.status as string,
        eliminatedIn: a.eliminated_in as string | null,
        power: (p.get(a.id)?.power_level as number) ?? 0,
        cards: (p.get(a.id)?.cards as number) ?? 0,
        fund: showFunds ? f.get(a.id) ?? 0 : null,
      }))
      .sort((a, b) => Number(b.status === 'active') - Number(a.status === 'active') || b.power - a.power || a.id.localeCompare(b.id)),
  };
}

async function loadRound2Board() {
  const r2 = await loadRound2();
  return {
    rows: r2.board.rows.map((r) => ({
      rank: r.rank, id: r.agencyId, name: r.name, score: Math.round(r.score * 100) / 100,
      a: Math.round(r.accuracy * 10) / 10, s: Math.round(r.speed * 10) / 10, d: Math.round(r.destruction * 10) / 10,
      qualified: r.qualified === true,
    })),
    bestPoster: bestPoster(r2.duels).map((b) => ({ id: b.id, name: r2.names.get(b.id) ?? b.id, votes: b.votes })),
  };
}

async function loadRound3Board() {
  const db = serviceDb();
  const [missions, names] = await Promise.all([
    db.from('v_public_missions').select('no, name, winner_agency_id, choice, swap_target, ff_blocked').order('no'),
    db.from('agencies').select('id, name'),
  ]);
  const n = new Map((names.data ?? []).map((a) => [a.id as string, a.name as string]));
  return {
    missions: (missions.data ?? []).map((m) => ({
      no: m.no as number,
      name: m.name as string,
      winner: m.winner_agency_id as string | null,
      winnerName: m.winner_agency_id ? n.get(m.winner_agency_id) ?? null : null,
      choice: m.choice as string | null, // swap target is public; X-Ray target never is
      swapTarget: m.swap_target as string | null,
      blocked: Boolean(m.ff_blocked),
    })),
  };
}

async function loadZeroHour() {
  const rv = await loadReveal();
  return {
    opened: rv.slots.filter((s) => s.revealed).map((s) => ({
      id: s.agencyId, name: s.name, envelope: s.envelope, outcome: s.revealed!.outcome,
      multiplier: s.revealed!.multiplier, power: s.power, fund: s.fund, hero: s.revealed!.hero,
    })),
    sealed: rv.slots.filter((s) => !s.revealed).length,
    final: rv.final?.map((r) => ({ rank: r.rank, id: r.agencyId, name: r.name, hero: r.hero, coinToss: r.coinToss })) ?? null,
  };
}
