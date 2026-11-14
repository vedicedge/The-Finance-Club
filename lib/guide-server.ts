import 'server-only';
import { serviceDb } from '@/lib/db/server';
import { parseSettings } from '@/lib/settings';
import { isPhase } from '@/lib/phases';
import { isR1Step } from '@/lib/round1/steps';
import { lotPool, nextBidCard, bidCardsLeft } from '@/lib/round1/lots';
import { loadBidState, loadBids, settleBidding } from '@/lib/round1/bidding';
import { loadRound1 } from '@/lib/round1/server';
import { loadRound2 } from '@/lib/round2/server';
import { loadRound3 } from '@/lib/round3/server';
import { loadAnswerKeys, loadBoard, loadQuestions } from '@/lib/quiz/server';
import type { GuideSnapshot } from '@/lib/guide';

/**
 * Everything Simple mode needs to decide the next step, read with the service client. Only the
 * current phase's data is loaded. Answers are included only for viewers who may see them.
 */
export async function loadGuideSnapshot({ withAnswers }: { withAnswers: boolean }): Promise<GuideSnapshot> {
  const db = serviceDb();
  const [st, ag] = await Promise.all([
    db.from('event_state').select('phase, step, current_mission, prelim_published_at, prelim_frozen_at, settings').single(),
    db.from('agencies').select('status, is_test'),
  ]);
  if (st.error) throw st.error;
  const phase = isPhase(st.data.phase) ? st.data.phase : 'registration';
  const settings = parseSettings(st.data.settings);
  const mine = (ag.data ?? []).filter((a) => a.is_test === settings.dryRun.enabled);
  const snap: GuideSnapshot = {
    phase,
    step: (st.data.step as string | null) ?? null,
    now: Date.now(),
    dryRun: settings.dryRun.enabled,
    agencies: {
      total: mine.length,
      checkedIn: mine.filter((a) => a.status !== 'registered').length,
      active: mine.filter((a) => a.status === 'active').length,
    },
    quiz: { shuffled: false, slots: [], published: Boolean(st.data.prelim_published_at), frozen: Boolean(st.data.prelim_frozen_at), suddenDeathPending: false },
    r1: { fundsStarted: false, newsDrawn: false, tipsClosesAt: null, tipsSold: 0, locked: false, newsTotal: 0, newsRevealed: 0, teamUpsTotal: 0, teamUpsRevealed: 0, recapOn: false, lotsLeft: 0, sellable: 0, lot: null, buyers: [], missing: 0, bid: null, bidNext: null, bidLeft: 0 },
    r2: { duels: 0, duelsDecided: 0, towersNeeded: 0, towersEntered: 0, cutoffPending: false, published: false },
    r3: { multipliersEntered: false, dealt: false, mission: (st.data.current_mission as number | null) ?? null, finalists: [], missions: [] },
    zh: { opened: 0, total: 0 },
  };

  if (phase === 'prelim') {
    const [questions, keys] = await Promise.all([loadQuestions(), withAnswers ? loadAnswerKeys() : Promise.resolve(new Map<string, number>())]);
    const slotted = questions.filter((q) => q.order_no !== null && q.segment !== 'sudden_death' && q.status !== 'void').sort((a, b) => a.order_no! - b.order_no!);
    snap.quiz.shuffled = slotted.length > 0;
    snap.quiz.slots = slotted.map((q) => ({
      no: q.order_no!, id: q.id, prompt: q.prompt, options: q.options, answer: keys.get(q.id) ?? null,
      openedAt: q.opened_at ? Date.parse(q.opened_at) : null, timerS: q.timer_s, revealed: Boolean(q.revealed_at),
    }));
    if (snap.quiz.published && !snap.quiz.frozen) snap.quiz.suddenDeathPending = (await loadBoard()).qualifiers === null;
  }

  if (phase === 'round1') {
    await settleBidding();
    const [r1, bid] = await Promise.all([loadRound1(), loadBidState()]);
    const step = isR1Step(r1.step) ? r1.step : null;
    const bidSale = bid ? r1.recent.find((x) => x.card_id === bid.cardId) ?? null : null;
    const bidNext = step === 'secret' ? nextBidCard(r1.cards, r1.sold, r1.currentCardId, bid?.cardId ?? null) : null;
    const active = r1.agencies.filter((a) => a.status === 'active');
    const lot = r1.currentCardId ? r1.cards.find((c) => c.id === r1.currentCardId) ?? null : null;
    const drawn = r1.news.filter((n) => n.draw_order !== null);
    const pool = lotPool(r1.cards, r1.sold, step);
    const canBuy = (c: { category: string; min_bid: number }) => active.some((a) => a.missing.includes(c.category as never) && a.fund >= c.min_bid);
    snap.r1 = {
      fundsStarted: r1.fundsStarted,
      newsDrawn: drawn.length > 0,
      tipsClosesAt: r1.tipsClosesAt ? Date.parse(r1.tipsClosesAt) : null,
      tipsSold: r1.agencies.filter((a) => a.tipNews).length,
      locked: r1.locked,
      newsTotal: drawn.length,
      newsRevealed: drawn.filter((n) => n.revealed_at).length,
      teamUpsTotal: r1.teamUps.length,
      teamUpsRevealed: r1.teamUps.filter((t) => t.revealed_at).length,
      recapOn: r1.screen === 'news_recap',
      lotsLeft: pool.length,
      sellable: pool.filter(canBuy).length,
      lot: lot ? { id: lot.id, name: lot.card_name || lot.gear_name, category: lot.category, power: lot.power, minBid: lot.min_bid, sold: r1.sold.has(lot.id) } : null,
      buyers: lot ? active.filter((a) => a.missing.includes(lot.category as never) && a.fund >= lot.min_bid).map((a) => ({ id: a.id, name: a.name, fund: a.fund })) : [],
      missing: active.filter((a) => a.missing.length > 0).length,
      bid: bid
        ? {
            cardId: bid.cardId, closesAt: Date.parse(bid.closesAt), settled: bid.settled, count: (await loadBids(bid.cardId)).length,
            winner: bidSale?.agency_id ?? null, price: bidSale ? bidSale.price : null,
          }
        : null,
      bidNext: bidNext ? { id: bidNext.id, name: bidNext.card_name || bidNext.gear_name } : null,
      bidLeft: step === 'secret' ? bidCardsLeft(r1.cards, r1.sold, r1.currentCardId, bid?.cardId ?? null).length : 0,
    };
  }

  if (phase === 'round2') {
    const r2 = await loadRound2();
    const active = r2.field.filter((a) => a.status === 'active');
    snap.r2 = {
      duels: r2.duels.length,
      duelsDecided: r2.duels.filter((d) => d.winner !== null).length,
      towersNeeded: active.length,
      towersEntered: active.filter((a) => r2.raw.has(a.id)).length,
      cutoffPending: r2.board.qualifiers === null,
      published: r2.published,
    };
  }

  if (phase === 'round3' || phase === 'zero_hour') {
    const r3 = await loadRound3();
    snap.r3 = {
      multipliersEntered: r3.multipliersEntered,
      dealt: r3.dealt,
      mission: r3.mission,
      finalists: r3.finalists.map((f) => ({ id: f.id, name: f.name, forceFields: f.forceFields })),
      missions: r3.missions.map((m) => ({ no: m.no, name: m.name, winner: m.winner_agency_id, choice: m.choice })),
    };
  }

  if (phase === 'zero_hour') {
    const [reveals, holders] = await Promise.all([
      db.from('reveals').select('envelope_id', { count: 'exact', head: true }),
      db.from('v_envelope_holders').select('envelope_id').not('holder_agency_id', 'is', null),
    ]);
    snap.zh = { opened: reveals.count ?? 0, total: (holders.data ?? []).length };
  }
  return snap;
}
