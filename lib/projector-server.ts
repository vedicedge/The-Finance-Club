import 'server-only';
import { serviceDb } from '@/lib/db/server';
import type { RoundProgress } from '@/lib/projector';

/**
 * How far the current round has got, for the automatic projector (each round opens on its rules
 * page until its first action). Every read tolerates a database without the newest columns.
 */
export async function loadRoundProgress(phase: string): Promise<RoundProgress> {
  const db = serviceDb();
  const st = await db.from('event_state').select('step, round2_published_at').maybeSingle();
  const out: RoundProgress = { round2Published: Boolean(st.data?.round2_published_at), r1Step: (st.data?.step as string | null) ?? null };
  if (phase === 'prelim') {
    const q = await db.from('questions').select('id', { count: 'exact', head: true }).not('opened_at', 'is', null).neq('segment', 'sudden_death');
    out.quizStarted = (q.count ?? 0) > 0;
  }
  if (phase === 'round2') {
    const d = await db.from('poster_duels').select('id', { count: 'exact', head: true });
    out.duelsDrawn = (d.count ?? 0) > 0;
  }
  if (phase === 'round3') {
    const f = await db.from('event_state').select('ff_closes_at').maybeSingle();
    out.ffOpened = f.error ? true : Boolean(f.data?.ff_closes_at);
  }
  return out;
}
