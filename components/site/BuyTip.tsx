'use client';

import { useActionState, useState } from 'react';
import { buyInsiderTip, type BuyTipState } from '@/app/(site)/me/actions';
import { WindowClock } from '@/components/site/WindowClock';

/** My Agency during the Insider Tips window: countdown, then buy (with a confirm step). */
export function BuyTip({ closesAt, serverNow, fund }: { closesAt: string; serverNow: string; fund: number }) {
  const [state, action, pending] = useActionState<BuyTipState, FormData>(buyInsiderTip, {});
  const [confirming, setConfirming] = useState(false);
  const short = fund < 2;

  return (
    <section className="panel border-l-2 border-l-glow px-5 py-5 transmission">
      <div className="flex items-baseline justify-between gap-3">
        <p className="eyebrow text-glow">Insider Tip · window open</p>
        <WindowClock closesAt={closesAt} serverNow={serverNow} refreshOnClose className="text-3xl font-semibold text-glow" />
      </div>
      <div className="mt-2 space-y-2 text-sm text-bone/90">
        <p>
          <strong>What is it?</strong> Later in this round, 6 <strong>Breaking News</strong> headlines are announced. Each one makes a
          group of cards stronger or weaker by changing their Power, and your Power Level changes with it.
        </p>
        <p>An Insider Tip shows you one of those headlines now, before anyone else knows it:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>which cards it affects, and by how much (for example: every card in one series gets +2 Power);</li>
          <li>picked at random by the site, and seen only by your team;</li>
          <li>costs ₹2 Cr from your fund, one tip per team, only while this timer runs.</li>
        </ul>
        <p className="text-steel">Use it to decide which cards to bid higher on and which to avoid. Buying is optional.</p>
      </div>
      {state.error && (
        <p role="alert" className="mt-3 text-sm text-ember">
          {state.error}
        </p>
      )}
      {short ? (
        <p className="mt-3 text-sm text-ember">You need ₹2 Cr in your fund to buy a tip.</p>
      ) : !confirming ? (
        <button type="button" onClick={() => setConfirming(true)} className="btn btn-primary mt-4 w-full">
          Buy Insider Tip · ₹2 Cr
        </button>
      ) : (
        <form action={action} className="mt-4 space-y-2">
          <p className="text-sm text-bone">Spend ₹2 Cr from your fund on one tip? This can’t be undone.</p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setConfirming(false)} disabled={pending} className="btn btn-ghost">
              Cancel
            </button>
            <button disabled={pending} className="btn btn-primary">
              {pending ? 'Buying…' : 'Yes, buy it'}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
