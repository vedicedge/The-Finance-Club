import Link from 'next/link';
import { EVENT } from '@/lib/config';

export function SiteFooter() {
  return (
    <footer className="relative z-10 border-t border-line/60 bg-abyss/80">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-[var(--gutter)] py-10 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="display text-3xl">{EVENT.name}</p>
          <p className="font-script mt-1 text-2xl text-torch">{EVENT.tagline}</p>
          <p className="mt-3 text-sm text-steel">An intra-college event by {EVENT.club}. All money is virtual ₹ crore.</p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-steel">
          <Link href="/rounds" className="hover:text-torch">Rounds</Link>
          <Link href="/rules" className="hover:text-torch">Rules &amp; FAQ</Link>
          <Link href="/schedule" className="hover:text-torch">Schedule</Link>
          <Link href="/leaderboard" className="hover:text-torch">Leaderboard</Link>
          <Link href="/login" className="hover:text-torch">Agency login</Link>
          <Link href="/admin/login" className="hover:text-torch">Crew</Link>
        </nav>
      </div>
    </footer>
  );
}
