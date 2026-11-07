import type { Metadata } from 'next';
import Link from 'next/link';
import { hasRole, requireOrganiser } from '@/lib/auth/organiser';
import { formatCrore } from '@/lib/money';
import { MISSION_STEPS, loadRound3 } from '@/lib/round3/server';
import { AdminShell } from '@/components/admin/AdminShell';
import { NextPhase } from '@/components/admin/NextPhase';
import { AutoRefresh } from '@/components/admin/AutoRefresh';
import { buyForceField, fine, makeChoice, saveDeal, saveEnvelopeMap, setMissionStep, setWinner, transfer, undoChoice } from './actions';

export const metadata: Metadata = { title: 'Doomsday Vault console' };

const small = 'btn !min-h-0 !px-3 !py-1.5 !text-xs';
const sel = 'rounded-sm border border-line-strong bg-vault-2 px-2 py-2 text-sm';
const CHOICE_LABEL: Record<string, string> = { swap: 'Swap', xray: 'X-Ray', cash: 'Cash +₹6 Cr', none: 'No winner' };

export default async function Round3Console({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const organiser = await requireOrganiser('round3');
  const sp = await searchParams;
  const admin = organiser.roles.includes('admin');
  const r3 = await loadRound3({ withMultipliers: admin });
  const keeper = hasRole(organiser, 'ledger_keeper');
  const scorer = hasRole(organiser, 'scorer');
  // At Zero Hour the only thing left to do here is Mission 4's choice.
  const missionNo = r3.phase === 'zero_hour' ? 4 : r3.mission;
  const m = missionNo ? r3.missions.find((x) => x.no === missionNo) ?? null : null;
  const inVault = r3.phase === 'round3';
  const m4 = r3.missions.find((x) => x.no === 4)!;
  const name = (id: string | null) => (id ? `${id} ${r3.names.get(id) ?? ''}` : '—');
  const protectedNow = (id: string) => (m ? r3.finalists.find((f) => f.id === id)?.forceFields.includes(m.no) : false);

  return (
    <AdminShell organiser={organiser}>
      <AutoRefresh ms={4000} />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Round 3 · 31 min</p>
          <h1 className="display mt-3 text-5xl">The Doomsday Vault</h1>
        </div>
        <div className="flex gap-2">
          <Link href="/screen/reveal" target="_blank" className="btn btn-ghost">Reveal screen ↗</Link>
          {keeper && <Link href="/admin/ledger" className="btn btn-ghost">Fund Ledger</Link>}
        </div>
      </div>
      {sp.error && <p role="alert" className="mt-6 rounded-sm border border-ember/40 bg-ember/10 px-4 py-3 text-sm text-ember">Rejected: {sp.error}</p>}
      {sp.ok && <p role="status" className="mt-6 rounded-sm border border-toxic/40 bg-toxic/10 px-4 py-3 text-sm text-toxic">{sp.ok}</p>}
      <NextPhase organiser={organiser} to="round3" />
      <NextPhase organiser={organiser} to="zero_hour" />
      {!inVault && r3.phase !== 'zero_hour' && (
        <p className="mt-6 rounded-sm border border-glow/40 bg-glow/10 px-4 py-3 text-sm text-glow">
          The event is not in Round 3. Publish Round 2, then an admin switches the phase to Round 3. The multiplier map can be entered any time.
        </p>
      )}

      {/* ---------------------------------------------------------------- setup */}
      <section className="mt-8 grid gap-4 lg:grid-cols-2">
        {admin && (
          <form action={saveEnvelopeMap} className="panel space-y-3 px-5 py-5">
            <h2 className="eyebrow">Multiplier map · admin only · secret</h2>
            <p className="text-sm text-steel">
              {r3.multipliersEntered ? 'Entered ✓. Change it only if the envelopes were refilled.' : 'Enter what is inside each numbered envelope.'}
            </p>
            <details>
              <summary className="cursor-pointer text-sm text-glow">Show / edit the map</summary>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <label key={i} className="text-sm">
                    <span className="num text-steel">E{i}</span>
                    <select name={`E${i}`} defaultValue={r3.multiplierMap?.get(`E${i}`) ?? ''} className={`${sel} mt-1 w-full`}>
                      <option value="">—</option>
                      {r3.outcomes.map((o) => <option key={o.label} value={o.label}>×{Number(o.multiplier)} · {o.label}</option>)}
                    </select>
                  </label>
                ))}
              </div>
              <button className="btn btn-primary mt-3 w-full">Save map</button>
            </details>
          </form>
        )}

        <form action={saveDeal} className="panel space-y-3 px-5 py-5">
          <h2 className="eyebrow">The deal · who holds which envelope</h2>
          {r3.finalists.length === 0 ? (
            <p className="text-sm text-steel">No finalists yet.</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {r3.finalists.map((f) => (
                <label key={f.id} className="flex items-center justify-between gap-2 text-sm">
                  <span><span className="num font-semibold text-glow">{f.id}</span> {f.name}</span>
                  <select name={`deal_${f.id}`} defaultValue={f.envelope ?? ''} disabled={!keeper || !inVault} className={sel}>
                    <option value="">—</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => <option key={i} value={`E${i}`}>E{i}</option>)}
                  </select>
                </label>
              ))}
            </div>
          )}
          {keeper && inVault && <button className="btn btn-ghost w-full">Save deal</button>}
        </form>
      </section>

      {/* ---------------------------------------------------------------- mission control */}
      {inVault && (
        <section className="panel mt-6 px-5 py-5">
          <h2 className="eyebrow">Mission cycle</h2>
          <div className="mt-3 space-y-2">
            {[1, 2, 3, 4].map((no) => (
              <div key={no} className="flex flex-wrap items-center gap-2">
                <span className="w-24 text-sm text-steel">Mission {no}</span>
                {MISSION_STEPS.filter((s) => no < 4 || (s.id !== 'choice' && s.id !== 'chai')).map((s) => (
                  <form key={s.id} action={setMissionStep.bind(null, no, s.id)}>
                    <button className={`${small} ${r3.mission === no && r3.step === s.id ? 'btn-primary' : 'btn-ghost'}`}>{s.label}</button>
                  </form>
                ))}
                {no === 4 && <span className="text-xs text-steel">Choice at the start of Zero Hour</span>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ---------------------------------------------------------------- current mission */}
      {m && (inVault || r3.phase === 'zero_hour') && (
        <section className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="panel space-y-3 px-5 py-5">
            <h2 className="eyebrow">Mission {m.no} · {m.name}</h2>
            <p className="text-sm text-steel">Step: <span className="text-bone">{MISSION_STEPS.find((s) => s.id === r3.step)?.label ?? '—'}</span></p>
            <h3 className="text-sm text-bone">Force Fields (₹5 Cr)</h3>
            <div className="flex flex-wrap gap-2">
              {r3.finalists.map((f) => (
                <form key={f.id} action={buyForceField.bind(null, f.id)}>
                  <button
                    disabled={!keeper || r3.step !== 'force_field' || f.forceFields.includes(m.no)}
                    className={`${small} ${f.forceFields.includes(m.no) ? 'btn-primary' : 'btn-ghost'}`}
                    title={`${f.name} · ${formatCrore(f.fund)}`}
                  >
                    {f.id}{f.forceFields.includes(m.no) ? ' 🛡' : ''}
                  </button>
                </form>
              ))}
            </div>

            <h3 className="pt-2 text-sm text-bone">Winner (first fully correct sheet)</h3>
            <form action={setWinner.bind(null, m.no)} className="flex gap-2">
              <select name="winner" defaultValue={m.choice === 'none' ? 'none' : m.winner_agency_id ?? ''} disabled={!scorer} className={`${sel} flex-1`}>
                <option value="">—</option>
                {r3.finalists.map((f) => <option key={f.id} value={f.id}>{f.id} · {f.name}</option>)}
                <option value="none">No correct sheet: no winner</option>
              </select>
              {scorer && <button className="btn btn-ghost">Save</button>}
            </form>

            {m.winner_agency_id && (
              <>
                <h3 className="pt-2 text-sm text-bone">Winner&apos;s choice · {name(m.winner_agency_id)}</h3>
                {m.choice ? (
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-toxic">{CHOICE_LABEL[m.choice]}{m.choice === 'swap' ? ` with ${m.swap_target}` : ''}</span>
                    {m.choice === 'xray' && <span className="text-steel">target {r3.xrays.filter((x) => x.mission === m.no).at(-1)?.target_agency_id} (secret)</span>}
                    {keeper && <form action={undoChoice.bind(null, m.no)}><button className={`${small} btn-ghost`}>Undo</button></form>}
                  </div>
                ) : keeper ? (
                  <div className="space-y-2">
                    <form action={makeChoice.bind(null, m.no, 'swap')} className="flex gap-2">
                      <select name="target" className={`${sel} flex-1`}>
                        {r3.finalists.filter((f) => f.id !== m.winner_agency_id && !protectedNow(f.id)).map((f) => (
                          <option key={f.id} value={f.id}>{f.id} · {f.name}</option>
                        ))}
                      </select>
                      <button className="btn btn-ghost">Swap</button>
                    </form>
                    <form action={makeChoice.bind(null, m.no, 'xray')} className="flex gap-2">
                      <select name="target" className={`${sel} flex-1`}>
                        {r3.finalists.filter((f) => f.id !== m.winner_agency_id).map((f) => <option key={f.id} value={f.id}>{f.id} · {f.name}</option>)}
                      </select>
                      <button className="btn btn-ghost">X-Ray</button>
                    </form>
                    <form action={makeChoice.bind(null, m.no, 'cash')}>
                      <button className="btn btn-ghost w-full">Take ₹6 Cr</button>
                    </form>
                    <p className="text-xs text-steel">
                      {m.no < 4 ? 'Opens in the Winner’s choice step.' : 'Mission 4 chooses at the start of Zero Hour.'} Swap lists only agencies without a Force Field this mission.
                    </p>
                  </div>
                ) : null}
              </>
            )}
          </div>

          <div className="space-y-4">
            {keeper && (
              <form action={transfer} className="panel grid gap-2 px-5 py-5 sm:grid-cols-2">
                <h2 className="eyebrow sm:col-span-2">Chai Pe Charcha transfer</h2>
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
                <button disabled={r3.step !== 'chai' || (r3.mission ?? 0) > 3} className="btn btn-primary sm:col-span-2">Record transfer</button>
              </form>
            )}
            {keeper && (
              <form action={fine} className="panel grid gap-2 px-5 py-5 sm:grid-cols-[1fr_auto]">
                <h2 className="eyebrow sm:col-span-2">Fine · −₹5 Cr</h2>
                <select name="agency" required className={sel}>
                  <option value="">Agency…</option>
                  {r3.finalists.map((f) => <option key={f.id} value={f.id}>{f.id} · {f.name}</option>)}
                </select>
                <button className="btn btn-ghost hover:!border-ember hover:!text-ember">Fine</button>
                <input name="note" placeholder="Opened another agency's Mission File" className={`${sel} sm:col-span-2`} />
              </form>
            )}
          </div>
        </section>
      )}

      {/* ---------------------------------------------------------------- status */}
      <section className="mt-6 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="panel px-5 py-5">
          <h2 className="eyebrow">Finalists</h2>
          <table className="mt-3 w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line-strong text-steel">
                <th className="py-1.5 font-medium">Agency</th>
                <th className="py-1.5 font-medium">Envelope</th>
                <th className="num py-1.5 text-right font-medium">Power</th>
                <th className="num py-1.5 text-right font-medium">Fund</th>
                <th className="py-1.5 pl-3 font-medium">Force Fields</th>
              </tr>
            </thead>
            <tbody>
              {r3.finalists.map((f) => (
                <tr key={f.id} className="border-b border-line/60">
                  <td className="py-1.5"><span className="num font-semibold text-glow">{f.id}</span> {f.name}</td>
                  <td className="num py-1.5">{f.envelope ?? '—'}</td>
                  <td className="num py-1.5 text-right">{f.power}</td>
                  <td className="num py-1.5 text-right">{formatCrore(f.fund)}</td>
                  <td className="py-1.5 pl-3 text-xs text-steel">{f.forceFields.map((n) => `M${n}`).join(' ') || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="panel px-5 py-5">
          <h2 className="eyebrow">Mission log</h2>
          <ol className="mt-3 space-y-2 text-sm">
            {r3.missions.map((x) => (
              <li key={x.no}>
                <span className="text-steel">M{x.no} {x.name}:</span>{' '}
                {x.choice === 'none' ? 'no winner' : x.winner_agency_id ? (
                  <>
                    <span className="num text-glow">{x.winner_agency_id}</span>{' '}
                    {x.choice ? `→ ${CHOICE_LABEL[x.choice]}${x.choice === 'swap' ? ` with ${x.swap_target}` : ''}` : '(choosing)'}
                  </>
                ) : '—'}
              </li>
            ))}
          </ol>
          {m4.winner_agency_id && !m4.choice && (
            <p className="mt-3 text-xs text-glow">Mission 4&apos;s choice is made at the start of Zero Hour, before the first envelope opens.</p>
          )}
        </div>
      </section>
    </AdminShell>
  );
}
