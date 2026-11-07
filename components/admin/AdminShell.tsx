import Link from 'next/link';
import { EVENT } from '@/lib/config';
import { AREAS, areasFor, ROLE_LABELS } from '@/lib/auth/roles';
import type { Organiser } from '@/lib/auth/organiser';
import { signOut } from '@/app/admin/login/actions';
import { getEventState } from '@/lib/event-state';
import { DryRunStrip } from '@/components/site/DryRunStrip';
import { loadSchemaStatus } from '@/lib/schema-version-server';

/** Header and navigation for organiser pages. Shows only the areas the organiser's roles allow. */
export async function AdminShell({ organiser, children }: { organiser: Organiser; children: React.ReactNode }) {
  const areas = areasFor(organiser.roles).filter((a) => a !== 'screens');
  const [{ settings }, schema] = await Promise.all([getEventState(), loadSchemaStatus()]);
  return (
    <div className="min-h-dvh">
      {settings.dryRun.enabled && <DryRunStrip />}
      {!schema.ok && (
        <p role="alert" className="border-b border-ember/50 bg-ember/15 px-[var(--gutter)] py-2.5 text-center text-sm text-ember">
          The database is missing an update (it reports {schema.found ?? 'an older version'}; this site needs {schema.expected}). An admin
          runs the newer files from <code>supabase/migrations/</code> in the Supabase SQL editor before the event continues.
        </p>
      )}
      <header className="border-b border-line bg-abyss/85 shadow-[0_1px_0_rgb(169_207_110/0.12)] backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-[var(--gutter)] py-4">
          <Link href="/admin" className="flex items-baseline gap-3">
            <span className="font-deco metal text-2xl leading-none">{EVENT.name}</span>
            <span className="eyebrow text-glow">Command centre</span>
          </Link>
          <nav aria-label="Organiser areas" className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-steel">
            {areas.map((a) => (
              <Link key={a} href={AREAS[a].path} className="font-display text-[0.74rem] font-semibold tracking-[0.12em] uppercase hover:text-glow">
                {AREAS[a].label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-4 text-sm">
            <span className="text-steel">
              {organiser.displayName ?? organiser.email}
              <span className="ml-2 text-xs text-steel/70">{organiser.roles.map((r) => ROLE_LABELS[r]).join(' · ')}</span>
            </span>
            <form action={signOut}>
              <button className="rounded-sm border border-line-strong px-3 py-1.5 text-steel hover:border-glow hover:text-glow">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-6xl px-[var(--gutter)] py-10">
        {children}
      </main>
    </div>
  );
}

