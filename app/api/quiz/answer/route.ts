import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { serviceDb } from '@/lib/db/server';
import { AGENCY_SESSION_COOKIE, hashSessionToken } from '@/lib/auth/session-token';

const KNOWN = ['not_signed_in', 'not_prelim', 'not_checked_in', 'not_eligible', 'not_open', 'not_yet', 'bad_option', 'already_answered'];

/**
 * Locks an answer. The phone sends only which option it tapped; the database stamps the time,
 * marks it and scores it. The response says only "locked" or "late", never right or wrong.
 */
export async function POST(request: NextRequest) {
  const headers = { 'Cache-Control': 'no-store' };
  const token = (await cookies()).get(AGENCY_SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: 'not_signed_in' }, { status: 401, headers });

  let body: { question?: unknown; option?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400, headers });
  }
  const question = typeof body.question === 'string' && /^[MTBH][0-9]{1,2}$/.test(body.question) ? body.question : null;
  const option = Number.isInteger(body.option) ? (body.option as number) : null;
  if (!question || option === null || option < 0 || option > 3) {
    return NextResponse.json({ error: 'bad_request' }, { status: 400, headers });
  }

  const { data, error } = await serviceDb().rpc('quiz_submit_answer', {
    p_token_hash: hashSessionToken(token),
    p_question: question,
    p_option: option,
  });
  if (error) {
    const code = KNOWN.find((k) => error.message?.includes(k)) ?? 'unavailable';
    return NextResponse.json({ error: code }, { status: code === 'unavailable' ? 503 : 409, headers });
  }
  return NextResponse.json({ status: data }, { headers });
}
