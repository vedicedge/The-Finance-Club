import Link from 'next/link';
import { EVENT } from '@/lib/config';
import { AREAS, areasFor, ROLE_LABELS } from '@/lib/auth/roles';
import type { Organiser } from '@/lib/auth/organiser';
import { signOut } from '@/app/admin/login/actions';

/** Header and navigation for organiser pages. Shows only the areas the organiser's roles allow. */
export function AdminShell({ organiser, children }: { organiser: Organiser; children: React.ReactNode }) {
  const areas = areasFor(organiser.roles).filter((a) => a !== 'screens');
  return (
    <div className="min-h-dvh">
      <header className="border-b border-line bg-vault/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-[var(--gutter)] py-4">
          <Link href="/admin" className="display text-2xl text-bone">
            {EVENT.name} <span className="eyebrow ml-2 align-middle">Command centre</span>
          </Link>
          <nav aria-label="Organiser areas" className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-steel">
            {areas.map((a) => (
              <Link key={a} href={AREAS[a].path} className="hover:text-torch">
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
              <button className="rounded-sm border border-line-strong px-3 py-1.5 text-steel hover:border-torch hover:text-torch">
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
