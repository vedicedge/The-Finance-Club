/**
 * Hero Score (spec: Core rules) = Power Level × Battle Outcome multiplier + Fund left ÷ 2.
 * Example: 28 × 1.5 + 18 ÷ 2 = 51.
 */
export function heroScore(powerLevel: number, multiplier: number, fundLeft: number): number {
  // Multipliers are quarters and fund is in half-crores, so scale to avoid binary drift.
  return (powerLevel * Math.round(multiplier * 100) * 2 + Math.round(fundLeft * 10) * 10) / 200;
}
