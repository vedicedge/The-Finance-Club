'use client';

import { useEffect, useState } from 'react';
import { EVENT, ROUNDS } from '@/lib/config';
import { formatCrore } from '@/lib/money';
import { Stage } from '@/components/screen/Stage';
import { BoardColumns, BoardHeader } from '@/components/screen/BoardColumns';
import { WindowClock } from '@/components/site/WindowClock';
import { GearCard, GearCardBack } from '@/components/cards/GearCard';
import { FlipReveal } from '@/components/cards/FlipReveal';
import { seriesLabel } from '@/lib/card-art';

type S = {
  phase: string;
  step: string | null;
  marqueeTotal: number;
  lot: null | {
    id: string; category: string; gear_name: string; card_name?: string; power: number; min_bid: number; phase: string;
    lot_order: number | null; sold: boolean; needing: string[];
  };
  lastSale: null | {
    card: string; gear_name: string; card_name?: string; category?: string; power?: number;
    agency: string; agencyName: string; price: number; at: string;
  };
  news: { id: string; headline: string; affects: string; delta: number; cards?: { id: string; name: string; category: string; power: number }[] }[];
  teamUps: { name: string; bonus: number }[];
  board: { id: string; name: string; power: number; cards: number; fund: number | null }[];
  tips: null | { closesAt: string | null; now: string; sold: number };
  recap: null | {
    news: { id: string; headline: string; affects: string; delta: number; holders: { id: string; name: string }[] }[];
    teamUps: { name: string; gearA: string; gearB: string; bonus: number; holders: { id: string; name: string }[] }[];
  };
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
    <Stage art="bazaar" artOpacity={0.07}>
      <div className="absolute inset-x-0 top-0 flex items-center justify-between border-b border-line px-[3cqw] py-[1.6cqh]">
        <p className="text-[1.25cqw] font-semibold tracking-[0.3em] text-steel uppercase">
          {EVENT.name} · Round 1 · <span className="text-glow">{ROUNDS.round1}</span>
        </p>
        {step && <p className="text-[1.25cqw] font-semibold tracking-[0.3em] text-steel uppercase">{STEP_LABEL[step] ?? step}</p>}
      </div>

      {!s ? (
        <Center title={error ?? 'Establishing secure line…'} />
      ) : s.recap ? (
        <RecapView recap={s.recap} />
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

function who(holders: { id: string; name: string }[]) {
  return holders.map((h) => `${h.id} ${h.name}`).join(', ');
}

/** End of Power Bazaar: every revealed headline and Team-Up at once, with who holds the cards. */
function RecapView({ recap }: { recap: NonNullable<S['recap']> }) {
  return (
    <div className="flex h-full flex-col px-[5cqw] pt-[9cqh] pb-[3cqh]">
      <h1 className="display text-center text-[3.7cqw]">Breaking News · the full picture</h1>
      <div className="mt-[2.5cqh] grid min-h-0 flex-1 grid-cols-[1.5fr_1fr] gap-x-[4cqw]">
        <section className="min-w-0">
          <p className="text-[1.15cqw] font-semibold tracking-[0.3em] text-ember uppercase">Breaking News · {recap.news.length} headlines</p>
          <ol className="mt-[1cqh]">
            {recap.news.map((n) => (
              <li key={n.id} className="flex items-center gap-[1.5cqw] border-b border-line py-[1cqh]">
                <div className="min-w-0 flex-1">
                  <p className="text-[1.7cqw] leading-tight text-bone">{n.headline}</p>
                  <p className="mt-[0.4cqh] truncate text-[1.2cqw] text-steel">
                    {n.affects} · {n.holders.length ? <span className="text-bone">{who(n.holders)}</span> : 'not sold'}
                  </p>
                </div>
                <span className={`num w-[5cqw] text-right text-[2.6cqw] font-semibold ${n.delta > 0 ? 'text-toxic' : 'text-ember'}`}>
                  {n.delta > 0 ? '+' : '−'}
                  {Math.abs(n.delta)}
                </span>
              </li>
            ))}
          </ol>
        </section>
        <section className="min-w-0">
          <p className="text-[1.15cqw] font-semibold tracking-[0.3em] text-toxic uppercase">Team-Ups · both cards = +3</p>
          <ul className="mt-[1cqh]">
            {recap.teamUps.map((t) => (
              <li key={t.name} className="border-b border-line py-[1.2cqh]">
                <div className="flex items-baseline justify-between gap-[1cqw]">
                  <p className="min-w-0 text-[1.7cqw] leading-tight text-bone">{t.name}</p>
                  <span className="num text-[2.2cqw] font-semibold text-toxic">+{t.bonus}</span>
                </div>
                <p className="mt-[0.3cqh] text-[1.1cqw] text-steel">
                  {t.gearA} + {t.gearB}
                </p>
                <p className={`mt-[0.3cqh] text-[1.3cqw] ${t.holders.length ? 'text-toxic' : 'text-steel'}`}>
                  {t.holders.length ? `${who(t.holders)} hold${t.holders.length === 1 ? 's' : ''} both` : 'Nobody holds both'}
                </p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function TipsView({ s }: { s: S }) {
  const t = s.tips;
  const open = t?.closesAt ? Date.parse(t.closesAt) > Date.parse(t.now) : false;
  return (
    <Center title="Insider Tips">
      {open && t?.closesAt ? (
        <>
          <WindowClock closesAt={t.closesAt} serverNow={t.now} className="mt-[1cqh] block text-[13cqw] leading-none font-semibold text-glow" />
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
      <p className="display text-[6.2cqw]">{title}</p>
      {children}
    </div>
  );
}

function LotView({ s }: { s: S }) {
  const lot = s.lot;
  const sale = s.lastSale;
  const name = lot ? (lot.card_name ?? lot.gear_name) : '';
  const series = lot ? seriesLabel(name, lot.gear_name) : null;
  return (
    <div className="grid h-full grid-cols-[auto_minmax(0,1fr)_minmax(0,0.8fr)] items-center gap-[3cqw] px-[4cqw] pt-[11cqh] pb-[5cqh]">
      {/* the card: it turns over as the lot opens; text sits beside it, never on the picture */}
      <div className="w-[25cqw] text-[1.8cqw]">
        {lot ? (
          <FlipReveal
            revealKey={lot.id}
            back={<GearCardBack sizes="25vw" />}
            front={<GearCard card={{ id: lot.id, name, series: lot.gear_name, category: lot.category, power: lot.power }} sizes="25vw" showSeries={false} />}
          />
        ) : (
          <GearCardBack sizes="25vw" />
        )}
      </div>

      <div className="flex min-w-0 flex-col justify-center">
        {lot ? (
          <>
            <p className="text-[1.4cqw] font-semibold tracking-[0.3em] text-glow uppercase">
              {s.step === 'marquee' && lot.lot_order ? `Marquee lot ${lot.lot_order} of ${s.marqueeTotal}` : s.step === 'last_call' ? 'Last Call' : 'Secret Identity Bid'}
              <span className="ml-[1.5cqw] text-steel">{lot.category}</span>
            </p>
            <p className="num mt-[2cqh] text-[2.4cqw] font-semibold text-steel">{lot.id}</p>
            <h1 className="display mt-[1cqh] text-[4.4cqw] leading-[1.02]">{name}</h1>
            {series && <p className="mt-[1.2cqh] text-[1.6cqw] text-steel">{series}</p>}
            <div className="mt-[4cqh] flex gap-[4cqw]">
              <div>
                <p className="text-[1.15cqw] font-semibold tracking-[0.3em] text-steel uppercase">Power</p>
                <p className="num text-[7.5cqw] leading-none font-semibold text-glow">{lot.power}</p>
              </div>
              <div>
                <p className="text-[1.15cqw] font-semibold tracking-[0.3em] text-steel uppercase">Minimum bid</p>
                <p className="num mt-[2cqh] text-[4.4cqw] leading-none font-semibold text-bone">{formatCrore(lot.min_bid)}</p>
              </div>
            </div>
            {s.step === 'secret' && (
              <p className="mt-[4cqh] text-[1.45cqw] text-steel">Show 5 s · write your bid or PASS 10 s · unmask on &ldquo;3, 2, 1, mask utaro!&rdquo;</p>
            )}
            {lot.sold && <p className="stamp mt-[3cqh] self-start text-[2cqw] text-ember">Sold</p>}
          </>
        ) : (
          <p className="display text-[4cqw] text-steel">Next lot coming up…</p>
        )}
      </div>

      <aside className="flex min-w-0 flex-col justify-center gap-[5cqh] border-l border-line pl-[3cqw]">
        {lot && (
          <div>
            <p className="text-[1.15cqw] font-semibold tracking-[0.3em] text-steel uppercase">Still needing {lot.category}</p>
            <p className="num mt-[1.5cqh] text-[2.2cqw] leading-snug text-bone">{lot.needing.join('  ') || 'Nobody'}</p>
          </div>
        )}
        {sale && (
          <div key={sale.at} className="transmission">
            <p className="text-[1.15cqw] font-semibold tracking-[0.3em] text-steel uppercase">Last sale</p>
            <div className="mt-[1.5cqh] flex items-center gap-[1.5cqw]">
              <div className="w-[8cqw] flex-none text-[0.75cqw]">
                <GearCard
                  card={{ id: sale.card, name: sale.card_name ?? sale.gear_name, category: sale.category ?? '', power: sale.power }}
                  sizes="10vw"
                  showSeries={false}
                />
              </div>
              <div className="min-w-0">
                <p className="stamp text-[1.6cqw] text-toxic">Sold</p>
                <p className="mt-[1.2cqh] text-[1.7cqw] leading-tight text-bone">{sale.card_name ?? sale.gear_name}</p>
                <p className="num mt-[0.6cqh] text-[1.9cqw]">
                  → {sale.agency} <span className="text-steel">{sale.agencyName}</span>
                </p>
                <p className="num text-[2.2cqw] font-semibold text-glow">{formatCrore(sale.price)}</p>
              </div>
            </div>
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
        <div key={latest.id} className="transmission grid grid-cols-[minmax(0,1fr)_auto] items-center gap-[4cqw]">
          <div className="min-w-0">
            <p className="inline-block bg-ember px-[1cqw] py-[0.4cqh] text-[1.5cqw] font-bold tracking-[0.3em] text-abyss uppercase">Breaking News</p>
            <h1 className="display mt-[3cqh] text-[4.2cqw] leading-[1.05]">{latest.headline}</h1>
            <p className={`num mt-[2cqh] text-[2.6cqw] font-semibold ${latest.delta > 0 ? 'text-toxic' : 'text-ember'}`}>
              {latest.delta > 0 ? '+' : ''}
              {latest.delta} Power · {latest.affects}
              {(latest.cards?.length ?? 0) > 1 ? ' series' : ''}
            </p>
          </div>
          {/* the cards the headline hits, fanned out */}
          {latest.cards && latest.cards.length > 0 && (
            <div className="flex pr-[2cqw]">
              {latest.cards.map((c, i, all) => (
                <div
                  key={c.id}
                  className="w-[11cqw] text-[0.9cqw]"
                  style={{
                    marginLeft: i === 0 ? 0 : '-4cqw',
                    transform: `rotate(${(i - (all.length - 1) / 2) * 6}deg) translateY(${Math.abs(i - (all.length - 1) / 2) * 0.8}cqh)`,
                  }}
                >
                  <GearCard card={c} sizes="12vw" showSeries={false} />
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <p className="display mt-[20cqh] text-center text-[5.3cqw]">Breaking News incoming…</p>
      )}
      <div className="mt-auto grid grid-cols-2 gap-[4cqw]">
        <ul className="space-y-[1cqh] text-[1.6cqw] text-steel">
          {earlier.map((n) => (
            <li key={n.id}>{n.headline} <span className={`num ${n.delta > 0 ? 'text-toxic' : 'text-ember'}`}>({n.delta > 0 ? '+' : ''}{n.delta})</span></li>
          ))}
        </ul>
        {s.teamUps.length > 0 && (
          <div className="transmission">
            <p className="text-[1.3cqw] font-semibold tracking-[0.3em] text-glow uppercase">Team-Ups · +3 Power each</p>
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
      <h1 className="display text-center text-[4.4cqw]">{s.locked ? 'Power Levels are final' : 'Ledger check'}</h1>
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
            <span className="num w-[5cqw] font-semibold text-glow">{r.id}</span>
            <span className="min-w-0 flex-1 truncate">{r.name}</span>
            <span className="num w-[8cqw] text-right font-semibold">{r.power}</span>
            {withFund && <span className="num w-[10cqw] text-right text-steel">{r.fund !== null ? formatCrore(r.fund) : ''}</span>}
          </li>
        )}
      />
    </div>
  );
}
