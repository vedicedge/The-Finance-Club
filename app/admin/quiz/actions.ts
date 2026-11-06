'use server';

import { redirect } from 'next/navigation';
import { requireOrganiser } from '@/lib/auth/organiser';
import { serviceDb } from '@/lib/db/server';
import { audit } from '@/lib/audit';
import { loadBoard, quizErrorMessage } from '@/lib/quiz/server';

type DbResult = PromiseLike<{ error: { message: string; hint?: string | null } | null }>;

/** Runs one host action: role check, database call, audit, then back to the console. */
async function run(action: string, payload: Record<string, unknown>, call: () => DbResult): Promise<never> {
  const me = await requireOrganiser('quiz');
  const { error } = await call();
  if (error) redirect(`/admin/quiz?error=${encodeURIComponent(quizErrorMessage(error))}`);
  await audit(me, action, payload);
  redirect('/admin/quiz');
}

export async function shuffleQuiz() {
  await run('quiz.shuffle', {}, () => serviceDb().rpc('quiz_shuffle'));
}

export async function openQuestion(id: string) {
  await run('quiz.open', { id }, () => serviceDb().rpc('quiz_open_question', { p_question: id }));
}

export async function revealQuestion(id: string) {
  await run('quiz.reveal', { id }, () => serviceDb().rpc('quiz_reveal_question', { p_question: id }));
}

export async function voidQuestion(id: string, formData: FormData) {
  if (formData.get('confirm') !== 'on') redirect('/admin/quiz?error=' + encodeURIComponent('Tick “confirm” to void a question.'));
  await run('quiz.void', { id }, () => serviceDb().rpc('quiz_void_question', { p_question: id }));
}

export async function applySpare(voided: string, formData: FormData) {
  const spare = String(formData.get('spare') ?? '');
  await run('quiz.use_spare', { voided, spare }, () => serviceDb().rpc('quiz_use_spare', { p_voided: voided, p_spare: spare }));
}

export async function setProjector(mode: 'lobby' | 'question' | 'board') {
  await run('quiz.projector', { mode }, () =>
    serviceDb()
      .from('event_state')
      .update({ step: mode === 'question' ? null : mode })
      .eq('id', true),
  );
}

export async function publishBoard() {
  await run('quiz.publish', {}, () => serviceDb().rpc('quiz_publish_board'));
}

export async function unpublishBoard() {
  await run('quiz.unpublish', {}, () => serviceDb().rpc('quiz_unpublish_board'));
}

/** Records the sudden-death finishing order (1 = best) for the agencies tied at 16th. */
export async function saveTiebreak(formData: FormData) {
  const me = await requireOrganiser('quiz');
  const entries = [...formData.entries()]
    .filter(([k]) => k.startsWith('rank_'))
    .map(([k, v]) => ({ agency_id: k.slice(5), tiebreak_rank: Number(v) }));
  const ranks = entries.map((e) => e.tiebreak_rank);
  const valid =
    entries.length > 1 &&
    ranks.every((r) => Number.isInteger(r) && r >= 1 && r <= entries.length) &&
    new Set(ranks).size === ranks.length;
  if (!valid) redirect('/admin/quiz?error=' + encodeURIComponent(`Give each tied agency a different place, 1 to ${entries.length}.`));
  const question = String(formData.get('question') ?? '') || null;
  const { error } = await serviceDb()
    .from('prelim_tiebreaks')
    .upsert(entries.map((e) => ({ ...e, question_id: question, created_by: me.userId })), { onConflict: 'agency_id' });
  if (error) redirect('/admin/quiz?error=' + encodeURIComponent(error.message));
  await audit(me, 'quiz.sudden_death', { entries, question });
  redirect('/admin/quiz');
}

/** Freezes the top 16 (after the board is published and any 16th-place tie is settled). */
export async function freezeTop16(formData: FormData) {
  if (formData.get('confirm') !== 'on') redirect('/admin/quiz?error=' + encodeURIComponent('Tick “confirm” to freeze the top 16.'));
  const board = await loadBoard();
  if (!board.qualifiers) redirect('/admin/quiz?error=' + encodeURIComponent('Settle the tie for 16th place first (sudden death).'));
  const qualifiers = board.qualifiers;
  await run('quiz.freeze_top16', { qualifiers }, () => serviceDb().rpc('quiz_freeze_top16', { p_qualifiers: qualifiers }));
}
