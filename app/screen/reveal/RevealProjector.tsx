'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { EVENT, ROUNDS } from '@/lib/config';
import { formatCrore } from '@/lib/money';
import { Stage } from '@/components/screen/Stage';
import { BoardColumns, BoardHeader } from '@/components/screen/BoardColumns';
import type { RevealSlot } from '@/lib/zero-hour-server';
import type { HeroRow } from '@/lib/zero-hour';
import { nextReveal } from './actions';

type S = { phase: string; slots: RevealSlot[]; latest: string | null; final: HeroRow[] | null; mission4: { winner: string | null; pending: boolean } };

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0$/, ''));

export function RevealProjector({ canDrive, stateUrl = '/api/screen/reveal' }: { canDrive: boolean; stateUrl?: string }) {
  const [s, setS] = useState<S | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const load = useCallback(async () => {
    try {
      const res = await fetch(stateUrl, { cache: 'no-store' });
      if (res.status === 401) setError('Sign in at /admin/login on this laptop.');
      else setS((await res.json()) as S);
    } catch {
      setError('Signal lost. Reconnecting…');
    }
  }, [stateUrl]);

  useEffect(() => {
    load();
    const id = window.setInterval(load, 1500);
    return () => window.clearInterval(id);
  }, [load]);

  const next = useCallback(() => {
    if (!canDrive || pending) return;
    start(async () => {
      const r = await nextReveal();
      setError(r.ok ? null : r.error);
      await load();
    });
  }, [canDrive, pending, load]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'n') next();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next]);

  const latest = s?.slots.find((x) => x.envelope === s.latest) ?? null;
  return (
    <Stage>
      <div className="absolute inset-x-0 top-0 flex items-center justify-between border-b border-line px-[3cqw] py-[1.6cqh]">
        <p className="text-[1.25cqw] font-semibold tracking-[0.3em] text-steel uppercase">
          {EVENT.name} · <span className="text-ember">{ROUNDS.zeroHour}</span>
        </p>
        {s && <p className="num text-[1.25cqw] font-semibold tracking-[0.3em] text-steel uppercase">{s.slots.filter((x) => x.revealed).length} / {s.slots.length} opened</p>}
      </div>

      {!s ? (
        <div className="flex h-full items-center justify-center"><p className="display text-[4.4cqw]">{error ?? 'Establishing secure line…'}</p></div>
      ) : s.final ? (
        <Final rows={s.final} />
      ) : (
        <div className="grid h-full grid-cols-[1.5fr_1fr] gap-[3cqw] px-[4cqw] pt-[11cqh] pb-[6cqh]">
          <div className="relative flex flex-col justify-center">
            {latest?.revealed ? (
              <div key={latest.envelope} className="transmission relative">
                <div className="light-beam -z-10 opacity-90" aria-hidden="true" />
                <p className="text-[1.5cqw] font-semibold tracking-[0.3em] text-steel uppercase">
                  Mission File <span className="num text-glow">{latest.envelope}</span> · {latest.agencyId} {latest.name}
                </p>
                <h1 className="display mt-[2cqh] text-[4.9cqw] leading-[1.02]">{latest.revealed.outcome}</h1>
                <p className={`num mt-[1cqh] text-[7cqw] leading-none font-semibold ${latest.revealed.multiplier >= 1.5 ? 'text-toxic' : latest.revealed.multiplier < 1 ? 'text-ember' : 'text-bone'}`}>
                  ×{fmt(latest.revealed.multiplier)}
                </p>
                <p className="num mt-[4cqh] text-[2.4cqw] text-bone">
                  <span className="text-glow">{latest.power}</span> × {fmt(latest.revealed.multiplier)} + {formatCrore(latest.fund).replace(' Cr', '')} ÷ 2 ={' '}
                  <span className="text-[3.4cqw] font-semibold text-glow">{fmt(latest.revealed.hero)}</span>
                </p>
                <p className="mt-[1cqh] text-[1.3cqw] tracking-[0.2em] text-steel uppercase">Power Level × Battle Outcome + Fund left ÷ 2</p>
              </div>
            ) : (
              <>
                <h1 className="display metal text-[7cqw]">Zero Hour</h1>
                <p className="mt-[2cqh] text-[2.2cqw] text-steel">
                  {s.mission4.pending
                    ? `Mission 4's winner ${s.mission4.winner} makes the last call: Swap, X-Ray or ₹6 Cr.`
                    : 'Eight Mission Files. Opened in ascending Power Level. Highest Hero Score saves Mahanagar.'}
                </p>
              </>
            )}
          </div>
          <ol className="flex flex-col justify-center gap-[1cqh] border-l border-line pl-[3cqw]">
            {s.slots.map((x) => (
              <li
                key={x.envelope}
                className={`flex items-center gap-[1.2cqw] rounded-[0.3cqw] px-[1cqw] py-[1.1cqh] text-[1.8cqw] ${
                  x.envelope === s.latest ? 'bg-glow/15 ring-1 ring-glow' : x.revealed ? '' : 'opacity-45'
                }`}
              >
                <span className="num w-[3.6cqw] text-steel">{x.envelope}</span>
                <span className="num w-[4.4cqw] font-semibold text-glow">{x.agencyId}</span>
                <span className="min-w-0 flex-1 truncate">{x.name}</span>
                <span className="num w-[4cqw] text-right text-steel">P{x.power}</span>
                <span className="num w-[6cqw] text-right font-semibold">{x.revealed ? fmt(x.revealed.hero) : 'sealed'}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {canDrive && s && !s.final && (
        <div className="absolute right-[2cqw] bottom-[1.6cqh] flex items-center gap-[1cqw]">
          {error && <span className="text-[1.1cqw] text-ember">{error}</span>}
          <button onClick={next} disabled={pending} className="btn btn-primary !min-h-0 !px-[1.4cqw] !py-[0.8cqh] !text-[1cqw]">
            {pending ? 'Opening…' : 'Next envelope ▸'}
          </button>
        </div>
      )}
    </Stage>
  );
}

function Final({ rows }: { rows: HeroRow[] }) {
  // A tie that survives every tie-break is settled by a coin toss on stage: never name a
  // winner (or runner-up) on screen before it happens.
  const firsts = rows.filter((r) => r.rank === 1);
  const seconds = rows.filter((r) => r.rank === 2);
  const tossForFirst = firsts.length > 1;
  const tossForSecond = !tossForFirst && seconds.length > 1;
  const winner = firsts[0] ?? rows[0];
  const runner = seconds[0] ?? rows[1];
  const names = (rs: HeroRow[]) => rs.map((r) => `${r.agencyId} ${r.name}`).join(' and ');
  return (
    <div className="flex h-full flex-col px-[5cqw] pt-[10cqh] pb-[4cqh]">
      <div className="relative text-center">
        <div className="light-beam -z-10" aria-hidden="true" />
        <p className="text-[1.5cqw] font-semibold tracking-[0.35em] text-glow uppercase">{EVENT.winnerTitle}</p>
        {tossForFirst ? (
          <>
            <h1 className="display mt-[1.5cqh] text-[5.3cqw] leading-none">Coin toss on stage</h1>
            <p className="mt-[1.5cqh] text-[2.2cqw] text-bone">{names(firsts)}</p>
            <p className="num mt-[1cqh] text-[1.8cqw] text-steel">
              Hero Score <span className="font-semibold text-bone">{fmt(winner.hero)}</span> each, still level after the tie-breaks. The
              toss decides the title; the other is runner-up.
            </p>
          </>
        ) : (
          <>
            <h1 className="display metal glow-text mt-[1.5cqh] text-[6.2cqw] leading-none">{winner.name}</h1>
            <p className="num mt-[1cqh] text-[2.2cqw] text-steel">
              {winner.agencyId} · Hero Score <span className="font-semibold text-bone">{fmt(winner.hero)}</span>
            </p>
            {tossForSecond ? (
              <p className="mt-[2cqh] text-[1.8cqw] text-ember">
                Runner-up: coin toss on stage between {names(seconds)} · {fmt(seconds[0].hero)} each
              </p>
            ) : (
              runner && (
                <p className="mt-[2cqh] text-[1.8cqw] text-steel">
                  Runner-up: <span className="text-bone">{runner.agencyId} {runner.name}</span> · {fmt(runner.hero)}
                </p>
              )
            )}
          </>
        )}
      </div>
      <BoardColumns
        className="mt-auto !max-w-[70cqw] mx-auto"
        perColumn={4}
        rows={rows}
        header={
          <BoardHeader className="!text-[0.95cqw]">
            <span className="w-[3cqw]">#</span>
            <span className="w-[4.4cqw]">ID</span>
            <span className="flex-1">Agency</span>
            <span className="w-[8cqw] text-right">Hero Score</span>
          </BoardHeader>
        }
        renderRow={(r) => (
          <li key={r.agencyId} className="flex items-center gap-[1.2cqw] border-b border-line py-[1cqh] text-[1.7cqw]">
            <span className="num w-[3cqw] text-steel">{r.rank}</span>
            <span className="num w-[4.4cqw] font-semibold text-glow">{r.agencyId}</span>
            <span className="min-w-0 flex-1 truncate">{r.name}</span>
            <span className="num w-[8cqw] text-right font-semibold">{fmt(r.hero)}</span>
          </li>
        )}
      />
    </div>
  );
}
