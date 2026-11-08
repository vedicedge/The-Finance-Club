'use client';

import { useActionState } from 'react';
import { RegistrationSuccess } from '@/components/site/RegistrationSuccess';
import { registerAgency, type RegisterState } from './actions';

const idle: RegisterState = { kind: 'idle' };

function Field({
  name,
  label,
  state,
  ...input
}: { name: string; label: string; state: RegisterState } & React.InputHTMLAttributes<HTMLInputElement>) {
  const error = state.kind === 'error' ? state.errors?.[name] : undefined;
  const value = state.kind === 'error' ? state.values[name] : undefined;
  return (
    <label className="block">
      <span className="text-sm font-medium text-bone">{label}</span>
      <input
        name={name}
        defaultValue={value}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${name}-error` : undefined}
        className="field"
        {...input}
      />
      {error && (
        <span id={`${name}-error`} className="mt-1.5 block text-sm text-ember">
          {error}
        </span>
      )}
    </label>
  );
}

export function RegisterForm({ emailDomain, emailHint, smallTeams = false }: { emailDomain: string | null; emailHint: string; smallTeams?: boolean }) {
  const [state, action, pending] = useActionState(registerAgency, idle);

  if (state.kind === 'done') return <RegistrationSuccess {...state} />;

  return (
    <form action={action} className="space-y-8" noValidate>
      {emailDomain && (
        <p className="panel border-l-2 border-l-glow px-4 py-3 text-sm text-bone">
          <strong className="text-glow">Reminder:</strong> {emailHint}
        </p>
      )}

      <fieldset className="space-y-4">
        <legend className="eyebrow">Agency</legend>
        <Field name="agency_name" label="Agency name" state={state} required maxLength={40} autoComplete="off" placeholder="e.g. Rakshak Labs" />
      </fieldset>

      {[0, 1, 2].map((i) => (
        <fieldset key={i} className="panel space-y-4 px-4 py-5 sm:px-5">
          <legend className="eyebrow -ml-1 px-1">
            Founder {i + 1}
            {i === 0 && <span className="ml-2 text-glow">· Captain</span>}
            {i > 0 && smallTeams && <span className="ml-2 text-steel">· Optional</span>}
          </legend>
          {i === 0 && <p className="text-sm text-steel">The captain logs in on the quiz phone on Doomsday.</p>}
          <Field name={`f${i}_name`} label="Full name" state={state} required={i === 0 || !smallTeams} maxLength={60} autoComplete={i === 0 ? 'name' : 'off'} />
          <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
            <Field name={`f${i}_section`} label="Section" state={state} required={i === 0 || !smallTeams} maxLength={20} placeholder="e.g. E" autoComplete="off" />
            <Field name={`f${i}_phone`} label="Mobile number" state={state} required={i === 0 || !smallTeams} type="tel" inputMode="tel" placeholder="10-digit mobile" autoComplete={i === 0 ? 'tel-national' : 'off'} />
          </div>
          <Field
            name={`f${i}_email`}
            label={emailDomain ? `IMI email ID (@${emailDomain})` : 'Email'}
            state={state}
            required={i === 0 || !smallTeams}
            type="email"
            inputMode="email"
            autoCapitalize="none"
            spellCheck={false}
            placeholder={emailDomain ? `name@${emailDomain}` : 'name@example.com'}
            autoComplete={i === 0 ? 'email' : 'off'}
          />
        </fieldset>
      ))}

      {/* Honeypot for bots: hidden from people and screen readers. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Website <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {state.kind === 'error' && state.message && (
        <p role="alert" className="panel border-l-2 border-l-ember px-4 py-3 text-sm text-ember">
          Signal interference. {state.message}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn btn-primary w-full">
        {pending ? 'Transmitting…' : 'Register agency'}
      </button>
      <p className="text-center text-xs text-steel">
        By registering you confirm all founders agree to take part. Spotted a typo later? An organiser can correct founder details until registration closes.
      </p>
    </form>
  );
}
