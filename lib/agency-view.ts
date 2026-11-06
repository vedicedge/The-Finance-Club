import 'server-only';
import { serviceDb } from '@/lib/db/server';
import { withRunningBalance, type LedgerRow } from '@/lib/ledger';
import type { Category } from '@/lib/round1/steps';

export type DossierGear = {
  category: Category;
  card_id: string;
  gear_name: string;
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
  round1Locked: boolean;
};

/** Everything an agency may see about itself on My Agency. Only ever called for the signed-in agency. */
export async function loadDossier(agencyId: string): Promise<DossierData> {
  const db = serviceDb();
  const [st, ledger, gear, power, tip, news, teamUps, scores] = await Promise.all([
    db.from('event_state').select('prelim_published_at, round1_locked_at').single(),
    db.from('v_ledger').select('id, agency_id, amount, reason, ref, note, created_at, voided, void_reason').eq('agency_id', agencyId),
    db.from('v_held_gear').select('category, card_id, gear_name, power, price').eq('agency_id', agencyId),
    db.from('v_power_level').select('gear_power, team_up_bonus, news_delta, power_level').eq('agency_id', agencyId).maybeSingle(),
    db.from('insider_tips').select('news_id, breaking_news(id, headline, affects_gear, delta)').eq('agency_id', agencyId).is('voided_at', null).maybeSingle(),
    db.from('v_public_news').select('headline, affects_gear, delta'),
    db.from('v_public_team_ups').select('name, gear_a, gear_b, bonus'),
    db.from('v_prelim_scores').select('agency_id, total_points, correct_time_s'),
  ]);

  const rows = (ledger.data ?? []).map((r) => ({ ...r, amount: Number(r.amount) })) as LedgerRow[];
  const withBalance = withRunningBalance(rows); // oldest first
  const fund = withBalance.at(-1)?.balance ?? 0;
  const heldNames = new Set((gear.data ?? []).map((g) => g.gear_name as string));

  // Prelim rank: points desc, then correct-answer time asc (same as the board).
  let rank: number | null = null;
  const all = (scores.data ?? []).map((s) => ({ id: s.agency_id as string, t: s.total_points as number, time: Number(s.correct_time_s) }));
  const me = all.find((s) => s.id === agencyId);
  if (me) rank = 1 + all.filter((s) => s.t > me.t || (s.t === me.t && s.time < me.time)).length;

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
    tip: t ? { id: t.id, headline: t.headline, affects: t.affects_gear, delta: t.delta } : null,
    round1Locked: Boolean(st.data?.round1_locked_at),
  };
}
