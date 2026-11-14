import type { Metadata } from 'next';
import Link from 'next/link';
import { requireOrganiser } from '@/lib/auth/organiser';
import { serviceDb } from '@/lib/db/server';
import { parseSettings } from '@/lib/settings';
import { PHASE_INFO, isPhase } from '@/lib/phases';
import { SEGMENTS } from '@/lib/scoring/quiz';
import { OPTION_LETTERS } from '@/lib/quiz/types';
import { loadAnswerCounts, loadAnswerKeys, loadBoard, loadQuestions, type QuestionRow } from '@/lib/quiz/server';
import { AdminShell } from '@/components/admin/AdminShell';
import { AutoRefresh } from '@/components/admin/AutoRefresh';
import { NextPhase } from '@/components/admin/NextPhase';
import {
  applySpare,
  freezeTop16,
  openQuestion,
  publishBoard,
  revealQuestion,
  saveTiebreak,
  setProjector,
  shuffleQuiz,
  unpublishBoard,
  voidQuestion,
} from './actions';

export const metadata: Metadata = { title: 'Quiz host console' };

const small = 'btn !min-h-0 !px-3 !py-1.5 !text-xs';

function liveStatus(q: QuestionRow, now: number) {
  if (q.status === 'void') return { label: 'Voided', tone: 'text-ember' };
  if (q.revealed_at) return { label: 'Revealed', tone: 'text-toxic' };
  if (!q.opened_at) return { label: 'Pending', tone: 'text-steel' };
  const start = Date.parse(q.opened_at);
  if (now < start) return { label: `Read-in ${Math.ceil((start - now) / 1000)} s`, tone: 'text-glow' };
  const left = Math.ceil((start + q.timer_s * 1000 - now) / 1000);
  if (left > 0) return { label: `Live · ${left} s left`, tone: 'text-glow' };
  return { label: 'Time up · reveal', tone: 'text-bone' };
}

export default async function QuizHostPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const organiser = await requireOrganiser('quiz');
  const { error } = await searchParams;
  const db = serviceDb();
  const [{ data: st }, questions, keys, counts, board, eligible] = await Promise.all([
    db.from('event_state').select('phase, step, current_question_id, prelim_published_at, prelim_frozen_at, settings').single(),
    loadQuestions(),
    loadAnswerKeys(),
    loadAnswerCounts(),
    loadBoard(),
    db.from('agencies').select('status'),
  ]);
  const now = Date.now();
  const phase = isPhase(st?.phase) ? st.phase : 'registration';
  const requiresCheckin = parseSettings(st?.settings).prelim.requiresCheckin;
  const eligibleCount = (eligible.data ?? []).filter((a) =>
    requiresCheckin ? a.status === 'checked_in' : a.status === 'registered' || a.status === 'checked_in',
  ).length;

  const byId = new Map(questions.map((q) => [q.id, q]));
  const slotted = questions.filter((q) => q.order_no !== null && q.segment !== 'sudden_death');
  const slots = Array.from({ length: 15 }, (_, i) => {
    const inSlot = slotted.filter((q) => q.order_no === i + 1);
    return { no: i + 1, active: inSlot.find((q) => q.status !== 'void') ?? null, voided: inSlot.filter((q) => q.status === 'void') };
  });
  const shuffled = slotted.length > 0;
  const started = questions.some((q) => q.opened_at && q.segment !== 'sudden_death');
  const current = st?.current_question_id ? byId.get(st.current_question_id) ?? null : null;
  const running = questions.some(
    (q) => q.status === 'open' && q.opened_at && now < Date.parse(q.opened_at) + q.timer_s * 1000,
  );
  const next = slots.find((s) => s.active?.status === 'pending')?.active ?? null;
  const spares = questions.filter((q) => q.segment !== 'sudden_death' && q.order_no === null && q.status === 'pending');
  const suddenDeathQs = questions.filter((q) => q.segment === 'sudden_death');
  const published = Boolean(st?.prelim_published_at);
  const frozen = Boolean(st?.prelim_frozen_at);
  const projector = st?.step === 'board' ? 'board' : st?.step === 'lobby' ? 'lobby' : 'question';
  const allRevealed = slots.every((s) => s.active?.revealed_at);
  // Played slots whose timer has ended but whose answer was never revealed (e.g. the host moved on).
  // They hold up both the next question and publishing until revealed (or voided).
  const toReveal = slots
    .map((s) => s.active)
    .filter(
      (q): q is QuestionRow =>
        q !== null && q.opened_at !== null && !q.revealed_at && now >= Date.parse(q.opened_at) + q.timer_s * 1000,
    );

  return (
    <AdminShell organiser={organiser}>
      <AutoRefresh ms={running || current?.status === 'open' ? 1000 : 4000} />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Prelim · Hero Ya Zero?</p>
          <h1 className="display mt-3 text-5xl">Quiz host console</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/projector" target="_blank" className="btn btn-ghost">
            Open projector ↗
          </Link>
          <a href="/admin/quiz/export" className="btn btn-ghost">
            Export CSV
          </a>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-6 rounded-sm border border-ember/40 bg-ember/10 px-4 py-3 text-sm text-ember">
          Signal interference: {error}
        </p>
      )}
      <NextPhase organiser={organiser} to="round1" />
      {phase !== 'prelim' && (
        <p className="mt-6 rounded-sm border border-glow/40 bg-glow/10 px-4 py-3 text-sm text-glow">
          The event is in <strong>{PHASE_INFO[phase].label}</strong>. Questions can only be opened in the Prelim phase; an
          admin switches it in the command centre.
        </p>
      )}

      {/* ---------------------------------------------------------------- run */}
      <section className="mt-8 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="panel px-5 py-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="eyebrow">Now showing</h2>
            <span className="num text-sm text-steel">
              {current ? `${counts.get(current.id)?.total ?? 0} / ${eligibleCount} locked in` : `${eligibleCount} agencies eligible`}
            </span>
          </div>
          {current ? (
            <>
              <p className={`mt-3 text-sm font-semibold ${liveStatus(current, now).tone}`}>
                {current.segment === 'sudden_death' ? 'Sudden death' : `Slot ${current.order_no}`} · {current.id} ·{' '}
                <span style={{ color: SEGMENTS[current.segment].color }}>{SEGMENTS[current.segment].label}</span> · {liveStatus(current, now).label}
              </p>
              <p className="font-serif mt-2 text-2xl text-bone">{current.prompt}</p>
              <ol className="mt-3 grid gap-1.5 sm:grid-cols-2">
                {current.options.map((o, i) => (
                  <li
                    key={i}
                    className={`rounded-sm border px-3 py-2 text-sm ${keys.get(current.id) === i ? 'border-toxic/60 text-toxic' : 'border-line text-bone'}`}
                  >
                    <span className="num mr-2 font-semibold">{OPTION_LETTERS[i]}</span>
                    {o}
                    {keys.get(current.id) === i && ' ✓'}
                    {current.revealed_at && <span className="num float-right text-steel">{counts.get(current.id)?.byOption[i] ?? 0}</span>}
                  </li>
                ))}
              </ol>
              <div className="mt-4 flex flex-wrap gap-2">
                {!current.revealed_at && current.status !== 'void' && (
                  <form action={revealQuestion.bind(null, current.id)}>
                    <button
                      disabled={!current.opened_at || now < Date.parse(current.opened_at) + current.timer_s * 1000}
                      className="btn btn-primary"
                    >
                      Reveal answer
                    </button>
                  </form>
                )}
                {current.segment !== 'sudden_death' && current.status !== 'void' && !published && (
                  <form action={voidQuestion.bind(null, current.id)} className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 text-xs text-steel">
                      <input type="checkbox" name="confirm" className="accent-ember" /> confirm
                    </label>
                    <button className="btn btn-ghost hover:!border-ember hover:!text-ember">Void</button>
                  </form>
                )}
              </div>
            </>
          ) : (
            <p className="mt-3 text-steel">Nothing opened yet. The projector shows the lobby.</p>
          )}
        </div>

        <div className="panel space-y-4 px-5 py-5">
          <h2 className="eyebrow">Controls</h2>
          {!shuffled ? (
            <form action={shuffleQuiz}>
              <button className="btn btn-primary w-full">Shuffle the live 15</button>
              <p className="mt-2 text-xs text-steel">Fixes one random order of the 15 live questions, the same for everyone.</p>
            </form>
          ) : toReveal.length > 0 ? (
            <div className="space-y-2">
              {toReveal.map((q) => (
                <form key={q.id} action={revealQuestion.bind(null, q.id)}>
                  <button className="btn btn-primary w-full !min-h-14">
                    Reveal answer · question {q.order_no} · {q.id}
                  </button>
                </form>
              ))}
              <p className="text-xs text-steel">
                {next ? `Reveal first, then open question ${next.order_no}.` : 'Reveal it, then publish the final board.'} Phones show
                right/wrong and points for a question only once it is revealed.
              </p>
            </div>
          ) : next ? (
            <form action={openQuestion.bind(null, next.id)}>
              <button disabled={running || phase !== 'prelim'} className="btn btn-primary w-full !min-h-14">
                Open question {next.order_no} · {next.id}
              </button>
              <p className="mt-2 text-xs text-steel">
                <span style={{ color: SEGMENTS[next.segment].color }}>{SEGMENTS[next.segment].label}</span> · {next.timer_s} s. Read-in, then the clock starts on every phone at once (the first question of a category gets a 5-second category intro first).
              </p>
            </form>
          ) : (
            <p className="text-sm text-toxic">All 15 slots have been played.</p>
          )}
          {shuffled && !started && (
            <form action={shuffleQuiz}>
              <button className={`${small} btn-ghost`}>Re-shuffle (allowed until question 1 opens)</button>
            </form>
          )}
          <div>
            <p className="text-sm text-steel">Projector</p>
            <div className="mt-2 flex gap-2">
              {(['lobby', 'question', 'board'] as const).map((m) => (
                <form key={m} action={setProjector.bind(null, m)}>
                  <button className={`${small} ${projector === m ? 'btn-primary' : 'btn-ghost'}`}>{m}</button>
                </form>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- the 15 slots */}
      <h2 className="eyebrow mt-10">The live 15</h2>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[44rem] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-line-strong text-steel">
              <th className="py-2 pr-3 font-medium">#</th>
              <th className="py-2 pr-3 font-medium">Question</th>
              <th className="py-2 pr-3 font-medium">Status</th>
              <th className="num py-2 pr-3 text-right font-medium">Answers</th>
              <th className="num py-2 pr-3 text-right font-medium">Correct</th>
              <th className="py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {slots.map((s) => {
              const q = s.active;
              const c = q ? counts.get(q.id) : undefined;
              const key = q ? keys.get(q.id) : undefined;
              const correct = c && key !== undefined ? c.byOption[key] : 0;
              const lastVoid = s.voided.at(-1);
              return (
                <tr key={s.no} className="border-b border-line/60 align-top">
                  <td className="num py-2 pr-3 text-steel">{s.no}</td>
                  <td className="py-2 pr-3">
                    {q ? (
                      <>
                        <span className="num font-semibold text-glow">{q.id}</span>{' '}
                        <span className="text-xs" style={{ color: SEGMENTS[q.segment].color }}>{SEGMENTS[q.segment].label}</span>
                        <span className="block max-w-md truncate text-bone/85">{q.prompt}</span>
                      </>
                    ) : (
                      <span className="text-steel">{shuffled ? '—' : 'Not shuffled yet'}</span>
                    )}
                    {s.voided.length > 0 && (
                      <span className="block text-xs text-ember">Voided: {s.voided.map((v) => v.id).join(', ')}</span>
                    )}
                    {!q && lastVoid && (
                      <form action={applySpare.bind(null, lastVoid.id)} className="mt-1 flex items-center gap-2">
                        <select name="spare" className="rounded-sm border border-line-strong bg-vault-2 px-2 py-1 text-xs">
                          {spares
                            .filter((sp) => sp.segment === lastVoid.segment)
                            .map((sp) => (
                              <option key={sp.id} value={sp.id}>
                                {sp.id}
                                {sp.side ? ` (${sp.side})` : ''} — {sp.prompt.slice(0, 50)}
                              </option>
                            ))}
                        </select>
                        <button className={`${small} btn-primary`}>Use spare</button>
                      </form>
                    )}
                  </td>
                  <td className={`py-2 pr-3 ${q ? liveStatus(q, now).tone : 'text-steel'}`}>{q ? liveStatus(q, now).label : ''}</td>
                  <td className="num py-2 pr-3 text-right">{c?.total ?? 0}</td>
                  <td className="num py-2 pr-3 text-right">{q?.revealed_at && c?.total ? `${Math.round((100 * correct) / c.total)}%` : ''}</td>
                  <td className="py-2 text-right">
                    {q?.status === 'pending' && shuffled && (
                      <form action={openQuestion.bind(null, q.id)}>
                        <button disabled={running || phase !== 'prelim' || toReveal.length > 0} className={`${small} btn-ghost`}>
                          Open
                        </button>
                      </form>
                    )}
                    {q && toReveal.includes(q) && (
                      <form action={revealQuestion.bind(null, q.id)}>
                        <button className={`${small} btn-primary`}>Reveal</button>
                      </form>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ---------------------------------------------------------------- board */}
      <section className="mt-10 grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <div className="panel px-5 py-5">
          <div className="flex items-center justify-between">
            <h2 className="eyebrow">{published ? 'Final board (published)' : 'Live board'}</h2>
            <span className="text-xs text-steel">Points ↓ then correct-answer time ↑</span>
          </div>
          <ol className="mt-3 text-sm">
            {board.rows.slice(0, 24).map((r) => (
              <li
                key={r.agencyId}
                className={`flex items-center gap-3 border-b border-line/60 py-1.5 ${r.position === 16 ? 'border-b-glow' : ''}`}
              >
                <span className="num w-7 text-steel">{r.rank}</span>
                <span className="num w-12 font-semibold text-glow">{r.agencyId}</span>
                <span className="min-w-0 flex-1 truncate">{r.name}</span>
                <span className="num w-16 text-right">{r.total.toLocaleString('en-IN')}</span>
                <span className="num w-14 text-right text-xs text-steel">{Number(r.correctTime).toFixed(1)} s</span>
                <span className={`w-5 text-right ${r.qualified ? 'text-toxic' : r.qualified === null ? 'text-ember' : 'text-steel/50'}`}>
                  {r.qualified ? '✓' : r.qualified === null ? '?' : ''}
                </span>
              </li>
            ))}
            {board.rows.length === 0 && <li className="py-3 text-steel">No agencies yet.</li>}
          </ol>
        </div>

        <div className="space-y-4">
          {board.cutoffGroup.length > 0 && (
            <form action={saveTiebreak} className="panel space-y-3 px-5 py-5">
              <h2 className="eyebrow text-ember">Sudden death · tie for 16th</h2>
              <p className="text-sm text-steel">
                Show a sudden-death question on the projector, then enter the finishing order (1 = best).
              </p>
              <div className="flex flex-wrap gap-2">
                {suddenDeathQs.map((q) => (
                  <div key={q.id} className="flex items-center gap-1">
                    {q.status === 'pending' ? (
                      <button formAction={openQuestion.bind(null, q.id)} disabled={running || phase !== 'prelim'} className={`${small} btn-ghost`}>
                        Show {q.id}
                      </button>
                    ) : !q.revealed_at ? (
                      <button formAction={revealQuestion.bind(null, q.id)} className={`${small} btn-ghost`}>
                        Reveal {q.id}
                      </button>
                    ) : (
                      <span className="text-xs text-steel">{q.id} done</span>
                    )}
                  </div>
                ))}
              </div>
              <input type="hidden" name="question" value={current?.segment === 'sudden_death' ? current.id : ''} />
              {board.cutoffGroup.map((id) => (
                <label key={id} className="flex items-center justify-between gap-3 text-sm">
                  <span>
                    <span className="num font-semibold text-glow">{id}</span> {board.names.get(id)}
                  </span>
                  <input
                    name={`rank_${id}`}
                    type="number"
                    min={1}
                    max={board.cutoffGroup.length}
                    defaultValue={board.rows.find((r) => r.agencyId === id)?.tiebreakRank ?? ''}
                    className="w-16 rounded-sm border border-line-strong bg-vault-2 px-2 py-1"
                  />
                </label>
              ))}
              <button className="btn btn-primary w-full">Save finishing order</button>
            </form>
          )}

          <div className="panel space-y-3 px-5 py-5">
            <h2 className="eyebrow">Publish &amp; freeze</h2>
            {!published ? (
              <>
                <form action={publishBoard}>
                  <button disabled={!allRevealed} className="btn btn-primary w-full">
                    Publish the final board
                  </button>
                  {!allRevealed && <p className="mt-2 text-xs text-steel">Unlocks when all 15 slots are revealed.</p>}
                </form>
                {toReveal.length > 0 && (
                  <div className="space-y-2 rounded-sm border border-glow/40 bg-glow/10 px-3 py-3 text-sm">
                    <p className="text-glow">Not revealed yet:</p>
                    {toReveal.map((q) => (
                      <form key={q.id} action={revealQuestion.bind(null, q.id)} className="flex items-center justify-between gap-3">
                        <span className="num">
                          Question {q.order_no} · {q.id}
                        </span>
                        <button className={`${small} btn-primary`}>Reveal</button>
                      </form>
                    ))}
                  </div>
                )}
              </>
            ) : frozen ? (
              <p className="text-sm text-toxic">Top 16 frozen. Phones now show “Qualified” or “Eliminated”.</p>
            ) : (
              <>
                <form action={freezeTop16} className="space-y-2">
                  <label className="flex items-center gap-2 text-sm text-steel">
                    <input type="checkbox" name="confirm" className="accent-glow" /> The board is final
                  </label>
                  <button disabled={board.qualifiers === null} className="btn btn-primary w-full">
                    Freeze the top 16 for Round 1
                  </button>
                  {board.qualifiers === null && <p className="text-xs text-ember">Settle the tie for 16th first.</p>}
                </form>
                <form action={unpublishBoard}>
                  <button className={`${small} btn-ghost`}>Unpublish</button>
                </form>
              </>
            )}
          </div>
        </div>
      </section>
    </AdminShell>
  );
}
