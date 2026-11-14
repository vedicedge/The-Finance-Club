'use client';

import { pollFetch } from '@/lib/poll';
import Image from 'next/image';
import { TitleLockup } from '@/components/art/Poster';
import { useEffect, useRef, useState } from 'react';
import { EVENT, ROUNDS } from '@/lib/config';
import { SEGMENTS, type QuizSegment } from '@/lib/scoring/quiz';
import { OPTION_LETTERS, secondsLeft, secondsToStart } from '@/lib/quiz/types';
import { Stage } from '@/components/screen/Stage';
import { BoardColumns, BoardHeader } from '@/components/screen/BoardColumns';

type ScreenState = {
  now: string;
  phase: string;
  mode: 'lobby' | 'question' | 'board';
  published: boolean;
  frozen: boolean;
  standingBy: number;
  eligibleCount: number;
  lockedCount: number;
  question: null | {
    id: string;
    segment: QuizSegment;
    number: number | null;
    prompt: string;
    options: string[];
    timer_s: number;
    weight: number;
    status: string;
    opened_at: string;
    revealed: boolean;
    correct_index: number | null;
    distribution: number[] | null;
    intro_until?: string | null;
    reveal_line?: string | null;
  };
  board: null | {
    rows: { id: string; name: string; total: number; rank: number; position: number; qualified: boolean | null }[];
    suddenDeath: string[];
  };
};

export function QuizProjector({ stateUrl = '/api/screen/quiz' }: { stateUrl?: string }) {
  const [s, setS] = useState<ScreenState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [, setTick] = useState(0);
  const best = useRef(Infinity);

  useEffect(() => {
    let stop = false;
    let t: number;
    const loop = async () => {
      const t0 = Date.now();
      try {
        const res = await pollFetch(stateUrl);
        const t1 = Date.now();
        if (res.status === 401) setError('Sign in at /admin/login on this laptop to drive the projector.');
        else {
          const data = (await res.json()) as ScreenState;
          if (data.now && t1 - t0 <= best.current + 50) {
            best.current = Math.min(best.current, t1 - t0);
            setOffset(Date.parse(data.now) - (t0 + (t1 - t0) / 2));
          }
          setS(data);
          setError(null);
        }
      } catch {
        setError('Signal lost. Reconnecting…');
      }
      if (!stop) t = window.setTimeout(loop, 1000);
    };
    loop();
    const tick = window.setInterval(() => setTick((x) => x + 1), 200);
    return () => {
      stop = true;
      window.clearTimeout(t);
      window.clearInterval(tick);
    };
  }, [stateUrl]);

  return (
    <Stage art="prelim">
      <TopBar s={s} />
      {!s ? (
        <Center title={error ?? 'Establishing secure line…'} />
      ) : s.mode === 'board' && s.board ? (
        <BoardView s={s} />
      ) : s.mode === 'question' && s.question ? (
        <QuestionView s={s} offset={offset} />
      ) : (
        <Lobby s={s} />
      )}
      {error && s && (
        <p className="absolute right-[2cqw] bottom-[1.5cqh] text-[1.2cqw] font-semibold tracking-[0.2em] text-ember uppercase">{error}</p>
      )}
    </Stage>
  );
}

function TopBar({ s }: { s: ScreenState | null }) {
  return (
    <div className="absolute inset-x-0 top-0 flex items-center justify-between border-b border-line px-[3cqw] py-[1.6cqh]">
      <p className="text-[1.25cqw] font-semibold tracking-[0.3em] text-steel uppercase">
        {EVENT.name} · Prelim · <span className="text-glow">{ROUNDS.prelim}</span>
      </p>
      {s?.question?.number && s.mode === 'question' && (
        <p className="num text-[1.4cqw] font-semibold tracking-[0.2em] text-steel uppercase">
          Question <span className="text-bone">{s.question.number}</span> / 15
        </p>
      )}
    </div>
  );
}

function Center({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-[6cqw] text-center">
      <p className="display text-[4.4cqw]">{title}</p>
      {children}
    </div>
  );
}

function Lobby({ s }: { s: ScreenState }) {
  const host = typeof window === 'undefined' ? '' : window.location.host;
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <TitleLockup sizes="40vw" className="w-[34cqw]" />
      <p className="mt-[3cqh] text-[1.4cqw] font-semibold tracking-[0.35em] text-glow uppercase">Incoming transmission</p>
      <h1 className="display metal mt-[1.5cqh] text-[8.8cqw]">{ROUNDS.prelim}</h1>
      <p className="mt-[3cqh] text-[2.4cqw] text-bone">
        Captains: sign in at <span className="num font-semibold text-glow">{host}/login</span>
      </p>
      <p className="mt-[1.5cqh] text-[1.7cqw] text-steel">
        15 questions · answer on one phone · faster correct answers score more
      </p>
      <p className="num mt-[6cqh] text-[6cqw] leading-none font-semibold text-toxic">{s.standingBy}</p>
      <p className="mt-[1cqh] text-[1.3cqw] font-semibold tracking-[0.3em] text-steel uppercase">agencies standing by</p>
    </div>
  );
}

function QuestionView({ s, offset }: { s: ScreenState; offset: number }) {
  const q = s.question!;
  const toStart = secondsToStart(q.opened_at, offset);
  const left = secondsLeft(q.opened_at, q.timer_s, offset);
  const seg = SEGMENTS[q.segment];
  const total = Math.max(1, s.eligibleCount);

  if (q.status === 'void') return <Center title="Question voided."><p className="mt-[2cqh] text-[2cqw] text-steel">Stand by for a replacement.</p></Center>;
  // The first question of a category opens with a few seconds of category intro.
  if (q.intro_until && Date.now() + offset < Date.parse(q.intro_until)) return <CategoryIntro q={q} />;

  return (
    <div className="relative grid h-full grid-cols-[1fr_22cqw] gap-[3cqw] px-[4cqw] pt-[11cqh] pb-[5cqh]">
      <CategoryTint color={seg.color} />
      <div className="relative flex min-w-0 flex-col">
        <CategoryBanner q={q} />
        <h1 className={`font-serif mt-[2.5cqh] leading-[1.15] text-bone ${q.prompt.length <= 40 ? 'text-[5.2cqw]' : 'text-[3.4cqw]'}`}>{q.prompt}</h1>
        {q.revealed && q.reveal_line && (
          <p className="mt-[2cqh] text-[2cqw] leading-snug text-toxic">✓ {q.reveal_line}</p>
        )}
        <ol className={`mt-auto grid gap-[1.4cqw] ${q.options.length === 2 ? 'grid-cols-2' : 'grid-cols-2'}`}>
          {q.options.map((opt, i) => {
            const correct = q.revealed && q.correct_index === i;
            const dim = q.revealed && !correct;
            const count = q.distribution?.[i] ?? 0;
            const share = q.distribution ? count / Math.max(1, q.distribution.reduce((a, b) => a + b, 0)) : 0;
            return (
              <li
                key={i}
                className={`relative flex items-center gap-[1.4cqw] overflow-hidden rounded-[0.3cqw] border px-[1.6cqw] py-[2.2cqh] ${
                  correct ? 'border-toxic bg-toxic/15' : 'bg-vault/90'
                } ${dim ? 'opacity-45' : ''}`}
                style={correct ? undefined : { borderColor: `${seg.color}66` }}
              >
                {q.distribution && (
                  <span
                    aria-hidden="true"
                    className={`absolute inset-y-0 left-0 ${correct ? 'bg-toxic/20' : 'bg-steel/10'}`}
                    style={{ width: `${share * 100}%` }}
                  />
                )}
                <span className="num relative flex size-[3.4cqw] flex-none items-center justify-center rounded-[0.3cqw] border border-current text-[1.8cqw] font-semibold">
                  {OPTION_LETTERS[i]}
                </span>
                <span className="relative flex-1 text-[2.3cqw] leading-tight">{opt}</span>
                {q.distribution && <span className="num relative text-[1.8cqw] text-steel">{count}</span>}
              </li>
            );
          })}
        </ol>
      </div>

      <aside className="relative flex flex-col items-center justify-center border-l border-line pl-[3cqw] text-center">
        {q.revealed ? (
          <>
            <p className="text-[1.3cqw] font-semibold tracking-[0.3em] text-steel uppercase">Answer</p>
            <p className="num mt-[1cqh] text-[11cqw] leading-none font-semibold text-toxic">
              {q.correct_index !== null ? OPTION_LETTERS[q.correct_index] : '–'}
            </p>
          </>
        ) : toStart > 0 ? (
          <>
            <p className="text-[1.3cqw] font-semibold tracking-[0.3em] text-steel uppercase">Read · clock starts in</p>
            <p className="num mt-[1cqh] text-[13cqw] leading-none font-semibold text-glow">{Math.ceil(toStart)}</p>
          </>
        ) : left > 0 ? (
          <>
            <p className="text-[1.3cqw] font-semibold tracking-[0.3em] text-steel uppercase">Seconds</p>
            <p className={`num mt-[1cqh] text-[13cqw] leading-none font-semibold ${left <= 3 ? 'text-ember' : 'text-bone'}`}>
              {Math.ceil(left)}
            </p>
            <div className="mt-[3cqh] h-[1.2cqh] w-full overflow-hidden rounded-full bg-vault-2">
              <div
                className={`h-full origin-left ${left <= 3 ? 'bg-ember' : ''}`}
                style={{ transform: `scaleX(${Math.max(0, left / q.timer_s)})`, transition: 'transform 200ms linear', ...(left <= 3 ? {} : { background: seg.color }) }}
              />
            </div>
          </>
        ) : (
          <p className="display text-[3.9cqw] text-ember">Time&apos;s up</p>
        )}
        {q.segment !== 'sudden_death' && (
          <p className="num mt-[6cqh] text-[1.6cqw] text-steel">
            <span className="text-[3.2cqw] font-semibold text-bone">{s.lockedCount}</span> / {total}
            <span className="mt-[0.6cqh] block text-[1.1cqw] font-semibold tracking-[0.3em] uppercase">locked in</span>
          </p>
        )}
      </aside>
    </div>
  );
}

type Q = NonNullable<ScreenState['question']>;

/** A soft wash of the category's colour over the projector, and a stripe along the top. */
function CategoryTint({ color }: { color: string }) {
  return (
    <>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(90% 70% at 30% 0%, ${color}2e, transparent 70%)` }} />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-[8.5cqh] h-[0.6cqh]" style={{ background: color }} />
    </>
  );
}

/** The category, big and in its colour, with the one-line instruction. */
function CategoryBanner({ q }: { q: Q }) {
  const seg = SEGMENTS[q.segment];
  const sudden = q.segment === 'sudden_death';
  return (
    <div>
      <p className="text-[1.15cqw] font-semibold tracking-[0.3em] text-steel uppercase">
        {sudden ? 'Tie for 16th place' : `Category ${seg.order} of 4`} · {q.timer_s} s{q.weight > 1 ? ` · ×${q.weight} points` : ''}
      </p>
      <p className="display mt-[0.6cqh] flex items-center gap-[1.2cqw] text-[3.4cqw] leading-none" style={{ color: seg.color }}>
        <span aria-hidden="true" className="inline-block size-[2.2cqw] flex-none rounded-[0.3cqw]" style={{ background: seg.color }} />
        {seg.label}
      </p>
      <p className="mt-[1.2cqh] text-[1.7cqw] text-bone/85">{seg.instruction}</p>
    </div>
  );
}

/** The first question of a category: the whole screen announces the new category. */
function CategoryIntro({ q }: { q: Q }) {
  const seg = SEGMENTS[q.segment];
  return (
    <div className="relative flex h-full flex-col items-center justify-center px-[8cqw] text-center">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(70% 60% at 50% 50%, ${seg.color}40, transparent 75%)` }} />
      <p className="relative text-[1.8cqw] font-semibold tracking-[0.35em] text-bone uppercase">
        {q.segment === 'sudden_death' ? 'Sudden death' : `New category · ${seg.order} of 4`}
      </p>
      <h1 className="display relative mt-[2cqh] text-[7cqw] leading-none" style={{ color: seg.color }}>{seg.label}</h1>
      <p className="relative mt-[4cqh] max-w-[70cqw] text-[2.6cqw] leading-snug text-bone">{seg.instruction}</p>
      <p className="num relative mt-[4cqh] text-[1.8cqw] text-steel">
        {q.timer_s} seconds per question{q.weight > 1 ? ` · ×${q.weight} points` : ''} · question {q.number ?? ''} of 15 coming up
      </p>
    </div>
  );
}

function BoardView({ s }: { s: ScreenState }) {
  const rows = s.board!.rows.slice(0, 16);
  return (
    <div className="flex h-full flex-col px-[5cqw] pt-[10cqh] pb-[4cqh]">
      <h1 className="display text-center text-[4.4cqw]">{s.published ? 'Final board' : 'Live board'}</h1>
      <p className="mt-[0.5cqh] text-center text-[1.4cqw] font-semibold tracking-[0.3em] text-steel uppercase">
        Top 16 → {ROUNDS.round1}
      </p>
      {s.board!.suddenDeath.length > 0 && (
        <p className="mt-[1.5cqh] text-center text-[1.8cqw] text-ember">
          Tie for 16th: {s.board!.suddenDeath.join(', ')} — sudden death on stage.
        </p>
      )}
      <BoardColumns
        className="mt-[3cqh]"
        rows={rows}
        header={
          <BoardHeader>
            <span className="w-[3.4cqw]">#</span>
            <span className="w-[5cqw]">ID</span>
            <span className="flex-1">Agency</span>
            <span className="w-[9cqw] text-right">Points</span>
          </BoardHeader>
        }
        renderRow={(r) => (
          <li key={r.id} className="flex items-center gap-[1.4cqw] border-b border-line py-[1.25cqh] text-[2cqw]">
            <span className="num w-[3.4cqw] text-steel">{r.rank}</span>
            <span className="num w-[5cqw] font-semibold text-glow">{r.id}</span>
            <span className="min-w-0 flex-1 truncate">{r.name}</span>
            <span className="num w-[9cqw] text-right font-semibold">{r.total.toLocaleString('en-IN')}</span>
          </li>
        )}
      />
    </div>
  );
}
