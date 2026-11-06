import 'server-only';
import { serviceDb } from '@/lib/db/server';
import { parseSettings } from '@/lib/settings';

export const MISSION_STEPS = [
  { id: 'force_field', label: 'Force Field', length: '30 s' },
  { id: 'play', label: 'Play', length: '4 min' },
  { id: 'results', label: 'Results', length: '1 min' },
  { id: 'choice', label: 'Winner’s choice', length: '30 s' },
  { id: 'chai', label: 'Chai Pe Charcha', length: '1 min' },
] as const;

export type Mission = { no: number; name: string; winner_agency_id: string | null; choice: string | null; swap_target: string | null };
export type Finalist = { id: string; name: string; envelope: string | null; fund: number; power: number; forceFields: number[] };

/**
 * Round 3 for organiser screens. Includes the X-Ray log (organisers only). The multiplier map is
 * returned only when `withMultipliers` is set (admins).
 */
export async function loadRound3({ withMultipliers = false } = {}) {
  const db = serviceDb();
  const [st, agencies, holders, funds, power, missions, ffs, moves, xrays, contents, outcomes] = await Promise.all([
    db.from('event_state').select('phase, step, current_mission, settings').single(),
    db.from('agencies').select('id, name, status').order('id'),
    db.from('v_envelope_holders').select('envelope_id, holder_agency_id').order('envelope_id'),
    db.from('v_fund_left').select('agency_id, fund_left'),
    db.from('v_power_level').select('agency_id, power_level'),
    db.from('missions').select('no, name, winner_agency_id, choice, swap_target').order('no'),
    db.from('force_fields').select('agency_id, mission').is('voided_at', null),
    db.from('envelope_moves').select('envelope_id, mission, from_agency, to_agency, kind, created_at').eq('kind', 'swap').is('voided_at', null).order('id'),
    db.from('xray_log').select('mission, agency_id, target_agency_id').order('id'),
    withMultipliers ? db.from('envelope_contents').select('envelope_id, outcome_label') : db.from('envelope_contents').select('envelope_id', { count: 'exact', head: true }),
    db.from('battle_outcomes').select('label, multiplier, envelopes, sort_order').order('sort_order'),
  ]);
  for (const r of [st, agencies, holders, funds, power, missions, ffs, moves, xrays, contents, outcomes]) if (r.error) throw r.error;

  const fundOf = new Map((funds.data ?? []).map((f) => [f.agency_id as string, Number(f.fund_left)]));
  const powerOf = new Map((power.data ?? []).map((p) => [p.agency_id as string, p.power_level as number]));
  const envOf = new Map((holders.data ?? []).filter((h) => h.holder_agency_id).map((h) => [h.holder_agency_id as string, h.envelope_id as string]));
  const dealt = envOf.size > 0;
  const finalists: Finalist[] = (agencies.data ?? [])
    .filter((a) => (dealt ? envOf.has(a.id) : a.status === 'active'))
    .map((a) => ({
      id: a.id,
      name: a.name,
      envelope: envOf.get(a.id) ?? null,
      fund: fundOf.get(a.id) ?? 0,
      power: powerOf.get(a.id) ?? 0,
      forceFields: (ffs.data ?? []).filter((f) => f.agency_id === a.id).map((f) => f.mission as number),
    }));
  return {
    phase: st.data?.phase as string,
    step: (st.data?.step as string | null) ?? null,
    mission: (st.data?.current_mission as number | null) ?? null,
    settings: parseSettings(st.data?.settings),
    dealt,
    finalists,
    names: new Map((agencies.data ?? []).map((a) => [a.id as string, a.name as string])),
    missions: (missions.data ?? []) as Mission[],
    swaps: (moves.data ?? []) as { envelope_id: string; mission: number; from_agency: string; to_agency: string }[],
    xrays: (xrays.data ?? []) as { mission: number; agency_id: string; target_agency_id: string }[],
    multipliersEntered: withMultipliers ? (contents.data?.length ?? 0) === 8 : (contents.count ?? 0) === 8,
    multiplierMap: withMultipliers ? new Map(((contents.data ?? []) as { envelope_id: string; outcome_label: string }[]).map((c) => [c.envelope_id, c.outcome_label])) : null,
    outcomes: (outcomes.data ?? []) as { label: string; multiplier: number; envelopes: number }[],
  };
}
