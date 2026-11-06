import type { Metadata } from 'next';
import { requireOrganiser } from '@/lib/auth/organiser';
import { QuizProjector } from './QuizProjector';

export const metadata: Metadata = { title: 'Projector · Prelim' };

export default async function QuizScreenPage() {
  await requireOrganiser('screens');
  return <QuizProjector />;
}
