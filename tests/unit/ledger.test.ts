import { describe, expect, it } from 'vitest';
import { withRunningBalance, type LedgerRow } from '@/lib/ledger';

const row = (id: number, amount: number, voided = false): LedgerRow => ({
  id, agency_id: 'A01', amount, reason: 'gear', ref: null, note: null, created_at: '2026-11-25T13:00:00Z', voided, void_reason: null,
});

describe('running balance', () => {
  it('adds entries oldest first and skips voided ones', () => {
    const out = withRunningBalance([row(3, -6.5), row(1, 50), row(2, -2, true), row(4, -8)]);
    expect(out.map((r) => [r.id, r.balance])).toEqual([[1, 50], [2, 50], [3, 43.5], [4, 35.5]]);
  });

  it('never drifts with half-crore amounts', () => {
    const many = Array.from({ length: 200 }, (_, i) => row(i + 1, i % 2 ? -0.5 : 0.5));
    expect(withRunningBalance(many).at(-1)!.balance).toBe(0);
  });
});
