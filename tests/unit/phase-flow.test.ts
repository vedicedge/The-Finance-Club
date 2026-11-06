import { describe, expect, it } from 'vitest';
import { canAdvance, type FlowState } from '@/lib/phase-flow';

const base: FlowState = { phase: 'prelim', prelimFrozen: false, round1Locked: false, round2Published: false, mission4Decided: false };

describe('next-round button', () => {
  it('offers each next round only once the current one is finished', () => {
    expect(canAdvance('round1', base)).toBe(false);
    expect(canAdvance('round1', { ...base, prelimFrozen: true })).toBe(true);
    expect(canAdvance('round2', { ...base, phase: 'round1', prelimFrozen: true })).toBe(false);
    expect(canAdvance('round2', { ...base, phase: 'round1', round1Locked: true })).toBe(true);
    expect(canAdvance('round3', { ...base, phase: 'round2', round2Published: true })).toBe(true);
    expect(canAdvance('zero_hour', { ...base, phase: 'round3' })).toBe(false);
    expect(canAdvance('zero_hour', { ...base, phase: 'round3', mission4Decided: true })).toBe(true);
  });

  it('never skips a round or goes backwards', () => {
    expect(canAdvance('round3', { ...base, phase: 'round1', round1Locked: true, round2Published: true })).toBe(false);
    expect(canAdvance('round2', { ...base, phase: 'round2', round1Locked: true })).toBe(false);
  });
});
