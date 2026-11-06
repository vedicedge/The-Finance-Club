import type { Metadata } from 'next';
import { requireOrganiser } from '@/lib/auth/organiser';
import { BoardProjector } from './BoardProjector';

export const metadata: Metadata = { title: 'Projector · Leaderboard' };

export default async function BoardScreenPage() {
  await requireOrganiser('screens');
  return <BoardProjector />;
}
