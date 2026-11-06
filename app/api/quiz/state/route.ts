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
    return NextResponse.json(data, { status: data?.signed_in ? 200 : 401, headers });
  } catch {
    return NextResponse.json({ error: 'unavailable' }, { status: 503, headers });
  }
}
