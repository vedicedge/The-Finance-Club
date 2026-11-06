import { NextResponse } from 'next/server';
import { getOrganiser } from '@/lib/auth/organiser';
import { canAccess } from '@/lib/auth/roles';
import { isR1Step } from '@/lib/round1/steps';
import { needing } from '@/lib/round1/lots';
import { loadRound1 } from '@/lib/round1/server';

/**
 * What the auction projector shows. Only public facts leave this handler: the current lot,
 * the last sale, who still needs the category, and headlines/Team-Ups already revealed.
 * Unrevealed news, tips and (until Round 1 locks, unless the setting allows) funds stay here.
 */
export async function GET() {
  const headers = { 'Cache-Control': 'no-store' };
  const organiser = await getOrganiser();
  if (!organiser || !canAccess(organiser.roles, 'screens')) {
    return NextResponse.json({ error: 'not_signed_in' }, { status: 401, headers });
  }
  const r1 = await loadRound1();
  const step = isR1Step(r1.step) ? r1.step : r1.locked ? 'locked' : null;
  const active = r1.agencies.filter((a) => a.status === 'active');
  const lotCard = r1.currentCardId ? r1.cards.find((c) => c.id === r1.currentCardId) : undefined;
  const last = r1.recent[0];
  const name = (id: string) => r1.agencies.find((a) => a.id === id)?.name ?? id;
  const showFunds = r1.locked || r1.settings.round1.showFundPublicly;

  return NextResponse.json(
    {
      phase: r1.phase,
      step,
      marqueeTotal: r1.cards.filter((c) => c.phase === 'marquee').length,
      lot: lotCard
        ? {
            id: lotCard.id,
            category: lotCard.category,
            gear_name: lotCard.gear_name,
            power: lotCard.power,
            min_bid: lotCard.min_bid,
            phase: lotCard.phase,
            lot_order: lotCard.lot_order,
            sold: r1.sold.has(lotCard.id),
            needing: needing(lotCard.category, active.map((a) => ({ id: a.id, held: Object.keys(a.held) }))),
          }
        : null,
      lastSale: last ? { card: last.card_id, gear_name: last.gear_name, agency: last.agency_id, agencyName: name(last.agency_id), price: last.price, at: last.sold_at } : null,
      news: r1.news
        .filter((n) => n.revealed_at && n.draw_order !== null)
        .sort((a, b) => a.draw_order! - b.draw_order!)
        .map((n) => ({ id: n.id, headline: n.headline, affects: n.affects_gear, delta: n.delta })),
      teamUps: r1.teamUps.filter((t) => t.revealed_at).map((t) => ({ name: t.name, bonus: t.bonus })),
      board: active
        .map((a) => ({ id: a.id, name: a.name, power: a.power.total, cards: a.power.cards, fund: showFunds ? a.fund : null }))
        .sort((a, b) => b.power - a.power || a.id.localeCompare(b.id)),
      // The Insider Tips window: when it closes and how many tips were bought (never who or which card).
      tips:
        step === 'tips'
          ? { closesAt: r1.tipsClosesAt, now: r1.now, sold: r1.agencies.filter((a) => a.tipNews).length }
          : null,
      locked: r1.locked,
    },
    { headers },
  );
}
