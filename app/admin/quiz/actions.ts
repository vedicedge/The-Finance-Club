'use server';

import { redirect } from 'next/navigation';
import { requireOrganiser } from '@/lib/auth/organiser';
import { serviceDb } from '@/lib/db/server';
import { audit } from '@/lib/audit';
import { loadBoard, quizErrorMessage } from '@/lib/quiz/server';
import { readXlsx } from '@/lib/xlsx';
import { parseKahoot, readCsv } from '@/lib/kahoot';

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
  await run('quiz.publish', {}, async () => {
    const r = await serviceDb().rpc('quiz_publish_board');
    // The audience wants the board next: put it on the projector without another click.
    if (!r.error) await serviceDb().from('event_state').update({ step: 'board' }).eq('id', true);
    return r;
  });
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

// ---------------------------------------------------------------- red alert: the prelim on Kahoot

const backTo = (p: Record<string, string>): never => redirect(`/admin/quiz?${new URLSearchParams(p)}#red-alert`);

/** Red alert on (the prelim moves to Kahoot, with its game PIN) or off again. */
export async function setKahoot(on: boolean, formData: FormData) {
  const me = await requireOrganiser('quiz');
  if (on && formData.get('confirm') !== 'on' && !formData.get('update')) backTo({ error: 'Tick “confirm” to sound the red alert.' });
  if (!on && formData.get('confirm') !== 'on') backTo({ error: 'Tick “confirm” to switch back to the website quiz.' });
  const pin = String(formData.get('pin') ?? '').trim();
  const { error } = await serviceDb().rpc('prelim_set_kahoot', { p_on: on, p_pin: pin || null, p_actor: me.userId });
  if (error) backTo({ error: quizErrorMessage(error) });
  await audit(me, on ? 'quiz.kahoot_on' : 'quiz.kahoot_off', { pin: pin || null });
  backTo({ ok: on ? `Red alert: the prelim is on Kahoot${pin ? ` (PIN ${pin})` : ''}. Phones and the projector now say so.` : 'Back to the website quiz.' });
}

/** Kahoot's results file (.xlsx or .csv): players matched to agencies by the ID in their nickname. */
export async function uploadKahoot(formData: FormData) {
  const me = await requireOrganiser('quiz');
  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) backTo({ error: 'Choose Kahoot’s results file first.' });
  const buf = Buffer.from(await (file as File).arrayBuffer());
  let sheets: string[][][];
  try {
    sheets = /\.csv$/i.test((file as File).name) ? [readCsv(buf.toString('utf8'))] : [...readXlsx(buf).values()];
  } catch {
    return backTo({ error: 'That file could not be read. Upload Kahoot’s results as .xlsx (or .csv).' });
  }
  const { data: agencies } = await serviceDb().from('agencies').select('id, name');
  const parsed = parseKahoot(sheets, (agencies ?? []) as { id: string; name: string }[]);
  if (parsed.error) backTo({ error: parsed.error });
  const { error } = await serviceDb().rpc('prelim_save_kahoot', { p_rows: parsed.rows, p_actor: me.userId });
  if (error) backTo({ error: quizErrorMessage(error) });
  await audit(me, 'quiz.kahoot_results', { teams: parsed.rows.length, unmatched: parsed.unmatched, duplicates: parsed.duplicates });
  const notes = [
    parsed.unmatched.length ? `Not matched (no agency ID in the nickname): ${parsed.unmatched.map((u) => `${u.player} (rank ${u.rank})`).join(', ')}.` : '',
    parsed.duplicates.length ? `Ignored second entries: ${parsed.duplicates.map((d) => `${d.player} → ${d.agency}`).join(', ')}.` : '',
  ].filter(Boolean).join(' ');
  backTo({ ok: `Kahoot results uploaded: ${parsed.rows.length} teams ranked. ${notes} Check the table, then publish.` });
}

/** Publishes the Kahoot ranking as the prelim board (the projector shows it). */
export async function publishKahoot() {
  const me = await requireOrganiser('quiz');
  const { error } = await serviceDb().rpc('prelim_kahoot_publish');
  if (error) backTo({ error: quizErrorMessage(error) });
  await audit(me, 'quiz.kahoot_publish', {});
  backTo({ ok: 'The Kahoot board is published and on the projector. Freeze the top 16 next.' });
}
