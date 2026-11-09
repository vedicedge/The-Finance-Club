import 'server-only';
import { serviceDb } from '@/lib/db/server';
import { EVENT } from '@/lib/config';
import { parseSettings, type EventSettings } from '@/lib/settings';
import { CATEGORIES, type Category } from '@/lib/round1/steps';
import { loadCardNames, seriesOf } from '@/lib/cards';

/**
 * Data for the printable backup sheets. Every sheet prints only what organisers can already see
 * and what is safe on paper at the desk: no answer keys, no multipliers, no X-Ray targets, no
 * Insider Tip cards and no unrevealed Breaking News or Team-Ups. Those tables are never queried
 * here. Rows are for the current kind of agency: test agencies in dry run mode, real ones otherwise.
 */

export type PrintAgency = {
  id: string;
  name: string;
  status: string;
  eliminatedIn: string | null;
  checkedIn: boolean;
  founders: { name: string; section: string; captain: boolean }[];
};

export type PrintCard = {
  id: string;
  category: string;
  /** The card's series key (not printed). */
  gear_name: string;
  /** The card's own name (the series key before the 8 November database update). */
  card_name: string;
  /** Its series' display name. */
  series_name: string;
  power: number;
  min_bid: number;
  phase: 'marquee' | 'secret' | 'jugaad';
  lot_order: number | null;
};

const printedAtFormat = new Intl.DateTimeFormat('en-IN', {
  timeZone: EVENT.timeZone,
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
});

function check(...results: { error: unknown }[]) {
  for (const r of results) if (r.error) throw r.error;
}

export async function loadPrintBase(): Promise<{
  printedAt: string;
  settings: EventSettings;
  phase: string;
  agencies: PrintAgency[];
  flags: { prelimFrozen: boolean; round1Locked: boolean; round2Published: boolean };
}> {
  const db = serviceDb();
  const [st, ag] = await Promise.all([
    db.from('event_state').select('phase, settings, prelim_frozen_at, round1_locked_at, round2_published_at').single(),
    db.from('agencies').select('id, name, status, eliminated_in, is_test, checked_in_at, founders(name, section, is_captain)').order('id'),
  ]);
  check(st, ag);
  const settings = parseSettings(st.data?.settings);
  const dryRun = settings.dryRun.enabled;
  type Row = {
    id: string;
    name: string;
    status: string;
    eliminated_in: string | null;
    is_test: boolean;
    checked_in_at: string | null;
    founders: { name: string; section: string | null; is_captain: boolean }[];
  };
  const agencies = ((ag.data ?? []) as unknown as Row[])
    .filter((a) => a.is_test === dryRun)
    .map((a) => ({
      id: a.id,
      name: a.name,
      status: a.status,
      eliminatedIn: a.eliminated_in,
      checkedIn: Boolean(a.checked_in_at) || a.status !== 'registered',
      founders: [...a.founders]
        .sort((x, y) => Number(y.is_captain) - Number(x.is_captain))
        .map((f) => ({ name: f.name, section: f.section ?? '', captain: f.is_captain })),
    }));
  return {
    printedAt: printedAtFormat.format(new Date()),
    settings,
    phase: (st.data?.phase as string) ?? 'registration',
    agencies,
    flags: {
      prelimFrozen: Boolean(st.data?.prelim_frozen_at),
      round1Locked: Boolean(st.data?.round1_locked_at),
      round2Published: Boolean(st.data?.round2_published_at),
    },
  };
}

/** Agencies that reached Round 1 (the frozen top 16), in ID order. */
export function round1Field(agencies: PrintAgency[]) {
  return agencies.filter((a) => a.status === 'active' || (a.status === 'eliminated' && a.eliminatedIn !== null && a.eliminatedIn !== 'prelim'));
}

/** Agencies that reached Round 2. */
export function round2Field(agencies: PrintAgency[]) {
  return agencies.filter((a) => a.status === 'active' || a.eliminatedIn === 'round2' || a.eliminatedIn === 'round3');
}

/** Lots in running order: Marquee, then the secret cards, then the Jugaad Kits. */
export function lotSheetOrder(cards: PrintCard[]): PrintCard[] {
  const rank = { marquee: 0, secret: 1, jugaad: 2 } as const;
  return [...cards].sort(
    (a, b) => rank[a.phase] - rank[b.phase] || (a.lot_order ?? 999) - (b.lot_order ?? 999) || a.id.localeCompare(b.id),
  );
}

export type Holding = { card_id: string; price: number; slot?: string };
export type AuctionPrint = {
  cards: PrintCard[];
  shuffled: boolean;
  soldTo: Map<string, { agency: string; price: number; slot: string }>;
  /** Per agency: the card in each category, and every Jugaad Kit it took (one per missing category). */
  held: Map<string, Partial<Record<Category, Holding>> & { Jugaad?: Holding[] }>;
  tipBought: Set<string>;
  fund: Map<string, number>;
  power: Map<string, number>;
  startFunded: Set<string>;
};

export async function loadAuctionPrint(): Promise<AuctionPrint> {
  const db = serviceDb();
  const [cards, sales, tips, funds, power, starts, names] = await Promise.all([
    db.from('gear_cards').select('id, category, gear_name, power, min_bid, phase, lot_order').order('id'),
    db.from('sales').select('card_id, agency_id, category, price').is('voided_at', null),
    // Only whether a tip was bought: which news card it reveals is never read here.
    db.from('insider_tips').select('agency_id').is('voided_at', null),
    db.from('v_fund_left').select('agency_id, fund_left'),
    db.from('v_power_level').select('agency_id, power_level'),
    db.from('v_ledger').select('agency_id').eq('reason', 'start_fund').eq('voided', false),
    loadCardNames(),
  ]);
  check(cards, sales, tips, funds, power, starts);
  const list = (cards.data ?? []).map((c) => ({
    ...c, card_name: names.card.get(c.id) ?? c.gear_name, series_name: seriesOf(names, c.gear_name),
  })) as PrintCard[];
  const soldTo = new Map<string, { agency: string; price: number; slot: string }>();
  const held = new Map<string, Partial<Record<Category, Holding>> & { Jugaad?: Holding[] }>();
  for (const s of sales.data ?? []) {
    soldTo.set(s.card_id, { agency: s.agency_id, price: Number(s.price), slot: s.category });
    const m = held.get(s.agency_id) ?? {};
    const h = { card_id: s.card_id, price: Number(s.price), slot: s.category };
    if (String(s.card_id).startsWith('JK')) m.Jugaad = [...(m.Jugaad ?? []), h];
    else m[s.category as Category] = h;
    held.set(s.agency_id, m);
  }
  return {
    cards: lotSheetOrder(list),
    shuffled: list.some((c) => c.phase === 'secret' && c.lot_order !== null),
    soldTo,
    held,
    tipBought: new Set((tips.data ?? []).map((t) => t.agency_id as string)),
    fund: new Map((funds.data ?? []).map((f) => [f.agency_id as string, Number(f.fund_left)])),
    power: new Map((power.data ?? []).map((p) => [p.agency_id as string, Number(p.power_level)])),
    startFunded: new Set((starts.data ?? []).map((s) => s.agency_id as string)),
  };
}

export { CATEGORIES };

export type DuelPrint = { agency_a: string; agency_b: string | null; votes_a: number | null; votes_b: number | null; tiebreak_winner: string | null; winner: string | null };
export type TowerPrint = {
  agency_id: string;
  correct_blocks: number;
  reference_blocks: number;
  build_time_s: number;
  frozen_blocks: number;
  blocks_fallen: number;
};

export async function loadRound2Print() {
  const db = serviceDb();
  const [duels, towers, scores] = await Promise.all([
    db.from('poster_duels').select('agency_a, agency_b, votes_a, votes_b, tiebreak_winner, winner').order('id'),
    db.from('tower_results').select('agency_id, correct_blocks, reference_blocks, build_time_s, frozen_blocks, blocks_fallen'),
    db.from('v_tower_scores').select('agency_id, accuracy, speed, destruction, tower_score'),
  ]);
  check(duels, towers, scores);
  return {
    duels: (duels.data ?? []) as DuelPrint[],
    towers: new Map((towers.data ?? []).map((t) => [t.agency_id as string, t as TowerPrint])),
    scores: new Map(
      (scores.data ?? []).map((s) => [
        s.agency_id as string,
        { a: Number(s.accuracy), s: Number(s.speed), d: Number(s.destruction), score: Number(s.tower_score) },
      ]),
    ),
  };
}

export async function loadRound3Print() {
  const db = serviceDb();
  // v_public_missions shows a swap target only for swaps: X-Ray targets are never read here.
  const [holders, power, missions, ffs, outcomes] = await Promise.all([
    db.from('v_envelope_holders').select('envelope_id, holder_agency_id').order('envelope_id'),
    db.from('v_power_level').select('agency_id, power_level'),
    db.from('v_public_missions').select('no, name, winner_agency_id, choice, swap_target').order('no'),
    db.from('force_fields').select('agency_id, mission').is('voided_at', null),
    db.from('battle_outcomes').select('label, multiplier, envelopes, sort_order').order('sort_order'),
  ]);
  check(holders, power, missions, ffs, outcomes);
  const envelopeOf = new Map<string, string>();
  for (const h of holders.data ?? []) if (h.holder_agency_id) envelopeOf.set(h.holder_agency_id as string, h.envelope_id as string);
  return {
    envelopeOf,
    power: new Map((power.data ?? []).map((p) => [p.agency_id as string, Number(p.power_level)])),
    missions: (missions.data ?? []) as { no: number; name: string; winner_agency_id: string | null; choice: string | null; swap_target: string | null }[],
    forceFields: (ffs.data ?? []) as { agency_id: string; mission: number }[],
    outcomes: (outcomes.data ?? []) as { label: string; multiplier: number; envelopes: number }[],
  };
}

/**
 * The 8 finalists: the card holders once dealt, otherwise the agencies still in the game
 * after Round 2 is published, otherwise nobody yet (the sheet prints blank rows).
 */
export function finalists(agencies: PrintAgency[], envelopeOf: Map<string, string>, round2Published: boolean) {
  if (envelopeOf.size > 0) return agencies.filter((a) => envelopeOf.has(a.id));
  if (round2Published) return agencies.filter((a) => a.status === 'active');
  return [];
}

/** Zero Hour reveal order: ascending Power Level, ties by agency ID (website default). */
export function revealOrder<T extends { id: string }>(rows: T[], power: Map<string, number>): T[] {
  return [...rows].sort((a, b) => (power.get(a.id) ?? 0) - (power.get(b.id) ?? 0) || a.id.localeCompare(b.id));
}
