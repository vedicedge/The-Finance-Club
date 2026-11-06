import { requireOrganiser } from '@/lib/auth/organiser';
import { audit } from '@/lib/audit';
import { loadBoard, loadSlotPoints } from '@/lib/quiz/server';
import { prelimCsv } from '@/lib/quiz/csv';

/** Spec: "Export CSV: agency, q1–q15 points, total, correct count, total correct time." */
export async function GET() {
  const me = await requireOrganiser('quiz');
  const [board, slots] = await Promise.all([loadBoard(), loadSlotPoints()]);
  const csv = prelimCsv(
    board.rows.map((r) => ({
      agencyId: r.agencyId,
      name: r.name,
      rank: r.rank,
      slots: slots.get(r.agencyId) ?? [],
      total: r.total,
      correctCount: r.correctCount,
      correctTime: Number(r.correctTime).toFixed(1),
    })),
  );
  await audit(me, 'quiz.export_csv', { rows: board.rows.length });
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="doomsday-prelim-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
