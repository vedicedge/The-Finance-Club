'use server';

import { redirect } from 'next/navigation';
import { requireOrganiser } from '@/lib/auth/organiser';
import { serviceDb } from '@/lib/db/server';
import { audit } from '@/lib/audit';
import { dbMessage } from '@/lib/round1/server';
import { readXlsx } from '@/lib/xlsx';
import { parseCards, parseQuestions } from '@/lib/content-sheet';

const back = (p: Record<string, string>): never => redirect(`/admin/content?${new URLSearchParams(p)}`);

/** Upload: checks every row first; the database then applies all of it or none of it. */
export async function importContent(formData: FormData) {
  const me = await requireOrganiser('settings');
  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) back({ error: 'Choose the Excel file (.xlsx) first.' });
  let book: Map<string, string[][]>;
  try {
    book = readXlsx(Buffer.from(await (file as File).arrayBuffer()));
  } catch {
    return back({ error: 'That file is not an Excel workbook (.xlsx). In Excel use File → Save As → Excel Workbook.' });
  }
  const sheet = (name: string) => [...book.entries()].find(([n]) => n.trim().toLowerCase() === name)?.[1] ?? [];
  const q = parseQuestions(sheet('questions'));
  const c = parseCards(sheet('cards'));
  const errors = [...q.errors, ...c.errors];
  if (errors.length) back({ error: errors.slice(0, 8).join(' · ') + (errors.length > 8 ? ` · and ${errors.length - 8} more` : '') });
  if (!q.rows.length && !c.rows.length) back({ error: 'No rows found. The sheets must be named "Questions" and "Cards".' });
  const { error } = await serviceDb().rpc('admin_import_content', { p_questions: q.rows, p_cards: c.rows, p_actor: me.userId });
  if (error) back({ error: dbMessage(error) });
  await audit(me, 'content.import', { questions: q.rows.length, cards: c.rows.length });
  back({ ok: `Uploaded: ${q.rows.length} questions, ${c.rows.length} cards.${q.rows.length ? ' Shuffle the live 15 again on the quiz console.' : ''}` });
}
