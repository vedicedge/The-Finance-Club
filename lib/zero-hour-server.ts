import 'server-only';
import { serviceDb } from '@/lib/db/server';
import { parseSettings } from '@/lib/settings';
import { rankHero, type HeroRow } from '@/lib/zero-hour';

export type RevealSlot = {
  order: number; // position in the reveal (ascending Power Level, ties by agency ID)
  agencyId: string;
  name: string;
  envelope: string;
  power: number;
  fund: number;
  revealed: null | { outcome: string; multiplier: number; hero: number };
};

/** The reveal as the projector and leaderboard may show it: multipliers only once opened. */
export async function loadReveal() {
  const db = serviceDb();
  const [st, holders, power, funds, agencies, heroes, m4] = await Promise.all([
    db.from('event_state').select('phase, settings').single(),
    db.from('v_envelope_holders').select('envelope_id, holder_agency_id'),
    db.from('v_power_level').select('agency_id, power_level'),
    db.from('v_fund_left').select('agency_id, fund_left'),
    db.from('agencies').select('id, name'),
    db.from('v_hero_scores').select('envelope_id, reveal_order, agency_id, outcome_label, multiplier, power_level, fund_left, hero_score'),
    db.from('missions').select('winner_agency_id, choice').eq('no', 4).single(),
  ]);
  for (const r of [st, holders, power, funds, agencies, heroes]) if (r.error) throw r.error;
  const powerOf = new Map((power.data ?? []).map((p) => [p.agency_id as string, p.power_level as number]));
  const fundOf = new Map((funds.data ?? []).map((f) => [f.agency_id as string, Number(f.fund_left)]));
  const nameOf = new Map((agencies.data ?? []).map((a) => [a.id as string, a.name as string]));
  const heroOf = new Map((heroes.data ?? []).map((h) => [h.envelope_id as string, h]));

  const slots: RevealSlot[] = (holders.data ?? [])
    .filter((h) => h.holder_agency_id)
    .map((h) => ({ envelope: h.envelope_id as string, agencyId: h.holder_agency_id as string }))
    .sort((a, b) => (powerOf.get(a.agencyId) ?? 0) - (powerOf.get(b.agencyId) ?? 0) || a.agencyId.localeCompare(b.agencyId))
    .map((h, i) => {
      const r = heroOf.get(h.envelope);
      return {
        order: i + 1,
        agencyId: h.agencyId,
        name: nameOf.get(h.agencyId) ?? h.agencyId,
        envelope: h.envelope,
        power: powerOf.get(h.agencyId) ?? 0,
        fund: fundOf.get(h.agencyId) ?? 0,
        revealed: r ? { outcome: r.outcome_label, multiplier: Number(r.multiplier), hero: Number(r.hero_score) } : null,
      };
    });

  const allOpen = slots.length > 0 && slots.every((s) => s.revealed);
  const final: HeroRow[] | null = allOpen
    ? rankHero(
        slots.map((s) => ({ agencyId: s.agencyId, name: s.name, hero: s.revealed!.hero, fund: s.fund, power: s.power })),
        parseSettings(st.data?.settings).zeroHour.heroTiebreak,
      )
    : null;
  const latest = [...(heroes.data ?? [])].sort((a, b) => b.reveal_order - a.reveal_order)[0]?.envelope_id ?? null;

  return {
    phase: st.data?.phase as string,
    slots,
    latest: latest as string | null,
    final,
    mission4: {
      winner: (m4.data?.winner_agency_id as string | null) ?? null,
      pending: Boolean(m4.data?.winner_agency_id) && !m4.data?.choice,
    },
  };
}
