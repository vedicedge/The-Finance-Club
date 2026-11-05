import Link from 'next/link';
import { EVENT } from '@/lib/config';
import { Skyline } from '@/components/Skyline';

export default function NotFound() {
  return (
    <main id="main" className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-[var(--gutter)] pb-48 text-center">
      <p className="eyebrow text-ember">Signal lost · Error 404</p>
      <h1 className="display mt-6 text-[clamp(3.5rem,14vw,8rem)]">Sector dark.</h1>
      <p className="font-display mt-4 max-w-lg text-xl text-bone/85">
        This part of {EVENT.city} has gone dark. {EVENT.villain} got here first, or it never existed.
      </p>
      <Link
        href="/"
        className="mt-10 rounded-sm bg-torch px-5 py-3 text-sm font-semibold tracking-[0.18em] text-abyss uppercase"
      >
        Return to base
      </Link>
      <Skyline lit={false} className="pointer-events-none absolute inset-x-0 bottom-0 h-44 w-full opacity-60 sm:h-56" />
    </main>
  );
}
