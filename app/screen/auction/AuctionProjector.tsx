'use client';

import { useEffect, useState } from 'react';
import { EVENT, ROUNDS } from '@/lib/config';
import { formatCrore } from '@/lib/money';
import { Stage } from '@/components/screen/Stage';
import { BoardColumns, BoardHeader } from '@/components/screen/BoardColumns';
import { WindowClock } from '@/components/site/WindowClock';

type S = {
  phase: string;
  step: string | null;
  marqueeTotal: number;
  lot: null | {
    id: string; category: string; gear_name: string; power: number; min_bid: number; phase: string;
    lot_order: number | null; sold: boolean; needing: string[];
  };
  lastSale: null | { card: string; gear_name: string; agency: string; agencyName: string; price: number; at: string };
  news: { id: string; headline: string; affects: string; delta: number }[];
  teamUps: { name: string; bonus: number }[];
  board: { id: string; name: string; power: number; cards: number; fund: number | null }[];
  tips: null | { closesAt: string | null; now: string; sold: number };
  locked: boolean;
};

const STEP_LABEL: Record<string, string> = {
  rules: 'Rules', tips: 'Insider Tips', marquee: 'Marquee Auction', secret: 'Secret Identity Bids',
  last_call: 'Last Call', news: 'Breaking News', ledger_check: 'Ledger check', locked: 'Round 1 locked',
};

export function AuctionProjector({ stateUrl = '/api/screen/auction' }: { stateUrl?: string }) {
  const [s, setS] = useState<S | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stop = false;
    let t: number;
    const loop = async () => {
      try {
        const res = await fetch(stateUrl, { cache: 'no-store' });
        if (res.status === 401) setError('Sign in at /admin/login on this laptop to drive the projector.');
        else { setS((await res.json()) as S); setError(null); }
      } catch {
        setError('Signal lost. Reconnecting…');
      }
      if (!stop) t = window.setTimeout(loop, 1500);
    };
    loop();
    return () => { stop = true; window.clearTimeout(t); };
  }, [stateUrl]);

  const step = s?.step ?? null;
  return (
    <Stage>
      <div className="absolute inset-x-0 top-0 flex items-center justify-between border-b border-line px-[3cqw] py-[1.6cqh]">
        <p className="text-[1.25cqw] font-semibold tracking-[0.3em] text-steel uppercase">
          {EVENT.name} · Round 1 · <span className="text-torch">{ROUNDS.round1}</span>
        </p>
        {step && <p className="text-[1.25cqw] font-semibold tracking-[0.3em] text-steel uppercase">{STEP_LABEL[step] ?? step}</p>}
      </div>

      {!s ? (
        <Center title={error ?? 'Establishing secure line…'} />
      ) : step === 'marquee' || step === 'secret' || step === 'last_call' ? (
        <LotView s={s} />
      ) : step === 'news' ? (
        <NewsView s={s} />
      ) : step === 'ledger_check' || step === 'locked' ? (
        <BoardView s={s} />
      ) : step === 'tips' ? (
        <TipsView s={s} />
      ) : (
        <Center title={ROUNDS.round1}>
          <ul className="mt-[4cqh] space-y-[1.2cqh] text-[2cqw] text-bone">
            <li>₹50 Cr each · sign one HQ, one Suit, one Gadget, one Sidekick</li>
            <li>Bids in ₹0.5 Cr steps · never more than your fund left</li>
            <li>Missing one category after Last Call: the Jugaad Kit, ₹8 Cr</li>
            <li className="text-steel">Fund left counts half in the Hero Score</li>
          </ul>
        </Center>
      )}
      {error && s && <p className="absolute right-[2cqw] bottom-[1.5cqh] text-[1.2cqw] font-semibold tracking-[0.2em] text-ember uppercase">{error}</p>}
    </Stage>
  );
}

function TipsView({ s }: { s: S }) {
  const t = s.tips;
  const open = t?.closesAt ? Date.parse(t.closesAt) > Date.parse(t.now) : false;
  return (
    <Center title="Insider Tips">
      {open && t?.closesAt ? (
        <>
          <WindowClock closesAt={t.closesAt} serverNow={t.now} className="mt-[1cqh] block text-[13cqw] leading-none font-semibold text-torch" />
          <p className="mt-[3cqh] text-[2.4cqw] text-bone">Buy now on your My Agency page · ₹2 Cr · one per agency</p>
          <p className="mt-[1cqh] text-[1.8cqw] text-steel">
            See one Breaking News headline before it is announced. <span className="num text-bone">{t.sold}</span> bought so far.
          </p>
        </>
      ) : (
        <>
          <p className="mt-[3cqh] text-[2.4cqw] text-bone">
            {t?.closesAt ? 'The window has closed.' : '₹2 Cr buys one tip, on your My Agency page.'}
          </p>
          <p className="mt-[1cqh] text-[1.8cqw] text-steel">
            {t?.closesAt
              ? `${t.sold} tip${t.sold === 1 ? '' : 's'} bought.`
              : 'It privately reveals one Breaking News card that will really be played. One per agency.'}
          </p>
        </>
      )}
    </Center>
  );
}

function Center({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-[6cqw] text-center">
      <p className="display text-[7cqw]">{title}</p>
      {children}
    </div>
  );
}

function LotView({ s }: { s: S }) {
  const lot = s.lot;
  const sale = s.lastSale;
  return (
    <div className="grid h-full grid-cols-[1.55fr_1fr] gap-[3cqw] px-[4cqw] pt-[11cqh] pb-[5cqh]">
      <div className="flex flex-col justify-center">
        {lot ? (
          <>
            <p className="text-[1.5cqw] font-semibold tracking-[0.3em] text-torch uppercase">
              {s.step === 'marquee' && lot.lot_order ? `Marquee lot ${lot.lot_order} of ${s.marqueeTotal}` : s.step === 'last_call' ? 'Last Call' : 'Secret Identity Bid'}
              <span className="ml-[1.5cqw] text-steel">{lot.category}</span>
            </p>
            <p className="num mt-[2cqh] text-[3cqw] font-semibold text-steel">{lot.id}</p>
            <h1 className="display mt-[1cqh] text-[6.4cqw] leading-[1]">{lot.gear_name}</h1>
            <div className="mt-[5cqh] flex gap-[4cqw]">
              <div>
                <p className="text-[1.2cqw] font-semibold tracking-[0.3em] text-steel uppercase">Power</p>
                <p className="num text-[9cqw] leading-none font-semibold text-torch">{lot.power}</p>
              </div>
              <div>
                <p className="text-[1.2cqw] font-semibold tracking-[0.3em] text-steel uppercase">Minimum bid</p>
                <p className="num mt-[2cqh] text-[5cqw] leading-none font-semibold text-bone">{formatCrore(lot.min_bid)}</p>
              </div>
            </div>
            {s.step === 'secret' && (
              <p className="mt-[5cqh] text-[1.6cqw] text-steel">Show 5 s · write your bid or PASS 10 s · unmask on &ldquo;3, 2, 1, mask utaro!&rdquo;</p>
            )}
            {lot.sold && <p className="stamp mt-[4cqh] self-start text-[2cqw] text-ember">Sold</p>}
          </>
        ) : (
          <p className="display text-[5cqw] text-steel">Next lot coming up…</p>
        )}
      </div>
      <aside className="flex flex-col justify-center gap-[5cqh] border-l border-line pl-[3cqw]">
        {lot && (
          <div>
            <p className="text-[1.2cqw] font-semibold tracking-[0.3em] text-steel uppercase">Still needing {lot.category}</p>
            <p className="num mt-[1.5cqh] text-[2.4cqw] leading-snug text-bone">{lot.needing.join('  ') || 'Nobody'}</p>
          </div>
        )}
        {sale && (
          <div key={sale.at} className="transmission">
            <p className="text-[1.2cqw] font-semibold tracking-[0.3em] text-steel uppercase">Last sale</p>
            <p className="stamp mt-[1.5cqh] text-[1.8cqw] text-toxic">Sold</p>
            <p className="mt-[1.5cqh] text-[2cqw] text-bone">
              <span className="num font-semibold text-torch">{sale.card}</span> {sale.gear_name}
            </p>
            <p className="num mt-[0.5cqh] text-[2.2cqw]">
              → {sale.agency} <span className="text-steel">{sale.agencyName}</span> · <span className="font-semibold">{formatCrore(sale.price)}</span>
            </p>
          </div>
        )}
      </aside>
    </div>
  );
}

function NewsView({ s }: { s: S }) {
  const latest = s.news.at(-1);
  const earlier = s.news.slice(0, -1).reverse();
  return (
    <div className="flex h-full flex-col px-[5cqw] pt-[11cqh] pb-[5cqh]">
      {latest ? (
        <div key={latest.id} className="transmission">
          <p className="inline-block bg-ember px-[1cqw] py-[0.4cqh] text-[1.5cqw] font-bold tracking-[0.3em] text-abyss uppercase">Breaking News</p>
          <h1 className="display mt-[3cqh] text-[5.4cqw] leading-[1.05]">{latest.headline}</h1>
          <p className={`num mt-[2cqh] text-[3cqw] font-semibold ${latest.delta > 0 ? 'text-toxic' : 'text-ember'}`}>
            {latest.delta > 0 ? '+' : ''}{latest.delta} Power · {latest.affects}
          </p>
        </div>
      ) : (
        <p className="display mt-[20cqh] text-center text-[6cqw]">Breaking News incoming…</p>
      )}
      <div className="mt-auto grid grid-cols-2 gap-[4cqw]">
        <ul className="space-y-[1cqh] text-[1.6cqw] text-steel">
          {earlier.map((n) => (
            <li key={n.id}>{n.headline} <span className={`num ${n.delta > 0 ? 'text-toxic' : 'text-ember'}`}>({n.delta > 0 ? '+' : ''}{n.delta})</span></li>
          ))}
        </ul>
        {s.teamUps.length > 0 && (
          <div className="transmission">
            <p className="text-[1.3cqw] font-semibold tracking-[0.3em] text-torch uppercase">Team-Ups · +3 Power each</p>
            <ul className="mt-[1cqh] space-y-[0.8cqh] text-[1.8cqw] text-bone">
              {s.teamUps.map((t) => <li key={t.name}>{t.name}</li>)}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function BoardView({ s }: { s: S }) {
  const rows = s.board.slice(0, 16);
  const withFund = rows.some((r) => r.fund !== null);
  return (
    <div className="flex h-full flex-col px-[5cqw] pt-[10cqh] pb-[4cqh]">
      <h1 className="display text-center text-[5cqw]">{s.locked ? 'Power Levels are final' : 'Ledger check'}</h1>
      <BoardColumns
        className="mt-[4cqh]"
        rows={rows}
        header={
          <BoardHeader>
            <span className="w-[5cqw]">ID</span>
            <span className="flex-1">Agency</span>
            <span className="w-[8cqw] text-right">Power</span>
            {withFund && <span className="w-[10cqw] text-right">Fund left</span>}
          </BoardHeader>
        }
        renderRow={(r) => (
          <li key={r.id} className="flex items-center gap-[1.4cqw] border-b border-line py-[1.25cqh] text-[2cqw]">
            <span className="num w-[5cqw] font-semibold text-torch">{r.id}</span>
            <span className="min-w-0 flex-1 truncate">{r.name}</span>
            <span className="num w-[8cqw] text-right font-semibold">{r.power}</span>
            {withFund && <span className="num w-[10cqw] text-right text-steel">{r.fund !== null ? formatCrore(r.fund) : ''}</span>}
          </li>
        )}
      />
    </div>
  );
}
