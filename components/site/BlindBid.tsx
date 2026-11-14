'use client';

import { useEffect, useState } from 'react';
import { pollFetch } from '@/lib/poll';
import { formatCrore } from '@/lib/money';
import { budgetWarning } from '@/lib/round1/budget';
import { WindowClock } from '@/components/site/WindowClock';
import { BudgetWarning } from '@/components/site/BudgetWarning';

type State =
  | { live: false; now: string }
  | {
      live: true;
      now: string;
      fund: number;
      missing: string[];
      card: null | { id: string; category: string; power: number; minBid: number; name: string; series: string };
      open: boolean;
      closesAt: string | null;
      myBid: number | null;
      eligible: boolean;
      result: null | { winner: null } | { winner: string; winnerName: string; price: number; mine: boolean };
    };

/**
 * Secret Identity Bids on the phone: the card on the projector, a 20-second countdown and the
 * team's own blind bid (changeable until 0:00). Refreshes itself every second.
 */
export function BlindBid() {
  const [s, setS] = useState<State | null>(null);
  const [amount, setAmount] = useState('');
  const [msg, setMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const cardId = s?.live ? s.card?.id ?? null : null;

  useEffect(() => {
    let stop = false;
    let t: number;
    const loop = async () => {
      try {
        const res = await pollFetch('/api/me/bid');
        if (res.ok) setS((await res.json()) as State);
      } catch {
        /* keep the last state */
      }
      if (!stop) t = window.setTimeout(loop, 1000);
    };
    loop();
    return () => {
      stop = true;
      window.clearTimeout(t);
    };
  }, []);

  // A new card clears the box and the last message; so does the window closing.
  const open = s?.live ? s.open : false;
  useEffect(() => {
    setAmount('');
    setMsg(null);
  }, [cardId, open]);

  if (!s || !s.live) return null;
  const warn = budgetWarning(s.fund, s.missing.length);

  const send = async (value: number | null) => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/me/bid', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: value }) });
      const j = (await res.json()) as { ok?: boolean; error?: string };
      if (j.ok) {
        setMsg({ tone: 'ok', text: value === null ? 'Bid withdrawn.' : `Bid placed: ${formatCrore(value)}. You can change it until 0:00.` });
        setS((prev) => (prev && prev.live ? { ...prev, myBid: value } : prev));
      } else setMsg({ tone: 'err', text: j.error ?? 'Your bid was not accepted.' });
    } catch {
      setMsg({ tone: 'err', text: 'No signal. Try again.' });
    }
    setBusy(false);
  };

  const c = s.card;
  return (
    <section className="panel border-l-2 border-l-glow px-5 py-5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="eyebrow text-glow">Secret Identity Bid</p>
        {s.open && s.closesAt && <WindowClock closesAt={s.closesAt} serverNow={s.now} className="text-3xl font-semibold text-glow" />}
      </div>

      {!c ? (
        <p className="mt-3 text-sm text-steel">Waiting for the first card. Bidding opens here when the card is on the projector.</p>
      ) : (
        <>
          <p className="mt-2 text-bone">
            <span className="num font-semibold text-glow">{c.id}</span> · {c.name}
          </p>
          <p className="num text-sm text-steel">
            {c.category} · Power <span className="text-bone">{c.power}</span> · minimum <span className="text-bone">{formatCrore(c.minBid)}</span> · you
            have <span className="text-bone">{formatCrore(s.fund)}</span>
          </p>

          {s.open ? (
            !s.eligible ? (
              <p className="mt-3 text-sm text-steel">You already hold a {c.category}. Sit this one out.</p>
            ) : (
              <form
                className="mt-4 space-y-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const v = Number(amount.replace(',', '.'));
                  if (!Number.isFinite(v) || v <= 0) setMsg({ tone: 'err', text: 'Type your bid in ₹ Cr (steps of 0.5).' });
                  else void send(v);
                }}
              >
                <p className="text-sm text-steel">
                  {s.myBid !== null ? (
                    <>
                      Your bid: <span className="num font-semibold text-toxic">{formatCrore(s.myBid)}</span>. Nobody else can see it.
                    </>
                  ) : (
                    'Blind bid: nobody sees it until the timer ends. Highest bid wins; a tie goes to the earlier bid.'
                  )}
                </p>
                <div className="flex gap-2">
                  <input
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    type="number"
                    inputMode="decimal"
                    step="0.5"
                    min={c.minBid}
                    max={s.fund}
                    placeholder={`₹ Cr, from ${c.minBid}`}
                    className="field num !mt-0 flex-1"
                    aria-label="Your bid in ₹ crore"
                  />
                  <button disabled={busy} className="btn btn-primary">
                    {s.myBid !== null ? 'Change bid' : 'Place bid'}
                  </button>
                </div>
                {s.myBid !== null && (
                  <button type="button" disabled={busy} onClick={() => void send(null)} className="text-xs text-steel underline underline-offset-4">
                    Withdraw my bid (pass)
                  </button>
                )}
              </form>
            )
          ) : s.result ? (
            s.result.winner ? (
              <p className={`mt-3 ${s.result.mine ? 'text-toxic' : 'text-bone'}`}>
                {s.result.mine ? 'You won it! ' : ''}Sold to <span className="num font-semibold">{s.result.winner}</span> {s.result.winnerName} for{' '}
                <span className="num font-semibold">{formatCrore(s.result.price)}</span>.
              </p>
            ) : (
              <p className="mt-3 text-steel">No valid bid. This card goes to Last Call.</p>
            )
          ) : (
            <p className="mt-3 text-sm text-steel">Bidding on this card opens in a moment. Watch the projector.</p>
          )}
          {msg && <p role={msg.tone === 'err' ? 'alert' : 'status'} className={`mt-2 text-sm ${msg.tone === 'err' ? 'text-ember' : 'text-toxic'}`}>{msg.text}</p>}
        </>
      )}
      {warn && <BudgetWarning fund={s.fund} missing={s.missing.length} reserve={warn.reserve} className="mt-4" />}
    </section>
  );
}
