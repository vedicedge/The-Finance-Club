import type { Metadata } from 'next';
import { requireOrganiser } from '@/lib/auth/organiser';
import { AuctionProjector } from './AuctionProjector';

export const metadata: Metadata = { title: 'Projector · Power Bazaar' };

export default async function AuctionScreenPage() {
  await requireOrganiser('screens');
  return <AuctionProjector />;
}
