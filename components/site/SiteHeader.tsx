import Link from 'next/link';
import { EVENT } from '@/lib/config';

const LINKS = [
  { href: '/rounds', label: 'Rounds' },
  { href: '/rules', label: 'Rules' },
  { href: '/schedule', label: 'Schedule' },
];

/** Public header. Phones get a no-JavaScript dropdown so nothing overflows the screen. */
export function SiteHeader({ registrationOpen }: { registrationOpen: boolean }) {
  return (
    <header className="relative z-30 border-b border-line/60">
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-[var(--gutter)] py-4">
        <Link href="/" className="display text-2xl leading-none text-bone sm:text-[1.7rem]">
          {EVENT.name}
        </Link>
        <nav aria-label="Main" className="ml-auto hidden items-center gap-6 text-sm text-steel md:flex">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-torch">
              {l.label}
            </Link>
          ))}
          <Link href="/me" className="hover:text-torch">
            My Agency
          </Link>
          {registrationOpen && (
            <Link href="/register" className="btn btn-primary !min-h-0 !py-2">
              Register
            </Link>
          )}
        </nav>
        <details className="group relative ml-auto md:hidden">
          <summary className="btn btn-ghost !min-h-0 cursor-pointer list-none !px-3 !py-2 [&::-webkit-details-marker]:hidden">
            Menu
          </summary>
          <nav
            aria-label="Main"
            className="panel absolute right-0 mt-2 flex w-56 flex-col bg-vault p-2 text-base shadow-2xl shadow-black/60"
          >
            {[...LINKS, { href: '/me', label: 'My Agency' }, ...(registrationOpen ? [{ href: '/register', label: 'Register' }] : [])].map(
              (l) => (
                <Link key={l.href} href={l.href} className="rounded-sm px-3 py-3 text-bone hover:bg-vault-2 hover:text-torch">
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
