import type { Metadata } from 'next';
import { requireAgency } from '@/lib/auth/agency';
import { serviceDb } from '@/lib/db/server';
import { getEventState } from '@/lib/event-state';
import { Dossier } from '@/components/site/Dossier';
import { logoutAgency } from '../login/actions';

export const metadata: Metadata = { title: 'My Agency' };

export default async function MyAgencyPage() {
  const agency = await requireAgency();
  const [{ data: founders }, state] = await Promise.all([
    serviceDb()
      .from('founders')
      .select('name, section, is_captain')
      .eq('agency_id', agency.id)
      .order('is_captain', { ascending: false })
      .order('id'),
    getEventState(),
  ]);
  return (
    <Dossier
      agency={agency}
      founders={founders ?? []}
      startsAt={state.settings.event.startsAt}
      venue={state.settings.event.venue}
      signOut={
        <form action={logoutAgency}>
          <button className="btn btn-ghost w-full sm:w-auto">Sign out of this phone</button>
        </form>
      }
    />
  );
}
