import type { QuizSegment } from '@/lib/scoring/quiz';
import type { Phase } from '@/lib/phases';

/** What /api/quiz/state returns to a phone (built by the quiz_phone_state database function). */
export type PhoneState =
  | { signed_in: false }
  | {
      signed_in: true;
      now: string;
      phase: Phase;
      agency: { id: string; name: string; status: string; eliminated_in: string | null };
      eligible: boolean;
      requires_checkin: boolean;
      question:
        | null
        | { sudden_death: true }
        | {
            id: string;
            number: number | null;
            segment: QuizSegment;
            prompt: string;
            options: string[];
            timer_s: number;
            weight: number;
            status: 'pending' | 'open' | 'closed' | 'void';
            opened_at: string;
            revealed: boolean;
            correct_index: number | null;
            my_answer: null | { option_index: number; late: boolean; is_correct: boolean | null; points: number | null };
            /** First question of a category: the category intro shows until then. */
            intro_until?: string | null;
          };
      totals: { points: number; correct: number; answered: number };
      revealed_count: number;
      published: boolean;
      frozen: boolean;
      rank: number | null;
      dry_run?: boolean;
      /** Red alert: the prelim moved to Kahoot. */
      kahoot?: { pin: string | null; published: boolean; rank: number | null; score: number | null };
    };

/** Seconds left on a question, using the server's clock (offset = server time − phone time). */
export function secondsLeft(openedAtIso: string, timerS: number, clockOffsetMs: number, nowMs = Date.now()): number {
  const serverNow = nowMs + clockOffsetMs;
  return (Date.parse(openedAtIso) + timerS * 1000 - serverNow) / 1000;
}

/** Seconds until the clock starts (read-in), or 0 once it has. */
export function secondsToStart(openedAtIso: string, clockOffsetMs: number, nowMs = Date.now()): number {
  return Math.max(0, (Date.parse(openedAtIso) - (nowMs + clockOffsetMs)) / 1000);
}

export const OPTION_LETTERS = ['A', 'B', 'C', 'D'] as const;
