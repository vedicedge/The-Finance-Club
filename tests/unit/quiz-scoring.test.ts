import { describe, expect, it } from 'vitest';
import { quizPoints, toTenths } from '@/lib/scoring/quiz';

describe('prelim scoring — worked examples from the spec', () => {
  it('Marvel Ya DC? (T 10, W 1) correct at 2.0 s scores 900', () => {
    expect(quizPoints({ responseTimeS: 2.0, timerS: 10, weight: 1, correct: true })).toBe(900);
  });

  it('Box Office (T 20, W 2) correct at 12.0 s scores 1,400', () => {
    expect(quizPoints({ responseTimeS: 12.0, timerS: 20, weight: 2, correct: true })).toBe(1400);
  });

  it('a wrong answer scores 0, however fast', () => {
    expect(quizPoints({ responseTimeS: 0.4, timerS: 10, weight: 1, correct: false })).toBe(0);
    expect(quizPoints({ responseTimeS: 1.0, timerS: 20, weight: 2, correct: false })).toBe(0);
  });

  it('correct at exactly 10.0 s on a 10 s question scores 500', () => {
    expect(quizPoints({ responseTimeS: 10.0, timerS: 10, weight: 1, correct: true })).toBe(500);
  });

  it('correct at 10.1 s on a 10 s question scores 0', () => {
    expect(quizPoints({ responseTimeS: 10.1, timerS: 10, weight: 1, correct: true })).toBe(0);
  });
});

describe('prelim scoring — boundaries', () => {
  it('an instant correct answer earns 1,000 × W', () => {
    expect(quizPoints({ responseTimeS: 0, timerS: 10, weight: 1, correct: true })).toBe(1000);
    expect(quizPoints({ responseTimeS: 0, timerS: 20, weight: 2, correct: true })).toBe(2000);
  });

  it('a correct answer at the last moment earns 500 × W', () => {
    expect(quizPoints({ responseTimeS: 20.0, timerS: 20, weight: 2, correct: true })).toBe(1000);
  });

  it('accepts the database string form of numeric(6,1)', () => {
    expect(quizPoints({ responseTimeS: '12.0', timerS: 20, weight: 2, correct: true })).toBe(1400);
  });

  it('never goes below 500 × W or above 1,000 × W for a correct, in-time answer', () => {
    for (const [timerS, weight] of [[10, 1], [20, 2]] as const) {
      for (let t10 = 0; t10 <= timerS * 10; t10++) {
        const p = quizPoints({ responseTimeS: t10 / 10, timerS, weight, correct: true });
        expect(p).toBeGreaterThanOrEqual(500 * weight);
        expect(p).toBeLessThanOrEqual(1000 * weight);
      }
    }
  });

  it('is strictly decreasing in time (faster correct answers score more)', () => {
    let previous = Infinity;
    for (let t10 = 0; t10 <= 100; t10++) {
      const p = quizPoints({ responseTimeS: t10 / 10, timerS: 10, weight: 1, correct: true });
      expect(p).toBeLessThan(previous);
      previous = p;
    }
  });

  it('converts one-decimal times to whole tenths without float drift', () => {
    expect(toTenths(12.3)).toBe(123);
    expect(toTenths('0.1')).toBe(1);
    expect(toTenths(10.1)).toBe(101);
  });
});
