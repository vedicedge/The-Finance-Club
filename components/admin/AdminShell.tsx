import Link from 'next/link';
import { EVENT } from '@/lib/config';
import { AREAS, areasFor, ROLE_LABELS } from '@/lib/auth/roles';
import type { Organiser } from '@/lib/auth/organiser';
import { signOut } from '@/app/admin/login/actions';
import { getEventState } from '@/lib/event-state';
import { DryRunStrip } from '@/components/site/DryRunStrip';
import { loadSchemaStatus } from '@/lib/schema-version-server';
import { cookies } from 'next/headers';
import { SIMPLE_COOKIE } from '@/lib/guide-rules';
import { setSimpleMode } from '@/app/admin/guide/actions';
import { CONSOLE_FOR } from '@/components/admin/Guide';

/** Is Simple mode on for this device? */
export async function isSimpleMode(): Promise<boolean> {
  return (await cookies()).get(SIMPLE_COOKIE)?.value === '1';
}

/** Header and navigation for organiser pages. Shows only the areas the organiser's roles allow. */
export async function AdminShell({ organiser, children, guideHome = false }: { organiser: Organiser; children: React.ReactNode; guideHome?: boolean }) {
  const areas = areasFor(organiser.roles).filter((a) => a !== 'screens');
  const [{ settings, phase }, schema, simple] = await Promise.all([getEventState(), loadSchemaStatus(), isSimpleMode()]);
  const consoleLink = CONSOLE_FOR[phase];
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
          {simple ? (
            <nav aria-label="Simple mode" className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-steel">
              <Link href="/admin" className="font-display text-[0.74rem] font-semibold tracking-[0.12em] text-glow uppercase">Next step</Link>
              <Link href={consoleLink.href} className="font-display text-[0.74rem] font-semibold tracking-[0.12em] uppercase hover:text-glow">
                Full console: {consoleLink.label}
              </Link>
            </nav>
          ) : (
          <nav aria-label="Organiser areas" className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-steel">
            {areas.map((a) => (
              <Link
                key={a}
                href={AREAS[a].path}
                target={AREAS[a].path.startsWith('/admin') ? undefined : '_blank'}
                className="font-display text-[0.74rem] font-semibold tracking-[0.12em] uppercase hover:text-glow"
              >
                {AREAS[a].label}
              </Link>
            ))}
          </nav>
          )}
          <div className="ml-auto flex items-center gap-4 text-sm">
            <form action={setSimpleMode.bind(null, !simple, '/admin')}>
              <button
                aria-pressed={simple}
                title={simple ? 'Back to every console and option' : 'One step at a time: only what to do next'}
                className={`rounded-sm border px-3 py-1.5 font-semibold ${simple ? 'border-glow bg-glow/15 text-glow' : 'border-glow/60 text-glow hover:bg-glow/10'}`}
              >
                Simple mode: {simple ? 'on' : 'off'}
              </button>
            </form>
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
      {simple && !guideHome && (
        <p className="border-b border-glow/30 bg-glow/10 px-[var(--gutter)] py-2 text-center text-sm text-bone">
          Simple mode is on.{' '}
          <Link href="/admin" className="font-semibold text-glow underline underline-offset-4">← Back to the next step</Link>
        </p>
      )}
      <main id="main" className="mx-auto max-w-6xl px-[var(--gutter)] py-10">
        {children}
      </main>
    </div>
  );
}

