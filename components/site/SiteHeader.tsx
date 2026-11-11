import Link from 'next/link';
import { EVENT } from '@/lib/config';
import { FullscreenButton } from '@/components/site/FullscreenButton';

const LINKS = [
  { href: '/rounds', label: 'Rounds' },
  { href: '/rules', label: 'Rules' },
  { href: '/schedule', label: 'Schedule' },
  { href: '/leaderboard', label: 'Leaderboard' },
];

/** The eclipse mark from the poster, for the header. */
function EclipseMark() {
  return (
    <svg viewBox="0 0 32 32" className="size-7 flex-none" aria-hidden="true">
      <defs>
        <radialGradient id="mark-corona" cx="16" cy="16" r="16" gradientUnits="userSpaceOnUse">
          <stop offset="0.6" stopColor="#a9cf6e" stopOpacity="0.95" />
          <stop offset="1" stopColor="#a9cf6e" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="16" cy="16" r="16" fill="url(#mark-corona)" />
      <circle cx="16" cy="16" r="9.6" fill="#080a07" stroke="#dcedbf" strokeWidth="0.8" />
    </svg>
  );
}

/** Public header. Phones get a no-JavaScript dropdown so nothing overflows the screen. */
export function SiteHeader({ registrationOpen }: { registrationOpen: boolean }) {
  return (
    <header className="relative z-30 border-b border-line/60 bg-abyss/70 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-[var(--gutter)] py-3.5">
        <Link href="/" className="group flex items-center gap-2.5" aria-label={`${EVENT.name} home`}>
          <EclipseMark />
          <span className="font-deco metal text-[1.45rem] leading-none tracking-[0.06em] sm:text-[1.6rem]">{EVENT.name}</span>
        </Link>
        <nav aria-label="Main" className="ml-auto hidden items-center gap-7 lg:flex">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="font-display text-[0.78rem] font-semibold tracking-[0.2em] text-steel uppercase transition-colors hover:text-glow">
              {l.label}
            </Link>
          ))}
          <Link href="/me" className="font-display text-[0.78rem] font-semibold tracking-[0.2em] text-steel uppercase transition-colors hover:text-glow">
            My Agency
          </Link>
          {registrationOpen && (
            <Link href="/register" className="btn btn-primary !min-h-0 !px-4 !py-2 !text-[0.74rem]">
              Register
            </Link>
          )}
        </nav>
        <FullscreenButton className="ml-auto lg:hidden" />
        <details className="group relative lg:hidden">
          <summary className="btn btn-ghost !min-h-0 list-none !px-3.5 !py-2 [&::-webkit-details-marker]:hidden">
            <span aria-hidden="true" className="flex flex-col gap-[3px]">
              <span className="block h-px w-4 bg-current" />
              <span className="block h-px w-4 bg-current" />
              <span className="block h-px w-3 bg-current" />
            </span>
            Menu
          </summary>
          <nav
            aria-label="Main"
            className="panel corners absolute right-0 mt-2 flex w-60 flex-col !bg-vault p-2 text-base shadow-2xl shadow-black/70 [--corner-inset:4px] [--corner-size:10px]"
          >
            {[...LINKS, { href: '/me', label: 'My Agency' }, ...(registrationOpen ? [{ href: '/register', label: 'Register' }] : [])].map(
              (l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="font-display rounded-sm px-3 py-3 text-[0.9rem] font-semibold tracking-[0.14em] text-bone uppercase hover:bg-vault-2 hover:text-glow"
                >
                  {l.label}
                </Link>
              ),
            )}
          </nav>
        </details>
      </div>
    </header>
  );
}
