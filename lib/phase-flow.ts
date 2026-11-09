import { PHASE_INFO, type Phase } from '@/lib/phases';

/** What the database says about how far the event has got. */
export type FlowState = {
  phase: string;
  prelimFrozen: boolean;
  round1Locked: boolean;
  round2Published: boolean;
  /** Every finalist holds a recorded card and the multiplier map is entered. */
  envelopesRecorded: boolean;
};

/**
 * The "next round" step on each console: which phase it moves to, which phase it follows, and
 * when it is ready. Matches the run order in the spec; earlier phases use the command centre.
 */
export const NEXT_PHASE = {
  round1: { from: 'prelim', done: 'The top 16 are frozen.', href: '/admin/auction', ready: (s: FlowState) => s.prelimFrozen },
  round2: { from: 'round1', done: 'Round 1 is locked.', href: '/admin/round2', ready: (s: FlowState) => s.round1Locked },
  round3: { from: 'round2', done: 'Round 2 is published.', href: '/admin/round3', ready: (s: FlowState) => s.round2Published },
  zero_hour: { from: 'round3', done: 'Every finalist’s card is recorded and the multiplier map is entered.', href: '/admin/results', ready: (s: FlowState) => s.envelopesRecorded },
} as const satisfies Partial<Record<Phase, { from: Phase; done: string; href: string; ready: (s: FlowState) => boolean }>>;

export type NextPhase = keyof typeof NEXT_PHASE;

export function isNextPhase(v: string): v is NextPhase {
  return Object.hasOwn(NEXT_PHASE, v);
}

/** Can the event move to `to` right now? */
export function canAdvance(to: NextPhase, s: FlowState): boolean {
  return s.phase === NEXT_PHASE[to].from && NEXT_PHASE[to].ready(s);
}

export function phaseLabel(p: Phase): string {
  return PHASE_INFO[p].label;
}
