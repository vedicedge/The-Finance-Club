import type { R1Step } from '@/lib/round1/steps';

export type Lot = { id: string; category: string; phase: 'marquee' | 'secret' | 'jugaad'; lot_order: number | null };

/** The cards that can be auctioned in a step, in running order. */
export function lotPool<T extends Lot>(cards: T[], sold: Set<string>, step: R1Step | null): T[] {
  const unsold = cards.filter((c) => c.phase !== 'jugaad' && !sold.has(c.id));
  const pool =
    step === 'marquee'
      ? unsold.filter((c) => c.phase === 'marquee')
      : step === 'secret'
        ? unsold.filter((c) => c.phase === 'secret')
        : step === 'last_call'
          ? unsold
          : [];
  return pool.sort((a, b) => (a.lot_order ?? 999) - (b.lot_order ?? 999) || a.id.localeCompare(b.id));
}

/** The next unsold lot after `currentId` in running order (wrapping round), or null. */
export function nextLot<T extends Lot>(cards: T[], sold: Set<string>, step: R1Step | null, currentId: string | null): T | null {
  const pool = lotPool(cards, sold, step);
  if (pool.length === 0) return null;
  if (!currentId) return pool[0];
  const order = (id: string) => cards.find((c) => c.id === id)?.lot_order ?? 999;
  const cur = order(currentId);
  return pool.find((c) => (c.lot_order ?? 999) > cur && c.id !== currentId) ?? pool.find((c) => c.id !== currentId) ?? null;
}

/** Agencies (active, in order) that still lack a category. */
export function needing(category: string, agencies: { id: string; held: string[] }[]): string[] {
  return agencies.filter((a) => !a.held.includes(category)).map((a) => a.id);
}

/**
 * Phone bidding (Secret Identity Bids): the card to open next. The lot on the projector if it is
 * unsold and has not had its window yet; otherwise the next unsold Secret card after it in the
 * running order. No wrap-around: each card gets one window, and cards left unsold go to Last Call.
 */
export function nextBidCard<T extends Lot>(cards: T[], sold: Set<string>, currentId: string | null, lastBidCard: string | null): T | null {
  const pool = lotPool(cards, sold, 'secret');
  const current = currentId ? pool.find((c) => c.id === currentId) : undefined;
  if (current && lastBidCard !== current.id) return current;
  const order = (id: string | null) => (id ? cards.find((c) => c.id === id)?.lot_order ?? -1 : -1);
  const after = Math.max(order(currentId), order(lastBidCard));
  return pool.find((c) => (c.lot_order ?? 999) > after) ?? null;
}

/** Secret cards still to be bid on (the current lot if it has not had its window, then the rest of the order). */
export function bidCardsLeft<T extends Lot>(cards: T[], sold: Set<string>, currentId: string | null, lastBidCard: string | null): T[] {
  const out: T[] = [];
  let cur = currentId;
  let last = lastBidCard;
  for (let next = nextBidCard(cards, sold, cur, last); next; next = nextBidCard(cards, sold, cur, last)) {
    out.push(next);
    cur = next.id;
    last = next.id;
  }
  return out;
}
