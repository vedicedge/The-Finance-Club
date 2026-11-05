'use client';

import Link from 'next/link';

/** Anything that breaks while rendering a page lands here. */
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-[var(--gutter)] py-16 text-center">
      <p className="eyebrow text-ember">Signal interference</p>
      <h1 className="display mt-5 text-[clamp(2.8rem,10vw,4.5rem)]">The line went dead.</h1>
      <p className="font-display mt-4 text-xl text-bone/85">
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
