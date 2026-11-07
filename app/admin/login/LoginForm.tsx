'use client';

import { useActionState, useState } from 'react';
import { sendLoginLink, signInWithPassword, type LoginState } from './actions';

const idle: LoginState = { kind: 'idle' };

export function LoginForm() {
  const [mode, setMode] = useState<'link' | 'password'>('link');
  const [linkState, linkAction, linkPending] = useActionState(sendLoginLink, idle);
  const [pwState, pwAction, pwPending] = useActionState(signInWithPassword, idle);
  const state = mode === 'link' ? linkState : pwState;
  const pending = mode === 'link' ? linkPending : pwPending;

  return (
    <form action={mode === 'link' ? linkAction : pwAction} className="mt-8 space-y-5">
      <label className="block">
        <span className="eyebrow">Crew email</span>
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          className="mt-2 block w-full rounded-sm border border-line-strong bg-vault-2 px-4 py-3 text-base text-bone placeholder:text-steel/60 focus:border-glow focus:outline-none"
          placeholder="you@example.com"
        />
      </label>

      {mode === 'password' && (
        <label className="block">
          <span className="eyebrow">Password</span>
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="mt-2 block w-full rounded-sm border border-line-strong bg-vault-2 px-4 py-3 text-base text-bone focus:border-glow focus:outline-none"
          />
        </label>
      )}

      <button
        type="submit"
        disabled={pending}
        className="btn btn-primary w-full"
      >
        {pending ? 'Establishing secure line…' : mode === 'link' ? 'Send sign-in link' : 'Enter command centre'}
      </button>

      {state.kind !== 'idle' && (
        <p
          role="status"
          className={`rounded-sm border px-4 py-3 text-sm ${
            state.kind === 'sent' ? 'border-toxic/40 bg-toxic/10 text-toxic' : 'border-ember/40 bg-ember/10 text-ember'
          }`}
        >
          {state.kind === 'sent' ? 'Transmission sent. ' : 'Signal interference. '}
          {state.message}
        </p>
      )}

      <button
        type="button"
        onClick={() => setMode(mode === 'link' ? 'password' : 'link')}
        className="text-sm text-steel underline decoration-line-strong underline-offset-4 hover:text-bone"
      >
        {mode === 'link' ? 'Use a password instead' : 'Email me a link instead'}
      </button>
    </form>
  );
}
