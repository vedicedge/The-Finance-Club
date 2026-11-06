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
