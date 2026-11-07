'use client';

import Link from 'next/link';

/** Anything that breaks while rendering a page lands here. */
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-[var(--gutter)] py-16 text-center">
      <div className="mx-auto mb-8 size-24 rounded-full border border-ember/40 bg-abyss shadow-[0_0_60px_-6px_rgb(229_87_74/0.55)]" aria-hidden="true" />
      <p className="eyebrow text-ember">Signal interference</p>
      <h1 className="display metal mt-5 text-[clamp(2.6rem,10vw,4.2rem)]">The line went dead.</h1>
      <p className="mt-4 font-serif text-xl text-bone/85">
        Something jammed the transmission. Try again; if it keeps happening, tell an organiser.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <button onClick={reset} className="btn btn-primary">
          Try again
        </button>
        <Link href="/" className="btn btn-ghost">
          Return to base
        </Link>
      </div>
    </main>
  );
}
