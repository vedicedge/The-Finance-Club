import type { Metadata } from 'next';
import { connection } from 'next/server';
import { loadLeaderboard, type Leaderboard } from '@/lib/leaderboard';
import { publicEnv } from '@/lib/env';
import { LeaderboardView } from '@/components/site/LeaderboardView';

export const metadata: Metadata = { title: 'Leaderboard' };

export default async function LeaderboardPage() {
  await connection();
  let initial: Leaderboard | null = null;
  if (publicEnv() && process.env.SUPABASE_SECRET_KEY) {
    try {
      initial = await loadLeaderboard();
    } catch {
      initial = null;
    }
  }
  return (
    <div className="mx-auto max-w-3xl px-[var(--gutter)] pt-12 pb-20">
      <p className="eyebrow">Live · updates every few seconds</p>
      <h1 className="display mt-4 text-[clamp(3rem,10vw,5rem)]">Leaderboard</h1>
      <div className="mt-10">
        <LeaderboardView initial={initial} />
      </div>
    </div>
  );
}
