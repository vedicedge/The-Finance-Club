import { getEventState, registrationStatus } from '@/lib/event-state';
import { ThreatBar } from '@/components/site/ThreatBar';
import { SiteHeader } from '@/components/site/SiteHeader';
import { SiteFooter } from '@/components/site/SiteFooter';

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const state = await getEventState();
  return (
    <div className="flex min-h-dvh flex-col">
      <ThreatBar phase={state.phase} alert={state.alert} />
      <SiteHeader registrationOpen={registrationStatus(state).open} />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
