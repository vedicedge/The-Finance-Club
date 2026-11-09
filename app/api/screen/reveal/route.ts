import { NextResponse } from 'next/server';

/** Retired: it exposed every opened card. The projector gets only the announced places from /api/screen/projector. */
export function GET() {
  return NextResponse.json({ error: 'gone' }, { status: 410, headers: { 'Cache-Control': 'no-store' } });
}
