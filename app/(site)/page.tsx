import Link from 'next/link';
import { EVENT, ROUNDS } from '@/lib/config';
import { getEventState, registrationStatus } from '@/lib/event-state';
import { longDate, wallClock } from '@/lib/schedule';
import { Countdown } from '@/components/site/Countdown';
import { Skyline } from '@/components/Skyline';

const STAGES = [
  { tag: 'Prelim', name: ROUNDS.prelim, cut: '50+ → 16', line: 'A 15-question live quiz on your phone. Fast and right beats slow and right.' },
  { tag: 'Round 1', name: ROUNDS.round1, cut: '16 → survivors', line: 'Spend ₹50 Cr at a live auction to sign an HQ, a Suit, a Gadget and a Sidekick.' },
  { tag: 'Round 2', name: ROUNDS.round2, cut: '→ top 8', line: 'Win the poster duel on Instagram stories, then rebuild a tower from memory and knock it down.' },
  { tag: 'Round 3', name: ROUNDS.round3, cut: '8 finalists', line: 'Sealed Mission Files, four puzzle races, swaps, X-Rays and Chai Pe Charcha deals.' },
  { tag: 'Finale', name: ROUNDS.zeroHour, cut: '→ 1 Hero Agency', line: 'Envelopes open on stage. The highest Hero Score saves Mahanagar.' },
];

export default async function Landing() {
  const state = await getEventState();
  const { registration, event } = state.settings;
  const reg = registrationStatus(state);
  const slotsLeft = Math.max(0, registration.maxAgencies - state.agencyCount);

  return (
    <>
      {/* ---------------------------------------------------------------- hero */}
      <section className="relative isolate overflow-hidden">
        <div className="light-beam -z-10" aria-hidden="true" />
        <div className="mx-auto flex max-w-3xl flex-col items-center px-[var(--gutter)] pt-14 pb-44 text-center sm:pt-20 sm:pb-72">
          <p className="eyebrow">Incoming transmission · {EVENT.club}</p>
          <h1 className="display mt-7 text-[clamp(4.25rem,17vw,10.5rem)] text-bone">{EVENT.name}</h1>
          <p className="font-script mt-1 text-[clamp(1.5rem,5vw,2.3rem)] text-torch">{EVENT.tagline}</p>

          <p className="eyebrow mt-12">Time until {EVENT.villain} strikes</p>
          <div className="mt-4 flex w-full justify-center">
            <Countdown
              target={event.startsAt}
              after={<p className="display text-4xl text-ember">Doomsday is here.</p>}
            />
          </div>
          <p className="eyebrow mt-5 text-torch">
            {longDate(event.startsAt)} · {wallClock(event.startsAt, 0)} · {event.venue}
          </p>

          <div className="mt-10 flex w-full max-w-md flex-col gap-3 sm:max-w-xl sm:flex-row">
            {reg.open ? (
              <Link href="/register" className="btn btn-primary flex-1">
                Register your agency
              </Link>
            ) : (
              <span className="btn btn-ghost flex-1 cursor-default text-steel">Registration closed</span>
            )}
            <Link href="/login" className="btn btn-ghost flex-1">
              Agency login
            </Link>
          </div>
          {reg.open && (
            <p className="mt-4 text-sm text-steel">
              <span className="num text-bone">{slotsLeft}</span> of <span className="num">{registration.maxAgencies}</span> agency
              slots left · closes {longDate(registration.closesAt)}
            </p>
          )}
        </div>
        <Skyline className="pointer-events-none absolute inset-x-0 bottom-0 h-36 w-full sm:h-60" />
      </section>

      {/* ---------------------------------------------------------------- synopsis */}
      <section className="border-t border-line/60 bg-abyss">
        <div className="mx-auto grid max-w-6xl gap-10 px-[var(--gutter)] py-20 md:grid-cols-[1fr_1.4fr]">
          <div>
            <p className="eyebrow">Synopsis</p>
            <h2 className="display mt-4 text-[clamp(2.6rem,7vw,4.5rem)]">The city has one evening.</h2>
          </div>
          <div className="font-display space-y-5 text-[clamp(1.2rem,2.6vw,1.45rem)] leading-relaxed text-bone/90">
            <p>
              {EVENT.villain} has announced a doomsday attack on {EVENT.city} for 25 November. From the Aravallis to Hauz
              Khas, from Cyber City to the last Metro, the city needs a hero.
            </p>
            <p>
              Each team is a newly founded hero agency of three founders with ₹50 crore of funding. Fund a hero. Build
              it. Win the public. Survive the final battle. One agency becomes {EVENT.winnerTitle}.
            </p>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- stages */}
      <section className="border-t border-line/60">
        <div className="mx-auto max-w-6xl px-[var(--gutter)] py-20">
          <p className="eyebrow">Mission briefing</p>
          <h2 className="display mt-4 text-[clamp(2.6rem,7vw,4.5rem)]">Five stages. One survivor.</h2>
          <ol className="mt-12 grid gap-px overflow-hidden rounded-sm border border-line bg-line md:grid-cols-5">
            {STAGES.map((s, i) => (
              <li key={s.tag} className="flex flex-col bg-vault px-5 py-6">
                <span className="num text-[0.7rem] font-semibold tracking-[0.24em] text-steel uppercase">
                  {String(i + 1).padStart(2, '0')} · {s.tag}
                </span>
                <span className="font-display mt-3 text-2xl leading-tight text-bone">{s.name}</span>
                <span className="num mt-2 text-sm font-semibold text-torch">{s.cut}</span>
                <span className="mt-3 text-sm leading-relaxed text-steel">{s.line}</span>
              </li>
            ))}
          </ol>
          <Link href="/rounds" className="btn btn-ghost mt-8">
            Read the full briefing
          </Link>
        </div>
      </section>

      {/* ---------------------------------------------------------------- hero score */}
      <section className="border-t border-line/60 bg-abyss">
        <div className="mx-auto max-w-6xl px-[var(--gutter)] py-20 text-center">
          <p className="eyebrow">How the city is saved</p>
          <h2 className="display mt-4 text-[clamp(2.4rem,6vw,4rem)]">The Hero Score</h2>
          <p className="font-display mx-auto mt-8 max-w-3xl text-[clamp(1.5rem,4.4vw,2.6rem)] leading-snug text-bone">
            <span className="text-torch">Power Level</span> × <span className="text-toxic">Battle Outcome</span> +{' '}
            <span className="text-bone">Fund left ÷ 2</span>
          </p>
          <p className="mx-auto mt-6 max-w-xl text-steel">
            A strong hero, luck and nerve in the Vault, and cash discipline all the way. Power Level 28 with a ×1.5 outcome
            and ₹18 Cr left scores <span className="num text-bone">28 × 1.5 + 18 ÷ 2 = 51</span>.
          </p>
          <Link href="/rules" className="btn btn-ghost mt-8">
            Rules &amp; FAQ
          </Link>
        </div>
      </section>

      {/* ---------------------------------------------------------------- enlist */}
      <section className="border-t border-line/60">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-[var(--gutter)] py-20 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow">Enlist</p>
            <h2 className="display mt-4 text-[clamp(2.4rem,6vw,4rem)]">Three founders. One agency.</h2>
            <ul className="mt-6 space-y-2 text-steel">
              <li>· Exactly 3 founders, named at registration — no changes later</li>
              <li>
                · {registration.eligibility}
                {registration.emailDomain && <>; every founder registers with an @{registration.emailDomain} email</>}
              </li>
              <li>· {registration.fee} · up to {registration.maxAgencies} agencies · closes {longDate(registration.closesAt)}</li>
              <li>· Optional dress code: come as your own hero</li>
            </ul>
          </div>
          {reg.open ? (
            <Link href="/register" className="btn btn-primary md:min-w-64">
              Register your agency
            </Link>
          ) : (
            <Link href="/login" className="btn btn-ghost md:min-w-64">
              Agency login
            </Link>
          )}
        </div>
      </section>
    </>
  );
}
