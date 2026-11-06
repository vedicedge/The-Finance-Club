'use client';

import { useActionState } from 'react';
import { RegistrationSuccess } from '@/components/site/RegistrationSuccess';
import { registerTestAgency, type QuickState } from './actions';

/** Dry run: join with just a name. */
export function QuickJoinForm() {
  const [state, action, pending] = useActionState(registerTestAgency, { kind: 'idle' } as QuickState);
  if (state.kind === 'done') return <RegistrationSuccess {...state} dryRun />;
  return (
    <form action={action} className="space-y-5">
      <label className="block">
        <span className="text-sm font-medium text-bone">Your name</span>
        <input
          name="name"
          required
          maxLength={40}
          autoComplete="name"
          defaultValue={state.kind === 'error' ? state.name : undefined}
          aria-invalid={state.kind === 'error' ? true : undefined}
          placeholder="e.g. Anagh"
          className="field text-lg"
        />
      </label>
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>Website <input name="website" tabIndex={-1} autoComplete="off" /></label>
      </div>
      {state.kind === 'error' && (
        <p role="alert" className="panel border-l-2 border-l-ember px-4 py-3 text-sm text-ember">{state.message}</p>
      )}
      <button disabled={pending} className="btn btn-primary w-full">{pending ? 'Joining…' : 'Join the dry run'}</button>
      <p className="text-center text-xs text-steel">You get a one-person test agency, checked in and ready for the rounds.</p>
    </form>
  );
}
