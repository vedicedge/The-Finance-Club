'use client';

import { useActionState } from 'react';
import { editTeam, resetPin, updateFounder, type FounderEditState, type PinResetState, type TeamEditState } from './actions';

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

type Member = { name: string; section: string; phone: string; email: string; is_captain: boolean };

/**
 * Last-minute team change at the desk: edit, replace, add or remove members (a row left blank
 * is removed) and pick the captain. Needs a reason; allowed until the prelim starts.
 */
export function TeamEditor({ agencyId, members }: { agencyId: string; members: Member[] }) {
  const [state, action, pending] = useActionState<TeamEditState, FormData>(editTeam.bind(null, agencyId), { kind: 'idle' });
  const rows = [0, 1, 2].map((i) => members[i] ?? null);
  const captain = Math.max(0, members.findIndex((m) => m.is_captain));
  const input = 'w-full rounded-sm border border-line-strong bg-vault-2 px-2 py-1.5 text-sm text-bone';
  return (
    <form action={action} className="space-y-2 py-3">
      <p className="text-sm text-steel">
        Change the team: edit a row to replace a member, fill the empty row to add one, or clear a row to remove that member.
        New members need an IMI email and must not be in another team.
      </p>
      {rows.map((m, i) => (
        <div key={i} className="grid gap-2 sm:grid-cols-[auto_1.4fr_0.5fr_1fr_1.6fr] sm:items-center">
          <label className="flex items-center gap-1.5 text-xs text-steel">
            <input type="radio" name="captain" value={i} defaultChecked={i === captain} className="size-4 accent-glow" /> Captain
          </label>
          <input name={`f${i}_name`} defaultValue={m?.name ?? ''} placeholder={m ? 'Name' : 'Add a member: name'} aria-label={`Member ${i + 1} name`} className={input} />
          <input name={`f${i}_section`} defaultValue={m?.section ?? ''} placeholder="Section" aria-label={`Member ${i + 1} section`} className={input} />
          <input name={`f${i}_phone`} defaultValue={m?.phone ?? ''} placeholder="Phone" inputMode="tel" aria-label={`Member ${i + 1} phone`} className={`${input} num`} />
          <input name={`f${i}_email`} defaultValue={m?.email ?? ''} placeholder="name@imi.edu" type="email" aria-label={`Member ${i + 1} email`} className={input} />
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-2">
        <input name="reason" required placeholder="Reason, e.g. member unwell, replaced by…" aria-label="Reason for the change" className={`${input} max-w-md flex-1`} />
        <button disabled={pending} className="btn btn-primary !min-h-0 !px-4 !py-2 !text-xs">{pending ? 'Saving' : 'Save team change'}</button>
      </div>
      {state.kind === 'ok' && <p role="status" className="text-sm text-toxic">{state.message}</p>}
      {state.kind === 'error' && <p role="alert" className="text-sm text-ember">{state.message}</p>}
    </form>
  );
}
