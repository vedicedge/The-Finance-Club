/**
 * Round 2 Tower Score (spec: Part B — Skyline: Build. Break.). Rank on the unrounded score.
 *
 *   A = 100 × correct blocks ÷ reference blocks
 *   S = 100 × (1 − build time ÷ 10 min); an unfinished build freezes at 10 min, S = 0
 *   D = 100 × blocks fallen ÷ blocks in the frozen build; D = 0 if nothing was built
 *   Tower Score = (A + S + D) ÷ 3
 */

export const TOWER_TIME_LIMIT_S = 600;

export type TowerInput = {
  correctBlocks: number;
  referenceBlocks: number;
  /** Seconds from the reference being hidden to the build declared final; 600 if unfinished. */
  buildTimeS: number;
  frozenBlocks: number;
  blocksFallen: number;
};

export type TowerScore = { accuracy: number; speed: number; destruction: number; score: number };

export function towerScore(t: TowerInput): TowerScore {
  if (t.referenceBlocks <= 0) throw new RangeError('Reference must have at least one block');
  const accuracy = (100 * t.correctBlocks) / t.referenceBlocks;
  const speed = 100 * (1 - Math.min(t.buildTimeS, TOWER_TIME_LIMIT_S) / TOWER_TIME_LIMIT_S);
  const destruction = t.frozenBlocks === 0 ? 0 : (100 * t.blocksFallen) / t.frozenBlocks;
  return { accuracy, speed, destruction, score: (accuracy + speed + destruction) / 3 };
}
