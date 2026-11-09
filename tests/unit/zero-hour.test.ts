import { describe, expect, it } from 'vitest';
import { placesAnnounced, podium, rankHero } from '@/lib/zero-hour';

describe('the podium, one place at a time', () => {
  const rows = rankHero(
    [
      { agencyId: 'A01', name: 'One', hero: 90, fund: 10, power: 30 },
      { agencyId: 'A02', name: 'Two', hero: 80, fund: 10, power: 30 },
      { agencyId: 'A03', name: 'Three', hero: 70, fund: 10, power: 30 },
      { agencyId: 'A04', name: 'Four', hero: 60, fund: 10, power: 30 },
    ],
    ['fund_left', 'power_level', 'coin_toss'],
  );
  it('counts announced places from the step', () => {
    expect(placesAnnounced('round3', 'top1')).toBe(0);
    expect(placesAnnounced('zero_hour', null)).toBe(0);
    expect(placesAnnounced('zero_hour', 'top3')).toBe(1);
    expect(placesAnnounced('zero_hour', 'top1')).toBe(3);
    expect(placesAnnounced('ended', null)).toBe(3);
  });
  it('shows 3rd, then 2nd and 3rd, then all three, and never 4th', () => {
    expect(podium(rows, 0)).toEqual([]);
    expect(podium(rows, 1).map((r) => [r.place, r.agencyId])).toEqual([[3, 'A03']]);
    expect(podium(rows, 2).map((r) => r.agencyId)).toEqual(['A02', 'A03']);
    expect(podium(rows, 3).map((r) => r.agencyId)).toEqual(['A01', 'A02', 'A03']);
    expect(podium(null, 3)).toEqual([]);
  });
});
