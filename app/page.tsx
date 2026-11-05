import { EVENT, ROUNDS } from '@/lib/config';
import { Skyline } from '@/components/Skyline';

// Holding page for Milestone 1. Milestone 2 replaces it with the full landing page
// (countdown, story, rounds, call to register).
export default function HoldingPage() {
  return (
    <main id="main" className="relative isolate flex min-h-dvh flex-col overflow-hidden">
      <div className="light-beam -z-10" aria-hidden="true" />

      <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-[var(--gutter)] pt-16 pb-48 text-center sm:pb-64">
        <p className="eyebrow">Incoming transmission · {EVENT.club}</p>

        <h1 className="display mt-8 text-[clamp(4.5rem,18vw,11rem)] text-bone">{EVENT.name}</h1>

        <p className="font-script mt-2 text-[clamp(1.6rem,5vw,2.4rem)] text-torch">{EVENT.tagline}</p>

        <p className="eyebrow mt-12">Synopsis</p>
        <p className="font-display mt-3 max-w-xl text-[clamp(1.2rem,3.4vw,1.6rem)] leading-snug text-bone/90">
          {EVENT.villain} has announced a doomsday attack on {EVENT.city}. Hero agencies have ₹50 crore, three
          founders and one evening to fund, build and save the city.
        </p>

        <p className="eyebrow mt-10 text-torch">Doomsday falls: 25 November 2026 · 5:30 pm</p>

        <ol className="mt-10 grid w-full max-w-xl grid-cols-1 gap-px overflow-hidden rounded-sm border border-line bg-line text-left sm:grid-cols-5">
          {[ROUNDS.prelim, ROUNDS.round1, ROUNDS.round2, ROUNDS.round3, ROUNDS.zeroHour].map((r, i) => (
            <li key={r} className="bg-vault/90 px-3 py-3">
              <span className="num block text-[0.7rem] font-semibold tracking-[0.2em] text-steel">
                {i === 0 ? 'PRELIM' : i === 4 ? 'FINALE' : `ROUND ${i}`}
              </span>
              <span className="font-display mt-1 block text-lg leading-tight text-bone">{r}</span>
            </li>
          ))}
        </ol>

        <p className="mt-10 text-sm text-steel">
          Agency registration opens soon. Assemble your three founders.
        </p>
      </section>

      <Skyline className="pointer-events-none absolute inset-x-0 bottom-0 h-44 w-full sm:h-56" />
    </main>
  );
}
