'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { SEGMENTS } from '@/lib/scoring/quiz';
import { OPTION_LETTERS, secondsLeft, secondsToStart, type PhoneState } from '@/lib/quiz/types';

type Signed = Extract<PhoneState, { signed_in: true }>;
type Q = Extract<NonNullable<Signed['question']>, { id: string }>;

const POLL_LIVE_MS = 1000;
const POLL_IDLE_MS = 2000;

/** The phone quiz screen: waiting → read-in → question → locked → result → final board. */
export function PlayScreen({ stateUrl = '/api/quiz/state' }: { stateUrl?: string }) {
  const [state, setState] = useState<PhoneState | null>(null);
  const [offset, setOffset] = useState(0); // server clock − phone clock, ms
  const [failures, setFailures] = useState(0);
  const [tick, setTick] = useState(0);
  const [pending, setPending] = useState<{ question: string; option: number } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const bestRtt = useRef(Infinity);
  const timer = useRef<number | null>(null);

  const poll = useCallback(async () => {
    const t0 = Date.now();
    try {
      const res = await fetch(stateUrl, { cache: 'no-store' });
      const t1 = Date.now();
      const data = (await res.json()) as PhoneState;
      if ('now' in data && data.now) {
        // Keep the clock offset from the fastest round trip seen: it is the most accurate.
        const rtt = t1 - t0;
        if (rtt <= bestRtt.current + 50) {
          bestRtt.current = Math.min(bestRtt.current, rtt);
          setOffset(Date.parse(data.now) - (t0 + rtt / 2));
        }
      }
      setState(data);
      setFailures(0);
      return data;
    } catch {
      setFailures((f) => f + 1);
      return null;
    }
  }, [stateUrl]);

  // Polling loop: faster while a question is live.
  useEffect(() => {
    let stopped = false;
    const loop = async () => {
      const data = await poll();
      if (stopped) return;
      const q = data && data.signed_in ? data.question : null;
      const live = q && 'id' in q && !q.revealed && q.status === 'open';
      timer.current = window.setTimeout(loop, live ? POLL_LIVE_MS : POLL_IDLE_MS);
    };
    loop();
    return () => {
      stopped = true;
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [poll]);

  // Redraw the countdown smoothly between polls.
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 200);
    return () => window.clearInterval(id);
  }, []);

  const answer = async (q: Q, option: number) => {
    if (pending) return;
    setPending({ question: q.id, option });
    setNotice(null);
    try {
      const res = await fetch('/api/quiz/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q.id, option }),
      });
      const body = (await res.json()) as { status?: string; error?: string };
      if (body.status === 'late') setNotice('Too late: the timer had run out. This answer scores 0.');
      if (body.error && body.error !== 'already_answered') {
        setPending(null);
        setNotice(
          {
            not_yet: 'Hold on — the clock has not started yet.',
            not_open: 'This question is closed.',
            not_checked_in: 'Your agency is not checked in. Go to the desk.',
            not_signed_in: 'Signed out. Sign in again.',
          }[body.error] ?? 'Signal interference. Tap again.',
        );
      }
    } catch {
      setPending(null);
      setNotice('Signal interference. Tap again.');
    }
    poll();
  };

  // Clear the local lock once the server has caught up or the question moved on.
  const current = state && state.signed_in && state.question && 'id' in state.question ? state.question : null;
  useEffect(() => {
    if (pending && (!current || current.id !== pending.question || current.my_answer)) setPending(null);
  }, [current, pending]);

  void tick; // re-render driver for the countdown

  if (!state) return <Shell><Centered eyebrow="Secure line" title="Establishing secure line…" /></Shell>;
  if (!state.signed_in) {
    return (
      <Shell>
        <Centered eyebrow="Signed out" title="This phone is signed out." tone="ember">
          <p className="mt-3 text-steel">Your agency may have signed in on another phone. Only one phone can play.</p>
          <Link href="/login" className="btn btn-primary mt-6 w-full">Sign in again</Link>
        </Centered>
      </Shell>
    );
  }

  const s = state;
  return (
    <Shell agency={s.agency} points={s.totals.points} done={s.revealed_count} offline={failures >= 2} dryRun={s.dry_run}>
      <Body state={s} offset={offset} pending={pending} onAnswer={answer} />
      {notice && (
        <p role="status" className="mx-4 mb-4 rounded-sm border border-ember/40 bg-ember/10 px-4 py-3 text-sm text-ember">
          {notice}
        </p>
      )}
    </Shell>
  );
}

function Body({
  state: s,
  offset,
  pending,
  onAnswer,
}: {
  state: Signed;
  offset: number;
  pending: { question: string; option: number } | null;
  onAnswer: (q: Q, option: number) => void;
}) {
  // ---------------------------------------------------------------- after the prelim
  if (s.published || (s.phase !== 'prelim' && s.phase !== 'registration' && s.phase !== 'checkin')) {
    const qualified = s.agency.status === 'active';
    const out = s.agency.status === 'eliminated';
    return (
      <Centered eyebrow="Prelim · final board" title={s.rank ? `Rank #${s.rank}` : 'Prelim complete'}>
        <p className="num mt-2 text-xl text-bone">{s.totals.points.toLocaleString('en-IN')} points</p>
        {qualified && <p className="stamp mt-6 text-toxic">Qualified for Power Bazaar</p>}
        {out && <p className="stamp mt-6 text-ember">Eliminated · Prelim</p>}
        {!s.frozen && <p className="mt-6 text-steel">The quiz host is confirming the top 16. Stay tuned to the projector.</p>}
        {qualified && <p className="mt-6 text-steel">Report to your auction seat. Your ₹50 Cr is waiting.</p>}
        {out && <p className="mt-6 text-steel">Mahanagar thanks you. Stay for the takedowns and the reveal.</p>}
        <Link href="/me" className="btn btn-ghost mt-8 w-full">My Agency</Link>
      </Centered>
    );
  }

  if (s.phase !== 'prelim') {
    return (
      <Centered eyebrow="Standby" title="The prelim has not started.">
        <p className="mt-3 text-steel">Keep this screen open. Questions appear here the moment the host opens them.</p>
      </Centered>
    );
  }

  if (!s.eligible) {
    return (
      <Centered eyebrow="Access pending" title="Report to the check-in desk." tone="ember">
        <p className="mt-3 text-steel">All founders check in at the desk before your agency can answer.</p>
      </Centered>
    );
  }

  const q = s.question;
  if (!q) {
    return (
      <Centered eyebrow={`Question 1 of 15 incoming`} title="Stand by.">
        <p className="mt-3 text-steel">Eyes on the projector. Your options will appear here.</p>
      </Centered>
    );
  }
  if ('sudden_death' in q) {
    return <Centered eyebrow="Sudden death" title="Tie-break on stage." ><p className="mt-3 text-steel">Watch the projector.</p></Centered>;
  }
  if (q.status === 'void') {
    return (
      <Centered eyebrow={`Question ${q.number ?? ''}`} title="Question voided." tone="ember">
        <p className="mt-3 text-steel">The host voided this question. It scores nothing for anyone. Stand by for a replacement.</p>
      </Centered>
    );
  }

  const seg = SEGMENTS[q.segment];
  const toStart = secondsToStart(q.opened_at, offset);
  const left = secondsLeft(q.opened_at, q.timer_s, offset);
  const mine = q.my_answer?.option_index ?? (pending?.question === q.id ? pending.option : null);
  const answerable = !q.revealed && toStart <= 0 && left > 0 && mine === null;

  return (
    <div className="flex flex-1 flex-col px-4 pt-4 pb-6">
      <p className="eyebrow">
        Question {q.number} of 15 · {seg.label}
      </p>
      <p className="num mt-1 text-xs text-steel">
        {q.timer_s} s{q.weight > 1 ? ` · ×${q.weight} points` : ''}
      </p>
      <h1 className="font-serif mt-3 text-[1.65rem] leading-snug text-bone">{q.prompt}</h1>

      {/* Timer */}
      {!q.revealed && (
        <div className="mt-4" aria-live="off">
          {toStart > 0 ? (
            <p className="num text-center text-5xl font-semibold text-glow" aria-label={`Starts in ${Math.ceil(toStart)}`}>
              {Math.ceil(toStart)}
            </p>
          ) : (
            <Fuse left={left} total={q.timer_s} />
          )}
        </div>
      )}

      {/* Options */}
      <ul className="mt-5 grid gap-3">
        {q.options.map((opt, i) => {
          const chosen = mine === i;
          const correct = q.revealed && q.correct_index === i;
          const wrongPick = q.revealed && chosen && !correct;
          return (
            <li key={i}>
              <button
                type="button"
                disabled={!answerable}
                onClick={() => onAnswer(q, i)}
                className={[
                  'flex min-h-16 w-full items-center gap-4 rounded-[3px] border px-4 py-3 text-left text-lg transition-colors',
                  correct
                    ? 'border-toxic bg-toxic/15 text-bone'
                    : wrongPick
                      ? 'border-ember bg-ember/15 text-bone'
                      : chosen
                        ? 'border-glow bg-glow/15 text-bone'
                        : answerable
                          ? 'border-line-strong bg-vault-2 text-bone active:border-glow active:bg-glow/10'
                          : 'border-line bg-vault/60 text-bone/55',
                ].join(' ')}
              >
                <span className="font-display flex size-9 flex-none items-center justify-center rounded-sm border border-current text-base font-bold">
                  {OPTION_LETTERS[i]}
                </span>
                <span className="flex-1">{opt}</span>
                {chosen && !q.revealed && <span className="text-xs font-semibold tracking-[0.18em] text-glow uppercase">Locked</span>}
              </button>
            </li>
          );
        })}
      </ul>

      {/* Status line */}
      <div className="mt-6 text-center" role="status">
        {q.revealed ? (
          q.my_answer ? (
            q.my_answer.is_correct ? (
              <p className="stamp text-toxic">Correct · +{q.my_answer.points}</p>
            ) : (
              <p className="stamp text-ember">{q.my_answer.late ? 'Too late · 0' : 'Wrong · 0'}</p>
            )
          ) : (
            <p className="stamp text-ember">No answer · 0</p>
          )
        ) : mine !== null ? (
          <p className="text-steel">Answer locked. Waiting for the reveal…</p>
        ) : toStart > 0 ? (
          <p className="text-steel">Read the question. Options unlock at zero.</p>
        ) : left <= 0 ? (
          <p className="text-ember">Time&apos;s up. No answer locked.</p>
        ) : (
          <p className="text-steel">Tap once. Your answer locks on tap.</p>
        )}
      </div>
    </div>
  );
}

function Fuse({ left, total }: { left: number; total: number }) {
  const frac = Math.max(0, Math.min(1, left / total));
  const urgent = left <= 3 && left > 0;
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="eyebrow">Fuse</span>
        <span className={`num text-3xl font-semibold ${urgent ? 'text-ember' : 'text-bone'}`}>{Math.max(0, Math.ceil(left))}</span>
      </div>
      <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-vault-2" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={Math.max(0, Math.ceil(left))}>
        <div
          className={`h-full origin-left rounded-full ${urgent ? 'bg-ember motion-safe:animate-pulse' : 'bg-glow'}`}
          style={{ transform: `scaleX(${frac})`, transition: 'transform 200ms linear' }}
        />
      </div>
    </div>
  );
}

function Shell({
  children,
  agency,
  points,
  done,
  offline,
  dryRun,
}: {
  children: React.ReactNode;
  agency?: Signed['agency'];
  points?: number;
  done?: number;
  offline?: boolean;
  dryRun?: boolean;
}) {
  return (
    <main
      id="main"
      className="mx-auto flex min-h-dvh max-w-lg flex-col bg-[radial-gradient(120%_45%_at_50%_0%,rgb(169_207_110/0.13),transparent_70%)]"
    >
      {dryRun && (
        <p className="bg-glow px-4 py-1 text-center text-[0.65rem] font-bold tracking-[0.24em] text-abyss uppercase">Dry run · rehearsal</p>
      )}
      <header className="flex items-center justify-between gap-3 border-b border-line bg-abyss/80 px-4 py-3 backdrop-blur-md">
        <span className="min-w-0">
          <span className="num text-lg font-semibold text-glow">{agency?.id ?? '—'}</span>
          <span className="ml-2 truncate text-sm text-bone">{agency?.name}</span>
        </span>
        {agency && (
          <span className="num flex-none text-right text-sm text-steel">
            <span className="text-bone">{(points ?? 0).toLocaleString('en-IN')}</span> pts · {done}/15
          </span>
        )}
      </header>
      {offline && (
        <p role="alert" className="bg-ember/15 px-4 py-2 text-center text-xs font-semibold tracking-[0.14em] text-ember uppercase">
          Signal lost · reconnecting…
        </p>
      )}
      {children}
    </main>
  );
}

function Centered({
  eyebrow,
  title,
  tone,
  children,
}: {
  eyebrow: string;
  title: string;
  tone?: 'ember';
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
      {/* the eclipse from the poster: green while all is well, red when something needs attention */}
      <span aria-hidden="true" className="relative mb-9 block size-24">
        <span className={`absolute -inset-2 rounded-full blur-xl ${tone === 'ember' ? 'bg-ember/30' : 'bg-glow/30'}`} />
        <span
          className={`absolute inset-0 rounded-full border bg-abyss ${
            tone === 'ember' ? 'border-ember/80 shadow-[0_0_44px_rgb(229_87_74/0.55)]' : 'border-[#dcedbf]/80 shadow-[0_0_44px_rgb(169_207_110/0.55)]'
          }`}
        />
      </span>
      <p className={`eyebrow ${tone === 'ember' ? 'text-ember' : 'text-glow'}`}>{eyebrow}</p>
      <h1 className="display metal mt-4 text-[2.4rem]">{title}</h1>
      {children}
    </div>
  );
}
