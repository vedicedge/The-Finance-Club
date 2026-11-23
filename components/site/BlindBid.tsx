'use client';

import { useEffect, useState } from 'react';
import { pollFetch } from '@/lib/poll';
import { formatCrore } from '@/lib/money';
import { budgetWarning } from '@/lib/round1/budget';
import { categoryColor } from '@/lib/round1/colours';
import { WindowClock } from '@/components/site/WindowClock';
import { BudgetWarning } from '@/components/site/BudgetWarning';
import { CategoryTag } from '@/components/cards/CategoryTag';

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
 * Secret Identity Bids on the phone: the card on the projector, a 15-second countdown and the
 * team's own blind bid (changeable until 0:00). Refreshes itself every second, catches up at once
 * when the page comes back to the front or the network returns, and says so when the line drops.
 * A bid is sent with a time limit and retried once by itself, so a weak signal never leaves the
 * button stuck.
 */
export function BlindBid() {
  const [s, setS] = useState<State | null>(null);
  const [amount, setAmount] = useState('');
  const [msg, setMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [misses, setMisses] = useState(0);
  /** A bid above the fund (a loan) is sent only after a second tap on the same amount. */
  const [loanOk, setLoanOk] = useState<number | null>(null);
  const cardId = s?.live ? s.card?.id ?? null : null;

  useEffect(() => {
    let stop = false;
    let t: number;
    let running = false;
    const loop = async () => {
      if (running) return;
      running = true;
      window.clearTimeout(t);
      try {
        const res = await pollFetch('/api/me/bid', 4000);
        if (res.ok) {
          setS((await res.json()) as State);
          setMisses(0);
        } else setMisses((m) => m + 1);
      } catch {
        setMisses((m) => m + 1); // keep the last state, show "reconnecting" after two misses
      }
      running = false;
      if (!stop) t = window.setTimeout(loop, 1000);
    };
    // A laptop tab in the background is slowed down by the browser: catch up the moment it is back.
    const now = () => {
      if (document.visibilityState === 'visible') void loop();
    };
    loop();
    document.addEventListener('visibilitychange', now);
    window.addEventListener('online', now);
    window.addEventListener('focus', now);
    return () => {
      stop = true;
      window.clearTimeout(t);
      document.removeEventListener('visibilitychange', now);
      window.removeEventListener('online', now);
      window.removeEventListener('focus', now);
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
    setMsg({ tone: 'ok', text: 'Sending…' });
    // Two tries, 6 s each: a bid lost to a weak signal is re-sent once by itself.
    for (let attempt = 1; attempt <= 2; attempt++) {
      const ctl = new AbortController();
      const timer = window.setTimeout(() => ctl.abort(), 6000);
      try {
        const res = await fetch('/api/me/bid', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: value }),
          signal: ctl.signal,
          cache: 'no-store',
        });
        const j = (await res.json()) as { ok?: boolean; error?: string };
        if (j.ok) {
          setMsg({ tone: 'ok', text: value === null ? 'Bid withdrawn.' : `Bid placed: ${formatCrore(value)}. You can change it until 0:00.` });
          setS((prev) => (prev && prev.live ? { ...prev, myBid: value } : prev));
        } else setMsg({ tone: 'err', text: j.error ?? 'Your bid was not accepted.' });
        window.clearTimeout(timer);
        setBusy(false);
        return;
      } catch {
        window.clearTimeout(timer);
        if (attempt === 1) setMsg({ tone: 'ok', text: 'Weak signal: sending again…' });
      }
    }
    setMsg({ tone: 'err', text: 'Your bid did not reach us (no signal). Tap again, or move to better Wi-Fi or mobile data.' });
    setBusy(false);
  };

  /** "8", "8.5", "₹8,5 Cr" → 8.5; null if it is not a number. */
  const parse = (raw: string) => {
    const t = raw.replace(/₹|cr|crore/gi, '').replace(',', '.').trim();
    const v = Number(t);
    return t !== '' && Number.isFinite(v) ? v : null;
  };

  const c = s.card;
  return (
    <section className="panel border-l-4 px-5 py-5" style={{ borderLeftColor: c ? categoryColor(c.category) : undefined }}>
      <div className="flex items-baseline justify-between gap-3">
        <p className="eyebrow text-glow">Secret Identity Bid</p>
        {s.open && s.closesAt && <WindowClock closesAt={s.closesAt} serverNow={s.now} className="text-3xl font-semibold text-glow" />}
      </div>
      {misses >= 2 && (
        <p role="alert" className="mt-2 rounded-sm border border-ember/50 bg-ember/10 px-3 py-2 text-sm text-ember">
          Connection lost. Reconnecting… Keep this page open; if it lasts, switch to mobile data.
        </p>
      )}

      {!c ? (
        <p className="mt-3 text-sm text-steel">Waiting for the first card. Bidding opens here when the card is on the projector.</p>
      ) : (
        <>
          <p className="mt-2 text-bone">
            <span className="num font-semibold text-glow">{c.id}</span> · {c.name}
          </p>
          <p className="num text-sm text-steel">
            <CategoryTag category={c.category} /> · Power <span className="text-bone">{c.power}</span> · minimum <span className="text-bone">{formatCrore(c.minBid)}</span> · you
            have <span className="text-bone">{formatCrore(s.fund)}</span>
          </p>

          {s.open ? (
            !s.eligible ? (
              <p className="mt-3 text-sm text-steel">You already hold a {c.category}. Sit this one out.</p>
            ) : (
              <form
                noValidate
                className="mt-4 space-y-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const v = parse(amount);
                  // Friendly checks here; the database checks every rule again.
                  if (v === null || v <= 0) setMsg({ tone: 'err', text: 'Type your bid in ₹ Cr, e.g. 8 or 8.5.' });
                  else if (Math.round(v * 2) !== v * 2) setMsg({ tone: 'err', text: 'Bids move in ₹0.5 Cr steps, e.g. 8 or 8.5.' });
                  else if (v < c.minBid) setMsg({ tone: 'err', text: `The minimum bid for this card is ${formatCrore(c.minBid)}.` });
                  else if (v > s.fund && loanOk !== v) {
                    setLoanOk(v);
                    setMsg({ tone: 'err', text: `That is ${formatCrore(v - Math.max(0, s.fund))} more than you have: it would be a loan from The Finance Club and lower your Hero Score. Tap again to confirm.` });
                  } else void send(v);
                }}
              >
                {warn && (
                  <p className="rounded-sm border border-ember/40 bg-ember/10 px-3 py-2 text-xs text-bone">
                    <span className="font-semibold text-ember">Budget alert:</span> {formatCrore(s.fund)} left for {s.missing.length} more categor
                    {s.missing.length === 1 ? 'y' : 'ies'}; keep about {formatCrore(warn.reserve)}. This is only a reminder:{' '}
                    <strong>you can still bid.</strong>
                  </p>
                )}
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
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    placeholder={`₹ Cr, from ${c.minBid}`}
                    className="field num !mt-0 flex-1"
                    aria-label="Your bid in ₹ crore"
                  />
                  <button disabled={busy} className="btn btn-primary">
                    {busy ? 'Sending…' : s.myBid !== null ? 'Change bid' : 'Place bid'}
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
      {warn && !(s.open && s.eligible && c) && <BudgetWarning fund={s.fund} missing={s.missing.length} reserve={warn.reserve} className="mt-4" />}
    </section>
  );
}
