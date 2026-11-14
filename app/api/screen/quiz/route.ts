import { NextResponse } from 'next/server';
import { getOrganiser } from '@/lib/auth/organiser';
import { canAccess } from '@/lib/auth/roles';
import { serviceDb } from '@/lib/db/server';
import { parseSettings } from '@/lib/settings';
import { loadBoard } from '@/lib/quiz/server';

/**
 * What the quiz projector shows. Organisers only (the projector laptop is signed in).
 * The answer key is included only after the host has revealed the question.
 */
export async function GET() {
  const headers = { 'Cache-Control': 'no-store' };
  const organiser = await getOrganiser();
  if (!organiser || !canAccess(organiser.roles, 'screens')) {
    return NextResponse.json({ error: 'not_signed_in' }, { status: 401, headers });
  }
  const db = serviceDb();
  const { data: st, error } = await db
    .from('event_state')
    .select('phase, step, current_question_id, prelim_published_at, prelim_frozen_at, prelim_kahoot, prelim_kahoot_pin, settings')
    .single();
  if (error || !st) return NextResponse.json({ error: 'unavailable' }, { status: 503, headers });

  const now = new Date().toISOString();
  const requiresCheckin = parseSettings(st.settings).prelim.requiresCheckin;
  const [question, sessions, eligible] = await Promise.all([
    st.current_question_id
      ? db
          .from('questions')
          .select('id, segment, prompt, options, timer_s, weight, order_no, status, opened_at, revealed_at, intro_until')
          .eq('id', st.current_question_id)
          .single()
      : Promise.resolve({ data: null }),
    db.from('agency_sessions').select('agency_id').is('revoked_at', null).gt('expires_at', now),
    db
      .from('agencies')
      .select('id', { count: 'exact', head: true })
      .in('status', requiresCheckin ? ['checked_in'] : ['registered', 'checked_in']),
  ]);

  const q = question.data;
  let lockedCount = 0;
  let distribution: number[] | null = null;
  let correctIndex: number | null = null;
  let revealLine: string | null = null;
  const introUntil = (q?.intro_until as string | null | undefined) ?? null;
  const mode = st.step === 'board' ? 'board' : st.step === 'lobby' || !q ? 'lobby' : 'question';
  const revealed = Boolean(q && q.revealed_at && q.status !== 'void');
  const [answers, key, board] = await Promise.all([
    q ? db.from('answers').select('option_index').eq('question_id', q.id) : { data: null },
    // The key and the reveal line (whose company, or the working) go on the projector only after the reveal.
    revealed && q ? db.from('question_keys').select('correct_index, working').eq('question_id', q.id).maybeSingle() : { data: null },
    mode === 'board' ? loadBoard() : null,
  ]);
  if (q) {
    lockedCount = answers.data?.length ?? 0;
    if (revealed) {
      correctIndex = (key.data?.correct_index as number | undefined) ?? null;
      revealLine = (key.data?.working as string | null | undefined) ?? null;
      distribution = [0, 0, 0, 0];
      for (const a of answers.data ?? []) distribution[a.option_index] += 1;
    }
  }
  const kahoot = { on: Boolean(st.prelim_kahoot), pin: (st.prelim_kahoot_pin as string | null) ?? null };

  return NextResponse.json(
    {
      now: new Date().toISOString(),
      phase: st.phase,
      mode,
      published: Boolean(st.prelim_published_at),
      frozen: Boolean(st.prelim_frozen_at),
      kahoot: kahoot.on ? { pin: kahoot.pin } : null,
      standingBy: new Set((sessions.data ?? []).map((s) => s.agency_id)).size,
      eligibleCount: eligible.count ?? 0,
      lockedCount,
      question: q
        ? {
            id: q.id,
            segment: q.segment,
            number: q.order_no,
            prompt: q.prompt,
            options: q.options,
            timer_s: q.timer_s,
            weight: q.weight,
            status: q.status,
            opened_at: q.opened_at,
            revealed: Boolean(q.revealed_at),
            correct_index: correctIndex,
            distribution,
            intro_until: introUntil,
            reveal_line: revealLine,
          }
        : null,
      board: board
        ? {
            rows: board.rows.slice(0, 24).map((r) => ({
              id: r.agencyId,
              name: r.name,
              total: r.total,
              rank: r.rank,
              position: r.position,
              qualified: r.qualified,
            })),
            suddenDeath: board.suddenDeath,
          }
        : null,
    },
    { headers },
  );
}
