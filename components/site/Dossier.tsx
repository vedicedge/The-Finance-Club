import { ROUNDS } from '@/lib/config';
import { longDate, wallClock } from '@/lib/schedule';
import type { AgencySession } from '@/lib/auth/agency';
import type { DossierData } from '@/lib/agency-view';
import { formatCrore } from '@/lib/money';
import { REASON_LABEL, ledgerTime } from '@/lib/ledger';

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
  prelimLive = false,
  briefing = true,
  data,
}: {
  agency: AgencySession;
  founders: DossierFounder[];
  startsAt: string;
  venue: string;
  signOut: React.ReactNode;
  /** The prelim is running: show the way into the quiz screen. */
  prelimLive?: boolean;
  /** Show the "next briefing" box (only before the event starts). */
  briefing?: boolean;
  /** Live sections (prelim result, fund and ledger, gear and Power Level). */
  data?: DossierData;
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

      {prelimLive && (
        <a href="/play" className="btn btn-primary mt-6 w-full !min-h-16 !text-base">
          Enter the prelim · {ROUNDS.prelim}
        </a>
      )}

      {/* ---------------------------------------------------------------- what's next */}
      {briefing && (
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
      )}

      {/* ---------------------------------------------------------------- sections that unlock during the event */}
      <div className="mt-6 grid gap-4">
        {data?.prelim.published ? (
          <section className="panel px-5 py-5">
            <p className="eyebrow">Prelim · {ROUNDS.prelim}</p>
            <p className="mt-2 flex items-baseline gap-4">
              <span className="display text-4xl">Rank #{data.prelim.rank ?? '—'}</span>
              <span className="num text-lg text-steel">{data.prelim.total.toLocaleString('en-IN')} points</span>
            </p>
          </section>
        ) : (
          <Sealed eyebrow="Prelim" title="Score and rank" unlocks="the final prelim board" />
        )}

        {data && data.ledger.length > 0 ? (
          <section className="panel px-5 py-5">
            <p className="eyebrow">Fund left</p>
            <p className="num mt-2 text-5xl font-semibold text-torch">{formatCrore(data.fund)}</p>
            <p className="mt-1 text-sm text-steel">Counts half in your Hero Score. Every credit and debit:</p>
            <ol className="mt-4 divide-y divide-line/60 border-y border-line/60 text-sm">
              {data.ledger.map((e) => (
                <li key={e.id} className={`grid grid-cols-[3.6rem_1fr_auto] gap-x-3 py-2 ${e.voided ? 'text-steel/60 line-through' : ''}`}>
                  <span className="num text-steel">{ledgerTime(e.created_at).slice(0, 5)}</span>
                  <span className="min-w-0">
                    {REASON_LABEL[e.reason] ?? e.reason}
                    {e.note && <span className="block truncate text-xs text-steel">{e.note}</span>}
                    {e.voided && <span className="block text-xs text-ember no-underline">Voided</span>}
                  </span>
                  <span className="num text-right">
                    <span className={e.amount < 0 ? 'text-ember' : 'text-toxic'}>{formatCrore(e.amount, { signed: true })}</span>
                    <span className="block text-xs text-steel">{formatCrore(e.balance)}</span>
                  </span>
                </li>
              ))}
            </ol>
          </section>
        ) : (
          <Sealed eyebrow={`Round 1 · ${ROUNDS.round1}`} title="Fund left and ledger" unlocks="your ₹50 Cr arrives at Power Bazaar" />
        )}

        {data?.tip && (
          <section className="panel border-l-2 border-l-ember px-5 py-5">
            <p className="eyebrow text-ember">Insider Tip · eyes only</p>
            <p className="font-display mt-2 text-xl text-bone">&ldquo;{data.tip.headline}&rdquo;</p>
            <p className="num mt-1 text-sm text-steel">
              {data.tip.delta > 0 ? '+' : ''}{data.tip.delta} Power to {data.tip.affects}, when Breaking News hits.
            </p>
          </section>
        )}

        {data && data.gear.length > 0 ? (
          <section className="panel px-5 py-5">
            <div className="flex items-baseline justify-between">
              <p className="eyebrow">Gear · Power Level</p>
              {data.round1Locked && <span className="text-xs font-semibold tracking-[0.18em] text-toxic uppercase">Final</span>}
            </div>
            <p className="num mt-2 text-5xl font-semibold text-torch">{data.power.total}</p>
            <ul className="mt-4 divide-y divide-line/60 border-y border-line/60 text-sm">
              {(['HQ', 'Suit', 'Gadget', 'Sidekick'] as const).map((cat) => {
                const g = data.gear.find((x) => x.category === cat);
                return (
                  <li key={cat} className="grid grid-cols-[4.6rem_1fr_auto] gap-x-3 py-2">
                    <span className="text-steel">{cat}</span>
                    <span className="min-w-0">
                      {g ? (
                        <>
                          <span className="num mr-1.5 text-torch">{g.card_id}</span>
                          {g.gear_name}
                          {g.news.map((n) => (
                            <span key={n.headline} className={`block text-xs ${n.delta > 0 ? 'text-toxic' : 'text-ember'}`}>
                              {n.headline} ({n.delta > 0 ? '+' : ''}{n.delta})
                            </span>
                          ))}
                        </>
                      ) : (
                        <span className="text-steel">— not signed yet</span>
                      )}
                    </span>
                    <span className="num text-right">{g ? `P${g.power}` : ''}</span>
                  </li>
                );
              })}
            </ul>
            {data.teamUps.map((u) => (
              <p key={u.name} className="mt-2 text-sm text-toxic">Team-Up: {u.name} (+{u.bonus})</p>
            ))}
            <p className="num mt-3 text-xs text-steel">
              Gear {data.power.gear}
              {data.power.teamUp ? ` + Team-Ups ${data.power.teamUp}` : ''}
              {data.power.news ? ` ${data.power.news > 0 ? '+' : '−'} news ${Math.abs(data.power.news)}` : ''} = {data.power.total}
            </p>
          </section>
        ) : (
          <Sealed eyebrow="Gear" title="Cards, Team-Ups and Power Level" unlocks="your first card is signed" />
        )}

        <Sealed eyebrow={`Round 2 · ${ROUNDS.round2}`} title="Poster duel and Tower Score" unlocks="Round 2 results are published" />
        <Sealed eyebrow={`Round 3 · ${ROUNDS.round3}`} title="Mission File and Force Fields" unlocks="the envelopes are dealt" />
      </div>

      <div className="mt-10">{signOut}</div>
    </div>
  );
}
