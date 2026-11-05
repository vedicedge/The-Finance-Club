'use client';

import { useActionState } from 'react';
import { loginAgency, type AgencyLoginState } from './actions';

const idle: AgencyLoginState = { kind: 'idle' };

export function AgencyLoginForm() {
  const [state, action, pending] = useActionState(loginAgency, idle);
  return (
    <form action={action} className="space-y-5">
      <label className="block">
        <span className="eyebrow">Agency ID</span>
        <input
          name="agency_id"
          required
          autoCapitalize="characters"
          autoComplete="username"
          spellCheck={false}
          placeholder="A07"
          defaultValue={state.kind === 'error' ? state.agencyId : undefined}
          className="field num text-2xl tracking-[0.12em] uppercase"
        />
      </label>
      <label className="block">
        <span className="eyebrow">4-digit PIN</span>
        <input
          name="pin"
          required
          type="password"
          inputMode="numeric"
          pattern="[0-9]{4}"
          maxLength={4}
          autoComplete="current-password"
          placeholder="••••"
          className="field num text-2xl tracking-[0.5em]"
        />
      </label>
      {state.kind === 'error' && (
        <p role="alert" className="panel border-l-2 border-l-ember px-4 py-3 text-sm text-ember">
          {state.message}
        </p>
      )}
      <button type="submit" disabled={pending} className="btn btn-primary w-full">
        {pending ? 'Establishing secure line…' : 'Enter'}
      </button>
    </form>
  );
}
