import type { Metadata } from 'next';
import { requireOrganiser } from '@/lib/auth/organiser';
import { getEventState } from '@/lib/event-state';
import { HERO_TIEBREAK_PRESETS, isoToIstLocal } from '@/lib/settings';
import { AdminShell } from '@/components/admin/AdminShell';
import { SettingsForm } from './SettingsForm';
import { resetEvent } from './reset-actions';

export const metadata: Metadata = { title: 'Settings' };

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const organiser = await requireOrganiser('settings');
  const sp = await searchParams;
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
      {sp.error && <p role="alert" className="mt-6 rounded-sm border border-ember/40 bg-ember/10 px-4 py-3 text-sm text-ember">{sp.error}</p>}
      {sp.ok && <p role="status" className="mt-6 rounded-sm border border-toxic/40 bg-toxic/10 px-4 py-3 text-sm text-toxic">{sp.ok}</p>}
      <div className="mt-8">
        <SettingsForm
          settings={settings}
          closesLocal={isoToIstLocal(settings.registration.closesAt)}
          startsLocal={isoToIstLocal(settings.event.startsAt)}
          tiebreakKey={tiebreakKey}
        />
      </div>

      <form action={resetEvent} className="mt-12 space-y-4 rounded-sm border border-ember/50 bg-ember/5 px-5 py-5">
        <h2 className="eyebrow text-ember">Danger zone · reset the event</h2>
        <p className="text-sm text-bone/85">
          Clears everything the event produced: quiz answers, the Fund Ledger, sales, tips, poster duels, tower results,
          envelopes, Force Fields, X-Rays and reveals. Questions, news and missions go back to unused; the phase goes back to
          Registration. Settings, crew and the audit log stay. Use it after the dry run.
        </p>
        <label className="flex items-start gap-3 text-sm">
          <input type="radio" name="mode" value="keep" defaultChecked className="mt-1 accent-ember" />
          <span>Keep real registrations (agencies, founders and PINs stay; everyone goes back to &ldquo;registered&rdquo;). Dry-run test agencies are deleted.</span>
        </label>
        <label className="flex items-start gap-3 text-sm">
          <input type="radio" name="mode" value="all" className="mt-1 accent-ember" />
          <span>Delete registrations too (a completely fresh start)</span>
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <input name="confirm" placeholder="Type RESET" autoComplete="off" className="field !mt-0 max-w-40 uppercase" />
          <button className="btn btn-ghost !border-ember !text-ember hover:!bg-ember hover:!text-abyss">Reset the event</button>
        </div>
      </form>
    </AdminShell>
  );
}
