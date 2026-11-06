import type { Metadata } from 'next';
import { requireOrganiser } from '@/lib/auth/organiser';
import { getEventState } from '@/lib/event-state';
import { HERO_TIEBREAK_PRESETS, isoToIstLocal } from '@/lib/settings';
import { AdminShell } from '@/components/admin/AdminShell';
import { SettingsForm } from './SettingsForm';

export const metadata: Metadata = { title: 'Settings' };

export default async function SettingsPage() {
  const organiser = await requireOrganiser('settings');
  const { settings } = await getEventState();
  const current = settings.zeroHour.heroTiebreak.join(',');
  const tiebreakKey =
    Object.entries(HERO_TIEBREAK_PRESETS).find(([, v]) => v.join(',') === current)?.[0] ?? 'fund,power,coin';
  return (
    <AdminShell organiser={organiser}>
      <p className="eyebrow">Admin</p>
      <h1 className="display mt-3 text-5xl">Settings</h1>
      <p className="mt-4 max-w-2xl text-steel">
        The spec&apos;s open decisions and the site&apos;s defaults. Changes apply immediately. docs/decisions.md lists
        what each one means.
      </p>
      <div className="mt-8">
        <SettingsForm
          settings={settings}
          closesLocal={isoToIstLocal(settings.registration.closesAt)}
          startsLocal={isoToIstLocal(settings.event.startsAt)}
          tiebreakKey={tiebreakKey}
        />
      </div>
    </AdminShell>
  );
}
