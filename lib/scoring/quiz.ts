/**
 * Prelim "Hero Ya Zero?" scoring (spec: Prelim quiz engine).
 *
 *   points = round(1000 × W × (1 − t ÷ 2T))  if correct and t ≤ T, else 0
 *
 * t is measured by the database (received_at − opened_at), rounded to 0.1 s, and arrives here
 * already rounded. Halves round up, as Math.floor(x + 0.5). The maths is done in whole tenths
 * of a second so there is no floating-point drift; the SQL function public.quiz_points gives
 * identical results (checked in tests/db).
 */

export type QuizSegment = 'marvel_ya_dc' | 'teen_clue' | 'box_office' | 'hero_business' | 'sudden_death';

export type QuizAnswerInput = {
  /** Response time in seconds, one decimal place, as stored in answers.response_time_s. */
  responseTimeS: number | string;
  /** The question's timer T in seconds (10 or 20). */
  timerS: number;
  /** The question's weight W (1 or 2). */
  weight: number;
  correct: boolean;
};

/** Converts a one-decimal response time (e.g. 12.3 or "12.3") to whole tenths (123). */
export function toTenths(seconds: number | string): number {
  const n = typeof seconds === 'string' ? Number(seconds) : seconds;
  if (!Number.isFinite(n)) throw new RangeError(`Invalid response time: ${seconds}`);
  return Math.round(n * 10);
}

export function quizPoints({ responseTimeS, timerS, weight, correct }: QuizAnswerInput): number {
  if (!correct) return 0;
  const t10 = toTenths(responseTimeS);
  const timer10 = timerS * 10;
  if (t10 < 0 || t10 > timer10) return 0;
  // floor(1000·W·(2T − t)/(2T) + 0.5) written over a common integer denominator.
  const twoT = 2 * timer10;
  return Math.floor((2 * 1000 * weight * (twoT - t10) + twoT) / (2 * twoT));
}

/** Segment settings from the spec table (questions also store timer_s and weight). */
export const SEGMENTS: Record<QuizSegment, { label: string; timerS: number; weight: number }> = {
  marvel_ya_dc: { label: 'Marvel Ya DC?', timerS: 10, weight: 1 },
  teen_clue: { label: 'Teen Clue, Ek Hero', timerS: 10, weight: 1 },
  box_office: { label: 'Box Office Ka Hisaab', timerS: 20, weight: 2 },
  hero_business: { label: 'Hero Ka Business', timerS: 10, weight: 1 },
  sudden_death: { label: 'Sudden Death', timerS: 20, weight: 1 },
};
