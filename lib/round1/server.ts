import 'server-only';
import { serviceDb } from '@/lib/db/server';
import { parseSettings, type EventSettings } from '@/lib/settings';
import { CATEGORIES, isR1Step, type Category, type R1Step } from '@/lib/round1/steps';
import type { Lot } from '@/lib/round1/lots';

export type Card = Lot & { gear_name: string; power: number; min_bid: number };
export type Holding = { card_id: string; gear_name: string; power: number; price: number; phase: string; sale_id: number };
export type R1Agency = {
  id: string;
  name: string;
  status: string;
  eliminatedIn: string | null;
  fund: number;
  power: { cards: number; gear: number; teamUp: number; news: number; total: number };
  held: Partial<Record<Category, Holding>>;
  missing: Category[];
  tipNews: string | null;
};
export type News = { id: string; headline: string; affects_gear: string; delta: number; draw_order: number | null; revealed_at: string | null };
export type TeamUp = { id: number; name: string; gear_a: string; gear_b: string; bonus: number; revealed_at: string | null };
export type RecentSale = Holding & { agency_id: string; category: string; sold_at: string; ledger_entry_id: number };

export type Round1 = {
  phase: string;
  step: R1Step | 'locked' | null;
  currentCardId: string | null;
  prelimFrozen: boolean;
  locked: boolean;
  settings: EventSettings;
  fundsStarted: boolean;
  cards: Card[];
  sold: Set<string>;
  agencies: R1Agency[]; // every agency that reached Round 1 (active, or eliminated in round 1 or later)
  news: News[]; // SECRET until revealed: organiser screens only
  teamUps: TeamUp[]; // SECRET until revealed: organiser screens only
  recent: RecentSale[];
};

/**
 * Everything the auction console, the auction projector and the ledger check need.
 * Contains secrets (unrevealed news, Team-Ups, tips): never pass it whole to a browser.
 */
export async function loadRound1(): Promise<Round1> {
  const db = serviceDb();
  const [st, cards, held, agencies, funds, power, tips, news, teamUps, starts, sales] = await Promise.all([
    db.from('event_state').select('phase, step, current_card_id, prelim_frozen_at, round1_locked_at, settings').single(),
    db.from('gear_cards').select('id, category, gear_name, power, min_bid, phase, lot_order').order('id'),
    db.from('v_held_gear').select('agency_id, category, card_id, gear_name, power, price, phase, sale_id'),
    db.from('agencies').select('id, name, status, eliminated_in').order('id'),
    db.from('v_fund_left').select('agency_id, fund_left'),
    db.from('v_power_level').select('agency_id, cards, gear_power, team_up_bonus, news_delta, power_level'),
    db.from('insider_tips').select('agency_id, news_id').is('voided_at', null),
    db.from('breaking_news').select('id, headline, affects_gear, delta, draw_order, revealed_at').order('id'),
    db.from('team_ups').select('id, name, gear_a, gear_b, bonus, revealed_at').order('id'),
    db.from('v_ledger').select('id', { count: 'exact', head: true }).eq('reason', 'start_fund').eq('voided', false),
    db
      .from('sales')
      .select('id, card_id, agency_id, category, price, phase, sold_at, ledger_entry_id, gear_cards(gear_name, power)')
      .is('voided_at', null)
      .order('id', { ascending: false })
      .limit(10),
  ]);
  for (const r of [st, cards, held, agencies, funds, power, tips, news, teamUps, sales]) if (r.error) throw r.error;

  const fundOf = new Map((funds.data ?? []).map((f) => [f.agency_id as string, Number(f.fund_left)]));
  const powerOf = new Map((power.data ?? []).map((p) => [p.agency_id as string, p]));
  const tipOf = new Map((tips.data ?? []).map((t) => [t.agency_id as string, t.news_id as string]));
  const heldOf = new Map<string, Partial<Record<Category, Holding>>>();
  for (const h of held.data ?? []) {
    const m = heldOf.get(h.agency_id) ?? {};
    m[h.category as Category] = {
      card_id: h.card_id, gear_name: h.gear_name, power: h.power, price: Number(h.price), phase: h.phase, sale_id: h.sale_id,
    };
    heldOf.set(h.agency_id, m);
  }

  const inRound1 = (agencies.data ?? []).filter(
    (a) => a.status === 'active' || (a.status === 'eliminated' && a.eliminated_in !== 'prelim'),
  );
  const step = st.data?.step;
  return {
    phase: st.data?.phase ?? 'registration',
    step: isR1Step(step) || step === 'locked' ? step : null,
    currentCardId: st.data?.current_card_id ?? null,
    prelimFrozen: Boolean(st.data?.prelim_frozen_at),
    locked: Boolean(st.data?.round1_locked_at),
    settings: parseSettings(st.data?.settings),
    fundsStarted: (starts.count ?? 0) > 0,
    cards: (cards.data ?? []).map((c) => ({ ...c, min_bid: Number(c.min_bid) })) as Card[],
    sold: new Set((held.data ?? []).map((h) => h.card_id as string)),
    agencies: inRound1.map((a) => {
      const p = powerOf.get(a.id);
      const h = heldOf.get(a.id) ?? {};
      return {
        id: a.id,
        name: a.name,
        status: a.status,
        eliminatedIn: a.eliminated_in,
        fund: fundOf.get(a.id) ?? 0,
        power: {
          cards: p?.cards ?? 0, gear: p?.gear_power ?? 0, teamUp: p?.team_up_bonus ?? 0, news: p?.news_delta ?? 0, total: p?.power_level ?? 0,
        },
        held: h,
        missing: CATEGORIES.filter((c) => !h[c]),
        tipNews: tipOf.get(a.id) ?? null,
      };
    }),
    news: (news.data ?? []) as News[],
    teamUps: (teamUps.data ?? []) as TeamUp[],
    recent: (sales.data ?? []).map((s) => {
      const g = (Array.isArray(s.gear_cards) ? s.gear_cards[0] : s.gear_cards) as { gear_name: string; power: number } | null;
      return {
        sale_id: s.id, card_id: s.card_id, agency_id: s.agency_id, category: s.category, price: Number(s.price),
        phase: s.phase, sold_at: s.sold_at, ledger_entry_id: s.ledger_entry_id, gear_name: g?.gear_name ?? '', power: g?.power ?? 0,
      };
    }),
  };
}

/** Database error → the hint the SQL function raised, for organiser screens. */
export function dbMessage(error: { message?: string; hint?: string | null } | null | undefined): string {
  if (!error) return 'Unknown error.';
  return error.hint || error.message || 'Unknown error.';
}
