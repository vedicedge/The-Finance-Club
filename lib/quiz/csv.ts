/** Spec: "Export CSV: agency, q1–q15 points, total, correct count, total correct time." */

export type CsvRow = {
  agencyId: string;
  name: string;
  rank: number;
  /** Points per slot 1–15; null = no answer (or the slot was never played). */
  slots: (number | null)[];
  total: number;
  correctCount: number;
  correctTime: string;
};

function cell(v: string | number | null): string {
  if (v === null) return '';
  const s = String(v);
  // Quote anything with a comma, quote or newline; neutralise spreadsheet formulas.
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function prelimCsv(rows: CsvRow[], slots = 15): string {
  const head = ['agency', 'name', 'rank', ...Array.from({ length: slots }, (_, i) => `q${i + 1}`), 'total', 'correct', 'correct_time_s'];
  const lines = rows.map((r) =>
    [r.agencyId, r.name, r.rank, ...Array.from({ length: slots }, (_, i) => r.slots[i] ?? null), r.total, r.correctCount, r.correctTime]
      .map(cell)
      .join(','),
  );
  return [head.join(','), ...lines].join('\r\n') + '\r\n';
}
