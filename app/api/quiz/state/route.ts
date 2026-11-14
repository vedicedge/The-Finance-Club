import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { serviceDb } from '@/lib/db/server';
import { AGENCY_SESSION_COOKIE, hashSessionToken } from '@/lib/auth/session-token';

type PhoneData = { signed_in?: boolean; agency?: { id?: string }; question?: Record<string, unknown> | null } & Record<string, unknown>;

/**
 * The phone's view of the quiz (see quiz_phone_state for what it may contain). Every phone polls
 * this about once a second, so its reads run side by side: one database round trip, not three.
 */
export async function GET() {
  const token = (await cookies()).get(AGENCY_SESSION_COOKIE)?.value;
  const headers = { 'Cache-Control': 'no-store' };
  if (!token) return NextResponse.json({ signed_in: false }, { status: 401, headers });
  try {
    const db = serviceDb();
    const [phone, kahootState, intros] = await Promise.all([
      db.rpc('quiz_phone_state', { p_token_hash: hashSessionToken(token) }),
      db.from('event_state').select('prelim_kahoot, prelim_kahoot_pin, prelim_published_at').maybeSingle(),
      // Category intros: only the first question of each category has one (a handful of rows).
      db.from('questions').select('id, intro_until').not('intro_until', 'is', null),
    ]);
    if (phone.error) return NextResponse.json({ error: 'unavailable' }, { status: 503, headers });
    const data = phone.data as PhoneData | null;

    const q = data?.question;
    if (q && typeof q.id === 'string') {
      q.intro_until = (intros.data ?? []).find((r) => r.id === q.id)?.intro_until ?? null;
    }

    // Red alert: the prelim moved to Kahoot. The phone shows where to go, then the Kahoot rank.
    const agencyId = data?.agency?.id;
    const k = kahootState.data;
    if (data && agencyId && k?.prelim_kahoot) {
      const res = await db.from('prelim_kahoot_results').select('agency_id, score, agencies(is_test)').order('kahoot_rank');
      const isTest = (r: { agencies: unknown } | undefined) =>
        ((Array.isArray(r?.agencies) ? r?.agencies[0] : r?.agencies) as { is_test: boolean } | null | undefined)?.is_test;
      const all = res.data ?? [];
      const mineTest = isTest(all.find((r) => r.agency_id === agencyId));
      const rows = mineTest === undefined ? all : all.filter((r) => isTest(r) === mineTest);
      const at = rows.findIndex((r) => r.agency_id === agencyId);
      data.kahoot = {
        pin: (k.prelim_kahoot_pin as string | null) ?? null,
        published: Boolean(k.prelim_published_at),
        rank: at >= 0 ? at + 1 : null,
        score: at >= 0 ? (rows[at].score as number) : null,
      };
    }
    return NextResponse.json(data, { status: data?.signed_in ? 200 : 401, headers });
  } catch {
    return NextResponse.json({ error: 'unavailable' }, { status: 503, headers });
  }
}
