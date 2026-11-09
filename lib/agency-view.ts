import 'server-only';
import { placesAnnounced } from '@/lib/zero-hour';
import { serviceDb } from '@/lib/db/server';
import { withRunningBalance, type LedgerRow } from '@/lib/ledger';
import type { Category } from '@/lib/round1/steps';
import { rankTower } from '@/lib/round2/tower-board';
import { loadCardNames, seriesOf } from '@/lib/cards';

export type DossierGear = {
  category: Category;
  card_id: string;
  /** The card's series key (what news and Team-Ups match; not shown). */
  gear_name: string;
  /** The card's own name. */
  card_name: string;
  /** Its series' display name. */
  series_name: string;
  power: number;
  price: number;
  /** Revealed Breaking News changes to this card's Power. */
  news: { headline: string; delta: number }[];
};

export type DossierData = {
  prelim: { published: boolean; rank: number | null; total: number };
  ledger: (LedgerRow & { balance: number })[];
  fund: number;
  gear: DossierGear[];
  teamUps: { name: string; bonus: number }[];
  power: { gear: number; teamUp: number; news: number; total: number };
  /** This agency's own Insider Tip (eyes only), even before Breaking News. */
  tip: { id: string; headline: string; affects: string; delta: number } | null;
  /** The self-service Insider Tips window, while it is open (database time). */
  tipsWindow: { closesAt: string; serverNow: string } | null;
  round1Locked: boolean;
  round2: {
    duel: null | { opponent: string | null; opponentName: string | null; mine: number | null; theirs: number | null; won: boolean | null };
    published: boolean;
    tower: null | { a: number; s: number; d: number; score: number; rank: number; qualified: boolean };
    bonus: boolean;
  };
  round3: {
    envelope: string | null;
    swaps: { mission: number; gave: string; got: string; with: string }[];
    forceFields: number[];
    currentMission: number | null;
  };
  hero: null | { outcome: string; multiplier: number; hero: number };
};

/** Everything an agency may see about itself on My Agency. Only ever called for the signed-in agency. */
export async function loadDossier(agencyId: string): Promise<DossierData> {
  const db = serviceDb();
  const [st, ledger, gear, power, tip, news, teamUps, scores, duels, towers, holder, moves, ffs, hero, names, cardNames] = await Promise.all([
    db.from('event_state').select('phase, step, tips_closes_at, prelim_published_at, round1_locked_at, round2_published_at, current_mission').single(),
    db.from('v_ledger').select('id, agency_id, amount, reason, ref, note, created_at, voided, void_reason').eq('agency_id', agencyId),
    db.from('v_held_gear').select('category, card_id, gear_name, power, price').eq('agency_id', agencyId),
    db.from('v_power_level').select('gear_power, team_up_bonus, news_delta, power_level').eq('agency_id', agencyId).maybeSingle(),
    db.from('insider_tips').select('news_id, breaking_news(id, headline, affects_gear, delta)').eq('agency_id', agencyId).is('voided_at', null).maybeSingle(),
    db.from('v_public_news').select('headline, affects_gear, delta'),
    db.from('v_public_team_ups').select('name, gear_a, gear_b, bonus'),
    db.from('v_prelim_scores').select('agency_id, total_points, correct_time_s'),
    db.from('poster_duels').select('id, agency_a, agency_b, votes_a, votes_b, winner').or(`agency_a.eq.${agencyId},agency_b.eq.${agencyId}`),
    db.from('v_tower_scores').select('agency_id, accuracy, speed, destruction, tower_score, cutoff_rank, published'),
    db.from('v_envelope_holders').select('envelope_id').eq('holder_agency_id', agencyId).maybeSingle(),
    db.from('envelope_moves').select('envelope_id, mission, from_agency, to_agency, move_group').eq('kind', 'swap').is('voided_at', null)
      .or(`from_agency.eq.${agencyId},to_agency.eq.${agencyId}`).order('id'),
    db.from('force_fields').select('mission').eq('agency_id', agencyId).is('voided_at', null),
    db.from('v_hero_scores').select('outcome_label, multiplier, hero_score').eq('agency_id', agencyId).maybeSingle(),
    db.from('agencies').select('id, name, is_test'),
    loadCardNames(),
  ]);

  const rows = (ledger.data ?? []).map((r) => ({ ...r, amount: Number(r.amount) })) as LedgerRow[];
  const withBalance = withRunningBalance(rows); // oldest first
  const fund = withBalance.at(-1)?.balance ?? 0;
  const heldNames = new Set((gear.data ?? []).map((g) => g.gear_name as string));

  // Prelim rank: points desc, then correct-answer time asc (same as the board).
  let rank: number | null = null;
  // Rank among agencies of the same kind (test agencies in a dry run, real ones otherwise).
  const isTest = new Map((names.data ?? []).map((a) => [a.id as string, Boolean(a.is_test)]));
  const mine = isTest.get(agencyId) ?? false;
  const all = (scores.data ?? [])
    .filter((s) => (isTest.get(s.agency_id) ?? false) === mine)
    .map((s) => ({ id: s.agency_id as string, t: s.total_points as number, time: Number(s.correct_time_s) }));
  const me = all.find((s) => s.id === agencyId);
  if (me) rank = 1 + all.filter((s) => s.t > me.t || (s.t === me.t && s.time < me.time)).length;

  // Round 2: opponent once drawn; votes, tower and bonus only once published.
  const r2Published = Boolean(st.data?.round2_published_at);
  const d = duels.data?.[0];
  const nameOf = new Map((names.data ?? []).map((a) => [a.id as string, a.name as string]));
  const isA = d?.agency_a === agencyId;
  const opponent = d ? (isA ? d.agency_b : d.agency_a) : null;
  const towerBoard = r2Published
    ? rankTower((towers.data ?? []).map((x) => ({
        agencyId: x.agency_id, name: x.agency_id, score: Number(x.tower_score), accuracy: Number(x.accuracy),
        speed: Number(x.speed), destruction: Number(x.destruction), cutoffRank: x.cutoff_rank,
      })))
    : null;
  const myTower = towerBoard?.rows.find((r) => r.agencyId === agencyId);

  // Round 3: my swaps, as "gave Ex, got Ey, with Axx".
  type SwapParts = { mission: number; gave?: string; got?: string; with?: string };
  const groups = new Map<string, SwapParts>();
  for (const m of moves.data ?? []) {
    const g: SwapParts = groups.get(m.move_group) ?? { mission: m.mission as number };
    if (m.from_agency === agencyId) { g.gave = m.envelope_id; g.with = m.to_agency; }
    if (m.to_agency === agencyId) { g.got = m.envelope_id; g.with = m.from_agency; }
    groups.set(m.move_group, g);
  }

  const t = tip.data?.breaking_news as unknown as { id: string; headline: string; affects_gear: string; delta: number } | null;
  return {
    prelim: { published: Boolean(st.data?.prelim_published_at), rank, total: me?.t ?? 0 },
    ledger: [...withBalance].reverse(), // newest first on the page
    fund,
    gear: (gear.data ?? [])
      .map((g) => ({
        category: g.category as Category,
        card_id: g.card_id,
        gear_name: g.gear_name,
        card_name: cardNames.card.get(g.card_id) ?? g.gear_name,
        series_name: seriesOf(cardNames, g.gear_name),
        power: g.power,
        price: Number(g.price),
        news: (news.data ?? []).filter((n) => n.affects_gear === g.gear_name).map((n) => ({ headline: n.headline, delta: n.delta })),
      }))
      .sort((a, b) => ['HQ', 'Suit', 'Gadget', 'Sidekick'].indexOf(a.category) - ['HQ', 'Suit', 'Gadget', 'Sidekick'].indexOf(b.category)),
    teamUps: (teamUps.data ?? []).filter((u) => heldNames.has(u.gear_a) && heldNames.has(u.gear_b)).map((u) => ({ name: u.name, bonus: u.bonus })),
    power: {
      gear: power.data?.gear_power ?? 0,
      teamUp: power.data?.team_up_bonus ?? 0,
      news: power.data?.news_delta ?? 0,
      total: power.data?.power_level ?? 0,
    },
    tip: t ? { id: t.id, headline: t.headline, affects: seriesOf(cardNames, t.affects_gear), delta: t.delta } : null,
    tipsWindow:
      st.data?.phase === 'round1' && st.data?.step === 'tips' && !st.data?.round1_locked_at && st.data?.tips_closes_at &&
      Date.parse(st.data.tips_closes_at) > Date.now()
        ? { closesAt: st.data.tips_closes_at as string, serverNow: new Date().toISOString() }
        : null,
    round1Locked: Boolean(st.data?.round1_locked_at),
    round2: {
      duel: d
        ? {
            opponent,
            opponentName: opponent ? nameOf.get(opponent) ?? null : null,
            mine: r2Published ? (isA ? d.votes_a : d.votes_b) : null,
            theirs: r2Published ? (isA ? d.votes_b : d.votes_a) : null,
            won: r2Published ? d.winner === agencyId : null,
          }
        : null,
      published: r2Published,
      tower: myTower
        ? { a: myTower.accuracy, s: myTower.speed, d: myTower.destruction, score: myTower.score, rank: myTower.rank, qualified: myTower.qualified === true }
        : null,
      bonus: rows.some((r) => r.reason === 'poster_bonus' && !r.voided),
    },
    round3: {
      envelope: (holder.data?.envelope_id as string | undefined) ?? null,
      swaps: [...groups.values()]
        .filter((g) => g.gave && g.got && g.with)
        .map((g) => ({ mission: g.mission, gave: g.gave!, got: g.got!, with: g.with! })),
      forceFields: (ffs.data ?? []).map((f) => f.mission as number),
      currentMission: (st.data?.current_mission as number | null) ?? null,
    },
    // No result reaches a participant until the anchor has announced 1st place.
    hero: hero.data && placesAnnounced(st.data?.phase as string, st.data?.step as string | null) === 3
      ? { outcome: hero.data.outcome_label, multiplier: Number(hero.data.multiplier), hero: Number(hero.data.hero_score) }
      : null,
  };
}
