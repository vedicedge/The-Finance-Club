import { Fragment } from 'react';
import { ROUNDS } from '@/lib/config';
import { formatBuildTime } from '@/lib/round2/tower-board';
import { CHECKLIST, CHECKLIST_INTRO, CHECKLIST_TITLE } from '@/lib/print/checklist';
import {
  CATEGORIES,
  finalists,
  revealOrder,
  round1Field,
  round2Field,
  type AuctionPrint,
  type PrintAgency,
  type loadPrintBase,
  type loadRound2Print,
  type loadRound3Print,
} from '@/lib/print/data';
import { BlankRows, Sheet } from './Paper';

type Base = Awaited<ReturnType<typeof loadPrintBase>>;
type R2 = Awaited<ReturnType<typeof loadRound2Print>>;
type R3 = Awaited<ReturnType<typeof loadRound3Print>>;

const nf = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });
/** Plain ₹ crore figure for a ₹ Cr column, with a true minus sign. */
const cr = (n: number) => (n < 0 ? `−${nf.format(-n)}` : nf.format(n));
const two = (n: number) => n.toFixed(2);

function sheetProps(base: Base) {
  return { printedAt: base.printedAt, dryRun: base.settings.dryRun.enabled };
}

/** A shaded full-width row that names the part of the table below it. */
function Divider({ cols, children }: { cols: number; children: React.ReactNode }) {
  return (
    <tr>
      <td colSpan={cols} className="!bg-neutral-100 text-[9.5px] font-bold uppercase tracking-[0.12em]">
        {children}
      </td>
    </tr>
  );
}

function Rules({ children }: { children: React.ReactNode }) {
  return <div className="avoid-break mt-3 border border-black px-3 py-2">{children}</div>;
}

/** `code` and **bold** inside checklist lines. */
function Inline({ text }: { text: string }) {
  return (
    <>
      {text.split(/(`[^`]+`|\*\*[^*]+\*\*)/).map((part, i) =>
        part.startsWith('`') ? (
          <code key={i} className="font-mono text-[10px]">
            {part.slice(1, -1)}
          </code>
        ) : part.startsWith('**') ? (
          <strong key={i}>{part.slice(2, -2)}</strong>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}

// ---------------------------------------------------------------- checklist

export function ChecklistSheet({ base }: { base: Base }) {
  return (
    <Sheet title={CHECKLIST_TITLE} subtitle={CHECKLIST_INTRO} {...sheetProps(base)}>
      {CHECKLIST.map((section) => (
        <div key={section.title}>
          <h2 className="!mt-5 border-b border-black pb-1">{section.title}</h2>
          {section.groups.map((group, g) => (
            <div key={g} className="avoid-break">
              {group.title && <h3 className="mt-3 text-[11.5px] font-bold">{group.title}</h3>}
              <ul className="!list-none !pl-0">
                {group.items.map((item) => (
                  <li key={item} className="flex gap-2 !mt-1.5">
                    <span aria-hidden className="shrink-0 text-[13px] leading-[1.1]">
                      ☐
                    </span>
                    <span>
                      <Inline text={item} />
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ))}
      <p className="muted !mt-6">Notes</p>
      <div className="mt-1 h-40 border border-black" />
    </Sheet>
  );
}

// ---------------------------------------------------------------- check-in

export function CheckinSheet({ base }: { base: Base }) {
  const rows = base.agencies;
  return (
    <Sheet
      title="Check-in desk"
      subtitle="Tick when every founder is present, then check the agency in on Agencies & check-in. ★ = captain."
      {...sheetProps(base)}
    >
      <table>
        <colgroup>
          <col style={{ width: '8%' }} />
          <col style={{ width: '24%' }} />
          <col />
          <col style={{ width: '11%' }} />
          <col style={{ width: '9%' }} />
          <col style={{ width: '9%' }} />
        </colgroup>
        <thead>
          <tr>
            <th>ID</th>
            <th>Agency</th>
            <th>Founders (section)</th>
            <th>All present</th>
            <th>Time</th>
            <th>Initials</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((a) => (
            <tr key={a.id}>
              <td className="num font-bold">{a.id}</td>
              <td>{a.name}</td>
              <td>
                {a.founders.map((f, i) => (
                  <div key={i}>
                    {f.captain ? '★ ' : ''}
                    {f.name}
                    {f.section && <span className="muted"> ({f.section})</span>}
                  </div>
                ))}
              </td>
              <td>{a.checkedIn ? '✓ on site' : '☐'}</td>
              <td />
              <td />
            </tr>
          ))}
          <BlankRows n={rows.length ? 4 : 30} cols={6} />
        </tbody>
      </table>
      <p className="muted !mt-2">{rows.length} agencies listed at print time. Phone numbers and emails are on the Agencies page.</p>
    </Sheet>
  );
}

// ---------------------------------------------------------------- Round 1

function soldCell(sold: { agency: string; price: number } | undefined) {
  return sold ? { to: sold.agency, price: cr(sold.price) } : { to: '', price: '' };
}

export function AuctionSheets({ base, auction }: { base: Base; auction: AuctionPrint }) {
  const lots = auction.cards.filter((c) => c.phase !== 'jugaad');
  const kits = auction.cards.filter((c) => c.phase === 'jugaad');
  const field = round1Field(base.agencies);
  let n = 0;
  const header = (
    <thead>
      <tr>
        <th>#</th>
        <th>Card</th>
        <th>Gear</th>
        <th>Cat.</th>
        <th>Power</th>
        <th>Min ₹ Cr</th>
        <th>Sold to</th>
        <th>Price ₹ Cr</th>
        <th>Initials</th>
      </tr>
    </thead>
  );
  const lotRow = (c: (typeof lots)[number]) => {
    const s = soldCell(auction.soldTo.get(c.id));
    n += 1;
    return (
      <tr key={c.id}>
        <td className="num muted">{n}</td>
        <td className="num font-bold">{c.id}</td>
        <td>
          {c.card_name}
          {c.card_name !== c.gear_name && <span className="muted"> · {c.gear_name} series</span>}
        </td>
        <td>{c.category}</td>
        <td className="num">{c.power}</td>
        <td className="num">{cr(c.min_bid)}</td>
        <td className="num font-bold">{s.to}</td>
        <td className="num font-bold">{s.price}</td>
        <td />
      </tr>
    );
  };
  return (
    <>
      <Sheet
        title={`${ROUNDS.round1} · lot tally`}
        subtitle={
          auction.shuffled
            ? 'Lots in the running order shuffled on the site. Filled-in sales come from the site at print time.'
            : 'Card order. The secret cards are shuffled on the site before the first sale: reprint after it for the running order.'
        }
        {...sheetProps(base)}
      >
        <Rules>
          Valid bid: at least the minimum, at most the agency’s fund left, in ₹0.5 Cr steps; one card per category per agency.
          A tie for highest re-bids once on slates, then a coin toss. No valid bid: unsold, back at Last Call, live, only to
          agencies still missing that category.
        </Rules>
        <table>
          <colgroup>
            <col style={{ width: '5%' }} />
            <col style={{ width: '7%' }} />
            <col />
            <col style={{ width: '9%' }} />
            <col style={{ width: '7%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '9%' }} />
          </colgroup>
          {header}
          <tbody>
            <Divider cols={9}>Marquee Auction · live with paddles, from the minimum</Divider>
            {lots.filter((c) => c.phase === 'marquee').map(lotRow)}
            <Divider cols={9}>Secret Identity Bids · on slates: show 5 s, write 10 s, unmask</Divider>
            {lots.filter((c) => c.phase === 'secret').map(lotRow)}
            <Divider cols={9}>Jugaad Kits · Power 2 for ₹8 Cr, only for an agency missing exactly one category (write the slot it fills)</Divider>
            {kits.map((c) => {
              const s = auction.soldTo.get(c.id);
              return (
                <tr key={c.id}>
                  <td />
                  <td className="num font-bold">{c.id}</td>
                  <td>{c.card_name}</td>
                  <td>{s ? s.slot : '→ ______'}</td>
                  <td className="num">{c.power}</td>
                  <td className="num">{cr(c.min_bid)}</td>
                  <td className="num font-bold">{s?.agency ?? ''}</td>
                  <td className="num font-bold">{s ? cr(s.price) : ''}</td>
                  <td />
                </tr>
              );
            })}
          </tbody>
        </table>
      </Sheet>

      <Sheet
        title={`${ROUNDS.round1} · fund tracker`}
        subtitle="One line per agency in the game. Write card and price in each slot as it sells. Printed figures come from the site at print time."
        {...sheetProps(base)}
      >
        <table>
          <colgroup>
            <col style={{ width: '6%' }} />
            <col style={{ width: '15%' }} />
            <col style={{ width: '6%' }} />
            <col style={{ width: '6%' }} />
            <col />
            <col />
            <col />
            <col />
            <col style={{ width: '9%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '7%' }} />
            <col style={{ width: '8%' }} />
          </colgroup>
          <thead>
            <tr>
              <th>ID</th>
              <th>Agency</th>
              <th>Start</th>
              <th>Tip −2</th>
              {CATEGORIES.map((c) => (
                <th key={c}>{c} card · ₹</th>
              ))}
              <th>Jugaad −8 (slot)</th>
              <th>Fund left</th>
              <th>Power</th>
              <th>Agency OK</th>
            </tr>
          </thead>
          <tbody>
            {field.map((a) => {
              const held = auction.held.get(a.id) ?? {};
              const started = auction.startFunded.has(a.id);
              return (
                <tr key={a.id} className="blank">
                  <td className="num font-bold">{a.id}</td>
                  <td>{a.name}</td>
                  <td className="num">+50</td>
                  <td className="num">{auction.tipBought.has(a.id) ? '−2' : ''}</td>
                  {CATEGORIES.map((c) => {
                    const h = held[c];
                    return (
                      <td key={c} className="num">
                        {h ? `${h.card_id} · ${cr(h.price)}` : ''}
                      </td>
                    );
                  })}
                  <td className="num">
                    {held.Jugaad ? `${held.Jugaad.card_id} · ${held.Jugaad.slot ?? ''}` : ''}
                  </td>
                  <td className="num font-bold">{started ? cr(auction.fund.get(a.id) ?? 0) : ''}</td>
                  <td className="num font-bold">{started ? (auction.power.get(a.id) ?? 0) : ''}</td>
                  <td />
                </tr>
              );
            })}
            <BlankRows n={field.length ? 2 : 16} cols={12} />
          </tbody>
        </table>
        <Rules>
          <p className="!mt-0">
            <strong>Fund left</strong> = ₹50 Cr − tip − every purchase. <strong>Power Level</strong> = the Power of the cards held +
            Team-Ups (+3 each) ± Breaking News, once revealed.
          </p>
          <p>
            After Last Call: missing exactly one category and ₹8 Cr in the fund → the next Jugaad Kit (JK1, JK2 …). Missing two or
            more categories, or short of ₹8 Cr → eliminated in Round 1.
          </p>
        </Rules>
      </Sheet>
    </>
  );
}

// ---------------------------------------------------------------- backup ledger

/** Lines per backup ledger sheet: the first has the instructions box above the table. */
const LEDGER_ROWS = [32, 37] as const;

export function LedgerSheets({ base }: { base: Base }) {
  return (
    <>
      {[1, 2].map((page) => (
        <Sheet key={page} title={`Backup Fund Ledger · sheet ${page} of 2`} {...sheetProps(base)}>
          {page === 1 && (
            <Rules>
              <p className="!mt-0">
                Only while the site is down. One line per money movement, in the order it happens. Never change a line: strike it
                through and write a new one, as on the site.
              </p>
              <p>
                When the site is back, enter each line where it belongs (sales and tips on the Power Bazaar console; Force Fields,
                choices, transfers and fines on the Round 3 console; anything else as an adjustment on Fund Ledger) and tick
                <em> On site</em>.
              </p>
              <p className="muted">
                What: Sale · Tip −2 · Jugaad −8 · Poster bonus +5 · Force Field −5 · Mission cash +6 · Transfer (two lines: − from,
                + to) · Fine −5 · Adjustment
              </p>
            </Rules>
          )}
          <table>
            <colgroup>
              <col style={{ width: '5%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '16%' }} />
              <col />
              <col style={{ width: '11%' }} />
              <col style={{ width: '9%' }} />
              <col style={{ width: '8%' }} />
            </colgroup>
            <thead>
              <tr>
                <th>#</th>
                <th>Time</th>
                <th>Agency</th>
                <th>What</th>
                <th>Card / ref / note</th>
                <th>+ / − ₹ Cr</th>
                <th>Keeper</th>
                <th>On site</th>
              </tr>
            </thead>
            <tbody>
              <BlankRows n={LEDGER_ROWS[page - 1]} cols={8} numbered from={page === 1 ? 1 : LEDGER_ROWS[0] + 1} />
            </tbody>
          </table>
        </Sheet>
      ))}
    </>
  );
}

// ---------------------------------------------------------------- Round 2

export function Round2Sheets({ base, r2 }: { base: Base; r2: R2 }) {
  const field = round2Field(base.agencies);
  const duelSlots = field.length ? Math.ceil(field.length / 2) : 8;
  return (
    <>
      <Sheet title={`${ROUNDS.round2} · Part A poster duels`} {...sheetProps(base)}>
        <Rules>
          Only story-vote counts at the cutoff (the last team’s slingshot shot) count. More votes wins the duel; a tie is settled by
          rock-paper-scissors. The winner, or a bye, gets <strong>₹5 Cr only if it also finishes in the top 8</strong> of the tower
          game. Best Launch Poster: most story votes (recognition only, no cash).
        </Rules>
        <table>
          <colgroup>
            <col style={{ width: '6%' }} />
            <col />
            <col style={{ width: '9%' }} />
            <col />
            <col style={{ width: '9%' }} />
            <col style={{ width: '11%' }} />
            <col style={{ width: '9%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '9%' }} />
          </colgroup>
          <thead>
            <tr>
              <th>Duel</th>
              <th>Agency A</th>
              <th>Votes A</th>
              <th>Agency B</th>
              <th>Votes B</th>
              <th>Tie: RPS winner</th>
              <th>Winner</th>
              <th>Top 8?</th>
              <th>+5 on site</th>
            </tr>
          </thead>
          <tbody>
            {r2.duels.map((d, i) => (
              <tr key={d.agency_a} className="blank">
                <td className="num muted">{i + 1}</td>
                <td className="num font-bold">{d.agency_a}</td>
                <td className="num">{d.votes_a ?? ''}</td>
                <td className="num font-bold">{d.agency_b ?? '— bye —'}</td>
                <td className="num">{d.agency_b ? (d.votes_b ?? '') : ''}</td>
                <td className="num">{d.tiebreak_winner ?? ''}</td>
                <td className="num font-bold">{d.winner ?? ''}</td>
                <td />
                <td />
              </tr>
            ))}
            <BlankRows n={r2.duels.length ? 1 : duelSlots} cols={9} numbered from={r2.duels.length + 1} />
          </tbody>
        </table>
        <p className="muted !mt-2">Best Launch Poster (most votes): ____________ with ______ votes.</p>
      </Sheet>

      <Sheet title={`${ROUNDS.round2} · Part B tower scores`} {...sheetProps(base)}>
        <Rules>
          <p className="!mt-0">
            <strong>A</strong> = 100 × blocks in the correct position and colour ÷ blocks in the reference ·{' '}
            <strong>S</strong> = 100 × (1 − build time ÷ 10 min); unfinished = 10:00, S = 0 · <strong>D</strong> = 100 × blocks
            fallen ÷ blocks in the frozen build; 0 if nothing was built · <strong>Tower Score</strong> = (A + S + D) ÷ 3.
          </p>
          <p>
            Example: 18 of 20 correct (A = 90), built in 6:00 (S = 40), 15 of 20 fall (D = 75) → (90 + 40 + 75) ÷ 3 = 68.33. Rank on
            unrounded scores; the top 8 go through. A tie at 8th: {base.settings.round2.cutoffTiebreak}, as announced before play.
          </p>
        </Rules>
        <table>
          <colgroup>
            <col style={{ width: '6%' }} />
            <col style={{ width: '15%' }} />
            <col style={{ width: '7%' }} />
            <col style={{ width: '7%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '7%' }} />
            <col style={{ width: '7%' }} />
            <col style={{ width: '7%' }} />
            <col style={{ width: '7%' }} />
            <col style={{ width: '7%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '6%' }} />
            <col style={{ width: '6%' }} />
          </colgroup>
          <thead>
            <tr>
              <th>ID</th>
              <th>Agency</th>
              <th>Correct</th>
              <th>Ref.</th>
              <th>Time m:ss</th>
              <th>Frozen</th>
              <th>Fallen</th>
              <th>A</th>
              <th>S</th>
              <th>D</th>
              <th>Score</th>
              <th>Rank</th>
              <th>Top 8</th>
            </tr>
          </thead>
          <tbody>
            {field.map((a) => {
              const t = r2.towers.get(a.id);
              const s = r2.scores.get(a.id);
              return (
                <tr key={a.id} className="blank">
                  <td className="num font-bold">{a.id}</td>
                  <td>{a.name}</td>
                  <td className="num">{t?.correct_blocks ?? ''}</td>
                  <td className="num">{t?.reference_blocks ?? ''}</td>
                  <td className="num">{t ? formatBuildTime(t.build_time_s) : ''}</td>
                  <td className="num">{t?.frozen_blocks ?? ''}</td>
                  <td className="num">{t?.blocks_fallen ?? ''}</td>
                  <td className="num">{s ? two(s.a) : ''}</td>
                  <td className="num">{s ? two(s.s) : ''}</td>
                  <td className="num">{s ? two(s.d) : ''}</td>
                  <td className="num font-bold">{s ? two(s.score) : ''}</td>
                  <td />
                  <td />
                </tr>
              );
            })}
            <BlankRows n={field.length ? 1 : 16} cols={13} />
          </tbody>
        </table>
      </Sheet>
    </>
  );
}

// ---------------------------------------------------------------- Round 3

const CHOICE_LABEL: Record<string, string> = { swap: 'Swap', xray: 'X-Ray', cash: '₹6 Cr cash', none: 'No winner' };

export function Round3Sheets({ base, r3 }: { base: Base; r3: R3 }) {
  const final = finalists(base.agencies, r3.envelopeOf, base.flags.round2Published);
  return (
    <>
      <Sheet title={`${ROUNDS.round3} · deal & missions`} {...sheetProps(base)}>
        <h2>Finalists and envelopes</h2>
        <table>
          <colgroup>
            <col style={{ width: '8%' }} />
            <col style={{ width: '26%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '14%' }} />
            <col />
          </colgroup>
          <thead>
            <tr>
              <th>ID</th>
              <th>Agency</th>
              <th>Power</th>
              <th>Envelope</th>
              <th>Envelope moves (mission · swapped with)</th>
            </tr>
          </thead>
          <tbody>
            {final.map((a) => (
              <tr key={a.id} className="blank">
                <td className="num font-bold">{a.id}</td>
                <td>{a.name}</td>
                <td className="num">{r3.power.get(a.id) ?? ''}</td>
                <td className="num font-bold">{r3.envelopeOf.get(a.id) ?? ''}</td>
                <td />
              </tr>
            ))}
            <BlankRows n={Math.max(0, 8 - final.length)} cols={5} />
          </tbody>
        </table>

        <h2>Missions</h2>
        <table>
          <colgroup>
            <col style={{ width: '4%' }} />
            <col style={{ width: '20%' }} />
            <col style={{ width: '22%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '13%' }} />
            <col />
            <col style={{ width: '8%' }} />
          </colgroup>
          <thead>
            <tr>
              <th>#</th>
              <th>Mission</th>
              <th>Force Fields (−₹5 Cr each)</th>
              <th>Winner</th>
              <th>Choice</th>
              <th>Swap target · X-Ray target (never announce)</th>
              <th>On site</th>
            </tr>
          </thead>
          <tbody>
            {r3.missions.map((m) => (
              <tr key={m.no} className="avoid-break" style={{ height: 52 }}>
                <td className="num font-bold">{m.no}</td>
                <td>{m.name}</td>
                <td className="num">
                  {r3.forceFields
                    .filter((f) => f.mission === m.no)
                    .map((f) => f.agency_id)
                    .sort()
                    .join(', ')}
                </td>
                <td className="num font-bold">{m.winner_agency_id ?? ''}</td>
                <td>{m.choice ? CHOICE_LABEL[m.choice] ?? m.choice : 'Swap · X-Ray · ₹6 Cr'}</td>
                <td className="num">{m.swap_target ?? ''}</td>
                <td />
              </tr>
            ))}
          </tbody>
        </table>
        <Rules>
          <p className="!mt-0">
            Cycle: Force Field 30 s → Play 4 min → Results 1 min → Winner’s choice 30 s → Chai Pe Charcha 1 min. A Force Field blocks
            swaps on that envelope until the mission’s winner has chosen; Mission 4’s choice and Force Fields carry to the start of
            Zero Hour.
          </p>
          <p>
            First fully correct sheet in arrival order wins; a wrong sheet is final; no correct sheet = no winner. Only the anchor
            moves envelopes. Opening another agency’s envelope = ₹5 Cr fine.
          </p>
        </Rules>
      </Sheet>

      <Sheet title={`${ROUNDS.round3} · transfers & fines`} {...sheetProps(base)}>
        <h2>Chai Pe Charcha cash deals (missions 1–3 only)</h2>
        <table>
          <colgroup>
            <col style={{ width: '9%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '10%' }} />
            <col />
            <col style={{ width: '10%' }} />
            <col style={{ width: '9%' }} />
          </colgroup>
          <thead>
            <tr>
              <th>Mission</th>
              <th>From</th>
              <th>To</th>
              <th>₹ Cr</th>
              <th>Note</th>
              <th>Keeper</th>
              <th>On site</th>
            </tr>
          </thead>
          <tbody>
            <BlankRows n={16} cols={7} />
          </tbody>
        </table>

        <h2>Fines (₹5 Cr: opening another agency’s envelope)</h2>
        <table>
          <colgroup>
            <col style={{ width: '9%' }} />
            <col style={{ width: '10%' }} />
            <col />
            <col style={{ width: '10%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '9%' }} />
          </colgroup>
          <thead>
            <tr>
              <th>Time</th>
              <th>Agency</th>
              <th>Reason</th>
              <th>₹ Cr</th>
              <th>Keeper</th>
              <th>On site</th>
            </tr>
          </thead>
          <tbody>
            <BlankRows n={6} cols={6} />
          </tbody>
        </table>
        <p className="muted !mt-2">Force Field payments and the ₹6 Cr mission cash go on the mission table and the backup ledger.</p>
      </Sheet>
    </>
  );
}

// ---------------------------------------------------------------- Zero Hour

const TIEBREAK_LABEL = { fund_left: 'higher fund left', power_level: 'higher Power Level', coin_toss: 'coin toss on stage' } as const;

export function ZeroHourSheet({ base, r3 }: { base: Base; r3: R3 }) {
  const order = revealOrder(finalists(base.agencies, r3.envelopeOf, base.flags.round2Published), r3.power);
  const tiebreak = base.settings.zeroHour.heroTiebreak.map((t) => TIEBREAK_LABEL[t]).join(', then ');
  const prize = (p: string | null) => p ?? 'to be announced';
  return (
    <Sheet title={`${ROUNDS.zeroHour} · Hero Scores`} {...sheetProps(base)}>
      <div className="mt-3 grid grid-cols-[1fr_auto] gap-4">
        <Rules>
          <p className="!mt-0">
            <strong>Hero Score = Power Level × Battle Outcome multiplier + Fund left ÷ 2.</strong> Example: 28 × 1.5 + 18 ÷ 2 = 51.
          </p>
          <p>
            Envelopes open in ascending Power Level, ties by agency ID. Highest Hero Score wins; a tie for 1st or 2nd goes to{' '}
            {tiebreak}.
          </p>
          <p>
            Mission 4’s winner makes the last choice before the first envelope opens. Winner: {prize(base.settings.prizes.winner)} ·
            Runner-up: {prize(base.settings.prizes.runnerUp)}.
          </p>
        </Rules>
        <table className="!mt-3 !w-auto">
          <thead>
            <tr>
              <th>Battle Outcome</th>
              <th>Env.</th>
              <th>×</th>
            </tr>
          </thead>
          <tbody>
            {r3.outcomes.map((o) => (
              <tr key={o.label}>
                <td>{o.label}</td>
                <td className="num">{o.envelopes}</td>
                <td className="num font-bold">{nf.format(Number(o.multiplier))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <table className="!mt-4">
        <colgroup>
          <col style={{ width: '5%' }} />
          <col style={{ width: '6%' }} />
          <col style={{ width: '14%' }} />
          <col style={{ width: '7%' }} />
          <col style={{ width: '7%' }} />
          <col />
          <col style={{ width: '6%' }} />
          <col style={{ width: '8%' }} />
          <col style={{ width: '8%' }} />
          <col style={{ width: '8%' }} />
          <col style={{ width: '8%' }} />
          <col style={{ width: '6%' }} />
        </colgroup>
        <thead>
          <tr>
            <th>Open</th>
            <th>ID</th>
            <th>Agency</th>
            <th>Power</th>
            <th>Env.</th>
            <th>Battle Outcome</th>
            <th>×</th>
            <th>Fund left</th>
            <th>Power × mult.</th>
            <th>Fund ÷ 2</th>
            <th>Hero Score</th>
            <th>Rank</th>
          </tr>
        </thead>
        <tbody>
          {order.map((a: PrintAgency, i) => (
            <tr key={a.id} style={{ height: 34 }}>
              <td className="num muted">{i + 1}</td>
              <td className="num font-bold">{a.id}</td>
              <td>{a.name}</td>
              <td className="num font-bold">{r3.power.get(a.id) ?? ''}</td>
              <td />
              <td />
              <td />
              <td />
              <td />
              <td />
              <td />
              <td />
            </tr>
          ))}
          {Array.from({ length: Math.max(0, 8 - order.length) }, (_, i) => (
            <tr key={`b${i}`} style={{ height: 34 }}>
              <td className="num muted">{order.length + i + 1}</td>
              {Array.from({ length: 11 }, (_, c) => (
                <td key={c} />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="muted !mt-2">
        Envelope and fund left are written in at Zero Hour (Mission 4’s choice can still change them). Multipliers are never printed
        in advance.
      </p>
      <p className="!mt-6">Winner: ______________________ Hero Score ________ · Runner-up: ______________________ Hero Score ________</p>
    </Sheet>
  );
}
