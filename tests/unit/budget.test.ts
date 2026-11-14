import { describe, expect, it } from 'vitest';
import { budgetWarning } from '@/lib/round1/budget';

describe('low-budget warning (Power Bazaar)', () => {
  it('warns under ₹8 Cr per missing category plus ₹5 Cr', () => {
    expect(budgetWarning(20, 2)).toEqual({ reserve: 21 });
    expect(budgetWarning(21, 2)).toBeNull();
    expect(budgetWarning(12, 1)).toEqual({ reserve: 13 });
    expect(budgetWarning(50, 4)).toBeNull();
  });
  it('never warns a team that holds all four categories', () => {
    expect(budgetWarning(1, 0)).toBeNull();
  });
});
