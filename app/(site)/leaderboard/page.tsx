import type { Metadata } from 'next';
import { connection } from 'next/server';
import { loadLeaderboard, type Leaderboard } from '@/lib/leaderboard';
import { publicEnv } from '@/lib/env';
import { LeaderboardView } from '@/components/site/LeaderboardView';
import { PageHero } from '@/components/site/Prose';

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
    <>
      <PageHero eyebrow="Live · updates every few seconds" title="Leaderboard" art="chess">
        Every agency starts on the board. One is left standing.
      </PageHero>
      <div className="mx-auto max-w-3xl px-[var(--gutter)] pt-12 pb-20">
        <LeaderboardView initial={initial} />
      </div>
    </>
  );
}
