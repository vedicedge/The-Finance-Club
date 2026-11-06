import { describe, expect, it } from 'vitest';
import { lotPool, needing, nextLot, type Lot } from '@/lib/round1/lots';
import { isR1Step, R1_STEPS } from '@/lib/round1/steps';

const cards: Lot[] = [
  { id: 'H01', category: 'HQ', phase: 'marquee', lot_order: 1 },
  { id: 'S01', category: 'Suit', phase: 'marquee', lot_order: 2 },
  { id: 'H05', category: 'HQ', phase: 'secret', lot_order: 10 },
  { id: 'H06', category: 'HQ', phase: 'secret', lot_order: 9 },
  { id: 'K12', category: 'Sidekick', phase: 'secret', lot_order: 11 },
  { id: 'JK1', category: 'Any', phase: 'jugaad', lot_order: null },
];

describe('lots', () => {
  it('each step auctions its own pool in running order; Last Call is every unsold card', () => {
    expect(lotPool(cards, new Set(), 'marquee').map((c) => c.id)).toEqual(['H01', 'S01']);
    expect(lotPool(cards, new Set(), 'secret').map((c) => c.id)).toEqual(['H06', 'H05', 'K12']);
    expect(lotPool(cards, new Set(['H06', 'S01']), 'last_call').map((c) => c.id)).toEqual(['H01', 'H05', 'K12']);
    expect(lotPool(cards, new Set(), 'tips')).toEqual([]);
  });

  it('next lot skips sold cards and wraps round, and never offers a Jugaad Kit', () => {
    expect(nextLot(cards, new Set(), 'secret', null)?.id).toBe('H06');
    expect(nextLot(cards, new Set(['H05']), 'secret', 'H06')?.id).toBe('K12');
    expect(nextLot(cards, new Set(['H06']), 'secret', 'K12')?.id).toBe('H05');
    expect(nextLot(cards, new Set(['H05', 'H06', 'K12']), 'secret', 'K12')).toBeNull();
  });

  it('lists the agencies still missing a category', () => {
    expect(needing('HQ', [{ id: 'A01', held: ['HQ'] }, { id: 'A02', held: ['Suit'] }])).toEqual(['A02']);
  });

  it('knows the seven Power Bazaar steps', () => {
    expect(R1_STEPS.map((s) => s.id)).toEqual(['rules', 'tips', 'marquee', 'secret', 'last_call', 'news', 'ledger_check']);
    expect(isR1Step('secret')).toBe(true);
    expect(isR1Step('locked')).toBe(false);
  });
});
