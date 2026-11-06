import type { Metadata } from 'next';
import { requireAgency } from '@/lib/auth/agency';
import { PlayScreen } from './PlayScreen';

export const metadata: Metadata = { title: 'Prelim · Hero Ya Zero?' };

/** The phone quiz screen. Full-screen, no site header, so the options get the room. */
export default async function PlayPage() {
  await requireAgency();
  return <PlayScreen />;
}
