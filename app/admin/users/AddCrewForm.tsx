'use client';

import { useActionState } from 'react';
import { ROLES, ROLE_LABELS } from '@/lib/auth/roles';
import { addCrewMember, type CrewState } from './actions';

const idle: CrewState = { kind: 'idle' };
const field =
  'mt-2 block w-full rounded-sm border border-line-strong bg-vault-2 px-3 py-2 text-bone focus:border-glow focus:outline-none';

export function AddCrewForm() {
  const [state, action, pending] = useActionState(addCrewMember, idle);
  return (
    <form action={action} className="grid gap-4 rounded-sm border border-line bg-vault p-5 sm:grid-cols-3">
      <label className="block">
        <span className="eyebrow">Email</span>
        <input name="email" type="email" required className={field} />
      </label>
      <label className="block">
        <span className="eyebrow">Name</span>
        <input name="display_name" className={field} />
      </label>
      <label className="block">
        <span className="eyebrow">Password (optional)</span>
        <input name="password" type="password" minLength={10} autoComplete="new-password" className={field} />
      </label>
      <fieldset className="sm:col-span-3">
        <legend className="eyebrow">Roles</legend>
        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
          {ROLES.map((r) => (
            <label key={r} className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="roles" value={r} className="accent-glow" /> {ROLE_LABELS[r]}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex flex-wrap items-center gap-4 sm:col-span-3">
        <button
          disabled={pending}
          className="rounded-sm bg-glow px-4 py-2 text-sm font-semibold tracking-[0.14em] text-abyss uppercase disabled:opacity-60"
        >
          {pending ? 'Adding…' : 'Add to crew'}
        </button>
        {state.kind !== 'idle' && (
          <p role="status" className={state.kind === 'ok' ? 'text-sm text-toxic' : 'text-sm text-ember'}>
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}
