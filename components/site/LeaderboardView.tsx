'use client';

import { useEffect, useState } from 'react';
import { ROUNDS } from '@/lib/config';
import { formatCrore } from '@/lib/money';
import type { Leaderboard } from '@/lib/leaderboard';

const CHOICE: Record<string, string> = { swap: 'Swap', xray: 'X-Ray', cash: 'took ₹6 Cr', none: 'no winner' };
const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0$/, ''));

/** Public leaderboard, newest stage first. Polls every 5 s (spec: simple polling for /leaderboard). */
export function LeaderboardView({ initial }: { initial: Leaderboard | null }) {
  const [lb, setLb] = useState<Leaderboard | null>(initial);
  const [stale, setStale] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/leaderboard');
        if (!res.ok) throw new Error();
        setLb((await res.json()) as Leaderboard);
        setStale(false);
      } catch {
        setStale(true);
      }
    };
    const id = window.setInterval(load, 5000);
    return () => window.clearInterval(id);
  }, []);

  if (!lb) return <p className="text-steel">The board is offline. Try again in a moment.</p>;
  const nothing = !lb.prelim && !lb.round1 && !lb.round2 && !lb.round3 && !lb.zeroHour;

  return (
    <div className="space-y-10">
      {stale && <p className="text-xs font-semibold tracking-[0.16em] text-ember uppercase">Signal weak · showing the last update</p>}
      {nothing && (
        <div className="panel px-5 py-8 text-center">
          <p className="font-display text-2xl text-bone">The board lights up after the prelim.</p>
          <p className="mt-2 text-steel">Fifteen questions decide who reaches {ROUNDS.round1}.</p>
        </div>
      )}

      {lb.zeroHour && (
        <Block eyebrow="Zero Hour" title={lb.zeroHour.final ? 'Mahanagar has its hero' : 'Envelopes opening'}>
          {lb.zeroHour.final ? (
            <ol className="divide-y divide-line/60 border-y border-line/60">
              {lb.zeroHour.final.map((r) => (
                <Row key={r.id} rank={r.rank} id={r.id} name={r.name} right={fmt(r.hero)} strong={r.rank === 1} note={r.coinToss ? 'coin toss' : undefined} />
              ))}
            </ol>
          ) : (
            <>
              <ol className="divide-y divide-line/60 border-y border-line/60">
                {lb.zeroHour.opened.map((r) => (
                  <Row key={r.id} id={r.id} name={r.name} right={fmt(r.hero)} note={`${r.envelope} · ×${fmt(r.multiplier)} · ${r.outcome}`} />
                ))}
              </ol>
              <p className="mt-2 text-sm text-steel">{lb.zeroHour.sealed} envelope{lb.zeroHour.sealed === 1 ? '' : 's'} still sealed.</p>
            </>
          )}
        </Block>
      )}

      {lb.round3 && (
        <Block eyebrow={`Round 3 · ${ROUNDS.round3}`} title="Mission log">
          <ol className="divide-y divide-line/60 border-y border-line/60">
            {lb.round3.missions.map((m) => (
              <li key={m.no} className="flex flex-wrap items-baseline justify-between gap-2 py-2.5">
                <span><span className="text-steel">Mission {m.no}</span> · {m.name}</span>
                <span className="text-sm">
                  {m.choice === 'none' ? (
                    <span className="text-steel">No winner</span>
                  ) : m.winner ? (
                    <>
                      <span className="num font-semibold text-torch">{m.winner}</span> {m.winnerName}
                      {m.choice && <span className="text-steel"> · {CHOICE[m.choice]}{m.choice === 'swap' && m.swapTarget ? ` with ${m.swapTarget}` : ''}</span>}
                    </>
                  ) : (
                    <span className="text-steel">—</span>
                  )}
                </span>
              </li>
            ))}
          </ol>
        </Block>
      )}

      {lb.round2 && (
        <Block eyebrow={`Round 2 · ${ROUNDS.round2}`} title="Tower Scores">
          <ol className="divide-y divide-line/60 border-y border-line/60">
            {lb.round2.rows.map((r) => (
              <Row key={r.id} rank={r.rank} id={r.id} name={r.name} right={r.score.toFixed(2)} note={`A ${r.a} · S ${r.s} · D ${r.d}`} tag={r.qualified ? 'Top 8' : undefined} />
            ))}
          </ol>
          {lb.round2.bestPoster.length > 0 && (
            <p className="mt-3 text-sm text-steel">
              Best Launch Poster: <span className="text-bone">{lb.round2.bestPoster.map((b) => `${b.id} ${b.name}`).join(', ')}</span> ({lb.round2.bestPoster[0].votes} story votes)
            </p>
          )}
        </Block>
      )}

      {lb.round1 && (
        <Block eyebrow={`Round 1 · ${ROUNDS.round1}`} title={lb.round1.locked ? 'Power Levels (final)' : 'Power Levels'}>
          <ol className="divide-y divide-line/60 border-y border-line/60">
            {lb.round1.rows.map((r) => (
              <Row
                key={r.id}
                id={r.id}
                name={r.name}
                right={`P${r.power}`}
                note={[r.fund !== null ? `${formatCrore(r.fund)} left` : null, `${r.cards}/4 cards`].filter(Boolean).join(' · ')}
                tag={r.status === 'eliminated' ? `Out · ${r.eliminatedIn?.replace('round', 'Round ')}` : undefined}
                dim={r.status === 'eliminated'}
              />
            ))}
          </ol>
          {!lb.round1.showFunds && <p className="mt-2 text-xs text-steel">Funds stay classified until Round 1 locks.</p>}
        </Block>
      )}

      {lb.prelim && (
        <Block eyebrow={`Prelim · ${ROUNDS.prelim}`} title="Final board">
          <ol className="divide-y divide-line/60 border-y border-line/60">
            {lb.prelim.map((r) => (
              <Row key={r.id} rank={r.rank} id={r.id} name={r.name} right={r.points.toLocaleString('en-IN')} />
            ))}
          </ol>
        </Block>
      )}
    </div>
  );
}

function Block({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <section>
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="display mt-2 text-[clamp(2rem,6vw,3rem)]">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Row({ rank, id, name, right, note, tag, strong, dim }: {
  rank?: number; id: string; name: string; right: string; note?: string; tag?: string; strong?: boolean; dim?: boolean;
}) {
  return (
    <li className={`grid grid-cols-[2rem_3.4rem_1fr_auto] items-baseline gap-x-3 py-2.5 ${dim ? 'opacity-50' : ''}`}>
      <span className="num text-steel">{rank ?? ''}</span>
      <span className="num font-semibold text-torch">{id}</span>
      <span className="min-w-0">
        <span className={`block truncate ${strong ? 'font-display text-xl text-bone' : 'text-bone'}`}>{name}</span>
        {(note || tag) && (
          <span className="block truncate text-xs text-steel">
            {tag && <span className="mr-2 font-semibold tracking-[0.12em] text-toxic uppercase">{tag}</span>}
            {note}
          </span>
        )}
      </span>
      <span className={`num text-right font-semibold ${strong ? 'text-xl text-torch' : ''}`}>{right}</span>
    </li>
  );
}
