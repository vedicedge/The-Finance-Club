'use server';

import { redirect } from 'next/navigation';
import { requireOrganiser } from '@/lib/auth/organiser';
import { serviceDb } from '@/lib/db/server';
import { audit } from '@/lib/audit';
import { formatCrore } from '@/lib/money';
import { isR1Step } from '@/lib/round1/steps';
import { nextLot } from '@/lib/round1/lots';
import { dbMessage, loadRound1 } from '@/lib/round1/server';
import type { Area } from '@/lib/auth/roles';

const back = (params: Record<string, string>): never => redirect(`/admin/auction?${new URLSearchParams(params)}`);

type DbCall<T> = PromiseLike<{ data: T | null; error: { message: string; hint?: string | null } | null }>;

/** Role check → database call → audit → back to the console with a message. */
async function act<T>(area: Area, action: string, payload: Record<string, unknown>, call: () => DbCall<T>, ok: (data: T | null) => string) {
  const me = await requireOrganiser(area);
  const { data, error } = await call();
  if (error) back({ error: dbMessage(error) });
  await audit(me, action, payload);
  back({ ok: ok(data) });
}

// ---------------------------------------------------------------- running the auction (auctioneer or ledger keeper)

export async function setStep(step: string) {
  if (!isR1Step(step)) back({ error: 'Unknown step.' });
  await act('auction', 'r1.step', { step }, () => serviceDb().from('event_state').update({ step }).eq('id', true), () => `Step: ${step}.`);
}

export async function shuffleLots() {
  await act('auction', 'r1.shuffle_lots', {}, () => serviceDb().rpc('r1_shuffle_lots'), () => 'Lot order shuffled.');
}

export async function showLot(formData: FormData) {
  const card = String(formData.get('card') ?? '') || null;
  await act('auction', 'r1.lot', { card }, () => serviceDb().from('event_state').update({ current_card_id: card }).eq('id', true), () =>
    card ? `On the projector: ${card}.` : 'Projector cleared.',
  );
}

export async function advanceLot() {
  const r1 = await loadRound1();
  const step = isR1Step(r1.step) ? r1.step : null;
  const next = nextLot(r1.cards, r1.sold, step, r1.currentCardId);
  await act('auction', 'r1.next_lot', { card: next?.id ?? null }, () =>
    serviceDb().from('event_state').update({ current_card_id: next?.id ?? null }).eq('id', true),
  () => (next ? `Next lot: ${next.id}.` : 'No unsold lots left in this step.'));
}

export async function revealNextNews() {
  await act('auction', 'r1.reveal_news', {}, () => serviceDb().rpc('r1_reveal_next_news'), (id) => `Breaking News ${id} is live.`);
}

export async function revealTeamUps() {
  await act('auction', 'r1.reveal_team_ups', {}, () => serviceDb().rpc('r1_reveal_team_ups'), () => 'Team-Ups revealed.');
}

// ---------------------------------------------------------------- money (ledger keepers)

export async function startFunds() {
  const me = await requireOrganiser('ledger');
  await act('ledger', 'r1.start_funds', {}, () => serviceDb().rpc('r1_start_funds', { p_actor: me.userId }), (n) =>
    `₹50 Cr credited to ${n} agencies.`,
  );
}

export async function recordSale(formData: FormData) {
  const me = await requireOrganiser('ledger');
  const card = String(formData.get('card') ?? '');
  const agency = String(formData.get('agency') ?? '');
  const price = Number(String(formData.get('price') ?? '').replace(',', '.'));
  if (!card || !agency || !Number.isFinite(price)) back({ error: 'Pick the card and the agency, and enter the price.' });

  const { error } = await serviceDb().rpc('r1_record_sale', { p_card: card, p_agency: agency, p_price: price, p_actor: me.userId });
  if (error) back({ error: dbMessage(error), card, agency, price: String(price) });
  await audit(me, 'r1.sale', { card, agency, price });

  // Selling the lot on the projector moves the projector to the next lot.
  const r1 = await loadRound1();
  if (r1.currentCardId === card) {
    const next = nextLot(r1.cards, r1.sold, isR1Step(r1.step) ? r1.step : null, card);
    await serviceDb().from('event_state').update({ current_card_id: next?.id ?? null }).eq('id', true);
  }
  back({ ok: `SOLD · ${card} to ${agency} for ${formatCrore(price)}.`, last: card });
}

export async function voidSale(entryId: number, formData: FormData) {
  const me = await requireOrganiser('ledger');
  const reason = String(formData.get('reason') ?? '');
  await act('ledger', 'ledger.void', { entry: entryId, reason }, () =>
    serviceDb().rpc('ledger_void', { p_entry: entryId, p_reason: reason, p_actor: me.userId }),
  () => 'Sale voided; the card is back on sale and the money is back in the fund.');
}

export async function buyTip(formData: FormData) {
  const me = await requireOrganiser('ledger');
  const agency = String(formData.get('agency') ?? '');
  const news = String(formData.get('news') ?? '') || null;
  await act('ledger', 'r1.tip', { agency }, () =>
    serviceDb().rpc('r1_buy_tip', { p_agency: agency, p_actor: me.userId, p_news: news }),
  (id) => `Tip sold to ${agency}: hand over the sealed envelope for ${id}.`);
}

export async function setNewsDraw(formData: FormData) {
  const random = formData.get('random') === '1';
  let ids = [1, 2, 3, 4, 5, 6].map((i) => String(formData.get(`n${i}`) ?? ''));
  if (random) {
    const { data } = await serviceDb().from('breaking_news').select('id');
    ids = (data ?? []).map((n) => n.id as string).sort(() => Math.random() - 0.5).slice(0, 6);
  }
  await act('ledger', 'r1.news_draw', { random }, () => serviceDb().rpc('r1_set_news_draw', { p_ids: ids }), () =>
    random ? 'Six news cards drawn at random. Seal the physical cards in this order.' : 'Draw saved.',
  );
}

export async function applyJugaad() {
  const me = await requireOrganiser('ledger');
  await act('ledger', 'r1.jugaad', {}, () => serviceDb().rpc('r1_apply_jugaad', { p_actor: me.userId }), (rows) => {
    const list = (rows as { agency: string; action: string }[] | null) ?? [];
    if (list.length === 0) return 'Every agency holds all four categories. Nothing to do.';
    return list.map((r) => `${r.agency}: ${r.action === 'jugaad_kit' ? 'Jugaad Kit' : 'eliminated'}`).join(' · ');
  });
}

export async function lockRound1(formData: FormData) {
  if (formData.get('confirm') !== 'on') back({ error: 'Tick the confirmation to lock Round 1.' });
  await act('ledger', 'r1.lock', {}, () => serviceDb().rpc('r1_lock'), () => 'Round 1 locked. Power Levels and funds are final.');
}
