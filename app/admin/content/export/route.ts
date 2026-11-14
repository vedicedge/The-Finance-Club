import { getOrganiser } from '@/lib/auth/organiser';
import { canAccess } from '@/lib/auth/roles';
import { serviceDb } from '@/lib/db/server';
import { writeXlsx } from '@/lib/xlsx';
import { CARD_HEADINGS, INSTRUCTIONS, LETTERS, QUESTION_HEADINGS } from '@/lib/content-sheet';

/** Admin only: today's questions (with their secret answers) and cards, ready to edit and upload again. */
export async function GET() {
  const organiser = await getOrganiser();
  if (!organiser || !canAccess(organiser.roles, 'settings')) return new Response('Not allowed', { status: 403 });
  const db = serviceDb();
  const [qs, keys, cards] = await Promise.all([
    db.from('questions').select('id, side, prompt, options, is_live').order('id'),
    db.from('question_keys').select('question_id, correct_index, working'),
    db.from('gear_cards').select('id, category, card_name, series_name, gear_name, power, min_bid, phase').order('id'),
  ]);
  const key = new Map((keys.data ?? []).map((k) => [k.question_id as string, k]));
  const order = (id: string) => 'MTBHS'.indexOf(id[0]) * 100 + Number(id.slice(1));
  const questions = [...(qs.data ?? [])].sort((a, b) => order(a.id) - order(b.id)).map((q) => {
    const k = key.get(q.id);
    const o = q.options as string[];
    return [q.id, q.prompt, o[0] ?? '', o[1] ?? '', o[2] ?? '', o[3] ?? '', k ? LETTERS[k.correct_index] : '', q.is_live ? 'Yes' : 'No', q.side ?? '', k?.working ?? ''];
  });
  const file = writeXlsx([
    { name: 'Questions', rows: [QUESTION_HEADINGS, ...questions], widths: [7, 60, 22, 22, 22, 22, 13, 13, 16, 40] },
    { name: 'Cards', rows: [CARD_HEADINGS, ...(cards.data ?? []).map((c) => [c.id, c.category, c.card_name ?? '', c.series_name ?? '', c.gear_name, c.power, Number(c.min_bid), c.phase])], widths: [7, 11, 30, 26, 26, 13, 13, 11] },
    { name: 'How to fill this in', rows: INSTRUCTIONS, widths: [150] },
  ]);
  return new Response(new Uint8Array(file), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="doomsday-questions-and-cards.xlsx"',
      'Cache-Control': 'no-store',
    },
  });
}
