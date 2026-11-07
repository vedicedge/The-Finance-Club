'use client';

import { useActionState } from 'react';
import type { EventSettings } from '@/lib/settings';
import { saveSettings, type SettingsState } from './actions';

type Props = { settings: EventSettings; closesLocal: string; startsLocal: string; tiebreakKey: string };

function Group({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <fieldset className="panel grid gap-4 px-5 py-5 sm:grid-cols-2">
      <legend className="eyebrow -ml-1 px-1">{title}</legend>
      {note && <p className="text-sm text-steel sm:col-span-2">{note}</p>}
      {children}
    </fieldset>
  );
}

function Text({ name, label, value, wide, ...rest }: { name: string; label: string; value: string | number; wide?: boolean } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={`block ${wide ? 'sm:col-span-2' : ''}`}>
      <span className="text-sm text-bone">{label}</span>
      <input name={name} defaultValue={value} className="field" {...rest} />
    </label>
  );
}

function Check({ name, label, checked }: { name: string; label: string; checked: boolean }) {
  return (
    <label className="flex items-center gap-3 text-sm text-bone sm:col-span-2">
      <input type="checkbox" name={name} defaultChecked={checked} className="size-5 accent-glow" /> {label}
    </label>
  );
}

export function SettingsForm({ settings: s, closesLocal, startsLocal, tiebreakKey }: Props) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(saveSettings, { kind: 'idle' });
  return (
    <form action={action} className="space-y-6">
      <Group title="Registration (open decision 1)">
        <Check name="registration_open" label="Registration open" checked={s.registration.open} />
        <Text name="closes_at" label="Closes (India time)" type="datetime-local" value={closesLocal} required />
        <Text name="max_agencies" label="Maximum agencies" type="number" min={1} max={999} value={s.registration.maxAgencies} required />
        <Text name="eligibility" label="Eligibility" value={s.registration.eligibility} />
        <Text name="fee" label="Fee" value={s.registration.fee} />
        <Text name="email_domain" label="Required email domain (blank = any email)" value={s.registration.emailDomain ?? ''} placeholder="imi.edu" />
        <label className="block sm:col-span-2">
          <span className="text-sm text-bone">Email reminder shown on the form</span>
          <textarea name="email_hint" defaultValue={s.registration.emailHint} rows={2} className="field" />
        </label>
      </Group>

      <Group title="Event (open decision 2)" note="Drives the countdown and every time on the schedule.">
        <Text name="starts_at" label="Starts (India time)" type="datetime-local" value={startsLocal} required />
        <Text name="venue" label="Venue" value={s.event.venue} />
      </Group>

      <Group title="Prelim">
        <Check name="requires_checkin" label="Agencies must be checked in to play the prelim" checked={s.prelim.requiresCheckin} />
        <Text
          name="lead_in_seconds"
          label="Read-in before each question's clock starts (seconds, 0–10)"
          type="number"
          min={0}
          max={10}
          value={s.prelim.leadInSeconds}
        />
      </Group>

      <Group title="Round 1 · Power Bazaar">
        <Check name="show_fund_publicly" label="Show every agency's fund left on the public leaderboard before Round 1 locks (open decision 4)" checked={s.round1.showFundPublicly} />
        <label className="block">
          <span className="text-sm text-bone">Insider Tip: which drawn news card it reveals</span>
          <select name="insider_tip_assignment" defaultValue={s.round1.insiderTipAssignment} className="field">
            <option value="random">Site picks at random from the 6 drawn</option>
            <option value="manual">Ledger keeper picks</option>
          </select>
        </label>
      </Group>

      <Group title="Round 2 · Operation: Skyline">
        <Text name="cutoff_tiebreak" label="Tie at the top-8 cutoff is settled by (open decision 8)" value={s.round2.cutoffTiebreak} wide />
      </Group>

      <Group title="Zero Hour">
        <label className="block sm:col-span-2">
          <span className="text-sm text-bone">Hero Score tie for 1st or 2nd (open decision 3)</span>
          <select name="hero_tiebreak" defaultValue={tiebreakKey} className="field">
            <option value="fund,power,coin">Higher fund left, then higher Power Level, then coin toss</option>
            <option value="power,fund,coin">Higher Power Level, then higher fund left, then coin toss</option>
            <option value="coin">Coin toss</option>
          </select>
        </label>
        <Text name="prize_winner" label="Winner prize (blank = to be announced)" value={s.prizes.winner ?? ''} />
        <Text name="prize_runner_up" label="Runner-up prize (blank = to be announced)" value={s.prizes.runnerUp ?? ''} />
      </Group>

      <Group title="Security" note="After this many wrong PINs, that agency ID is locked for the lock time.">
        <Text name="pin_max_attempts" label="Wrong PINs allowed" type="number" min={1} max={50} value={s.security.pinMaxAttempts} />
        <Text name="pin_lock_seconds" label="Lock time (seconds)" type="number" min={5} max={3600} value={s.security.pinLockSeconds} />
      </Group>

      <div className="flex flex-wrap items-center gap-4">
        <button disabled={pending} className="btn btn-primary">
          {pending ? 'Saving…' : 'Save settings'}
        </button>
        {state.kind === 'ok' && <p role="status" className="text-sm text-toxic">Transmission received. Settings saved.</p>}
        {state.kind === 'error' && <p role="alert" className="text-sm text-ember">{state.message}</p>}
      </div>
    </form>
  );
}
