/**
 * Round 2 ranking (spec: Tower Score; "use unrounded scores for ranking"; "Highest 8 qualify.
 * A tie at the cutoff is settled by rock-paper-scissors or a short quiz"). The organiser records
 * the order inside a tied group as cutoff_rank (1 = best).
 */

export const TOP = 8;

export type TowerInput = {
  agencyId: string;
  name: string;
  score: number;
  accuracy: number;
  speed: number;
  destruction: number;
  cutoffRank: number | null;
};

export type TowerRow = TowerInput & { rank: number; position: number; qualified: boolean | null };

const same = (a: number, b: number) => Math.abs(a - b) < 1e-9;

export function rankTower(input: TowerInput[], cutoff = TOP) {
  const sorted = [...input].sort((a, b) => b.score - a.score || a.agencyId.localeCompare(b.agencyId));
  const groups: TowerInput[][] = [];
  for (const r of sorted) {
    const g = groups.at(-1);
    if (g && same(g[0].score, r.score)) g.push(r);
    else groups.push([r]);
  }
  const rows: TowerRow[] = [];
  let cutoffGroup: string[] = [];
  let unresolved = false;
  let start = 0;
  for (const g of groups) {
    const end = start + g.length;
    const straddles = start < cutoff && end > cutoff;
    let ordered = g;
    if (straddles) {
      cutoffGroup = g.map((r) => r.agencyId);
      if (g.every((r) => typeof r.cutoffRank === 'number')) ordered = [...g].sort((a, b) => a.cutoffRank! - b.cutoffRank!);
      else unresolved = true;
    }
    ordered.forEach((r, i) => {
      rows.push({ ...r, rank: start + 1, position: start + i + 1, qualified: straddles && unresolved ? null : start + i + 1 <= cutoff });
    });
    start = end;
  }
  return {
    rows,
    cutoffGroup,
    tieAtCutoff: unresolved ? cutoffGroup : [],
    qualifiers: unresolved ? null : rows.filter((r) => r.position <= cutoff).map((r) => r.agencyId),
  };
}

/** "6:05" or "6" (minutes) or "365" (seconds) → seconds; "dnf"/"unfinished"/"" → 600. */
export function parseBuildTime(raw: string): number | null {
  const s = raw.trim().toLowerCase();
  if (s === '' || s === 'dnf' || s === 'unfinished' || s === '10:00') return 600;
  const mmss = /^(\d{1,2}):([0-5]\d)$/.exec(s);
  if (mmss) {
    const t = Number(mmss[1]) * 60 + Number(mmss[2]);
    return t <= 600 ? t : null;
  }
  if (/^\d{1,3}$/.test(s)) {
    const t = Number(s);
    return t <= 600 ? t : null;
  }
  return null;
}

export function formatBuildTime(seconds: number): string {
  if (seconds >= 600) return '10:00 (unfinished)';
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
