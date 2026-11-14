import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { serviceDb } from '@/lib/db/server';
import { AGENCY_SESSION_COOKIE, hashSessionToken } from '@/lib/auth/session-token';

/** The phone's view of the quiz. One database call; see quiz_phone_state for what it may contain. */
export async function GET() {
  const token = (await cookies()).get(AGENCY_SESSION_COOKIE)?.value;
  const headers = { 'Cache-Control': 'no-store' };
  if (!token) return NextResponse.json({ signed_in: false }, { status: 401, headers });
  try {
    const { data, error } = await serviceDb().rpc('quiz_phone_state', { p_token_hash: hashSessionToken(token) });
    if (error) return NextResponse.json({ error: 'unavailable' }, { status: 503, headers });
    // The category intro (first question of a category): read on its own, tolerant of an older database.
    const qid = (data as { question?: { id?: string } | null } | null)?.question?.id;
    if (qid) {
      const intro = await serviceDb().from('questions').select('intro_until').eq('id', qid).maybeSingle();
      (data as { question: Record<string, unknown> }).question.intro_until = (intro.data?.intro_until as string | null) ?? null;
    }
    // Red alert: the prelim moved to Kahoot. The phone shows where to go, then the Kahoot rank.
    const agencyId = (data as { agency?: { id?: string } } | null)?.agency?.id;
    if (agencyId) {
      const k = await serviceDb().from('event_state').select('prelim_kahoot, prelim_kahoot_pin, prelim_published_at').maybeSingle();
      if (k.data?.prelim_kahoot) {
        const res = await serviceDb().from('prelim_kahoot_results').select('agency_id, score, agencies(is_test)').order('kahoot_rank');
        const mineTest = (res.data ?? []).find((r) => r.agency_id === agencyId);
        const rows = (res.data ?? []).filter((r) => {
          const a = (Array.isArray(r.agencies) ? r.agencies[0] : r.agencies) as { is_test: boolean } | null;
          const m = (Array.isArray(mineTest?.agencies) ? mineTest?.agencies[0] : mineTest?.agencies) as { is_test: boolean } | null | undefined;
          return !m || a?.is_test === m.is_test;
        });
        const at = rows.findIndex((r) => r.agency_id === agencyId);
        (data as Record<string, unknown>).kahoot = {
          pin: (k.data.prelim_kahoot_pin as string | null) ?? null,
          published: Boolean(k.data.prelim_published_at),
          rank: at >= 0 ? at + 1 : null,
          score: at >= 0 ? (rows[at].score as number) : null,
        };
      }
    }
    return NextResponse.json(data, { status: data?.signed_in ? 200 : 401, headers });
  } catch {
    return NextResponse.json({ error: 'unavailable' }, { status: 503, headers });
  }
}
