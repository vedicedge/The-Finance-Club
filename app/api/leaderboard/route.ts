import { NextResponse } from 'next/server';
import { loadLeaderboard } from '@/lib/leaderboard';

/**
 * Public leaderboard JSON. Cached at Vercel's edge for a few seconds, so a full auditorium polling
 * every 5 s costs the database roughly one query burst every 4 s.
 */
export async function GET() {
  try {
    return NextResponse.json(await loadLeaderboard(), {
      headers: { 'Cache-Control': 'public, max-age=0, s-maxage=4, stale-while-revalidate=10' },
    });
  } catch {
    return NextResponse.json({ error: 'unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
