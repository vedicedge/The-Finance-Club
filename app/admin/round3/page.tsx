import type { Metadata } from 'next';
import Link from 'next/link';
import { hasRole, requireOrganiser } from '@/lib/auth/organiser';
import { canAccess } from '@/lib/auth/roles';
import { formatCrore } from '@/lib/money';
import { loadRound3 } from '@/lib/round3/server';
import { R3_STEP_LABELS, envNo, r3Step, r3StepIndex } from '@/lib/round3/flow';
import { AdminShell } from '@/components/admin/AdminShell';
import { NextPhase } from '@/components/admin/NextPhase';
import { AutoRefresh } from '@/components/admin/AutoRefresh';
import { WindowClock } from '@/components/site/WindowClock';
import {
  fine, openForceFieldWindow, randomEnvelopeMap, recordMinigame, saveDeal, saveEnvelopeMap, setForceFieldUsed, transfer, undoMinigame,
} from './actions';

export const metadata: Metadata = { title: 'Doomsday Vault console' };

const sel = 'rounded-sm border border-line-strong bg-vault-2 px-2 py-2 text-sm';
const CHOICE: Record<string, string> = { swap: 'Swap', xray: 'X-Ray', cash: '₹5 Cr cash', none: 'No winner' };

/** Round 3, one screen at a time: map → Force Field window → envelopes → mini games 1–4 → results. */
export default async function Round3Console({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const organiser = await requireOrganiser('round3');
  const sp = await searchParams;
  const admin = organiser.roles.includes('admin');
  const r3 = await loadRound3({ withMultipliers: admin });
  const keeper = hasRole(organiser, 'ledger_keeper');
  const crew = hasRole(organiser, 'ledger_keeper', 'scorer');
  const inVault = r3.phase === 'round3';
  const now = Date.now();
  const ffCloses = r3.ffClosesAt ? Date.parse(r3.ffClosesAt) : null;
  const step = r3Step({ mapEntered: r3.multipliersEntered, ffClosesAt: ffCloses, now, dealt: r3.dealt, missions: r3.missions });
  const stepIdx = r3StepIndex(step);
  const envelopes = Array.from({ length: Math.max(8, r3.mapNeeded) }, (_, i) => `E${i + 1}`);
  const readyShields = r3.shields.filter((f) => !f.used).map((f) => f.agency);
  const decided = r3.missions.filter((m) => m.choice !== null);
  const lastDecided = decided.at(-1) ?? null;
  const outcomeOf = (env: string) => r3.multiplierMap?.get(env) ?? null;
  const multOf = (label: string | null) => r3.outcomes.find((o) => o.label === label)?.multiplier;

  return (
    <AdminShell organiser={organiser}>
      <AutoRefresh ms={step.key === 'ff-wait' ? 1000 : 5000} />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Round 3 · step by step</p>
          <h1 className="display mt-3 text-5xl">The Doomsday Vault</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {canAccess(organiser.roles, 'reveal') && <Link href="/admin/results" className="btn btn-ghost">Final leaderboard</Link>}
          <Link href="/projector" target="_blank" className="btn btn-ghost">Projector ↗</Link>
        </div>
      </div>
      {sp.error && <p role="alert" className="mt-6 rounded-sm border border-ember/40 bg-ember/10 px-4 py-3 text-sm text-ember">Rejected: {sp.error}</p>}
      {sp.ok && <p role="status" className="mt-6 rounded-sm border border-toxic/40 bg-toxic/10 px-4 py-3 text-sm text-toxic">{sp.ok}</p>}
      <NextPhase organiser={organiser} to="round3" />
      {!inVault && r3.phase !== 'zero_hour' && (
        <p className="mt-6 rounded-sm border border-glow/40 bg-glow/10 px-4 py-3 text-sm text-glow">
          The event is not in Round 3 yet. Publish Round 2, then start Round 3. The map can be shuffled any time.
        </p>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_15rem]">
        {/* ---------------------------------------------------------------- do this now */}
        <section data-step={step.key === 'minigame' ? `mg-${step.no}` : step.key} className="panel border-l-4 border-l-glow px-6 py-6">
          <p className="text-xs font-semibold tracking-[0.24em] text-glow uppercase">Do this now · step {stepIdx + 1} of {R3_STEP_LABELS.length}</p>

          {step.key === 'map' && (
            <>
              <h2 className="display mt-3 text-3xl">Shuffle the map</h2>
              <p className="mt-3 text-steel">
                The site decides what is inside each envelope: one each of ×3, ×2, ×0.5 and ×0.25, and the rest ×1 and ×1.5
                ({r3.mapNeeded} envelopes for {r3.mapNeeded} finalists). Only admins see it.
              </p>
              {admin ? (
                <>
                  <form action={randomEnvelopeMap} className="mt-5">
                    <button className="btn btn-primary !min-h-14 !px-6">Shuffle the map</button>
                  </form>
                  <details className="mt-5">
                    <summary className="text-sm text-glow">Or fill the map by hand</summary>
                    <MapForm envelopes={envelopes} r3={r3} />
                  </details>
                </>
              ) : (
                <p className="mt-4 text-sm text-ember">An admin shuffles the map.</p>
              )}
            </>
          )}

          {step.key === 'ff' && (
            <>
              <h2 className="display mt-3 text-3xl">Force Field (insurance)</h2>
              <p className="mt-3 text-steel">
                Fill and deal the envelopes, and let every team read its own. Then start the timer: for 60 seconds each finalist may
                buy <span className="text-bone">one</span> Force Field for ₹5 Cr on My Agency, privately. It blocks one swap during the round.
                The projector shows the countdown.
              </p>
              {admin && <MapTable envelopes={envelopes} outcomeOf={outcomeOf} multOf={multOf} />}
              {keeper && (
                <form action={openForceFieldWindow} className="mt-5">
                  <button disabled={!inVault} className="btn btn-primary !min-h-14 !px-6">Start the 60-second Force Field timer</button>
                </form>
              )}
              {admin && (
                <form action={randomEnvelopeMap} className="mt-3">
                  <button className="btn btn-ghost !min-h-0 !py-1.5 !text-xs">Shuffle the map again</button>
                </form>
              )}
            </>
          )}

          {step.key === 'ff-wait' && r3.ffClosesAt && (
            <>
              <h2 className="display mt-3 text-3xl">Force Field window is open</h2>
              <p className="mt-5 flex items-baseline gap-3 text-steel">
                Time left <WindowClock closesAt={r3.ffClosesAt} serverNow={new Date(now).toISOString()} refreshOnClose className="text-5xl font-semibold text-glow" />
              </p>
              <p className="mt-3 text-steel">
                <span className="num text-bone">{r3.shields.length}</span> bought so far. Teams buy on My Agency; only you can see who.
              </p>
            </>
          )}

          {step.key === 'deal' && (
            <>
              <h2 className="display mt-3 text-3xl">Who holds which envelope</h2>
              <p className="mt-3 text-steel">Before mini game 1: the envelope number each team was dealt. Every team a different one.</p>
              <DealForm r3={r3} envelopes={envelopes} disabled={!crew || !inVault} />
            </>
          )}

          {step.key === 'minigame' && (
            <>
              <h2 className="display mt-3 text-3xl">Mini game {step.no} result</h2>
              <p className="mt-3 text-steel">
                Who won, and what they decided. A swap moves the envelopes here at once; if the team they pick plays its Force Field,
                tick the box: the swap is blocked and the winner’s choice is used up.
              </p>
              {readyShields.length > 0 && (
                <p className="mt-3 rounded-sm border border-glow/40 bg-glow/10 px-3 py-2 text-sm text-glow">
                  Unused Force Fields (secret): <span className="num">{readyShields.join(', ')}</span>
                </p>
              )}
              <form action={recordMinigame.bind(null, step.no)} className="mt-5 space-y-4">
                <label className="block text-sm text-steel">
                  Winner of mini game {step.no}
                  <select name="winner" required defaultValue="" className={`${sel} mt-1 w-full`}>
                    <option value="" disabled>Pick the winning team…</option>
                    {r3.finalists.map((f) => <option key={f.id} value={f.id}>{f.id} · {f.name} · holds {envNo(f.envelope)}</option>)}
                    <option value="none">No correct sheet: no winner</option>
                  </select>
                </label>
                <fieldset className="space-y-3">
                  <legend className="text-sm text-steel">The winner’s decision</legend>
                  <div className="rounded-sm border border-line px-3 py-3">
                    <label className="flex items-center gap-2 text-bone"><input type="radio" name="choice" value="swap" defaultChecked className="size-4 accent-glow" /> Swap envelopes with</label>
                    <select name="swap_target" defaultValue="" className={`${sel} mt-2 w-full`}>
                      <option value="">Pick the team…</option>
                      {r3.finalists.map((f) => <option key={f.id} value={f.id}>{f.id} · {f.name} · holds {envNo(f.envelope)}</option>)}
                    </select>
                    <label className="mt-2 flex items-center gap-2 text-sm text-steel">
                      <input type="checkbox" name="ff_played" className="size-4 accent-glow" /> That team played its Force Field (the swap is blocked)
                    </label>
                  </div>
                  <div className="rounded-sm border border-line px-3 py-3">
                    <label className="flex items-center gap-2 text-bone"><input type="radio" name="choice" value="xray" className="size-4 accent-glow" /> X-Ray (look at one team’s envelope privately)</label>
                    <select name="xray_target" defaultValue="" className={`${sel} mt-2 w-full`}>
                      <option value="">Pick the team…</option>
                      {r3.finalists.map((f) => <option key={f.id} value={f.id}>{f.id} · {f.name}</option>)}
                    </select>
                  </div>
                  <label className="flex items-center gap-2 rounded-sm border border-line px-3 py-3 text-bone">
                    <input type="radio" name="choice" value="cash" className="size-4 accent-glow" /> Take ₹5 Cr cash
                  </label>
                </fieldset>
                <button disabled={!crew || !inVault} className="btn btn-primary !min-h-14 w-full">Save mini game {step.no}</button>
              </form>
            </>
          )}

          {step.key === 'done' && (
            <>
              <h2 className="display mt-3 text-3xl">Round 3 is complete</h2>
              <p className="mt-3 text-steel">All four mini games are recorded and every envelope is where it should be. Start Zero Hour, then announce the results on the Final leaderboard.</p>
              <NextPhase organiser={organiser} to="zero_hour" />
              {r3.phase === 'zero_hour' && <Link href="/admin/results" className="btn btn-primary mt-4">Final leaderboard →</Link>}
            </>
          )}
        </section>

        {/* ---------------------------------------------------------------- progress */}
        <ol className="space-y-1.5 text-sm">
          {R3_STEP_LABELS.map((label, i) => (
            <li key={label} className={`flex items-center gap-3 ${i === stepIdx ? 'font-semibold text-glow' : i < stepIdx ? 'text-steel/70' : 'text-steel'}`}>
              <span aria-hidden className="num w-5 text-center">{i < stepIdx ? '✓' : i === stepIdx ? '●' : '○'}</span>
              <span className={i < stepIdx ? 'line-through decoration-steel/40' : ''}>{label}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* ---------------------------------------------------------------- what happened so far */}
      {(decided.length > 0 || r3.dealt) && (
        <section className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="panel px-5 py-5">
            <h2 className="eyebrow">Mini games</h2>
            <ol className="mt-3 space-y-2 text-sm">
              {r3.missions.map((m) => (
                <li key={m.no} className="flex flex-wrap items-center gap-2">
                  <span className="w-24 text-steel">Mini game {m.no}</span>
                  {m.choice === null ? (
                    <span className="text-steel">—</span>
                  ) : m.choice === 'none' ? (
                    <span>No winner</span>
                  ) : (
                    <span>
                      <span className="num text-glow">{m.winner_agency_id}</span> · {CHOICE[m.choice]}
                      {m.choice === 'swap' && ` with ${m.swap_target}`}
                      {m.ff_blocked && <span className="text-ember"> · blocked by a Force Field</span>}
                      {m.choice === 'xray' && ` of ${r3.xrays.filter((x) => x.mission === m.no).at(-1)?.target_agency_id ?? '?'} (secret)`}
                    </span>
                  )}
                  {crew && lastDecided?.no === m.no && (
                    <form action={undoMinigame.bind(null, m.no)}>
                      <button className="btn btn-ghost !min-h-0 !px-2 !py-1 !text-xs">Undo</button>
                    </form>
                  )}
                </li>
              ))}
            </ol>
          </div>
          <div className="panel px-5 py-5">
            <h2 className="eyebrow">Envelopes now</h2>
            <table className="mt-3 w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line-strong text-steel">
                  <th className="py-1.5 font-medium">Team</th>
                  <th className="py-1.5 font-medium">Envelope</th>
                  <th className="num py-1.5 text-right font-medium">Fund</th>
                </tr>
              </thead>
              <tbody>
                {r3.finalists.map((f) => (
                  <tr key={f.id} className="border-b border-line/60">
                    <td className="py-1.5"><span className="num font-semibold text-glow">{f.id}</span> {f.name}</td>
                    <td className="num py-1.5">{envNo(f.envelope)}{admin && f.envelope && outcomeOf(f.envelope) ? <span className="text-steel"> · ×{multOf(outcomeOf(f.envelope))}</span> : null}</td>
                    <td className="num py-1.5 text-right">{formatCrore(f.fund)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ---------------------------------------------------------------- other tools */}
      <details className="panel mt-6 px-5 py-4">
        <summary className="cursor-pointer text-sm font-semibold text-glow">Other tools: Chai Pe Charcha, fines, Force Fields, envelopes, map</summary>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {keeper && (
            <form action={transfer} className="panel grid gap-2 px-5 py-5 sm:grid-cols-2">
              <h3 className="eyebrow sm:col-span-2">Chai Pe Charcha transfer</h3>
              <select name="from" required className={sel}>
                <option value="">Payer…</option>
                {r3.finalists.map((f) => <option key={f.id} value={f.id}>{f.id} · {formatCrore(f.fund)}</option>)}
              </select>
              <select name="to" required className={sel}>
                <option value="">Payee…</option>
                {r3.finalists.map((f) => <option key={f.id} value={f.id}>{f.id} · {f.name}</option>)}
              </select>
              <input name="amount" type="number" step="0.5" min="0.5" required placeholder="₹ Cr" className={`${sel} num`} />
              <input name="note" placeholder="What for (optional)" className={sel} />
              <button disabled={!inVault} className="btn btn-primary sm:col-span-2">Record transfer</button>
            </form>
          )}
          {keeper && (
            <form action={fine} className="panel grid gap-2 px-5 py-5 sm:grid-cols-[1fr_auto]">
              <h3 className="eyebrow sm:col-span-2">Fine · −₹5 Cr</h3>
              <select name="agency" required className={sel}>
                <option value="">Team…</option>
                {r3.finalists.map((f) => <option key={f.id} value={f.id}>{f.id} · {f.name}</option>)}
              </select>
              <button className="btn btn-ghost hover:!border-ember hover:!text-ember">Fine</button>
              <input name="note" placeholder="Opened another team's Mission File" className={`${sel} sm:col-span-2`} />
            </form>
          )}
          {keeper && (
            <div className="panel px-5 py-5">
              <h3 className="eyebrow">Force Fields bought · secret</h3>
              {r3.shields.length === 0 ? (
                <p className="mt-2 text-sm text-steel">None bought.</p>
              ) : (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {r3.shields.map((f) => (
                    <li key={f.agency}>
                      <form action={setForceFieldUsed.bind(null, f.agency, !f.used)} className="flex items-center gap-2 rounded-sm border border-line px-3 py-1.5 text-sm">
                        <span className="num font-semibold text-glow">{f.agency}</span>
                        <span className={f.used ? 'text-steel' : 'text-toxic'}>{f.used ? 'used' : 'ready'}</span>
                        <button className="btn btn-ghost !min-h-0 !px-2 !py-1 !text-xs">{f.used ? 'Undo' : 'Mark used'}</button>
                      </form>
                    </li>
                  ))}
                </ul>
              )}
              {inVault && step.key !== 'ff-wait' && (
                <form action={openForceFieldWindow} className="mt-3">
                  <button className="btn btn-ghost !min-h-0 !py-1.5 !text-xs">Open the 60-second window again</button>
                </form>
              )}
            </div>
          )}
          {r3.dealt && decided.length === 0 && (
            <div className="panel px-5 py-5">
              <h3 className="eyebrow">Correct the envelopes</h3>
              <DealForm r3={r3} envelopes={envelopes} disabled={!crew || !inVault} />
            </div>
          )}
          {admin && (
            <div className="panel px-5 py-5">
              <h3 className="eyebrow">Multiplier map · admin only · secret</h3>
              <MapTable envelopes={envelopes} outcomeOf={outcomeOf} multOf={multOf} />
              <form action={randomEnvelopeMap} className="mt-3">
                <button className="btn btn-ghost !min-h-0 !py-1.5 !text-xs">Shuffle the map again</button>
              </form>
              <details className="mt-3">
                <summary className="text-sm text-glow">Edit by hand</summary>
                <MapForm envelopes={envelopes} r3={r3} />
              </details>
            </div>
          )}
        </div>
      </details>
    </AdminShell>
  );
}

type R3 = Awaited<ReturnType<typeof loadRound3>>;

function DealForm({ r3, envelopes, disabled }: { r3: R3; envelopes: string[]; disabled: boolean }) {
  return (
    <form action={saveDeal} className="mt-4 space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        {r3.finalists.map((f) => (
          <label key={f.id} className="flex items-center justify-between gap-2 text-sm">
            <span><span className="num font-semibold text-glow">{f.id}</span> {f.name}</span>
            <select name={`deal_${f.id}`} required defaultValue={f.envelope ?? ''} disabled={disabled} className={sel}>
              <option value="">—</option>
              {envelopes.slice(0, Math.max(8, r3.finalists.length)).map((e) => <option key={e} value={e}>Envelope {envNo(e)}</option>)}
            </select>
          </label>
        ))}
      </div>
      <button disabled={disabled} className="btn btn-primary w-full">Save envelopes</button>
    </form>
  );
}

function MapTable({ envelopes, outcomeOf, multOf }: { envelopes: string[]; outcomeOf: (e: string) => string | null; multOf: (l: string | null) => number | undefined }) {
  const rows = envelopes.filter((e) => outcomeOf(e));
  if (rows.length === 0) return null;
  return (
    <details className="mt-4">
      <summary className="text-sm text-glow">Show the map (to fill the envelopes) · admin only</summary>
      <ul className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
        {rows.map((e) => (
          <li key={e}>
            <span className="num text-steel">Envelope {envNo(e)}</span> · <span className="num text-bone">×{multOf(outcomeOf(e))}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}

function MapForm({ envelopes, r3 }: { envelopes: string[]; r3: R3 }) {
  return (
    <form action={saveEnvelopeMap} className="mt-3 space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {envelopes.map((e) => (
          <label key={e} className="text-sm">
            <span className="num text-steel">Envelope {envNo(e)}</span>
            <select name={e} defaultValue={r3.multiplierMap?.get(e) ?? ''} className={`${sel} mt-1 w-full`}>
              <option value="">—</option>
              {r3.outcomes.map((o) => <option key={o.label} value={o.label}>×{Number(o.multiplier)} · {o.label}</option>)}
            </select>
          </label>
        ))}
      </div>
      <button className="btn btn-primary w-full">Save map</button>
    </form>
  );
}
