import type { Metadata } from 'next';
import { hasRole, requireOrganiser } from '@/lib/auth/organiser';
import { formatBuildTime } from '@/lib/round2/tower-board';
import { bestPoster, loadRound2 } from '@/lib/round2/server';
import { AdminShell } from '@/components/admin/AdminShell';
import { NextPhase } from '@/components/admin/NextPhase';
import { drawPairings, publishRound2, saveCutoff, saveTower, saveVotes } from './actions';

export const metadata: Metadata = { title: 'Operation: Skyline console' };

const small = 'btn !min-h-0 !px-3 !py-1.5 !text-xs';
const num = 'w-16 rounded-sm border border-line-strong bg-vault-2 px-2 py-1 text-sm num';

type Typed = { duel?: string; votes_a?: string; votes_b?: string; row?: string; correct?: string; reference?: string; build_time?: string; fallen?: string; frozen?: string };

export default async function Round2Console({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string } & Typed> }) {
  const organiser = await requireOrganiser('round2');
  const sp = await searchParams;
  const r2 = await loadRound2();
  const social = hasRole(organiser, 'social_lead');
  const scorer = hasRole(organiser, 'scorer');
  const live = r2.phase === 'round2' && !r2.published;
  const votesIn = r2.duels.some((d) => d.votes_a !== null);
  const best = bestPoster(r2.duels);
  const scoreOf = new Map(r2.board.rows.map((r) => [r.agencyId, r]));
  const name = (id: string | null) => (id ? `${id} ${r2.names.get(id) ?? ''}` : '');

  return (
    <AdminShell organiser={organiser}>
      <p className="eyebrow">Round 2 · 35 min</p>
      <h1 className="display mt-3 text-5xl">Operation: Skyline</h1>
      {sp.error && <p role="alert" className="mt-6 rounded-sm border border-ember/40 bg-ember/10 px-4 py-3 text-sm text-ember">Rejected: {sp.error}</p>}
      {sp.ok && <p role="status" className="mt-6 rounded-sm border border-toxic/40 bg-toxic/10 px-4 py-3 text-sm text-toxic">{sp.ok}</p>}
      <NextPhase organiser={organiser} to="round2" />
      <NextPhase organiser={organiser} to="round3" />
      {r2.phase !== 'round2' && !r2.published && (
        <p className="mt-6 rounded-sm border border-torch/40 bg-torch/10 px-4 py-3 text-sm text-torch">
          The event is not in Round 2. Lock Round 1 on the Power Bazaar console, then an admin starts Round 2 (the button
          appears here, or use the command centre).
        </p>
      )}
      {r2.published && (
        <p className="mt-6 rounded-sm border border-toxic/40 bg-toxic/10 px-4 py-3 text-sm text-toxic">Round 2 is published. Results are final.</p>
      )}

      {/* ---------------------------------------------------------------- Part A */}
      <section className="panel mt-8 px-5 py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="eyebrow">Part A · poster duels (Instagram story votes)</h2>
          {social && live && (
            <form action={drawPairings}>
              <button disabled={votesIn} className={`${small} ${r2.duels.length ? 'btn-ghost' : 'btn-primary'}`}>
                {r2.duels.length ? 'Redraw pairings' : 'Draw pairings'}
              </button>
            </form>
          )}
        </div>
        {r2.duels.length === 0 ? (
          <p className="mt-3 text-sm text-steel">No pairings yet. The social-media lead draws them after Round 1.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line/60">
            {r2.duels.map((d) => {
              // After a refused save, show what was typed rather than the stored values.
              const again = sp.error && sp.duel === String(d.id);
              const va = again ? sp.votes_a : d.votes_a ?? '';
              const vb = again ? sp.votes_b : d.votes_b ?? '';
              return (
                <li key={d.id} className="py-2.5">
                  <form action={saveVotes.bind(null, d.id)} className="flex flex-wrap items-center gap-3 text-sm">
                    <span className="min-w-48"><span className="num font-semibold text-torch">{d.agency_a}</span> {r2.names.get(d.agency_a)}</span>
                    <input name="votes_a" type="number" min={0} defaultValue={va} disabled={!social || !live} className={num} aria-label={`Votes for ${d.agency_a}`} />
                    {d.agency_b ? (
                      <>
                        <span className="text-steel">vs</span>
                        <input name="votes_b" type="number" min={0} defaultValue={vb} disabled={!social || !live} className={num} aria-label={`Votes for ${d.agency_b}`} />
                        <span className="min-w-48"><span className="num font-semibold text-torch">{d.agency_b}</span> {r2.names.get(d.agency_b)}</span>
                        {/* Always offered: a tie can only be saved together with its rock-paper-scissors winner. */}
                        <select name="tiebreak" defaultValue={d.tiebreak_winner ?? ''} disabled={!social || !live} aria-label="Rock-paper-scissors winner, if tied" className="rounded-sm border border-line-strong bg-vault-2 px-2 py-1">
                          <option value="">If tied: RPS winner…</option>
                          <option value={d.agency_a}>{d.agency_a}</option>
                          <option value={d.agency_b}>{d.agency_b}</option>
                        </select>
                      </>
                    ) : (
                      <span className="text-steel">bye (wins the duel)</span>
                    )}
                    {social && live && <button className={`${small} btn-ghost`}>Save</button>}
                    {d.winner && <span className="text-xs text-toxic">Winner {d.winner}</span>}
                  </form>
                </li>
              );
            })}
          </ul>
        )}
        {best.length > 0 && (
          <p className="mt-3 text-sm text-steel">
            Best Launch Poster so far: <span className="text-bone">{best.map((b) => name(b.id)).join(', ')}</span> ({best[0].votes} votes)
          </p>
        )}
      </section>

      {/* ---------------------------------------------------------------- Part B */}
      <section className="panel mt-6 px-5 py-5">
        <h2 className="eyebrow">Part B · tower results</h2>
        <p className="mt-2 text-xs text-steel">
          Build time as m:ss from the reference being hidden to the build declared final, or DNF (frozen at 10:00, Speed 0).
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[60rem] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-line-strong text-steel">
                <th className="py-2 pr-3 font-medium">Agency</th>
                <th className="py-2 pr-3 font-medium">Correct / reference</th>
                <th className="py-2 pr-3 font-medium">Build time</th>
                <th className="py-2 pr-3 font-medium">Fallen / frozen</th>
                <th className="py-2 pr-3 font-medium" />
                <th className="num py-2 pr-3 text-right font-medium">A · S · D</th>
                <th className="num py-2 text-right font-medium">Score</th>
              </tr>
            </thead>
            <tbody>
              {r2.field.map((a) => {
                const t = r2.raw.get(a.id);
                const retry = Boolean(sp.error && sp.row === a.id);
                const s = scoreOf.get(a.id);
                return (
                  <tr key={a.id} className="border-b border-line/60">
                    <td className="py-2 pr-3"><span className="num font-semibold text-torch">{a.id}</span> {a.name}</td>
                    <td colSpan={4} className="py-2 pr-3">
                      <form action={saveTower.bind(null, a.id)} className="flex flex-wrap items-center gap-2">
                        <input name="correct" defaultValue={retry ? sp.correct : t?.correct_blocks ?? ''} disabled={!scorer || !live} className={num} aria-label="Correct blocks" />
                        <span className="text-steel">/</span>
                        <input name="reference" defaultValue={retry ? sp.reference : t?.reference_blocks ?? ''} disabled={!scorer || !live} className={num} aria-label="Reference blocks" />
                        <input name="build_time" defaultValue={retry ? sp.build_time : t ? (t.build_time_s >= 600 ? 'DNF' : formatBuildTime(t.build_time_s)) : ''} placeholder="6:05" disabled={!scorer || !live} className={`${num} !w-20`} aria-label="Build time" />
                        <input name="fallen" defaultValue={retry ? sp.fallen : t?.blocks_fallen ?? ''} disabled={!scorer || !live} className={num} aria-label="Blocks fallen" />
                        <span className="text-steel">/</span>
                        <input name="frozen" defaultValue={retry ? sp.frozen : t?.frozen_blocks ?? ''} disabled={!scorer || !live} className={num} aria-label="Blocks in frozen build" />
                        {scorer && live && <button className={`${small} btn-ghost`}>Save</button>}
                      </form>
                    </td>
                    <td className="num py-2 pr-3 text-right text-steel">
                      {s ? `${s.accuracy.toFixed(1)} · ${s.speed.toFixed(1)} · ${s.destruction.toFixed(1)}` : '—'}
                    </td>
                    <td className="num py-2 text-right font-semibold">{s ? s.score.toFixed(2) : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ---------------------------------------------------------------- top 8 + publish */}
      <section className="mt-6 grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <div className="panel px-5 py-5">
          <h2 className="eyebrow">Top 8 → The Doomsday Vault</h2>
          <ol className="mt-3 text-sm">
            {r2.board.rows.map((r) => (
              <li key={r.agencyId} className={`flex items-center gap-3 border-b border-line/60 py-1.5 ${r.position === 8 ? 'border-b-torch' : ''}`}>
                <span className="num w-6 text-steel">{r.rank}</span>
                <span className="num w-12 font-semibold text-torch">{r.agencyId}</span>
                <span className="min-w-0 flex-1 truncate">{r.name}</span>
                <span className="num">{r.score.toFixed(2)}</span>
                <span className={`w-5 text-right ${r.qualified ? 'text-toxic' : r.qualified === null ? 'text-ember' : 'text-steel/40'}`}>
                  {r.qualified ? '✓' : r.qualified === null ? '?' : ''}
                </span>
              </li>
            ))}
            {r2.board.rows.length === 0 && <li className="py-2 text-steel">No tower results yet.</li>}
          </ol>
        </div>
        <div className="space-y-4">
          {r2.board.cutoffGroup.length > 0 && scorer && live && (
            <form action={saveCutoff} className="panel space-y-3 px-5 py-5">
              <h2 className="eyebrow text-ember">Tie at 8th place</h2>
              <p className="text-sm text-steel">Settle it by {/* open decision 8 */}the announced tie-break, then enter the order (1 = goes through first).</p>
              {r2.board.cutoffGroup.map((id) => (
                <label key={id} className="flex items-center justify-between text-sm">
                  <span><span className="num font-semibold text-torch">{id}</span> {r2.names.get(id)}</span>
                  <input name={`rank_${id}`} type="number" min={1} max={r2.board.cutoffGroup.length} defaultValue={r2.raw.get(id)?.cutoff_rank ?? ''} className={num} />
                </label>
              ))}
              <button className="btn btn-primary w-full">Save order</button>
            </form>
          )}
          {scorer && live && (
            <form action={publishRound2} className="panel space-y-3 px-5 py-5">
              <h2 className="eyebrow">Publish Round 2</h2>
              <p className="text-sm text-steel">
                Top 8 stay in the game; everyone else is eliminated in Round 2. +₹5 Cr goes to each duel winner or bye that made the top 8.
              </p>
              <label className="flex items-center gap-2 text-sm text-steel">
                <input type="checkbox" name="confirm" className="accent-torch" /> All towers and votes are final
              </label>
              <button disabled={!r2.board.qualifiers} className="btn btn-primary w-full">Publish results</button>
            </form>
          )}
        </div>
      </section>
    </AdminShell>
  );
}
