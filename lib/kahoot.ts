/**
 * The prelim's red alert: reading Kahoot's results file. Kahoot's "Final Scores" sheet has a
 * heading row (Rank · Player · Total Score (points) · Correct answers · …) somewhere near the top;
 * a hand-made sheet with Rank · Agency ID · Score works too. Teams join Kahoot with their agency ID
 * in the nickname (e.g. "A07 Rakshak Labs"), which is how a player is matched to an agency.
 */

export type KahootRow = { agency_id: string; kahoot_rank: number; score: number; correct: number | null; player: string };
export type KahootParse = {
  rows: KahootRow[];
  /** Players that matched no agency (by ID or exact name). */
  unmatched: { player: string; rank: number; score: number }[];
  /** A second player for an agency already ranked (only the better-ranked one counts). */
  duplicates: { player: string; agency: string }[];
  error?: string;
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const num = (s: string) => {
  const n = Number(String(s).replace(/[,\s]/g, ''));
  return Number.isFinite(n) ? n : null;
};

/** "A7", "a07", "A-07 Rakshak" → "A07"; null if the text has no agency ID. */
export function agencyIdIn(text: string): string | null {
  const m = /(?:^|[^a-z0-9])a\s*-?\s*(\d{1,3})(?![0-9])/i.exec(` ${text}`);
  return m ? `A${String(Number(m[1])).padStart(2, '0')}` : null;
}

/** Finds the results table in any sheet: the first row with a rank, a player/agency and a score heading. */
function findTable(sheets: string[][][]): { rows: string[][]; rank: number; player: number; score: number; correct: number } | null {
  for (const rows of sheets) {
    for (let i = 0; i < Math.min(rows.length, 30); i++) {
      const h = (rows[i] ?? []).map((c) => norm(String(c ?? '')));
      const rank = h.findIndex((c) => c === 'rank' || c === 'position' || c === 'pos');
      const player = h.findIndex((c) => /^(player|nickname|name|team|agency|agencyid|playername)/.test(c));
      const score = h.findIndex((c) => /^(totalscore|score|points|totalpoints)/.test(c));
      const correct = h.findIndex((c) => /^correct/.test(c));
      if (player >= 0 && score >= 0) return { rows: rows.slice(i + 1), rank, player, score, correct };
    }
  }
  return null;
}

export function parseKahoot(sheets: string[][][], agencies: { id: string; name: string }[]): KahootParse {
  const out: KahootParse = { rows: [], unmatched: [], duplicates: [] };
  const t = findTable(sheets);
  if (!t) return { ...out, error: 'No results table found: the file needs a heading row with Player (or Agency) and Score.' };
  const ids = new Set(agencies.map((a) => a.id));
  const byName = new Map(agencies.map((a) => [norm(a.name), a.id]));
  const seen = new Set<string>();
  let order = 0;
  for (const r of t.rows) {
    const player = String(r[t.player] ?? '').trim();
    const score = num(String(r[t.score] ?? ''));
    if (!player && score === null) {
      if (order > 0) break; // the end of the table
      continue;
    }
    if (!player || score === null) continue;
    order += 1;
    const rank = t.rank >= 0 ? num(String(r[t.rank] ?? '')) ?? order : order;
    const correct = t.correct >= 0 ? num(String(r[t.correct] ?? '')) : null;
    const byId = agencyIdIn(player);
    const agency = byId && ids.has(byId) ? byId : byName.get(norm(player)) ?? null;
    if (!agency) {
      out.unmatched.push({ player, rank, score });
      continue;
    }
    if (seen.has(agency)) {
      out.duplicates.push({ player, agency });
      continue;
    }
    seen.add(agency);
    out.rows.push({ agency_id: agency, kahoot_rank: rank, score: Math.round(score), correct, player });
  }
  out.rows.sort((a, b) => a.kahoot_rank - b.kahoot_rank || b.score - a.score);
  if (out.rows.length === 0 && !out.error) out.error = 'No player matched an agency. Nicknames must contain the agency ID, e.g. "A07 Rakshak Labs".';
  return out;
}

/** A plain CSV (Kahoot can also export one): rows of cells, quotes respected. */
export function readCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') q = false;
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',' || ch === ';' || ch === '\t') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}
