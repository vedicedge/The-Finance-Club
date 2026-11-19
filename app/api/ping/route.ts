import { NextResponse } from 'next/server';

/** A tiny "is the line up?" check (no database). Pages call it before refreshing themselves. */
export function GET() {
  return new NextResponse(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
}
