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
    <section className="panel border-l-2 border-l-torch px-5 py-5 transmission">
      <div className="flex items-baseline justify-between gap-3">
        <p className="eyebrow text-torch">Insider Tips window</p>
        <WindowClock closesAt={closesAt} serverNow={serverNow} refreshOnClose className="text-3xl font-semibold text-torch" />
      </div>
      <p className="mt-2 text-sm text-bone/85">
        For ₹2 Cr, see one of the 6 Breaking News headlines before it is announced: which card it hits and by how much. The site
        picks the headline at random. One tip per agency; only your agency sees it.
      </p>
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
