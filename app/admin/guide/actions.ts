'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { requireOrganiser } from '@/lib/auth/organiser';
import { serviceDb } from '@/lib/db/server';
import { audit } from '@/lib/audit';
import { buildGuide, type GuideActionId } from '@/lib/guide';
import { mayPress, SIMPLE_COOKIE } from '@/lib/guide-rules';
import { loadGuideSnapshot } from '@/lib/guide-server';
import { dbMessage, loadRound1 } from '@/lib/round1/server';
import { BID_WINDOW_SECONDS, loadBidState, settleBidding } from '@/lib/round1/bidding';
import { isR1Step, TIPS_WINDOW_SECONDS, type R1Step } from '@/lib/round1/steps';
import { lotPool, nextLot, nextBidCard } from '@/lib/round1/lots';
import { loadBoard } from '@/lib/quiz/server';
import { loadRound2 } from '@/lib/round2/server';
import { canAdvance, type NextPhase } from '@/lib/phase-flow';
import { loadFlowState } from '@/lib/phase-flow-server';
import { formatCrore } from '@/lib/money';
import type { Phase } from '@/lib/phases';

/** The Simple mode switch in the header: remembered on this device for a month. */
export async function setSimpleMode(on: boolean, returnTo: string) {
  await requireOrganiser('dashboard');
  (await cookies()).set(SIMPLE_COOKIE, on ? '1' : '0', { path: '/', maxAge: 60 * 60 * 24 * 30, sameSite: 'lax', httpOnly: true });
  redirect(on ? '/admin' : returnTo.startsWith('/admin') ? returnTo : '/admin');
}

const done = (ok: string): never => redirect(`/admin?ok=${encodeURIComponent(ok)}`);
const fail = (error: string): never => redirect(`/admin?error=${encodeURIComponent(error)}`);
type Db = PromiseLike<{ data?: unknown; error: { message: string; hint?: string | null } | null }>;
async function call<T = unknown>(p: Db): Promise<T> {
  const r = await p;
  if (r.error) fail(dbMessage(r.error));
  return r.data as T;
}

async function movePhase(to: Exclude<Phase, 'registration'>, from: Phase, actor: string) {
  await call(serviceDb().from('event_state').update({ phase: to, step: null, updated_at: new Date().toISOString(), updated_by: actor }).eq('id', true).eq('phase', from));
  revalidatePath('/', 'layout');
}

/** Puts a Round 1 bidding step up, with its first lot on the projector. */
async function startStep(step: R1Step) {
  await call(serviceDb().from('event_state').update({ step, r1_screen: null }).eq('id', true));
  if (step === 'marquee' || step === 'secret' || step === 'last_call') {
    const r1 = await loadRound1();
    const active = r1.agencies.filter((a) => a.status === 'active');
    const first = lotPool(r1.cards, r1.sold, step).find((c) => active.some((a) => a.missing.includes(c.category as never) && a.fund >= c.min_bid)) ?? null;
    await call(serviceDb().from('event_state').update({ current_card_id: first?.id ?? null }).eq('id', true));
  }
}

/** Puts up the next lot that some team can still buy (skipping lots nobody needs or can afford). */
async function nextLotUp() {
  const r1 = await loadRound1();
  const step = isR1Step(r1.step) ? r1.step : null;
  const active = r1.agencies.filter((a) => a.status === 'active');
  const canBuy = (c: { category: string; min_bid: number }) => active.some((a) => a.missing.includes(c.category as never) && a.fund >= c.min_bid);
  let next = nextLot(r1.cards, r1.sold, step, r1.currentCardId);
  for (let i = 0; next && !canBuy(next) && i < r1.cards.length; i++) next = nextLot(r1.cards, r1.sold, step, next.id);
  if (next && !canBuy(next)) next = null;
  await call(serviceDb().from('event_state').update({ current_card_id: next?.id ?? null }).eq('id', true));
  return next?.id ?? null;
}

/**
 * Every Simple-mode button. It acts only if the step it was shown on is still the current one
 * (so a double tap, or two crew pressing at once, cannot do a step twice), with the same role
 * rules and database functions as the full console's own buttons.
 */
export async function guideDo(action: GuideActionId, arg: string, formData: FormData) {
  const me = await requireOrganiser('dashboard');
  if (!mayPress(me.roles, action)) fail('That step needs a different role. Ask the person shown on the card, or an admin.');

  const snap = await loadGuideSnapshot({ withAnswers: false });
  const now = buildGuide(snap).now;
  if (String(formData.get('key') ?? '') !== now.key) done('Already done. Here is the next step.');
  const button = now.buttons.find((b) => b.action === action && (b.arg ?? '') === arg);
  const formAction = (now.form === 'sale' && action === 'r1-sale') || (now.form === 'force-fields' && action === 'r3-ff-buy') ||
    (now.form === 'winner' && action === 'r3-winner') || (now.form === 'choice' && ['r3-swap', 'r3-xray', 'r3-cash'].includes(action));
  if (!button && !formAction) done('That step has moved on. Here is the next one.');
  if (button?.confirm && formData.get('confirm') !== 'on') fail(`Tick “${button.confirm}” first.`);

  const db = serviceDb();
  const actor = me.userId;
  const mission = Number(arg) || snap.r3.mission || 4;
  let ok = 'Done.';
  const toPhase = async (to: NextPhase) => {
    if (!canAdvance(to, await loadFlowState())) fail('Not ready to move on yet. Reload the page.');
    await movePhase(to, ({ round1: 'prelim', round2: 'round1', round3: 'round2', zero_hour: 'round3' } as const)[to], actor);
  };

  switch (action) {
    case 'start-checkin': await movePhase('checkin', 'registration', actor); ok = 'Check-in has started.'; break;
    case 'start-prelim': await movePhase('prelim', 'checkin', actor); ok = 'The prelim has started.'; break;
    case 'start-round1': await toPhase('round1'); ok = 'Round 1 has started.'; break;
    case 'start-round2': await toPhase('round2'); ok = 'Round 2 has started.'; break;
    case 'start-round3': await toPhase('round3'); ok = 'Round 3 has started.'; break;
    case 'start-zero-hour': await toPhase('zero_hour'); ok = 'Zero Hour has started.'; break;
    case 'end-event': await movePhase('ended', 'zero_hour', actor); ok = 'The event is over.'; break;

    case 'quiz-shuffle': await call(db.rpc('quiz_shuffle')); ok = 'Questions shuffled.'; break;
    case 'quiz-open': await call(db.rpc('quiz_open_question', { p_question: arg })); ok = 'Question opened.'; break;
    case 'quiz-reveal': await call(db.rpc('quiz_reveal_question', { p_question: arg })); ok = 'Answer revealed.'; break;
    case 'quiz-publish':
      await call(db.rpc('quiz_publish_board'));
      await call(db.from('event_state').update({ step: 'board' }).eq('id', true));
      ok = 'The final board is published.';
      break;
    case 'quiz-freeze': {
      const board = await loadBoard();
      if (!board.qualifiers) fail('Settle the tie for 16th place first (sudden death in the quiz console).');
      await call(db.rpc('quiz_freeze_top16', { p_qualifiers: board.qualifiers }));
      ok = 'The top 16 are frozen.';
      break;
    }

    case 'r1-funds': { const n = await call<number>(db.rpc('r1_start_funds', { p_actor: actor })); ok = `₹50 Cr credited to ${n} teams.`; break; }
    case 'r1-draw': {
      const { data } = await db.from('breaking_news').select('id');
      const ids = (data ?? []).map((x) => x.id as string).sort(() => Math.random() - 0.5).slice(0, 6);
      await call(db.rpc('r1_set_news_draw', { p_ids: ids }));
      ok = `Drawn in this order: ${ids.join(', ')}. Seal the physical cards in this order.`;
      break;
    }
    case 'r1-tips': await call(db.rpc('r1_open_tips_window', { p_seconds: TIPS_WINDOW_SECONDS, p_actor: actor })); ok = 'The Insider Tips window is open.'; break;
    case 'r1-marquee': await startStep('marquee'); ok = 'Marquee Auction: the first lot is on the projector.'; break;
    case 'r1-secret': await startStep('secret'); ok = 'Secret Identity Bids: the first lot is on the projector.'; break;
    case 'r1-lastcall': await startStep('last_call'); ok = 'Last Call: the first unsold lot is on the projector.'; break;
    case 'r1-news': await startStep('news'); ok = 'Breaking News.'; break;
    case 'r1-check': await startStep('ledger_check'); ok = 'Ledger check.'; break;
    case 'r1-first-lot':
    case 'r1-skip': { const id = await nextLotUp(); ok = id ? `${id} is on the projector.` : 'No lots left in this step.'; break; }
    case 'r1-bid': {
      await settleBidding();
      const [r1, bid] = await Promise.all([loadRound1(), loadBidState()]);
      const card = nextBidCard(r1.cards, r1.sold, r1.currentCardId, bid?.cardId ?? null);
      if (!card) fail('Every Secret Identity card has had its bidding window. Start Last Call.');
      await call(db.rpc('r1_open_bidding', { p_card: card!.id, p_seconds: BID_WINDOW_SECONDS, p_actor: actor }));
      ok = `Bidding open on ${card!.id} for ${BID_WINDOW_SECONDS} seconds.`;
      break;
    }
    case 'r1-sale': {
      const card = String(formData.get('card') ?? '');
      const agency = String(formData.get('agency') ?? '');
      const price = Number(String(formData.get('price') ?? '').replace(',', '.'));
      if (card !== snap.r1.lot?.id) done('That lot has moved on. Here is the current one.');
      if (!agency || !Number.isFinite(price) || price <= 0) fail('Pick the team and type the price.');
      await call(db.rpc('r1_record_sale', { p_card: card, p_agency: agency, p_price: price, p_actor: actor }));
      await audit(me, 'r1.sale', { card, agency, price, via: 'simple' });
      const next = await nextLotUp();
      done(`SOLD · ${card} to ${agency} for ${formatCrore(price)}.${next ? ` Next: ${next}.` : ''}`);
      break;
    }
    case 'r1-news-next': { const id = await call<string>(db.rpc('r1_reveal_next_news')); ok = `Headline ${id} is on the projector.`; break; }
    case 'r1-teamups': await call(db.rpc('r1_reveal_team_ups')); ok = 'Team-Ups revealed.'; break;
    case 'r1-recap': await call(db.rpc('r1_show_news_recap', { p_on: true })); ok = 'All news and Team-Ups are on the projector.'; break;
    case 'r1-jugaad': await call(db.rpc('r1_apply_jugaad', { p_actor: actor })); ok = 'Jugaad Kits applied; anyone who could not pay is eliminated.'; break;
    case 'r1-lock': await call(db.rpc('r1_lock')); ok = 'Round 1 is locked.'; break;

    case 'r2-draw': { const n = await call<number>(db.rpc('r2_draw_pairings')); ok = `Pairings drawn: ${n} duels.`; break; }
    case 'r2-publish': {
      const r2 = await loadRound2();
      if (!r2.board.qualifiers) fail('Settle the tie at 8th place first.');
      await call(db.rpc('r2_publish', { p_qualifiers: r2.board.qualifiers, p_actor: actor }));
      ok = 'Round 2 published: the top 8 go to the Vault.';
      break;
    }

    case 'r3-ff-window': await call(db.rpc('r3_set_mission', { p_mission: mission, p_step: 'force_field' })); ok = `Mission ${mission}: Force Field window.`; break;
    case 'r3-play': await call(db.rpc('r3_set_mission', { p_mission: mission, p_step: 'play' })); ok = `Mission ${mission}: puzzle running.`; break;
    case 'r3-results': await call(db.rpc('r3_set_mission', { p_mission: mission, p_step: 'results' })); ok = `Mission ${mission}: results.`; break;
    case 'r3-choice-window': await call(db.rpc('r3_set_mission', { p_mission: mission, p_step: 'choice' })); ok = `Mission ${mission}: winner’s choice.`; break;
    case 'r3-chai': await call(db.rpc('r3_set_mission', { p_mission: mission, p_step: 'chai' })); ok = `Mission ${mission}: Chai Pe Charcha.`; break;
    case 'r3-next-mission': await call(db.rpc('r3_set_mission', { p_mission: mission + 1, p_step: 'force_field' })); ok = `Mission ${mission + 1}: Force Field window.`; break;
    case 'r3-ff-buy': {
      const agency = String(formData.get('agency') ?? '');
      await call(db.rpc('r3_force_field', { p_agency: agency, p_actor: actor }));
      ok = `Force Field up for ${agency} (−₹5 Cr).`;
      break;
    }
    case 'r3-winner': {
      const w = String(formData.get('winner') ?? '');
      if (!w) fail('Pick the winner, or “No winner”.');
      await call(db.rpc('r3_set_winner', { p_mission: mission, p_agency: w === 'none' ? null : w, p_actor: actor }));
      ok = w === 'none' ? `Mission ${mission}: no winner.` : `Mission ${mission} winner: ${w}.`;
      break;
    }
    case 'r3-swap':
    case 'r3-xray':
    case 'r3-cash': {
      const choice = action === 'r3-swap' ? 'swap' : action === 'r3-xray' ? 'xray' : 'cash';
      const target = choice === 'cash' ? null : String(formData.get('target') ?? '') || null;
      if (choice !== 'cash' && !target) fail('Pick the team.');
      await call(db.rpc('r3_choose', { p_mission: mission, p_choice: choice, p_target: target, p_actor: actor }));
      ok = choice === 'swap' ? `Swapped with ${target}.` : choice === 'xray' ? `X-Ray: the marshal shows ${target}’s envelope privately.` : 'Cash: +₹6 Cr.';
      break;
    }
    case 'zh-next': { const env = await call<string>(db.rpc('zh_next_reveal', { p_actor: actor })); ok = `Envelope ${env} is open on the projector.`; break; }
  }
  await audit(me, `simple.${action}`, { arg: arg || null });
  done(ok);
}
