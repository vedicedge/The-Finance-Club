import type { Metadata } from 'next';
import Link from 'next/link';
import { hasRole, requireOrganiser } from '@/lib/auth/organiser';
import { formatCrore } from '@/lib/money';
import { loadRound3 } from '@/lib/round3/server';
import { AdminShell } from '@/components/admin/AdminShell';
import { NextPhase } from '@/components/admin/NextPhase';
import { AutoRefresh } from '@/components/admin/AutoRefresh';
import { canAccess } from '@/lib/auth/roles';
import { fine, saveDeal, saveEnvelopeMap, transfer } from './actions';

export const metadata: Metadata = { title: 'Doomsday Vault console' };

const sel = 'rounded-sm border border-line-strong bg-vault-2 px-2 py-2 text-sm';

export default async function Round3Console({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const organiser = await requireOrganiser('round3');
  const sp = await searchParams;
  const admin = organiser.roles.includes('admin');
  const r3 = await loadRound3({ withMultipliers: admin });
  const keeper = hasRole(organiser, 'ledger_keeper');
  const inVault = r3.phase === 'round3';
  const recordable = inVault || r3.phase === 'zero_hour';

  return (
    <AdminShell organiser={organiser}>
      <AutoRefresh ms={4000} />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Round 3 · runs offline</p>
          <h1 className="display mt-3 text-5xl">The Doomsday Vault</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {canAccess(organiser.roles, 'reveal') && <Link href="/admin/results" className="btn btn-ghost">Final leaderboard</Link>}
          <Link href="/projector" target="_blank" className="btn btn-ghost">Projector ↗</Link>
          {keeper && <Link href="/admin/ledger" className="btn btn-ghost">Fund Ledger</Link>}
        </div>
      </div>
      {sp.error && <p role="alert" className="mt-6 rounded-sm border border-ember/40 bg-ember/10 px-4 py-3 text-sm text-ember">Rejected: {sp.error}</p>}
      {sp.ok && <p role="status" className="mt-6 rounded-sm border border-toxic/40 bg-toxic/10 px-4 py-3 text-sm text-toxic">{sp.ok}</p>}
      <NextPhase organiser={organiser} to="round3" />
      <NextPhase organiser={organiser} to="zero_hour" />
      {!recordable && (
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
              <summary className="text-sm text-glow">Show / edit the map</summary>
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
          <h2 className="eyebrow">At the end · who holds which envelope</h2>
          <p className="text-sm text-steel">Record each finalist&apos;s envelope after the last mission. You can correct it until the results are calculated.</p>
          {r3.finalists.length === 0 ? (
            <p className="text-sm text-steel">No finalists yet.</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {r3.finalists.map((f) => (
                <label key={f.id} className="flex items-center justify-between gap-2 text-sm">
                  <span><span className="num font-semibold text-glow">{f.id}</span> {f.name}</span>
                  <select name={`deal_${f.id}`} defaultValue={f.envelope ?? ''} disabled={!keeper || !recordable} className={sel}>
                    <option value="">—</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => <option key={i} value={`E${i}`}>E{i}</option>)}
                  </select>
                </label>
              ))}
            </div>
          )}
          {keeper && recordable && <button className="btn btn-primary w-full">Save envelopes</button>}
        </form>
      </section>

      {/* ---------------------------------------------------------------- money during the round */}
      {keeper && (
        <section className="mt-6 grid gap-4 lg:grid-cols-2">
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
            <button disabled={!inVault} className="btn btn-primary sm:col-span-2">Record transfer</button>
          </form>
          <form action={fine} className="panel grid gap-2 px-5 py-5 sm:grid-cols-[1fr_auto]">
            <h2 className="eyebrow sm:col-span-2">Fine · −₹5 Cr</h2>
            <select name="agency" required className={sel}>
              <option value="">Agency…</option>
              {r3.finalists.map((f) => <option key={f.id} value={f.id}>{f.id} · {f.name}</option>)}
            </select>
            <button disabled={!inVault && r3.phase !== 'zero_hour'} className="btn btn-ghost hover:!border-ember hover:!text-ember">Fine</button>
            <input name="note" placeholder="Opened another agency's Mission File" className={`${sel} sm:col-span-2`} />
          </form>
        </section>
      )}

      {/* ---------------------------------------------------------------- status */}
      <section className="mt-6">
        <div className="panel px-5 py-5">
          <h2 className="eyebrow">Finalists</h2>
          <table className="mt-3 w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line-strong text-steel">
                <th className="py-1.5 font-medium">Agency</th>
                <th className="py-1.5 font-medium">Envelope</th>
                <th className="num py-1.5 text-right font-medium">Power</th>
                <th className="num py-1.5 text-right font-medium">Fund</th>
              </tr>
            </thead>
            <tbody>
              {r3.finalists.map((f) => (
                <tr key={f.id} className="border-b border-line/60">
                  <td className="py-1.5"><span className="num font-semibold text-glow">{f.id}</span> {f.name}</td>
                  <td className="num py-1.5">{f.envelope ?? '—'}</td>
                  <td className="num py-1.5 text-right">{f.power}</td>
                  <td className="num py-1.5 text-right">{formatCrore(f.fund)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AdminShell>
  );
}
