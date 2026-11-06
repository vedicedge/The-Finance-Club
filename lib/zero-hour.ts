import type { HeroTiebreak } from '@/lib/settings';

/** Zero Hour final ranking (spec: Hero Score; open decision 3 for ties at 1st/2nd). */

export type HeroInput = { agencyId: string; name: string; hero: number; fund: number; power: number };
export type HeroRow = HeroInput & { rank: number; coinToss: boolean };

const eq = (a: number, b: number) => Math.abs(a - b) < 1e-9;

/**
 * Highest Hero Score wins. Agencies level on Hero Score are split by the configured tie-breaks
 * in order (higher fund left, then higher Power Level); if still level and the tie touches 1st or
 * 2nd place, they share a rank and `coinToss` is set: the anchor tosses the coin on stage.
 */
export function rankHero(input: HeroInput[], tiebreak: HeroTiebreak[]): HeroRow[] {
  const keys = tiebreak.filter((t) => t !== 'coin_toss');
  const cmp = (a: HeroInput, b: HeroInput) => {
    if (!eq(a.hero, b.hero)) return b.hero - a.hero;
    for (const k of keys) {
      const d = k === 'fund_left' ? b.fund - a.fund : b.power - a.power;
      if (!eq(d, 0)) return d;
    }
    return 0;
  };
  const sorted = [...input].sort((a, b) => cmp(a, b) || a.agencyId.localeCompare(b.agencyId));
  const rows: HeroRow[] = [];
  sorted.forEach((r, i) => {
    const prev = rows[i - 1];
    const tiedWithPrev = prev && cmp(prev, r) === 0;
    const rank = tiedWithPrev ? prev.rank : i + 1;
    rows.push({ ...r, rank, coinToss: false });
  });
  for (const r of rows) {
    const group = rows.filter((x) => x.rank === r.rank);
    if (group.length > 1 && r.rank <= 2) r.coinToss = true;
  }
  return rows;
}
