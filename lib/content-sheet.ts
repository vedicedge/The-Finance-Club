/**
 * The organisers' content workbook: one "Questions" sheet (the prelim) and one "Cards" sheet
 * (the Power Bazaar gear cards). Columns are found by their heading, so their order does not
 * matter. Each row adds a new question or card, or replaces the one with the same ID.
 */

export const LETTERS = ['A', 'B', 'C', 'D'] as const;

export const SEGMENT_BY_PREFIX = {
  M: { segment: 'marvel_ya_dc', label: 'Marvel Ya DC?', options: 2, timer: 10, weight: 1 },
  T: { segment: 'teen_clue', label: 'Teen Clue, Ek Hero', options: 4, timer: 10, weight: 1 },
  B: { segment: 'box_office', label: 'Box Office Ka Hisaab (finance)', options: 4, timer: 20, weight: 2 },
  H: { segment: 'hero_business', label: 'Hero Ka Business', options: 4, timer: 10, weight: 1 },
  S: { segment: 'sudden_death', label: 'Sudden death (16th place tie only)', options: 4, timer: 20, weight: 1 },
} as const;

export const QUESTION_HEADINGS = ['ID', 'Prompt', 'Option A', 'Option B', 'Option C', 'Option D', 'Correct (A-D)', 'Live (Yes/No)', 'Side (Marvel/DC)', 'Working (optional)'];
export const CARD_HEADINGS = ['ID', 'Category', 'Card name', 'Series', 'Series key (do not change)', 'Power (1-10)', 'Min bid (Cr)', 'Phase'];
export const CARD_CATEGORIES = ['HQ', 'Suit', 'Gadget', 'Sidekick', 'Any'];
export const CARD_PHASES = ['marquee', 'secret', 'jugaad'];

export type QuestionRow = {
  id: string; segment: string; side: string | null; prompt: string; options: string[];
  timer_s: number; weight: number; is_live: boolean; correct_index: number; working: string | null;
};
export type CardRow = { id: string; category: string; card_name: string; series_name: string; gear_name: string; power: number; min_bid: number; phase: string };

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/** Column index of each heading, matched loosely ("min bid", "Min bid (Cr)" and "MIN_BID" all match). */
function columns(header: string[], headings: string[]) {
  const h = header.map(norm);
  return headings.map((name) => {
    const key = norm(name.replace(/\(.*\)/, ''));
    const exact = h.indexOf(key);
    return exact >= 0 ? exact : h.findIndex((x) => x.startsWith(key));
  });
}

const rowsOf = (rows: string[][]) => rows.slice(1).map((r, i) => ({ r: r.map((x) => String(x ?? '').trim()), line: i + 2 })).filter(({ r }) => r.some(Boolean));

export function parseQuestions(rows: string[][]): { rows: QuestionRow[]; errors: string[] } {
  const errors: string[] = [];
  const out: QuestionRow[] = [];
  if (!rows.length) return { rows: out, errors };
  const col = columns(rows[0], QUESTION_HEADINGS);
  for (const [i, name] of QUESTION_HEADINGS.entries()) if (col[i] < 0 && i < 8) errors.push(`Questions: no "${name}" column.`);
  if (errors.length) return { rows: out, errors };
  const seen = new Set<string>();
  for (const { r, line } of rowsOf(rows)) {
    const get = (i: number) => (col[i] >= 0 ? r[col[i]] ?? '' : '');
    const bad = (msg: string) => errors.push(`Questions row ${line}: ${msg}`);
    const id = get(0).toUpperCase();
    const seg = SEGMENT_BY_PREFIX[id[0] as keyof typeof SEGMENT_BY_PREFIX];
    if (!/^[MTBHS][0-9]{1,2}$/.test(id) || !seg) { bad(`ID "${get(0)}" must be M, T, B, H or S followed by a number (e.g. B7).`); continue; }
    if (seen.has(id)) { bad(`ID ${id} appears twice.`); continue; }
    seen.add(id);
    const options = [2, 3, 4, 5].map((k) => get(k)).slice(0, seg.options);
    const extra = [2, 3, 4, 5].slice(seg.options).some((k) => get(k));
    if (!get(1)) { bad('Prompt is empty.'); continue; }
    if (options.some((o) => !o)) { bad(`${seg.label} needs ${seg.options} options filled in.`); continue; }
    if (extra) { bad(`${seg.label} has only ${seg.options} options; leave Option C and D empty.`); continue; }
    const correct = LETTERS.indexOf(get(6).toUpperCase().slice(0, 1) as (typeof LETTERS)[number]);
    if (correct < 0 || correct >= seg.options) { bad(`Correct must be ${LETTERS.slice(0, seg.options).join(' or ')}.`); continue; }
    const liveRaw = norm(get(7));
    if (liveRaw && !['yes', 'no', 'y', 'n', 'true', 'false', '1', '0'].includes(liveRaw)) { bad('Live must be Yes or No.'); continue; }
    const live = ['yes', 'y', 'true', '1'].includes(liveRaw);
    if (live && seg.segment === 'sudden_death') { bad('A sudden-death question cannot be live.'); continue; }
    const sideRaw = get(8);
    const side = /^marvel$/i.test(sideRaw) ? 'Marvel' : /^dc$/i.test(sideRaw) ? 'DC' : null;
    if (sideRaw && !side) { bad('Side must be Marvel, DC or empty.'); continue; }
    out.push({
      id, segment: seg.segment, side, prompt: get(1), options, timer_s: seg.timer, weight: seg.weight,
      is_live: live, correct_index: correct, working: get(9) || null,
    });
  }
  return { rows: out, errors };
}

export function parseCards(rows: string[][]): { rows: CardRow[]; errors: string[] } {
  const errors: string[] = [];
  const out: CardRow[] = [];
  if (!rows.length) return { rows: out, errors };
  const col = columns(rows[0], CARD_HEADINGS);
  for (const [i, name] of CARD_HEADINGS.entries()) if (col[i] < 0) errors.push(`Cards: no "${name}" column.`);
  if (errors.length) return { rows: out, errors };
  const seen = new Set<string>();
  for (const { r, line } of rowsOf(rows)) {
    const get = (i: number) => r[col[i]] ?? '';
    const bad = (msg: string) => errors.push(`Cards row ${line}: ${msg}`);
    const id = get(0).toUpperCase();
    if (!/^([HSGK](0[1-9]|1[0-5])|JK[0-9]+)$/.test(id)) { bad(`ID "${get(0)}" must be H, S, G or K with 01–15 (e.g. G07), or JK1–JK4.`); continue; }
    if (seen.has(id)) { bad(`ID ${id} appears twice.`); continue; }
    seen.add(id);
    const category = CARD_CATEGORIES.find((c) => norm(c) === norm(get(1)));
    if (!category) { bad(`Category must be one of ${CARD_CATEGORIES.join(', ')}.`); continue; }
    const name = get(2);
    if (!name) { bad('Card name is empty.'); continue; }
    const series = get(3) || name;
    const key = get(4) || series;
    const power = Number(get(5));
    if (!Number.isInteger(power) || power < 1 || power > 10) { bad('Power must be a whole number from 1 to 10.'); continue; }
    const minBid = Number(get(6).replace(/[₹,\s]|cr/gi, ''));
    if (!(minBid > 0) || Math.round(minBid * 2) !== minBid * 2) { bad('Min bid must be above 0, in ₹0.5 Cr steps (e.g. 4 or 4.5).'); continue; }
    const phase = CARD_PHASES.find((p) => p === norm(get(7)));
    if (!phase) { bad(`Phase must be ${CARD_PHASES.join(', ')}.`); continue; }
    out.push({ id, category, card_name: name, series_name: series, gear_name: key, power, min_bid: minBid, phase });
  }
  return { rows: out, errors };
}

/** The "How to fill this in" sheet of the downloaded workbook. */
export const INSTRUCTIONS: string[][] = [
  ['How to update the prelim questions and the Power Bazaar cards'],
  [''],
  ['1. Edit the Questions and Cards sheets. Keep the heading row (row 1) as it is; the column order does not matter.'],
  ['2. A row with an existing ID replaces that question or card. A row with a new ID adds one. Rows you delete here are NOT deleted on the site.'],
  ['3. Upload the file on the website: Settings → Questions & cards → Upload. Nothing changes unless every row is valid.'],
  ['4. Questions can be changed only before the first prelim question opens; cards only before Round 1 starts.'],
  ['5. After uploading questions, shuffle the live 15 again on the quiz console.'],
  [''],
  ['QUESTIONS sheet'],
  ['ID: the first letter sets the segment. M = Marvel Ya DC? (2 options, 10 s), T = Teen Clue, Ek Hero (4 options, 10 s), B = Box Office Ka Hisaab (4 options, 20 s, double points), H = Hero Ka Business (4 options, 10 s), S = sudden death (4 options, 20 s, never live).'],
  ['Prompt: the question text. Option A–D: the answers (Marvel Ya DC? uses only A and B; leave C and D empty).'],
  ['Correct (A-D): the letter of the right answer. Secret: it is never shown to participants.'],
  ['Live (Yes/No): Yes = one of the 15 questions played (4 M + 4 T + 4 B + 3 H). No = a spare. Exactly 15 must be live.'],
  ['Side (Marvel/DC): optional label. Working (optional): a note for the quiz host.'],
  [''],
  ['CARDS sheet'],
  ['ID: H01–H15 = HQ, S01–S15 = Suit, G01–G15 = Gadget, K01–K15 = Sidekick, JK1–JK4 = Jugaad Kits.'],
  ['Category: HQ, Suit, Gadget, Sidekick (Any for Jugaad Kits). Card name and Series: shown on the projector and My Agency; card names must all differ.'],
  ['Series key (do not change): the internal name Breaking News and Team-Ups match on. Keep it as downloaded; for a brand-new card, copy the key of the series it belongs to.'],
  ['Power (1-10): whole number. Min bid (Cr): the opening bid in ₹ crore, in 0.5 steps.'],
  ['Phase: marquee (the top 2 of each category, auctioned live), secret (slate bids) or jugaad (Jugaad Kits).'],
];
