import { ROUNDS } from '@/lib/config';
import { longDate, wallClock } from '@/lib/schedule';
import type { AgencySession } from '@/lib/auth/agency';
import type { DossierData } from '@/lib/agency-view';
import { formatCrore } from '@/lib/money';
import { REASON_LABEL, ledgerTime } from '@/lib/ledger';
import { BuyTip } from '@/components/site/BuyTip';
import { Scene } from '@/components/art/Scene';
import { GearCard } from '@/components/cards/GearCard';
import { GearIcon } from '@/components/art/gear-icons';
import { seriesLabel } from '@/lib/card-art';

export type DossierFounder = { name: string; section: string; is_captain: boolean };

const ROUND_LABEL: Record<string, string> = { prelim: 'Prelim', round1: 'Round 1', round2: 'Round 2', round3: 'Round 3' };

export function statusStamp(a: AgencySession): { text: string; className: string; note: string } {
  switch (a.status) {
    case 'registered':
      return { text: 'Registered', className: 'text-glow', note: 'All three founders check in at the desk on Doomsday.' };
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
    <section className="panel relative overflow-hidden px-5 py-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="eyebrow">{eyebrow}</p>
          <h2 className="font-display mt-2 text-xl font-semibold tracking-[0.02em] text-bone/80">{title}</h2>
        </div>
        <svg viewBox="0 0 24 24" className="mt-1 size-5 flex-none text-steel/70" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6">
          <rect x="5" y="10.5" width="14" height="10" rx="1.5" />
          <path d="M8 10.5 V7.5 A4 4 0 0 1 16 7.5 V10.5" />
        </svg>
      </div>
      <div className="mt-4 space-y-1.5" aria-hidden="true">
        <span className="block h-2.5 w-11/12 bg-steel/15" />
        <span className="block h-2.5 w-2/3 bg-steel/15" />
      </div>
      <p className="mt-3 text-sm text-steel">Sealed until {unlocks}</p>
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
      <section className="panel corners relative isolate overflow-hidden px-5 py-6 [--corner-inset:8px] [--corner-size:14px] sm:px-7">
        <Scene
          name="heroes"
          className="absolute inset-x-0 top-0 -z-10 h-52 opacity-55 [mask-image:linear-gradient(180deg,#000_30%,transparent)]"
          sizes="(min-width: 672px) 672px, 100vw"
        />
        <p className="eyebrow text-glow">Agency dossier · Classified</p>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="num glow-text mt-16 text-7xl leading-none font-semibold text-glow">{agency.id}</p>
            <h1 className="display metal mt-3 text-4xl break-words">{agency.name}</h1>
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
                {f.is_captain && <span className="ml-2 text-xs font-semibold tracking-[0.18em] text-glow uppercase">Captain</span>}
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
        <section className="panel mt-6 border-l-2 !border-l-glow px-5 py-5">
          <p className="eyebrow">Next briefing</p>
          <p className="display mt-2 text-2xl text-bone">
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
            <p className="num mt-2 text-5xl font-semibold text-glow">{formatCrore(data.fund)}</p>
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

        {data?.tipsWindow && !data.tip && agency.status === 'active' && (
          <BuyTip closesAt={data.tipsWindow.closesAt} serverNow={data.tipsWindow.serverNow} fund={data.fund} />
        )}

        {data?.tip && (
          <section className="panel border-l-2 !border-l-ember px-5 py-5">
            <p className="eyebrow text-ember">Insider Tip · eyes only</p>
            <p className="font-serif mt-2 text-xl text-bone">&ldquo;{data.tip.headline}&rdquo;</p>
            <p className="num mt-1 text-sm text-steel">
              {data.tip.delta > 0 ? '+' : ''}{data.tip.delta} Power to every card in the {seriesLabel(data.tip.affects)}, when Breaking News hits.
            </p>
          </section>
        )}

        {data && data.gear.length > 0 ? (
          <section className="panel px-5 py-5">
            <div className="flex items-baseline justify-between">
              <p className="eyebrow">Gear · Power Level</p>
              {data.round1Locked && <span className="text-xs font-semibold tracking-[0.18em] text-toxic uppercase">Final</span>}
            </div>
            <p className="num mt-2 text-5xl font-semibold text-glow">{data.power.total}</p>
            {/* Your hand: the four cards as printed, with an empty slot for any not signed yet. */}
            <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(['HQ', 'Suit', 'Gadget', 'Sidekick'] as const).map((cat) => {
                const g = data.gear.find((x) => x.category === cat);
                return (
                  <li key={cat} className="text-[13px]">
                    {g ? (
                      <GearCard
                        card={{ id: g.card_id, name: g.card_name, series: g.series_name, category: cat, power: g.power }}
                        sizes="(min-width: 640px) 150px, 45vw"
                      />
                    ) : (
                      <div className="flex h-full min-h-[14em] flex-col items-center justify-center gap-2 rounded-[0.7em] border border-dashed border-line-strong text-steel">
                        <svg viewBox="0 0 48 48" className="w-10 opacity-60" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true">
                          <GearIcon kind={cat} />
                        </svg>
                        <span className="text-[0.72em] font-semibold tracking-[0.16em] uppercase">{cat} · not signed</span>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
            {/* The Power Level as a sum: each card, any Breaking News change, Team-Up bonuses, total. */}
            <div className="mt-4 grid grid-cols-[4.6rem_1fr_auto] gap-x-3 border-b border-line-strong pb-1.5 text-[0.68rem] font-semibold tracking-[0.18em] text-steel uppercase">
              <span>Slot</span>
              <span>Card</span>
              <span className="text-right">Power</span>
            </div>
            <ul className="divide-y divide-line/60 text-sm">
              {(['HQ', 'Suit', 'Gadget', 'Sidekick'] as const).map((cat) => {
                const g = data.gear.find((x) => x.category === cat);
                return (
                  <li key={cat} className="py-2">
                    <div className="grid grid-cols-[4.6rem_1fr_auto] gap-x-3">
                      <span className="text-steel">{cat}</span>
                      <span className="min-w-0">
                        {g ? (
                          <>
                            <span className="num mr-1.5 text-glow">{g.card_id}</span>
                            {g.card_name}
                            <span className="block text-xs text-steel">{seriesLabel(g.series_name)}</span>
                          </>
                        ) : (
                          <span className="text-steel">— not signed yet</span>
                        )}
                      </span>
                      <span className="num text-right font-semibold">{g ? g.power : ''}</span>
                    </div>
                    {g?.news.map((n) => (
                      <div key={n.headline} className="mt-1 grid grid-cols-[4.6rem_1fr_auto] gap-x-3 text-xs">
                        <span />
                        <span className={n.delta > 0 ? 'text-toxic' : 'text-ember'}>Breaking News: {n.headline}</span>
                        <span className={`num text-right font-semibold ${n.delta > 0 ? 'text-toxic' : 'text-ember'}`}>
                          {n.delta > 0 ? '+' : '−'}
                          {Math.abs(n.delta)}
                        </span>
                      </div>
                    ))}
                  </li>
                );
              })}
              {data.teamUps.map((u) => (
                <li key={u.name} className="grid grid-cols-[4.6rem_1fr_auto] gap-x-3 py-2">
                  <span className="text-toxic">Team-Up</span>
                  <span className="min-w-0 text-toxic">
                    {u.name}
                    <span className="block text-xs text-steel">You hold both cards of this pair, so they add a bonus.</span>
                  </span>
                  <span className="num text-right font-semibold text-toxic">+{u.bonus}</span>
                </li>
              ))}
              <li className="grid grid-cols-[4.6rem_1fr_auto] gap-x-3 border-t border-line-strong py-2 font-semibold">
                <span />
                <span>Power Level</span>
                <span className="num text-right text-glow">{data.power.total}</span>
              </li>
            </ul>
            {!data.round1Locked && (
              <p className="mt-2 text-xs text-steel">
                Breaking News can still change a card’s Power, and Team-Ups (+3 for holding both cards of a pair) are revealed
                with it.
              </p>
            )}
          </section>
        ) : (
          <Sealed eyebrow="Gear" title="Cards, Team-Ups and Power Level" unlocks="your first card is signed" />
        )}

        {data?.round2.duel || data?.round2.tower ? (
          <section className="panel px-5 py-5">
            <p className="eyebrow">Round 2 · {ROUNDS.round2}</p>
            {data.round2.duel && (
              <p className="mt-2 text-bone">
                Poster duel:{' '}
                {data.round2.duel.opponent ? (
                  <>vs <span className="num text-glow">{data.round2.duel.opponent}</span> {data.round2.duel.opponentName}</>
                ) : (
                  'a bye (counts as a win)'
                )}
                {data.round2.published && data.round2.duel.mine !== null && (
                  <span className="num block text-sm text-steel">
                    Story votes {data.round2.duel.mine}
                    {data.round2.duel.opponent ? ` – ${data.round2.duel.theirs}` : ''} · {data.round2.duel.won ? 'won' : 'lost'}
                  </span>
                )}
              </p>
            )}
            {data.round2.tower ? (
              <>
                <p className="num mt-4 text-4xl font-semibold text-glow">{data.round2.tower.score.toFixed(2)}</p>
                <p className="num mt-1 text-sm text-steel">
                  Accuracy {data.round2.tower.a.toFixed(1)} · Speed {data.round2.tower.s.toFixed(1)} · Destruction {data.round2.tower.d.toFixed(1)} · rank #{data.round2.tower.rank}
                </p>
                <p className={`stamp mt-4 ${data.round2.tower.qualified ? 'text-toxic' : 'text-ember'}`}>
                  {data.round2.tower.qualified ? 'Top 8 · into the Vault' : 'Eliminated · Round 2'}
                </p>
                {data.round2.bonus && <p className="mt-3 text-sm text-toxic">+₹5 Cr poster bonus credited.</p>}
              </>
            ) : (
              <p className="mt-3 text-sm text-steel">Tower Score and the top 8 appear once Round 2 results are published.</p>
            )}
          </section>
        ) : (
          <Sealed eyebrow={`Round 2 · ${ROUNDS.round2}`} title="Poster duel and Tower Score" unlocks="Round 2 results are published" />
        )}

        {data?.round3.envelope ? (
          <section className="panel px-5 py-5">
            <p className="eyebrow">Round 3 · {ROUNDS.round3}</p>
            <p className="mt-2 flex items-baseline gap-3">
              <span className="num text-5xl font-semibold text-glow">{data.round3.envelope}</span>
              <span className="text-sm text-steel">your Mission File · keep it sealed</span>
            </p>
            {data.round3.currentMission && (
              <p className="mt-2 text-sm">
                Mission {data.round3.currentMission}:{' '}
                {data.round3.forceFields.includes(data.round3.currentMission) ? (
                  <span className="text-toxic">Force Field up</span>
                ) : (
                  <span className="text-steel">no Force Field</span>
                )}
              </p>
            )}
            {data.round3.swaps.length > 0 && (
              <ul className="mt-3 space-y-1 text-sm text-steel">
                {data.round3.swaps.map((sw, i) => (
                  <li key={i}>Mission {sw.mission}: swapped {sw.gave} for {sw.got} with <span className="num text-bone">{sw.with}</span></li>
                ))}
              </ul>
            )}
            <div className="mt-4 grid grid-cols-3 gap-px overflow-hidden rounded-sm border border-line bg-line text-center">
              <div className="bg-vault-2 px-2 py-3">
                <p className="eyebrow !text-[0.6rem]">Power</p>
                <p className="num mt-1 text-xl text-bone">{data.power.total}</p>
              </div>
              <div className="bg-vault-2 px-2 py-3">
                <p className="eyebrow !text-[0.6rem]">Outcome</p>
                <p className="num mt-1 text-xl text-bone">{data.hero ? `×${data.hero.multiplier}` : '██'}</p>
              </div>
              <div className="bg-vault-2 px-2 py-3">
                <p className="eyebrow !text-[0.6rem]">Fund ÷ 2</p>
                <p className="num mt-1 text-xl text-bone">{(data.fund / 2).toFixed(2).replace(/\.?0+$/, '')}</p>
              </div>
            </div>
            {data.hero ? (
              <p className="mt-4 text-bone">
                {data.hero.outcome} · Hero Score <span className="num text-2xl font-semibold text-glow">{Number.isInteger(data.hero.hero) ? data.hero.hero : data.hero.hero.toFixed(2)}</span>
              </p>
            ) : (
              <p className="mt-3 text-xs text-steel">The Battle Outcome stays classified until your envelope opens at Zero Hour.</p>
            )}
          </section>
        ) : (
          <Sealed eyebrow={`Round 3 · ${ROUNDS.round3}`} title="Mission File and Force Fields" unlocks="the envelopes are dealt" />
        )}
      </div>

      <div className="mt-10">{signOut}</div>
    </div>
  );
}
