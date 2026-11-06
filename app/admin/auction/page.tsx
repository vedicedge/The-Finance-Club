import type { Metadata } from 'next';
import Link from 'next/link';
import { requireOrganiser } from '@/lib/auth/organiser';
import { canAccess } from '@/lib/auth/roles';
import { formatCrore } from '@/lib/money';
import { CATEGORIES, R1_STEPS, TIPS_WINDOW_SECONDS, isR1Step } from '@/lib/round1/steps';
import { lotPool, needing } from '@/lib/round1/lots';
import { loadRound1 } from '@/lib/round1/server';
import { AdminShell } from '@/components/admin/AdminShell';
import { AutoRefresh } from '@/components/admin/AutoRefresh';
import { WindowClock } from '@/components/site/WindowClock';
import { NextPhase } from '@/components/admin/NextPhase';
import {
  advanceLot,
  applyJugaad,
  buyTip,
  openTipsWindow,
  lockRound1,
  recordSale,
  revealNextNews,
  revealTeamUps,
  setNewsDraw,
  setStep,
  showNewsRecap,
  showLot,
  shuffleLots,
  startFunds,
  voidSale,
} from './actions';

export const metadata: Metadata = { title: 'Power Bazaar console' };

const small = 'btn !min-h-0 !px-3 !py-1.5 !text-xs';
const select = 'field !mt-1';
const istTime = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit', second: '2-digit' });

export default async function AuctionConsole({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string; card?: string; agency?: string; price?: string }>;
}) {
  const organiser = await requireOrganiser('auction');
  const sp = await searchParams;
  const r1 = await loadRound1();
  const canMoney = canAccess(organiser.roles, 'ledger');
  const step = isR1Step(r1.step) ? r1.step : null;
  const active = r1.agencies.filter((a) => a.status === 'active');
  const cardById = new Map(r1.cards.map((c) => [c.id, c]));
  const lot = r1.currentCardId ? cardById.get(r1.currentCardId) ?? null : null;
  const pool = lotPool(r1.cards, r1.sold, step);
  const sellable = step === 'marquee' || step === 'secret' || step === 'last_call';
  const drawn = r1.news.filter((n) => n.draw_order !== null).sort((a, b) => a.draw_order! - b.draw_order!);
  const tipsSold = r1.agencies.some((a) => a.tipNews);
  const allNewsOut = drawn.length > 0 && drawn.every((n) => n.revealed_at) && r1.teamUps.every((t) => t.revealed_at);
  const now = Date.parse(r1.now);
  const tipsOpen = step === 'tips' && r1.tipsClosesAt !== null && Date.parse(r1.tipsClosesAt) > now;
  // Newest first; "new" for 20 seconds so the console flags each purchase as it lands.
  const tipBuyers = r1.agencies
    .filter((a) => a.tipNews)
    .sort((a, b) => (b.tipAt ?? '').localeCompare(a.tipAt ?? ''));
  const isNew = (at: string | null) => at !== null && now - Date.parse(at) < 20_000;
  const lotsShuffled = r1.cards.some((c) => c.lot_order !== null);
  const pendingClose = active.filter((a) => a.missing.length > 0);

  return (
    <AdminShell organiser={organiser}>
      <AutoRefresh ms={tipsOpen ? 2000 : 4000} />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Round 1 · 50 min</p>
          <h1 className="display mt-3 text-5xl">Power Bazaar console</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/screen/auction" target="_blank" className="btn btn-ghost">Open projector ↗</Link>
          {canMoney && <Link href="/admin/ledger" className="btn btn-ghost">Fund Ledger</Link>}
        </div>
      </div>

      {sp.error && <p role="alert" className="mt-6 rounded-sm border border-ember/40 bg-ember/10 px-4 py-3 text-sm text-ember">Rejected: {sp.error}</p>}
      {sp.ok && <p role="status" className="mt-6 rounded-sm border border-toxic/40 bg-toxic/10 px-4 py-3 text-sm text-toxic">{sp.ok}</p>}
      <NextPhase organiser={organiser} to="round1" />
      <NextPhase organiser={organiser} to="round2" />
      {r1.phase !== 'round1' && !r1.locked && (
        <p className="mt-6 rounded-sm border border-torch/40 bg-torch/10 px-4 py-3 text-sm text-torch">
          The event is not in Round 1 yet. Freeze the top 16 in the quiz console, then an admin starts Round 1 (button above, or
          the command centre).
          You can already enter the Breaking News draw below.
        </p>
      )}
      {r1.locked && (
        <p className="mt-6 rounded-sm border border-toxic/40 bg-toxic/10 px-4 py-3 text-sm text-toxic">
          Round 1 is locked. Power Levels and Round 1 purchases are final.
        </p>
      )}

      {/* ---------------------------------------------------------------- steps */}
      {r1.phase === 'round1' && !r1.locked && (
        <nav aria-label="Round 1 steps" className="mt-8 flex flex-wrap gap-2">
          {R1_STEPS.map((s) => (
            <form key={s.id} action={setStep.bind(null, s.id)}>
              <button className={`${small} ${step === s.id ? 'btn-primary' : 'btn-ghost'}`} title={s.note}>
                <span className="num mr-1 opacity-70">{s.clock}</span> {s.label}
              </button>
            </form>
          ))}
        </nav>
      )}

      {r1.phase === 'round1' && !r1.locked && step === 'tips' && (
        <section className={`mt-6 rounded-sm border px-5 py-4 ${tipsOpen ? 'border-torch bg-torch/10' : 'border-line bg-vault'}`}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="eyebrow">Insider Tips · ₹2 Cr · bought by agencies on My Agency</h2>
              {tipsOpen ? (
                <p className="mt-1 text-bone">
                  Window open · <WindowClock closesAt={r1.tipsClosesAt!} serverNow={r1.now} refreshOnClose className="text-2xl font-semibold text-torch" /> left
                  · <span className="num">{tipBuyers.length}</span> bought
                </p>
              ) : (
                <p className="mt-1 text-sm text-steel">
                  {r1.tipsClosesAt ? 'The window has closed. ' : ''}Opening it shows a {TIPS_WINDOW_SECONDS}-second countdown on the projector and a
                  Buy button on every agency’s My Agency page. The site picks one of the 6 drawn cards at random.
                </p>
              )}
            </div>
            {!tipsOpen && (
              <form action={openTipsWindow}>
                <button disabled={!r1.fundsStarted || drawn.length === 0} className="btn btn-primary">
                  {r1.tipsClosesAt ? 'Reopen' : 'Open'} the {TIPS_WINDOW_SECONDS}-second window
                </button>
              </form>
            )}
          </div>
          {(!r1.fundsStarted || drawn.length === 0) && !tipsOpen && (
            <p className="mt-2 text-xs text-ember">
              {!r1.fundsStarted ? 'Credit the starting funds first. ' : ''}
              {drawn.length === 0 ? 'Enter the Breaking News draw first (below).' : ''}
            </p>
          )}
          {tipBuyers.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-2 text-sm">
              {tipBuyers.map((a) => (
                <li
                  key={a.id}
                  className={`rounded-sm border px-2.5 py-1 ${isNew(a.tipAt) ? 'border-toxic bg-toxic/15 text-toxic' : 'border-line text-bone'}`}
                >
                  {isNew(a.tipAt) && <span className="mr-1.5 text-[0.65rem] font-bold tracking-[0.15em]">NEW</span>}
                  <span className="num font-semibold">{a.id}</span> {a.name}
                  {a.tipAt && <span className="num ml-1.5 text-xs text-steel">{istTime.format(new Date(a.tipAt))}</span>}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {r1.phase === 'round1' && canMoney && !r1.fundsStarted && (
        <form action={startFunds} className="panel mt-6 flex flex-wrap items-center justify-between gap-4 border-l-2 border-l-torch px-5 py-4">
          <p className="text-bone">Start of Round 1: credit the starting fund to every agency in the game.</p>
          <button className="btn btn-primary">Credit ₹50 Cr to {active.length} agencies</button>
        </form>
      )}

      {/* ---------------------------------------------------------------- lot + sale */}
      {r1.phase === 'round1' && !r1.locked && (
        <section className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="panel px-5 py-5">
            <div className="flex items-center justify-between">
              <h2 className="eyebrow">On the projector</h2>
              <span className="text-xs text-steel">{pool.length} unsold in this step</span>
            </div>
            {lot ? (
              <>
                <p className="mt-3 flex items-baseline gap-3">
                  <span className="num text-4xl font-semibold text-torch">{lot.id}</span>
                  <span className="text-sm text-steel">{lot.category}</span>
                  {r1.sold.has(lot.id) && <span className="stamp text-ember">Sold</span>}
                </p>
                <p className="font-display mt-1 text-2xl">{lot.gear_name}</p>
                <p className="num mt-1 text-steel">
                  Power <span className="text-bone">{lot.power}</span> · minimum <span className="text-bone">{formatCrore(lot.min_bid)}</span>
                </p>
                <p className="mt-3 text-sm text-steel">
                  Still needing {lot.category}:{' '}
                  <span className="num text-bone">
                    {needing(lot.category, active.map((a) => ({ id: a.id, held: Object.keys(a.held) }))).join(' ') || 'nobody'}
                  </span>
                </p>
              </>
            ) : (
              <p className="mt-3 text-steel">{sellable ? 'No lot on the projector.' : 'Lots show during the Marquee, Secret Identity Bids and Last Call steps.'}</p>
            )}
            {sellable && (
              <div className="mt-4 flex flex-wrap items-end gap-2">
                <form action={advanceLot}>
                  <button className="btn btn-primary">{lot ? 'Next lot (no sale) →' : 'Show first lot'}</button>
                </form>
                <form key={lot?.id ?? 'none'} action={showLot} className="flex items-end gap-2">
                  <select name="card" defaultValue={lot?.id ?? ''} className="rounded-sm border border-line-strong bg-vault-2 px-2 py-2 text-sm">
                    {pool.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.id} · {c.gear_name} · P{c.power} · min {c.min_bid}
                      </option>
                    ))}
                  </select>
                  <button className={`${small} btn-ghost`}>Show</button>
                </form>
              </div>
            )}
            {!lotsShuffled && (
              <form action={shuffleLots} className="mt-4">
                <button className={`${small} btn-ghost`}>Shuffle the lot order (once, before the first sale)</button>
              </form>
            )}
          </div>

          {canMoney && (
            // Remount whenever the lot changes or a sale lands, so the card picker can never show a stale lot.
            <form key={`${lot?.id ?? ''}|${sp.ok ?? ''}|${sp.error ?? ''}`} action={recordSale} className="panel space-y-3 px-5 py-5">
              <h2 className="eyebrow">Record a sale</h2>
              <label className="block text-sm">
                Card
                <select name="card" defaultValue={sp.card ?? lot?.id ?? ''} className={select} required>
                  <option value="">—</option>
                  {lotPool(r1.cards, r1.sold, step === 'marquee' || step === 'secret' ? step : 'last_call').map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.id} · {c.gear_name} ({c.category}) · min {c.min_bid}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                Winning agency
                <select name="agency" defaultValue={sp.agency ?? ''} className={select} required>
                  <option value="">—</option>
                  {active.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.id} · {a.name} · {formatCrore(a.fund)} left · needs {a.missing.join(', ') || 'nothing'}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                Price (₹ Cr, steps of 0.5)
                <input name="price" type="number" inputMode="decimal" step="0.5" min="0.5" defaultValue={sp.price ?? ''} className="field num !mt-1" required />
              </label>
              <button disabled={!sellable} className="btn btn-primary w-full">Record sale</button>
              <p className="text-xs text-steel">
                The site rejects a price below the minimum, above the agency&apos;s fund left, off the ₹0.5 Cr step, or in a category the agency already holds.
              </p>
            </form>
          )}
        </section>
      )}

      {/* ---------------------------------------------------------------- recent sales */}
      {r1.recent.length > 0 && (
        <section className="panel mt-6 px-5 py-5">
          <h2 className="eyebrow">Latest sales</h2>
          <ul className="mt-3 divide-y divide-line/60 text-sm">
            {r1.recent.map((s) => (
              <li key={s.sale_id} className="flex flex-wrap items-center gap-3 py-2">
                <span className="num w-12 font-semibold text-torch">{s.card_id}</span>
                <span className="min-w-40 flex-1">{s.gear_name}</span>
                <span className="num w-12">{s.agency_id}</span>
                <span className="num w-20 text-right">{formatCrore(s.price)}</span>
                <span className="w-20 text-xs text-steel">{s.phase}</span>
                {canMoney && !r1.locked && (
                  <form action={voidSale.bind(null, s.ledger_entry_id)} className="flex items-center gap-2">
                    <input name="reason" placeholder="Why void?" className="w-36 rounded-sm border border-line-strong bg-vault-2 px-2 py-1 text-xs" />
                    <button className={`${small} btn-ghost hover:!border-ember hover:!text-ember`}>Void</button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ---------------------------------------------------------------- tips + news */}
      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        {canMoney && r1.phase === 'round1' && !r1.locked && (
          <form action={buyTip} className="panel space-y-3 px-5 py-5">
            <h2 className="eyebrow">Insider Tips · record for an agency</h2>
            <p className="text-xs text-steel">
              Fallback only, e.g. an agency whose phone died: agencies normally buy on My Agency during the window.
            </p>
            <select name="agency" className={select} required>
              <option value="">Agency…</option>
              {active.filter((a) => !a.tipNews).map((a) => (
                <option key={a.id} value={a.id}>{a.id} · {a.name} · {formatCrore(a.fund)}</option>
              ))}
            </select>
            {r1.settings.round1.insiderTipAssignment === 'manual' && (
              <select name="news" className={select} required>
                <option value="">News card in the envelope…</option>
                {drawn.map((n) => <option key={n.id} value={n.id}>{n.id} · {n.headline}</option>)}
              </select>
            )}
            <button disabled={step !== 'tips'} className="btn btn-primary w-full">Sell tip</button>
            {step !== 'tips' && <p className="text-xs text-steel">Tips sell only in the Insider Tips step.</p>}
            {tipsSold && (
              <ul className="text-sm text-steel">
                {tipBuyers.map((a) => (
                  <li key={a.id}>
                    <span className="num text-bone">{a.id}</span> → card {a.tipNews}
                    <span className="ml-1.5 text-xs">{a.tipSelf ? '(on My Agency)' : '(recorded by organiser)'}</span>
                  </li>
                ))}
              </ul>
            )}
          </form>
        )}

        <div className="panel space-y-3 px-5 py-5">
          <h2 className="eyebrow">Breaking News</h2>
          {drawn.length === 0 || (!tipsSold && !drawn.some((n) => n.revealed_at) && canMoney && !r1.locked) ? (
            canMoney ? (
              <form action={setNewsDraw} className="space-y-2">
                <p className="text-sm text-steel">Enter the 6 drawn cards in their sealed order (before bidding), or draw at random.</p>
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <select key={i} name={`n${i}`} defaultValue={drawn[i - 1]?.id ?? ''} className="rounded-sm border border-line-strong bg-vault-2 px-2 py-2 text-sm">
                      <option value="">#{i}</option>
                      {r1.news.map((n) => <option key={n.id} value={n.id}>#{i} {n.id}</option>)}
                    </select>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button className="btn btn-primary">Save draw</button>
                  <button name="random" value="1" className="btn btn-ghost">Random draw</button>
                </div>
              </form>
            ) : (
              <p className="text-sm text-steel">A ledger keeper enters the draw.</p>
            )
          ) : null}
          {drawn.length > 0 && (
            <ol className="space-y-1 text-sm">
              {drawn.map((n) => (
                <li key={n.id} className={n.revealed_at ? 'text-bone' : 'text-steel'}>
                  <span className="num mr-2">#{n.draw_order} {n.id}</span>
                  {n.headline} <span className="num">({n.delta > 0 ? '+' : ''}{n.delta} to {n.affects_gear})</span>
                  {n.revealed_at && <span className="ml-2 text-xs text-toxic">live</span>}
                </li>
              ))}
            </ol>
          )}
          {r1.phase === 'round1' && !r1.locked && drawn.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <form action={revealNextNews}>
                <button disabled={step !== 'news'} className="btn btn-primary">Reveal next headline</button>
              </form>
              <form action={revealTeamUps}>
                <button disabled={step !== 'news' || r1.teamUps.every((t) => t.revealed_at)} className="btn btn-ghost">Reveal the 3 Team-Ups</button>
              </form>
            </div>
          )}
          {r1.phase === 'round1' && drawn.length > 0 && (
            <div className={`rounded-sm border px-4 py-3 ${r1.screen === 'news_recap' ? 'border-toxic bg-toxic/10' : 'border-line'}`}>
              {r1.screen === 'news_recap' ? (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-toxic">The projector shows every headline and Team-Up, with who holds each card.</p>
                  <form action={showNewsRecap.bind(null, false)}>
                    <button className="btn btn-ghost">Back to the normal view</button>
                  </form>
                </div>
              ) : (
                <>
                  <form action={showNewsRecap.bind(null, true)}>
                    <button disabled={!allNewsOut} className="btn btn-primary w-full">Show all news &amp; Team-Ups on the projector</button>
                  </form>
                  <p className="mt-2 text-xs text-steel">
                    {allNewsOut
                      ? 'One screen with all 6 headlines and the Team-Ups, and who holds each card, so every agency can check its Power Level.'
                      : 'Available once all 6 headlines and the Team-Ups are revealed (Breaking News step). Locking Round 1 reveals any left.'}
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ---------------------------------------------------------------- close round 1 */}
      {canMoney && r1.phase === 'round1' && !r1.locked && (step === 'last_call' || step === 'news' || step === 'ledger_check') && (
        <section className="panel mt-6 space-y-4 px-5 py-5">
          <h2 className="eyebrow">Close Round 1</h2>
          {pendingClose.length > 0 ? (
            <>
              <ul className="text-sm">
                {pendingClose.map((a) => (
                  <li key={a.id}>
                    <span className="num font-semibold text-torch">{a.id}</span> missing {a.missing.join(', ')} ·{' '}
                    {a.missing.length >= 2
                      ? <span className="text-ember">will be eliminated (2+ missing)</span>
                      : a.fund < 8
                        ? <span className="text-ember">will be eliminated (cannot pay ₹8 Cr)</span>
                        : <span className="text-toxic">gets the Jugaad Kit for ₹8 Cr</span>}
                  </li>
                ))}
              </ul>
              <form action={applyJugaad}>
                <button className="btn btn-primary">Apply Jugaad Kits &amp; eliminations</button>
              </form>
            </>
          ) : (
            <p className="text-sm text-toxic">Every agency in the game holds all four categories.</p>
          )}
          <form action={lockRound1} className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
            <label className="flex items-center gap-2 text-sm text-steel">
              <input type="checkbox" name="confirm" className="accent-torch" /> Ledger check done
            </label>
            <button disabled={pendingClose.length > 0} className="btn btn-primary">Lock Round 1</button>
            <span className="text-xs text-steel">Reveals any remaining headlines and the Team-Ups, then fixes Power Levels.</span>
          </form>
        </section>
      )}

      {/* ---------------------------------------------------------------- ledger check */}
      <h2 className="eyebrow mt-10">Ledger check</h2>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[56rem] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-line-strong text-steel">
              <th className="py-2 pr-3 font-medium">Agency</th>
              <th className="num py-2 pr-3 text-right font-medium">Fund left</th>
              {CATEGORIES.map((c) => <th key={c} className="py-2 pr-3 font-medium">{c}</th>)}
              <th className="num py-2 pr-3 text-right font-medium">Power</th>
              <th className="py-2 font-medium">Tip</th>
            </tr>
          </thead>
          <tbody>
            {r1.agencies.map((a) => (
              <tr key={a.id} className={`border-b border-line/60 ${a.status !== 'active' ? 'text-steel/60' : ''}`}>
                <td className="py-2 pr-3">
                  <span className="num font-semibold text-torch">{a.id}</span> {a.name}
                  {a.status === 'eliminated' && <span className="ml-2 text-xs text-ember">eliminated</span>}
                </td>
                <td className="num py-2 pr-3 text-right">{formatCrore(a.fund)}</td>
                {CATEGORIES.map((c) => (
                  <td key={c} className="py-2 pr-3">
                    {a.held[c] ? (
                      <span title={a.held[c]!.gear_name}>
                        <span className="num">{a.held[c]!.card_id}</span> <span className="text-xs text-steel">P{a.held[c]!.power}</span>
                      </span>
                    ) : (
                      <span className="text-ember/70">—</span>
                    )}
                  </td>
                ))}
                <td className="num py-2 pr-3 text-right">
                  {a.power.total}
                  {(a.power.teamUp !== 0 || a.power.news !== 0) && (
                    <span className="ml-1 text-xs text-steel">
                      ({a.power.gear}{a.power.teamUp ? ` +${a.power.teamUp}` : ''}{a.power.news ? ` ${a.power.news > 0 ? '+' : ''}${a.power.news}` : ''})
                    </span>
                  )}
                </td>
                <td className="py-2 text-xs text-steel">{a.tipNews ? '✓' : ''}</td>
              </tr>
            ))}
            {r1.agencies.length === 0 && (
              <tr><td colSpan={8} className="py-4 text-steel">No agencies in Round 1 yet (freeze the top 16 first).</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
