import Link from 'next/link';
import { EVENT } from '@/lib/config';
import { TitleLockup, StarRule } from '@/components/art/Poster';
import { Skyline } from '@/components/Skyline';

export function SiteFooter() {
  return (
    <footer className="relative z-10 mt-10 overflow-hidden border-t border-line/60 bg-abyss">
      <Skyline className="pointer-events-none block h-28 w-full sm:h-40" />
      <div className="mx-auto max-w-6xl px-[var(--gutter)] pt-4 pb-12">
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div>
            <TitleLockup sizes="(min-width: 640px) 320px, 240px" className="w-60 sm:w-80" />
          </div>
          <nav aria-label="Footer" className="grid grid-cols-2 gap-x-10 gap-y-2.5 sm:grid-cols-3">
            {[
              ['/rounds', 'Rounds'],
              ['/rules', 'Rules & FAQ'],
              ['/schedule', 'Schedule'],
              ['/leaderboard', 'Leaderboard'],
              ['/login', 'Agency login'],
              ['/admin/login', 'Crew'],
            ].map(([href, label]) => (
              <Link key={href} href={href} className="font-display text-[0.74rem] font-semibold tracking-[0.18em] text-steel uppercase hover:text-glow">
                {label}
              </Link>
            ))}
          </nav>
        </div>
        <StarRule className="mt-10" />
        <p className="mt-5 text-center text-xs tracking-[0.12em] text-steel/80 uppercase">
          An intra-college event by {EVENT.club} · All money is virtual ₹ crore · Original artwork
        </p>
      </div>
    </footer>
  );
}
