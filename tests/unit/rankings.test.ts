import { describe, expect, it } from 'vitest';
import { formatBuildTime, parseBuildTime, rankTower, type TowerInput } from '@/lib/round2/tower-board';
import { rankHero } from '@/lib/zero-hour';

const t = (id: string, score: number, cutoffRank: number | null = null): TowerInput => ({
  agencyId: id, name: id, score, accuracy: 0, speed: 0, destruction: 0, cutoffRank,
});

describe('Round 2 top 8', () => {
  it('ranks on the unrounded Tower Score', () => {
    const r = rankTower([t('A01', 68.333333), t('A02', 68.334), t('A03', 50)], 2);
    expect(r.qualifiers).toEqual(['A02', 'A01']);
  });

  it('a tie across 8th place waits for the organiser’s order, then resolves', () => {
    const base = Array.from({ length: 7 }, (_, i) => t(`A0${i + 1}`, 90 - i));
    const tied = [...base, t('A08', 50), t('A09', 50), t('A10', 10)];
    expect(rankTower(tied).tieAtCutoff).toEqual(['A08', 'A09']);
    expect(rankTower(tied).qualifiers).toBeNull();
    const settled = [...base, t('A08', 50, 2), t('A09', 50, 1), t('A10', 10)];
    expect(rankTower(settled).qualifiers?.at(-1)).toBe('A09');
  });

  it('reads build times the way scorers write them', () => {
    expect(parseBuildTime('6:05')).toBe(365);
    expect(parseBuildTime('360')).toBe(360);
    expect(parseBuildTime('DNF')).toBe(600);
    expect(parseBuildTime('11:00')).toBeNull();
    expect(formatBuildTime(365)).toBe('6:05');
    expect(formatBuildTime(600)).toBe('10:00 (unfinished)');
  });
});

describe('Hero Score ranking', () => {
  const h = (id: string, hero: number, fund: number, power: number) => ({ agencyId: id, name: id, hero, fund, power });

  it('highest Hero Score wins', () => {
    expect(rankHero([h('A01', 51, 18, 28), h('A02', 60, 10, 30)], ['fund_left', 'power_level', 'coin_toss']).map((r) => r.agencyId)).toEqual(['A02', 'A01']);
  });

  it('ties go to higher fund left, then higher Power Level (open decision 3)', () => {
    const rows = rankHero([h('A01', 50, 10, 30), h('A02', 50, 12, 20), h('A03', 50, 12, 25)], ['fund_left', 'power_level', 'coin_toss']);
    expect(rows.map((r) => `${r.rank}:${r.agencyId}`)).toEqual(['1:A03', '2:A02', '3:A01']);
    expect(rows.some((r) => r.coinToss)).toBe(false);
  });

  it('still level for 1st or 2nd: a coin toss', () => {
    const rows = rankHero([h('A01', 50, 12, 25), h('A02', 50, 12, 25), h('A03', 10, 1, 1)], ['fund_left', 'power_level', 'coin_toss']);
    expect(rows.map((r) => [r.agencyId, r.rank, r.coinToss])).toEqual([['A01', 1, true], ['A02', 1, true], ['A03', 3, false]]);
  });
});
