import { ROUNDS } from '@/lib/config';
import { longDate, wallClock } from '@/lib/schedule';
import type { AgencySession } from '@/lib/auth/agency';

export type DossierFounder = { name: string; section: string; is_captain: boolean };

const ROUND_LABEL: Record<string, string> = { prelim: 'Prelim', round1: 'Round 1', round2: 'Round 2', round3: 'Round 3' };

export function statusStamp(a: AgencySession): { text: string; className: string; note: string } {
  switch (a.status) {
    case 'registered':
      return { text: 'Registered', className: 'text-torch', note: 'All three founders check in at the desk on Doomsday.' };
    case 'checked_in':
      return { text: 'Checked in', className: 'text-toxic', note: 'You are cleared for the prelim. Captain: keep the quiz phone charged.' };
    case 'active':
      return { text: 'In the game', className: 'text-toxic', note: 'Mahanagar is counting on you.' };
    case 'eliminated':
      return {
        text: `Eliminated · ${ROUND_LABEL[a.eliminatedIn ?? ''] ?? 'out'}`,
        className: 'text-ember',
        note: 'Your agency is out of the race. Stay for the reveal: the city still needs witnesses.',
      };
  }
}

/** A dossier section whose contents unlock later in the event. */
function Sealed({ eyebrow, title, unlocks }: { eyebrow: string; title: string; unlocks: string }) {
  return (
    <section className="panel px-5 py-5">
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="font-display mt-2 text-2xl text-bone">{title}</h2>
      <p className="mt-3 flex items-center gap-3 text-sm text-steel">
        <span className="inline-block h-3 w-24 rounded-[1px] bg-steel/25" aria-hidden="true" />
        Sealed until {unlocks}
      </p>
    </section>
  );
}

/** The My Agency dossier. Pure display: the page loads the data. */
export function Dossier({
  agency,
  founders,
  startsAt,
  venue,
  signOut,
}: {
  agency: AgencySession;
  founders: DossierFounder[];
  startsAt: string;
  venue: string;
  signOut: React.ReactNode;
}) {
  const stamp = statusStamp(agency);
  const start = startsAt;
  return (
    <div className="mx-auto max-w-2xl px-[var(--gutter)] pt-10 pb-20">
      {/* ---------------------------------------------------------------- dossier cover */}
      <section className="panel relative overflow-hidden px-5 py-6 sm:px-7">
        <p className="eyebrow">Agency dossier · Classified</p>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="num text-6xl leading-none font-semibold text-torch">{agency.id}</p>
            <h1 className="display mt-3 text-4xl break-words">{agency.name}</h1>
          </div>
          <p className={`stamp ${stamp.className}`}>{stamp.text}</p>
        </div>
        <p className="mt-4 text-sm text-steel">{stamp.note}</p>

        <h2 className="eyebrow mt-8">Founders</h2>
        <ul className="mt-3 divide-y divide-line/70 border-y border-line/70">
          {founders.map((f) => (
            <li key={f.name} className="flex items-baseline justify-between gap-4 py-2.5">
              <span className="text-bone">
                {f.name}
                {f.is_captain && <span className="ml-2 text-xs font-semibold tracking-[0.18em] text-torch uppercase">Captain</span>}
              </span>
              <span className="text-sm text-steel">Section {f.section}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* ---------------------------------------------------------------- what's next */}
      <section className="mt-6 panel border-l-2 border-l-torch px-5 py-5">
        <p className="eyebrow">Next briefing</p>
        <p className="font-display mt-2 text-2xl text-bone">
          {longDate(start)} · {wallClock(start, 0)}
        </p>
        <p className="mt-2 text-sm text-steel">
          {venue}. The prelim, {ROUNDS.prelim}, starts at {wallClock(start, 10)}. Your captain logs in
          on one phone before it begins.
        </p>
      </section>

      {/* ---------------------------------------------------------------- sections that unlock during the event */}
      <div className="mt-6 grid gap-4">
        <Sealed eyebrow="Prelim" title="Score and rank" unlocks="the final prelim board" />
        <Sealed eyebrow={`Round 1 · ${ROUNDS.round1}`} title="Fund left and ledger" unlocks="your ₹50 Cr arrives at Power Bazaar" />
        <Sealed eyebrow="Gear" title="Cards, Team-Ups and Power Level" unlocks="your first card is signed" />
        <Sealed eyebrow={`Round 2 · ${ROUNDS.round2}`} title="Poster duel and Tower Score" unlocks="Round 2 results are published" />
        <Sealed eyebrow={`Round 3 · ${ROUNDS.round3}`} title="Mission File and Force Fields" unlocks="the envelopes are dealt" />
      </div>

      <div className="mt-10">{signOut}</div>
    </div>
  );
}
