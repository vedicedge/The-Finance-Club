import { describe, expect, it } from 'vitest';
import { bidCardsLeft, nextBidCard } from '@/lib/round1/lots';
describe('phone bidding order (Secret Identity Bids)', () => {
  const secret = [
    { id: 'S1', category: 'HQ', phase: 'secret' as const, lot_order: 1 },
    { id: 'S2', category: 'Suit', phase: 'secret' as const, lot_order: 2 },
    { id: 'S3', category: 'HQ', phase: 'secret' as const, lot_order: 3 },
    { id: 'M1', category: 'HQ', phase: 'marquee' as const, lot_order: 9 },
  ];
  it('opens the lot on the projector if it has not had its window yet', () => {
    expect(nextBidCard(secret, new Set(), 'S2', null)?.id).toBe('S2');
    expect(nextBidCard(secret, new Set(), null, null)?.id).toBe('S1');
  });
  it('then moves on in order, skipping sold cards, and never wraps round', () => {
    expect(nextBidCard(secret, new Set(), 'S1', 'S1')?.id).toBe('S2');
    expect(nextBidCard(secret, new Set(['S2']), 'S1', 'S1')?.id).toBe('S3');
    expect(nextBidCard(secret, new Set(), 'S3', 'S3')).toBeNull();
    expect(bidCardsLeft(secret, new Set(['S2']), 'S1', 'S1').map((c) => c.id)).toEqual(['S3']);
    expect(bidCardsLeft(secret, new Set(), null, null).map((c) => c.id)).toEqual(['S1', 'S2', 'S3']);
  });
});
