import { describe, expect, it } from 'vitest';
import { towerScore } from '@/lib/scoring/tower';
import { heroScore } from '@/lib/scoring/hero';
import { formatCrore, isHalfStep } from '@/lib/money';

describe('Tower Score (Round 2)', () => {
  it('spec example: 18/20 correct, 6 min build, 15/20 fall → 68.33', () => {
    const s = towerScore({ correctBlocks: 18, referenceBlocks: 20, buildTimeS: 360, frozenBlocks: 20, blocksFallen: 15 });
    expect(s.accuracy).toBe(90);
    expect(s.speed).toBeCloseTo(40, 10);
    expect(s.destruction).toBe(75);
    expect(s.score.toFixed(2)).toBe('68.33');
  });

  it('an unfinished build freezes at 10 min with S = 0', () => {
    expect(towerScore({ correctBlocks: 5, referenceBlocks: 20, buildTimeS: 600, frozenBlocks: 8, blocksFallen: 0 }).speed).toBe(0);
  });

  it('D = 0 if nothing was built', () => {
    expect(towerScore({ correctBlocks: 0, referenceBlocks: 20, buildTimeS: 600, frozenBlocks: 0, blocksFallen: 0 }).destruction).toBe(0);
  });
});

describe('Hero Score', () => {
  it('spec example: Power 28, ×1.5, fund ₹18 Cr → 51', () => {
    expect(heroScore(28, 1.5, 18)).toBe(51);
  });

  it('handles quarter multipliers and half-crore funds exactly', () => {
    expect(heroScore(11, 0.25, 0.5)).toBe(3);
    expect(heroScore(40, 3, 10.5)).toBe(125.25);
  });
});

describe('money', () => {
  it('accepts only ₹0.5 Cr steps', () => {
    expect(isHalfStep(12.5)).toBe(true);
    expect(isHalfStep(8)).toBe(true);
    expect(isHalfStep(0.3)).toBe(false);
    expect(isHalfStep(7.25)).toBe(false);
  });

  it('formats crore amounts', () => {
    expect(formatCrore(50)).toBe('₹50 Cr');
    expect(formatCrore(-2)).toBe('−₹2 Cr');
    expect(formatCrore(5, { signed: true })).toBe('+₹5 Cr');
    expect(formatCrore('12.5')).toBe('₹12.5 Cr');
  });
});
