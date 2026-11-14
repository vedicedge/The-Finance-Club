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
    return NextResponse.json(data, { status: data?.signed_in ? 200 : 401, headers });
  } catch {
    return NextResponse.json({ error: 'unavailable' }, { status: 503, headers });
  }
}
