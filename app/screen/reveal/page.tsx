import type { Metadata } from 'next';
import { hasRole, requireOrganiser } from '@/lib/auth/organiser';
import { RevealProjector } from './RevealProjector';

export const metadata: Metadata = { title: 'Projector · Zero Hour' };

export default async function RevealPage() {
  const organiser = await requireOrganiser('screens');
  return <RevealProjector canDrive={hasRole(organiser, 'anchor')} />;
}
