import { describe, expect, it } from 'vitest';
import { hasDb, sql } from './helpers';
import { quizPoints } from '@/lib/scoring/quiz';
import { towerScore } from '@/lib/scoring/tower';
import { heroScore } from '@/lib/scoring/hero';

describe.skipIf(!hasDb)('SQL and TypeScript scoring agree', () => {
  it('quiz points for every tenth of a second, both timers and weights, right and wrong', () => {
    const rows = sql(`
      select timer, w, t10, c::int, quiz_points(t10 / 10.0, timer, w, c)
        from (values (10, 1), (20, 2), (10, 2), (20, 1)) as s(timer, w)
        cross join generate_series(0, 260) as t10
        cross join (values (true), (false)) as k(c)
       where t10 <= timer * 10 + 60;`);
    expect(rows.length).toBeGreaterThan(1000);
    for (const row of rows) {
      const [timer, w, t10, c, points] = row.split('|').map(Number);
      expect(quizPoints({ responseTimeS: t10 / 10, timerS: timer, weight: w, correct: c === 1 }), row).toBe(points);
    }
  });

  it('Tower Score', () => {
    const cases = [
      [18, 20, 360, 20, 15], [20, 20, 0, 20, 20], [0, 20, 600, 0, 0], [7, 13, 487, 11, 3], [12, 18, 600, 9, 9],
    ];
    for (const [c, r, b, f, d] of cases) {
      const [dbScore] = sql(`select tower_score(${c}, ${r}, ${b}, ${f}, ${d})::float8;`);
      const ts = towerScore({ correctBlocks: c, referenceBlocks: r, buildTimeS: b, frozenBlocks: f, blocksFallen: d });
      expect(ts.score).toBeCloseTo(Number(dbScore), 9);
    }
  });

  it('Hero Score', () => {
    for (const [p, m, f] of [[28, 1.5, 18], [11, 0.25, 0.5], [40, 3, 10.5], [24, 0.5, 33], [31, 2, 0]]) {
      const [db] = sql(`select hero_score(${p}, ${m}, ${f});`);
      expect(heroScore(p, m, f)).toBe(Number(db));
    }
  });
});
