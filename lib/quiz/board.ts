/**
 * Prelim board (spec: Ranking). Total points, highest first. Tie-break 1: lower sum of response
 * times on correct answers. Tie-break 2, for 16th place only: sudden death on stage, recorded by
 * the quiz host as a finishing order among the tied agencies.
 */

export const QUALIFY = 16;

export type BoardInput = {
  agencyId: string;
  name: string;
  total: number;
  correctCount: number;
  /** Sum of response times on correct answers, in seconds with one decimal ("14.0" or 14). */
  correctTime: number | string;
  /** Sudden-death finishing order (1 = best) among agencies tied at the cutoff, if recorded. */
  tiebreakRank?: number | null;
};

export type BoardRow = BoardInput & {
  /** Shared by agencies tied on points and time (1, 2, 2, 4…). */
  rank: number;
  /** Position after sudden death, 1…n. */
  position: number;
  /** Tied with another agency on points and time. */
  tied: boolean;
  qualified: boolean | null; // null while a tie at the cutoff is unresolved
};

export type Board = {
  rows: BoardRow[];
  /** Agencies tied across the cutoff that still need sudden death (empty when resolved). */
  suddenDeath: string[];
  /** The agencies tied across the cutoff, resolved or not. */
  cutoffGroup: string[];
  /** The qualifiers once the cutoff is clear; null while sudden death is pending. */
  qualifiers: string[] | null;
};

const tenths = (t: number | string) => Math.round(Number(t) * 10);

export function rankBoard(input: BoardInput[], cutoff = QUALIFY): Board {
  const sorted = [...input].sort(
    (a, b) => b.total - a.total || tenths(a.correctTime) - tenths(b.correctTime) || a.agencyId.localeCompare(b.agencyId),
  );

  // Groups of agencies tied on both points and time.
  const groups: BoardInput[][] = [];
  for (const row of sorted) {
    const last = groups.at(-1);
    if (last && last[0].total === row.total && tenths(last[0].correctTime) === tenths(row.correctTime)) last.push(row);
    else groups.push([row]);
  }

  const rows: BoardRow[] = [];
  let cutoffGroup: string[] = [];
  let unresolved = false;
  let start = 0; // number of agencies ranked above this group
  for (const g of groups) {
    const end = start + g.length; // positions start+1 … end
    const straddles = start < cutoff && end > cutoff;
    let ordered = g;
    if (straddles) {
      cutoffGroup = g.map((r) => r.agencyId);
      const allRanked = g.every((r) => typeof r.tiebreakRank === 'number');
      if (allRanked) ordered = [...g].sort((a, b) => (a.tiebreakRank as number) - (b.tiebreakRank as number));
      else unresolved = true;
    }
    ordered.forEach((r, i) => {
      const position = start + i + 1;
      rows.push({
        ...r,
        rank: start + 1,
        position,
        tied: g.length > 1,
        qualified: straddles && unresolved ? null : position <= cutoff,
      });
    });
    start = end;
  }

  return {
    rows,
    cutoffGroup,
    suddenDeath: unresolved ? cutoffGroup : [],
    qualifiers: unresolved ? null : rows.filter((r) => r.position <= cutoff).map((r) => r.agencyId),
  };
}
