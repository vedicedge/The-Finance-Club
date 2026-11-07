'use client';

import { useEffect, useState } from 'react';
import { EVENT, ROUNDS } from '@/lib/config';
import { formatCrore } from '@/lib/money';
import { Stage } from '@/components/screen/Stage';
import { BoardColumns, BoardHeader } from '@/components/screen/BoardColumns';
import type { Leaderboard } from '@/lib/leaderboard';

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0$/, ''));

/** The big board between rounds: shows the latest stage of the public leaderboard. */
export function BoardProjector() {
  const [lb, setLb] = useState<Leaderboard | null>(null);
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/leaderboard');
        if (res.ok) setLb((await res.json()) as Leaderboard);
      } catch {
        /* keep the last board */
      }
    };
    load();
    const id = window.setInterval(load, 5000);
    return () => window.clearInterval(id);
  }, []);

  let title: string = EVENT.name;
  // Column labels for the stage shown: [left, right], e.g. ['Rank', 'Points'].
  let labels: [string, string] = ['Rank', ''];
  let rows: { id: string; name: string; left?: string; right: string; dim?: boolean }[] = [];
  if (lb?.zeroHour?.final) {
    title = 'Final Hero Scores';
    labels = ['Rank', 'Hero Score'];
    rows = lb.zeroHour.final.map((r) => ({ id: r.id, name: r.name, left: String(r.rank), right: fmt(r.hero) }));
  } else if (lb?.round2 && ['round3', 'round2', 'zero_hour'].includes(lb.phase)) {
    title = `${ROUNDS.round2} · Tower Scores`;
    labels = ['Rank', 'Tower Score'];
    rows = lb.round2.rows.map((r) => ({ id: r.id, name: r.name, left: String(r.rank), right: r.score.toFixed(2), dim: !r.qualified }));
  } else if (lb?.round1) {
    title = `${ROUNDS.round1} · Power Levels`;
    const active = lb.round1.rows.filter((r) => r.status === 'active');
    labels = ['Power', active.some((r) => r.fund !== null) ? 'Fund left' : 'Cards'];
    rows = active.map((r) => ({
      id: r.id, name: r.name, left: String(r.power), right: r.fund !== null ? formatCrore(r.fund) : `${r.cards}/4`,
    }));
  } else if (lb?.prelim) {
    title = `${ROUNDS.prelim} · Final board`;
    labels = ['Rank', 'Points'];
    rows = lb.prelim.map((r) => ({ id: r.id, name: r.name, left: String(r.rank), right: r.points.toLocaleString('en-IN') }));
  }
  const shown = rows.slice(0, 16);

  return (
    <Stage>
      <div className="flex h-full flex-col px-[5cqw] pt-[7cqh] pb-[5cqh]">
        <p className="text-center text-[1.3cqw] font-semibold tracking-[0.3em] text-steel uppercase">{EVENT.name} · Leaderboard</p>
        <h1 className="display mt-[1.5cqh] text-center text-[4.4cqw]">{title}</h1>
        {shown.length === 0 ? (
          <p className="mt-[20cqh] text-center text-[2.4cqw] text-steel">The board lights up after the prelim.</p>
        ) : (
          <BoardColumns
            className="mt-[4cqh]"
            rows={shown}
            header={
              <BoardHeader>
                <span className="w-[5cqw]">{labels[0]}</span>
                <span className="w-[5cqw]">ID</span>
                <span className="flex-1">Agency</span>
                <span className="w-[10cqw] text-right">{labels[1]}</span>
              </BoardHeader>
            }
            renderRow={(r) => (
              <li key={r.id} className={`flex items-center gap-[1.4cqw] border-b border-line py-[1.3cqh] text-[2cqw] ${r.dim ? 'opacity-45' : ''}`}>
                <span className="num w-[5cqw] text-steel">{r.left}</span>
                <span className="num w-[5cqw] font-semibold text-glow">{r.id}</span>
                <span className="min-w-0 flex-1 truncate">{r.name}</span>
                <span className="num w-[10cqw] text-right font-semibold">{r.right}</span>
              </li>
            )}
          />
        )}
      </div>
    </Stage>
  );
}
