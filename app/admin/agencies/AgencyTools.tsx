'use client';

import { useActionState } from 'react';
import { resetPin, updateFounder, type FounderEditState, type PinResetState } from './actions';

export function ResetPinButton({ agencyId }: { agencyId: string }) {
  const [state, action, pending] = useActionState<PinResetState>(resetPin.bind(null, agencyId), { kind: 'idle' });
  if (state.kind === 'done') {
    return (
      <p className="transmission panel border-glow/50 px-3 py-2 text-sm">
        New PIN for {agencyId}: <span className="num ml-1 text-2xl font-semibold tracking-[0.15em] text-glow">{state.pin}</span>
        <span className="mt-1 block text-xs text-steel">Shown once. Their phones have been signed out.</span>
      </p>
    );
  }
  return (
    <form action={action}>
      <button disabled={pending} className="btn btn-ghost !min-h-0 !px-3 !py-2 !text-xs">
        {pending ? 'Resetting…' : 'Reset PIN'}
      </button>
      {state.kind === 'error' && <p className="mt-1 text-xs text-ember">{state.message}</p>}
    </form>
  );
}

type Founder = { id: number; name: string; section: string; phone: string; email: string; is_captain: boolean };

export function FounderEditor({ founder, locked }: { founder: Founder; locked: boolean }) {
  const [state, action, pending] = useActionState<FounderEditState, FormData>(updateFounder.bind(null, founder.id), {
    kind: 'idle',
  });
  const input = 'w-full rounded-sm border border-line-strong bg-vault-2 px-2 py-1.5 text-sm text-bone disabled:opacity-60';
  return (
    <form action={action} className="grid gap-2 py-3 sm:grid-cols-[1.4fr_0.5fr_1fr_1.6fr_auto] sm:items-center">
      <input name="name" defaultValue={founder.name} disabled={locked} aria-label="Name" className={input} />
      <input name="section" defaultValue={founder.section} disabled={locked} aria-label="Section" className={input} />
      <input name="phone" defaultValue={founder.phone} disabled={locked} aria-label="Phone" inputMode="tel" className={`${input} num`} />
      <input name="email" defaultValue={founder.email} disabled={locked} aria-label="Email" type="email" className={input} />
      {!locked && (
        <button disabled={pending} className="btn btn-ghost !min-h-0 !px-3 !py-1.5 !text-xs">
          {pending ? 'Saving' : 'Save'}
        </button>
      )}
      {founder.is_captain && <span className="text-xs font-semibold tracking-[0.18em] text-glow uppercase sm:col-span-5">Captain</span>}
      {state.kind === 'ok' && <span className="text-xs text-toxic sm:col-span-5">Saved.</span>}
      {state.kind === 'error' && <span className="text-xs text-ember sm:col-span-5">{state.message}</span>}
    </form>
  );
}
