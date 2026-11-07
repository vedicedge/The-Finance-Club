import type { Metadata } from 'next';
import { requireOrganiser } from '@/lib/auth/organiser';
import { ProjectorShell } from './ProjectorShell';

export const metadata: Metadata = { title: 'Projector' };

/**
 * The one link for the auditorium projector. Open it on the projector laptop (signed in with the
 * view-only projector account), go full screen and leave it: it follows the event on its own.
 * `?preview=1` is the small live preview in the command centre.
 */
export default async function ProjectorPage({ searchParams }: { searchParams: Promise<{ preview?: string }> }) {
  await requireOrganiser('screens');
  const { preview } = await searchParams;
  return <ProjectorShell preview={preview === '1'} />;
}
