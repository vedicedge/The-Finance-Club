import Link from 'next/link';
import { EVENT } from '@/lib/config';
import { Scene } from '@/components/art/Scene';

export default function NotFound() {
  return (
    <main id="main" className="relative isolate flex min-h-dvh flex-col items-center justify-center overflow-hidden px-[var(--gutter)] py-24 text-center">
      <Scene name="skyline" className="absolute inset-0 -z-20 opacity-50" sizes="100vw" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_50%_45%,rgb(8_10_7/0.55),rgb(8_10_7/0.95))]" aria-hidden="true" />
      <p className="eyebrow text-ember">Signal lost · Error 404</p>
      <h1 className="display metal mt-6 text-[clamp(3.5rem,14vw,8rem)]">Sector dark.</h1>
      <p className="mt-5 max-w-lg font-serif text-xl text-bone/85">
        This part of {EVENT.city} has gone dark. {EVENT.villain} got here first, or it never existed.
      </p>
      <Link href="/" className="btn btn-primary mt-10">
        Return to base
      </Link>
    </main>
  );
}
