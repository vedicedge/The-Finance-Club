import 'server-only';
import { serviceDb } from '@/lib/db/server';
import { rankBoard, type Board, type BoardInput } from '@/lib/quiz/board';
import type { QuizSegment } from '@/lib/scoring/quiz';

export type QuestionRow = {
  id: string;
  segment: QuizSegment;
  side: 'Marvel' | 'DC' | null;
  prompt: string;
  options: string[];
  timer_s: number;
  weight: number;
  is_live: boolean;
  order_no: number | null;
  replaces_id: string | null;
  status: 'pending' | 'open' | 'closed' | 'void';
  opened_at: string | null;
  revealed_at: string | null;
};

const QUESTION_COLUMNS = 'id, segment, side, prompt, options, timer_s, weight, is_live, order_no, replaces_id, status, opened_at, revealed_at';

export async function loadQuestions(): Promise<QuestionRow[]> {
  const { data, error } = await serviceDb().from('questions').select(QUESTION_COLUMNS).order('id');
  if (error) throw error;
  return (data ?? []) as QuestionRow[];
}

/** SECRET: answer keys. Only for the quiz host console and server-side checks. */
export async function loadAnswerKeys(): Promise<Map<string, number>> {
  const { data, error } = await serviceDb().from('question_keys').select('question_id, correct_index');
  if (error) throw error;
  return new Map((data ?? []).map((k) => [k.question_id as string, k.correct_index as number]));
}

/** Answers per question: how many, and per option (option counts only used after a reveal). */
export async function loadAnswerCounts(): Promise<Map<string, { total: number; byOption: number[] }>> {
  const { data, error } = await serviceDb().from('answers').select('question_id, option_index');
  if (error) throw error;
  const out = new Map<string, { total: number; byOption: number[] }>();
  for (const a of data ?? []) {
    const c = out.get(a.question_id) ?? { total: 0, byOption: [0, 0, 0, 0] };
    c.total += 1;
    c.byOption[a.option_index] += 1;
    out.set(a.question_id, c);
  }
  return out;
}

/** The prelim board with both tie-breaks applied. */
export async function loadBoard(): Promise<Board & { names: Map<string, string> }> {
  const db = serviceDb();
  const [scores, agencies, tiebreaks, st] = await Promise.all([
    db.from('v_prelim_scores').select('agency_id, total_points, correct_count, correct_time_s'),
    db.from('agencies').select('id, name, is_test'),
    db.from('prelim_tiebreaks').select('agency_id, tiebreak_rank'),
    db.from('event_state').select('settings').single(),
  ]);
  if (scores.error) throw scores.error;
  if (agencies.error) throw agencies.error;
  if (tiebreaks.error) throw tiebreaks.error;
  // A dry run ranks only test agencies; the real event only real ones.
  const dryRun = Boolean((st.data?.settings as { dry_run?: { enabled?: boolean } } | null)?.dry_run?.enabled);
  const inPlay = new Set((agencies.data ?? []).filter((a) => Boolean(a.is_test) === dryRun).map((a) => a.id as string));
  const names = new Map((agencies.data ?? []).map((a) => [a.id as string, a.name as string]));
  const tb = new Map((tiebreaks.data ?? []).map((t) => [t.agency_id as string, t.tiebreak_rank as number]));
  const input: BoardInput[] = (scores.data ?? []).filter((s) => inPlay.has(s.agency_id)).map((s) => ({
    agencyId: s.agency_id,
    name: names.get(s.agency_id) ?? s.agency_id,
    total: s.total_points,
    correctCount: s.correct_count,
    correctTime: s.correct_time_s,
    tiebreakRank: tb.get(s.agency_id) ?? null,
  }));
  return { ...rankBoard(input), names };
}

/** Points per agency per slot (1–15), for the CSV. Void questions are excluded. */
export async function loadSlotPoints(): Promise<Map<string, (number | null)[]>> {
  const db = serviceDb();
  const [questions, answers] = await Promise.all([
    db.from('questions').select('id, order_no, status, segment').not('order_no', 'is', null).neq('status', 'void'),
    db.from('answers').select('agency_id, question_id, points'),
  ]);
  if (questions.error) throw questions.error;
  if (answers.error) throw answers.error;
  const slotOf = new Map((questions.data ?? []).map((q) => [q.id as string, q.order_no as number]));
  const out = new Map<string, (number | null)[]>();
  for (const a of answers.data ?? []) {
    const slot = slotOf.get(a.question_id);
    if (!slot) continue;
    const row = out.get(a.agency_id) ?? Array<number | null>(15).fill(null);
    row[slot - 1] = a.points;
    out.set(a.agency_id, row);
  }
  return out;
}

/** Database error → a short message for the host (uses the hint the SQL function raised). */
export function quizErrorMessage(error: { message?: string; hint?: string | null }): string {
  if (error.hint) return error.hint;
  const m = error.message ?? '';
  const known: Record<string, string> = {
    not_prelim: 'Switch the event to the prelim phase first (command centre).',
    not_pending: 'That question has already been used.',
    question_running: 'Wait for the current question’s timer to finish.',
    not_revealable: 'That question cannot be revealed.',
    already_revealed: 'Already revealed.',
    still_running: 'Reveal unlocks when the timer ends.',
    already_void: 'Already voided.',
    not_a_voided_slot: 'Pick a voided question’s slot.',
    spare_not_available: 'That spare has already been used.',
    wrong_segment: 'A spare must come from the same segment.',
    board_not_published: 'Publish the board first.',
    already_frozen: 'The top 16 are already frozen.',
    bad_qualifiers: 'The qualifier list is not valid.',
  };
  return known[m] ?? m;
}
