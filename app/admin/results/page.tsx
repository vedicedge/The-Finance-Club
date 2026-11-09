import type { Metadata } from 'next';
import Link from 'next/link';
import { requireOrganiser } from '@/lib/auth/organiser';
import { serviceDb } from '@/lib/db/server';
import { formatCrore } from '@/lib/money';
import { loadReveal } from '@/lib/zero-hour-server';
import { RESULT_BUTTON, placesAnnounced, podium, resultStage } from '@/lib/zero-hour';
import { AdminShell } from '@/components/admin/AdminShell';
import { AutoRefresh } from '@/components/admin/AutoRefresh';
import { NextPhase } from '@/components/admin/NextPhase';
import { announceNext, calculateResults, undoAnnounce } from './actions';

export const metadata: Metadata = { title: 'Final leaderboard' };

const PLACE = ['3rd', '2nd', '1st'];
const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2));

/** Zero Hour: calculate the results privately, then put 3rd, 2nd and 1st on the projector one at a time. */
export default async function Results({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const organiser = await requireOrganiser('reveal');
  const sp = await searchParams;
  const [rv, st] = await Promise.all([loadReveal(), serviceDb().from('event_state').select('phase, step').single()]);
  const phase = (st.data?.phase as string) ?? 'registration';
  const stage = resultStage(phase, st.data?.step as string | null);
  const announced = placesAnnounced(phase, st.data?.step as string | null);
  const final = rv.final;
  const onStage = new Set(podium(final, announced).map((r) => r.agencyId));
  const slotOf = new Map(rv.slots.map((s) => [s.agencyId, s]));
  const zh = phase === 'zero_hour';

  return (
    <AdminShell organiser={organiser}>
      <AutoRefresh ms={5000} />
      <p className="eyebrow">Zero Hour · the announcement</p>
      <h1 className="display mt-3 text-5xl">Final leaderboard</h1>
      {sp.error && <p role="alert" className="mt-6 rounded-sm border border-ember/40 bg-ember/10 px-4 py-3 text-sm text-ember">Rejected: {sp.error}</p>}
      {sp.ok && <p role="status" className="mt-6 rounded-sm border border-toxic/40 bg-toxic/10 px-4 py-3 text-sm text-toxic">{sp.ok}</p>}
      <NextPhase organiser={organiser} to="zero_hour" />

      {!zh && phase !== 'ended' && (
        <p className="mt-6 rounded-sm border border-glow/40 bg-glow/10 px-4 py-3 text-sm text-glow">
          Opens at Zero Hour. First record who holds which card on the{' '}
          <Link href="/admin/round3" className="underline underline-offset-4">Round 3 console</Link>.
        </p>
      )}

      <section className="panel mt-6 border-l-4 border-l-glow px-6 py-6">
        {!final ? (
          <>
            <h2 className="eyebrow">Step 1 · Calculate</h2>
            <p className="mt-2 text-sm text-steel">
              Uses the cards recorded on the Round 3 console and the multiplier map. Nothing appears on the projector or on
              participants’ phones. {rv.slots.length} finalists hold a card.
            </p>
            <form action={calculateResults} className="mt-4">
              <button disabled={!zh} className="btn btn-primary !min-h-14 !px-6">Calculate the results</button>
            </form>
          </>
        ) : (
          <>
            <h2 className="eyebrow">Step 2 · Announce, one place at a time</h2>
            <p className="mt-2 text-sm text-steel">
              {stage === 0 ? 'The projector shows the results cover.' : stage <= 3 ? `On the projector: ${PLACE.slice(0, announced).join(', then ')}.` : stage === 4 ? 'On the projector: the final leaderboard.' : 'On the projector: the Doomsday cover.'}{' '}
              Participants see no result until 1st place is announced.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              {stage < 5 && (
                <form action={announceNext}>
                  <button disabled={!zh} className="btn btn-primary !min-h-14 !px-6">{RESULT_BUTTON[stage]}</button>
                </form>
              )}
              {stage > 0 && zh && (
                <form action={undoAnnounce}>
                  <button className="btn btn-ghost">Undo: {RESULT_BUTTON[stage - 1]}</button>
                </form>
              )}
            </div>
            {stage === 5 && zh && <p className="mt-4 text-sm text-glow">The Doomsday cover is up. Switch the phase to Event over in the command centre when you are done.</p>}
          </>
        )}
      </section>

      {final && (
        <section className="panel mt-6 px-5 py-5">
          <h2 className="eyebrow">Full ranking · organisers only</h2>
          <table className="mt-3 w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line-strong text-steel">
                <th className="py-1.5 font-medium">Rank</th>
                <th className="py-1.5 font-medium">Agency</th>
                <th className="py-1.5 font-medium">Card</th>
                <th className="num py-1.5 text-right font-medium">Power</th>
                <th className="num py-1.5 text-right font-medium">Fund</th>
                <th className="num py-1.5 text-right font-medium">Hero Score</th>
              </tr>
            </thead>
            <tbody>
              {final.map((r) => {
                const s = slotOf.get(r.agencyId);
                return (
                  <tr key={r.agencyId} className={`border-b border-line/60 ${onStage.has(r.agencyId) ? 'text-glow' : ''}`}>
                    <td className="num py-1.5">{r.rank}{r.coinToss && <span className="ml-1 text-xs text-ember">coin toss</span>}</td>
                    <td className="py-1.5"><span className="num font-semibold text-glow">{r.agencyId}</span> {r.name}</td>
                    <td className="py-1.5 text-xs text-steel">{s ? `${s.envelope} · ×${s.revealed?.multiplier} · ${s.revealed?.outcome}` : '—'}</td>
                    <td className="num py-1.5 text-right">{r.power}</td>
                    <td className="num py-1.5 text-right">{formatCrore(r.fund)}</td>
                    <td className="num py-1.5 text-right font-semibold">{fmt(r.hero)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-steel">Hero Score = Power Level × multiplier + fund left ÷ 2. Ties use the order in Settings; a tie that survives it is a coin toss on stage.</p>
        </section>
      )}
    </AdminShell>
  );
}
