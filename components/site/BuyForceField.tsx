'use client';

import { useActionState, useState } from 'react';
import { buyForceField, type BuyTipState } from '@/app/(site)/me/actions';
import { WindowClock } from '@/components/site/WindowClock';

/** My Agency during the Round 3 Force Field window: countdown, then buy (with a confirm step). */
export function BuyForceField({ closesAt, serverNow, fund }: { closesAt: string; serverNow: string; fund: number }) {
  const [state, action, pending] = useActionState<BuyTipState, FormData>(buyForceField, {});
  const [confirming, setConfirming] = useState(false);
  const short = fund < 5;

  return (
    <section className="panel border-l-2 border-l-glow px-5 py-5 transmission">
      <div className="flex items-baseline justify-between gap-3">
        <p className="eyebrow text-glow">Force Field window</p>
        <WindowClock closesAt={closesAt} serverNow={serverNow} refreshOnClose className="text-3xl font-semibold text-glow" />
      </div>
      <p className="mt-2 text-sm text-bone/85">
        For ₹5 Cr, one Force Field for the whole of Round 3. Play it once, whenever a mission winner tries to swap envelopes
        with you, and the swap is blocked. Only the organisers know you bought it.
      </p>
      {state.error && (
        <p role="alert" className="mt-3 text-sm text-ember">
          {state.error}
        </p>
      )}
      {short ? (
        <p className="mt-3 text-sm text-ember">You need ₹5 Cr in your fund to buy a Force Field.</p>
      ) : !confirming ? (
        <button type="button" onClick={() => setConfirming(true)} className="btn btn-primary mt-4 w-full">
          Buy Force Field · ₹5 Cr
        </button>
      ) : (
        <form action={action} className="mt-4 space-y-2">
          <p className="text-sm text-bone">Spend ₹5 Cr from your fund on your one Force Field? This can’t be undone.</p>
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
