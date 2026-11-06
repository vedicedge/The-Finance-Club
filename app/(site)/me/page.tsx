import type { Metadata } from 'next';
import { requireAgency } from '@/lib/auth/agency';
import { serviceDb } from '@/lib/db/server';
import { getEventState } from '@/lib/event-state';
import { Dossier } from '@/components/site/Dossier';
import { AutoRefresh } from '@/components/admin/AutoRefresh';
import { loadDossier } from '@/lib/agency-view';
import { logoutAgency } from '../login/actions';

export const metadata: Metadata = { title: 'My Agency' };

export default async function MyAgencyPage() {
  const agency = await requireAgency();
  const [{ data: founders }, state, data] = await Promise.all([
    serviceDb()
      .from('founders')
      .select('name, section, is_captain')
      .eq('agency_id', agency.id)
      .order('is_captain', { ascending: false })
      .order('id'),
    getEventState(),
    loadDossier(agency.id),
  ]);
  return (
    <>
      {/* Spec: simple 5-second polling for /me. */}
      <AutoRefresh ms={5000} />
      <Dossier
      data={data}
      briefing={state.phase === 'registration' || state.phase === 'checkin'}
      agency={agency}
      founders={founders ?? []}
      startsAt={state.settings.event.startsAt}
      venue={state.settings.event.venue}
      prelimLive={state.phase === 'prelim' && (agency.status === 'registered' || agency.status === 'checked_in')}
      signOut={
        <form action={logoutAgency}>
          <button className="btn btn-ghost w-full sm:w-auto">Sign out of this phone</button>
        </form>
      }
      />
    </>
  );
}
