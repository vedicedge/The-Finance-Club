import Link from 'next/link';
import { EVENT, ROUNDS } from '@/lib/config';
import { getEventState, registrationStatus } from '@/lib/event-state';
import { longDate, posterDate, shortDate } from '@/lib/schedule';
import { Countdown } from '@/components/site/Countdown';
import { HeroArt, KalyugCloseUp, Star, StarRule, Wordmark } from '@/components/art/Poster';
import { Scene, type SceneName } from '@/components/art/Scene';
import { GearIcon } from '@/components/art/silhouettes';

const STAGES: { tag: string; name: string; cut: string; line: string; scene: SceneName }[] = [
  { tag: 'Prelim', name: ROUNDS.prelim, cut: '50+ → 16', line: 'A 15-question live quiz on your phone. Fast and right beats slow and right.', scene: 'prelim' },
  { tag: 'Round 1', name: ROUNDS.round1, cut: '16 → survivors', line: 'Spend ₹50 Cr at a live auction to sign an HQ, a Suit, a Gadget and a Sidekick.', scene: 'bazaar' },
  { tag: 'Round 2', name: ROUNDS.round2, cut: '→ top 8', line: 'Win the poster duel on Instagram stories, then rebuild a tower from memory and knock it down.', scene: 'skyline' },
  { tag: 'Round 3', name: ROUNDS.round3, cut: '8 finalists', line: 'Sealed Mission Files, four puzzle races, swaps, X-Rays and Chai Pe Charcha deals.', scene: 'vault' },
  { tag: 'Finale', name: ROUNDS.zeroHour, cut: '→ 1 Hero Agency', line: 'Envelopes open on stage. The highest Hero Score saves Mahanagar.', scene: 'zerohour' },
];

export default async function Landing() {
  const state = await getEventState();
  const { registration, event } = state.settings;
  const reg = registrationStatus(state);
  const slotsLeft = Math.max(0, registration.maxAgencies - state.agencyCount);

  return (
    <>
      {/* ---------------------------------------------------------------- hero: Kalyug over Mahanagar */}
      {/* Everything that sells the event fits the first screen: the art, the wordmark, the clock and
          the register button. On phones and tablets the art takes whatever height is left once the
          title block is placed, so the button never falls below the fold. On wide screens the
          title column sits beside Professor Kalyug and tightens on short laptop screens. */}
      <section className="relative isolate overflow-hidden">
        <div className="streaks absolute inset-0 -z-10" aria-hidden="true" />
        <div className="fog absolute inset-0 -z-10" aria-hidden="true" />

        {/* viewfinder notes in the corners, on wide screens */}
        <div className="pointer-events-none absolute inset-6 hidden text-[0.62rem] font-semibold tracking-[0.3em] text-steel/80 uppercase xl:block" aria-hidden="true">
          <span className="absolute top-0 left-0">{EVENT.city} · Sector zero</span>
          <span className="absolute top-0 right-0">Transmission · live</span>
          <span className="absolute bottom-0 left-0">Scroll · mission briefing ↓</span>
          <span className="absolute right-0 bottom-0">Threat · total</span>
        </div>

        <div className="flex min-h-[calc(100svh-6.25rem)] flex-col lg:block lg:min-h-0">
          {/* Professor Kalyug before the eclipse: the portrait on phones, widened on laptops */}
          <div className="relative -z-20 min-h-[13rem] flex-1 overflow-hidden lg:absolute lg:inset-0" aria-hidden="true">
            <HeroArt className="hero-drift object-cover object-[center_22%] lg:object-[72%_25%]" />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgb(8_10_7/0.3),transparent_14%,transparent_62%,var(--color-abyss))] lg:bg-[linear-gradient(90deg,var(--color-abyss)_0%,rgb(8_10_7/0.88)_30%,rgb(8_10_7/0.35)_58%,transparent_78%)]" />
            <div className="absolute inset-x-0 bottom-0 hidden h-28 bg-gradient-to-b from-transparent to-abyss lg:block" />
          </div>

          <div className="relative mx-auto w-full max-w-7xl px-[var(--gutter)] pb-5 sm:pb-8 lg:flex lg:min-h-[min(54rem,calc(100svh-6.25rem))] lg:items-center lg:py-20 lg:short:py-8">
            <div className="mx-auto -mt-14 w-full max-w-xl text-center sm:-mt-20 lg:mx-0 lg:mt-0 lg:text-left">
              <p className="eyebrow hidden text-glow lg:block">Incoming transmission · {EVENT.city}</p>
              <h1 className="lg:mt-5 lg:short:mt-3">
                <Wordmark
                  sizes="(min-width: 1024px) 560px, (min-width: 640px) 420px, 80vw"
                  preload
                  className="mx-auto h-auto w-[min(80vw,21rem)] sm:w-[26rem] lg:mx-0 lg:-ml-2 lg:w-[min(100%,35rem)] lg:short:w-[27rem]"
                />
              </h1>
              <p className="mt-1 font-serif text-[1.15rem] leading-snug text-silver italic sm:text-[1.45rem] lg:mt-4 lg:text-[clamp(1.45rem,3vw,1.95rem)] lg:short:mt-2">
                {EVENT.tagline}
              </p>
              <p className="mt-4 hidden max-w-md text-[0.95rem] leading-relaxed text-steel lg:block lg:short:hidden">
                {EVENT.villain} has announced a doomsday attack on {EVENT.city}. Three founders, ₹50 crore, one evening to build a hero.
              </p>

              <p className="eyebrow mt-4 sm:mt-6 lg:mt-9 lg:short:mt-5">{EVENT.villain} strikes in</p>
              <div className="mt-2 flex justify-center lg:mt-3 lg:justify-start">
                <Countdown target={event.startsAt} after={<p className="display text-4xl text-ember">Doomsday is here.</p>} />
              </div>

              <div className="mx-auto mt-4 flex w-full max-w-md gap-3 sm:mt-6 lg:mx-0 lg:mt-9 lg:short:mt-5">
                {reg.open ? (
                  <Link href="/register" className="btn btn-primary flex-1">
                    Register your agency
                  </Link>
                ) : (
                  <span className="btn btn-ghost flex-1 cursor-default text-steel">Registration closed</span>
                )}
                <Link href="/login" className="btn btn-ghost hidden flex-1 sm:flex">
                  Agency login
                </Link>
              </div>
              <p className="mt-3 flex flex-wrap items-center justify-center gap-x-2 text-sm text-steel lg:justify-start">
                {reg.open && (
                  <span>
                    <span className="num text-glow">{slotsLeft}</span> of <span className="num">{registration.maxAgencies}</span>
                    <span className="sm:hidden"> slots left · closes {shortDate(registration.closesAt)}</span>
                    <span className="hidden sm:inline"> agency slots left · closes {longDate(registration.closesAt)}</span>
                  </span>
                )}
                <span className="sm:hidden">
                  {reg.open && <span aria-hidden="true">· </span>}
                  <Link href="/login" className="text-glow underline underline-offset-4">
                    Agency login
                  </Link>
                </span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- synopsis: Kalyug's transmission */}
      <section className="relative">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-[var(--gutter)] py-20 md:grid-cols-[1.05fr_1fr] md:py-28">
          <figure className="rise relative">
            <div className="frame corners [--corner-inset:14px]">
              <KalyugCloseUp sizes="(min-width: 768px) 560px, 92vw" className="block h-auto w-full" />
              <div className="streaks absolute inset-0" aria-hidden="true" />
              <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/80 to-transparent" aria-hidden="true" />
              <figcaption className="absolute right-5 bottom-5 left-5 flex flex-wrap items-end justify-between gap-3 sm:right-6 sm:left-6">
                <span>
                  <span className="eyebrow block !text-[0.6rem] text-glow">Subject</span>
                  <span className="font-display block text-lg font-semibold tracking-[0.08em] text-bone">{EVENT.villain}</span>
                </span>
                <span className="stamp !animate-none !text-[0.66rem] whitespace-nowrap text-ember sm:!text-[0.78rem]">Threat: total</span>
              </figcaption>
            </div>
          </figure>
          <div className="rise">
            <p className="eyebrow">Synopsis</p>
            <h2 className="display mt-4 text-[clamp(2.4rem,6vw,4rem)]">
              The city has <span className="text-glow glow-text">one evening.</span>
            </h2>
            <div className="mt-7 space-y-5 font-serif text-[clamp(1.2rem,2.4vw,1.42rem)] leading-relaxed text-bone/90">
              <p>
                {EVENT.villain} has announced a doomsday attack on {EVENT.city} for {posterDate(event.startsAt).replace(/ \d{4}$/, '')}. From the Aravallis to Hauz Khas,
                from Cyber City to the last Metro, the city needs a hero.
              </p>
              <p>
                Each team is a newly founded hero agency of three founders with ₹50 crore of funding. Fund a hero. Build it. Win
                the public. Survive the final battle. One agency becomes {EVENT.winnerTitle}.
              </p>
            </div>
            <dl className="mt-8 grid grid-cols-3 border-y border-line">
              {[
                ['Target', EVENT.city],
                ['Strike', shortDate(event.startsAt)],
                ['Defenders', 'Agencies of 3'],
              ].map(([k, v]) => (
                <div key={k} className="border-r border-line py-4 pr-3 last:border-r-0 [&:not(:first-child)]:pl-4">
                  <dt className="eyebrow !text-[0.6rem]">{k}</dt>
                  <dd className="font-display mt-1.5 text-[0.95rem] font-semibold text-bone">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- the five stages, as a film strip */}
      <section className="relative">
        <div className="mx-auto max-w-6xl px-[var(--gutter)] pt-6 pb-20">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="eyebrow">Mission briefing</p>
              <h2 className="display mt-4 text-[clamp(2.4rem,6vw,4rem)]">
                Five stages. <span className="text-glow glow-text">One survivor.</span>
              </h2>
            </div>
            <Link href="/rounds" className="btn btn-ghost self-start md:self-auto">
              Read the full briefing
            </Link>
          </div>

          <ol className="mt-12 space-y-3 rounded-[18px] bg-black p-3 shadow-[0_0_0_1px_rgb(170_184_150/0.1)] sm:space-y-4 sm:p-4">
            {STAGES.map((s, i) => {
              const right = i % 2 === 1;
              return (
                <li key={s.tag} className="rise frame aspect-[4/5] sm:aspect-[16/9] lg:aspect-[2/1]">
                  <Scene name={s.scene} className="absolute inset-0" sizes="(min-width: 1152px) 1120px, 100vw" />
                  <div
                    className={`absolute inset-0 ${right ? 'sm:bg-gradient-to-l' : 'sm:bg-gradient-to-r'} bg-gradient-to-t from-black/90 via-black/45 to-transparent sm:via-black/30`}
                    aria-hidden="true"
                  />
                  <div className="streaks absolute inset-0 opacity-60" aria-hidden="true" />
                  <div
                    className={`absolute inset-0 flex flex-col justify-end p-6 sm:justify-center sm:p-10 lg:p-14 ${right ? 'sm:items-end sm:text-right' : ''}`}
                  >
                    <p className="num text-[0.68rem] font-semibold tracking-[0.3em] text-glow uppercase">
                      {String(i + 1).padStart(2, '0')} / 05 · {s.tag}
                    </p>
                    <h3 className="display metal mt-3 text-[clamp(2.3rem,6.4vw,5rem)] leading-[0.95]">{s.name}</h3>
                    <p className="num font-display mt-3 text-sm font-semibold tracking-[0.18em] text-bone uppercase">{s.cut}</p>
                    <p className="mt-3 max-w-md text-[0.95rem] leading-relaxed text-bone/85">{s.line}</p>
                  </div>
                  <span className="absolute top-4 right-5 hidden font-mono text-[0.6rem] tracking-[0.2em] text-bone/45 sm:block" aria-hidden="true">
                    REC ● {String(i + 1).padStart(2, '0')}:00:{String(i * 7 + 11).padStart(2, '0')}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* ---------------------------------------------------------------- the Hero Score */}
      <section className="relative overflow-hidden border-y border-line/60 bg-vault/40">
        <div className="light-beam" aria-hidden="true" />
        <div className="relative mx-auto max-w-6xl px-[var(--gutter)] py-20 text-center md:py-24">
          <p className="eyebrow">How the city is saved</p>
          <h2 className="display metal mt-4 text-[clamp(2.4rem,6vw,4rem)]">The Hero Score</h2>
          <div className="mt-12 grid items-stretch gap-3 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:gap-4">
            <div className="panel corners px-5 py-6 [--corner-inset:6px] [--corner-size:12px]">
              <div className="flex justify-center gap-2.5" aria-hidden="true">
                {(['HQ', 'Suit', 'Gadget', 'Sidekick'] as const).map((k) => (
                  <svg key={k} viewBox="0 0 48 48" className="size-9 rounded-sm border border-glow/40 bg-abyss p-1.5" fill="none" stroke="#a9cf6e" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round">
                    <GearIcon kind={k} />
                  </svg>
                ))}
              </div>
              <p className="display mt-5 text-2xl text-glow">Power Level</p>
              <p className="mt-2 text-sm text-steel">Your four gear cards from {ROUNDS.round1}, plus Team-Ups and Breaking News.</p>
            </div>
            <p className="display self-center text-4xl text-steel" aria-hidden="true">
              ×
            </p>
            <div className="panel corners px-5 py-6 [--corner-inset:6px] [--corner-size:12px]">
              <div className="flex justify-center" aria-hidden="true">
                <svg viewBox="0 0 64 44" className="h-9 w-14">
                  <rect x="1" y="1" width="62" height="42" rx="3" fill="#1c2418" stroke="#a9cf6e" strokeOpacity="0.6" />
                  <path d="M1 1 L32 26 L63 1" fill="none" stroke="#a9cf6e" strokeOpacity="0.6" />
                  <circle cx="32" cy="26" r="6" fill="#a9cf6e" />
                </svg>
              </div>
              <p className="display mt-5 text-2xl text-toxic">Battle Outcome</p>
              <p className="mt-2 text-sm text-steel">The multiplier sealed in the Mission File you hold at {ROUNDS.zeroHour}.</p>
            </div>
            <p className="display self-center text-4xl text-steel" aria-hidden="true">
              +
            </p>
            <div className="panel corners px-5 py-6 [--corner-inset:6px] [--corner-size:12px]">
              <p className="num font-display text-[2.2rem] leading-9 text-glow" aria-hidden="true">
                ₹
              </p>
              <p className="display mt-5 text-2xl text-bone">Fund left ÷ 2</p>
              <p className="mt-2 text-sm text-steel">Every crore you don&apos;t spend still counts, at half.</p>
            </div>
          </div>
          <p className="mx-auto mt-10 max-w-xl text-steel">
            Power Level 28 with a ×1.5 outcome and ₹18 Cr left scores{' '}
            <span className="num whitespace-nowrap text-bone">28 × 1.5 + 18 ÷ 2 = 51</span>.
          </p>
          <Link href="/rules" className="btn btn-ghost mt-8">
            Rules &amp; FAQ
          </Link>
        </div>
      </section>

      {/* ---------------------------------------------------------------- enlist: the three founders */}
      <section className="torn-top relative isolate -mt-px overflow-hidden">
        <Scene
          name="heroes"
          className="absolute top-0 right-0 -z-20 h-[24rem] w-full md:bottom-0 md:h-auto md:w-[72%] md:[mask-image:linear-gradient(90deg,transparent,#000_32%)]"
          sizes="(min-width: 768px) 72vw, 100vw"
        />
        <div
          className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,transparent_0,transparent_13rem,var(--color-abyss)_24rem)] md:bg-gradient-to-r md:from-abyss md:via-abyss/40 md:to-transparent"
          aria-hidden="true"
        />
        <div className="mx-auto flex max-w-6xl flex-col justify-end px-[var(--gutter)] pt-[21rem] pb-16 md:min-h-[42rem] md:justify-center md:py-24">
          <div className="max-w-lg">
            <p className="eyebrow text-glow">Enlist</p>
            <h2 className="display mt-4 text-[clamp(2.4rem,6vw,4rem)]">
              Three founders.
              <br />
              <span className="metal">One agency.</span>
            </h2>
            <ul className="mt-7 space-y-2.5 text-bone/85">
              <li className="flex gap-3">
                <Star className="mt-1.5 flex-none" /> Exactly 3 founders, named at registration — no changes later
              </li>
              <li className="flex gap-3">
                <Star className="mt-1.5 flex-none" />
                <span>
                  {registration.eligibility}
                  {registration.emailDomain && <>; every founder registers with an @{registration.emailDomain} email</>}
                </span>
              </li>
              <li className="flex gap-3">
                <Star className="mt-1.5 flex-none" />
                {registration.fee} · up to {registration.maxAgencies} agencies · closes {longDate(registration.closesAt)}
              </li>
              <li className="flex gap-3">
                <Star className="mt-1.5 flex-none" /> Optional dress code: come as your own hero
              </li>
            </ul>
            <div className="mt-9">
              {reg.open ? (
                <Link href="/register" className="btn btn-primary w-full sm:w-auto sm:min-w-64">
                  Register your agency
                </Link>
              ) : (
                <Link href="/login" className="btn btn-ghost w-full sm:w-auto sm:min-w-64">
                  Agency login
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>
      <StarRule className="mx-auto max-w-6xl px-[var(--gutter)]" />
    </>
  );
}
