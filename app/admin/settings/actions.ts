'use server';

import { revalidatePath } from 'next/cache';
import { requireOrganiser } from '@/lib/auth/organiser';
import { serviceDb } from '@/lib/db/server';
import { audit } from '@/lib/audit';
import { DEFAULT_SETTINGS, HERO_TIEBREAK_PRESETS, istLocalToIso, serializeSettings, type EventSettings } from '@/lib/settings';
import { getEventState } from '@/lib/event-state';

export type SettingsState = { kind: 'idle' } | { kind: 'ok' } | { kind: 'error'; message: string };

export async function saveSettings(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const me = await requireOrganiser('settings');
  const text = (k: string) => String(formData.get(k) ?? '').trim();
  const on = (k: string) => formData.get(k) === 'on';
  const num = (k: string) => Number(text(k));

  const closesAt = istLocalToIso(text('closes_at'));
  const startsAt = istLocalToIso(text('starts_at'));
  if (!closesAt || !startsAt) return { kind: 'error', message: 'Enter valid dates and times.' };
  const maxAgencies = num('max_agencies');
  if (!Number.isInteger(maxAgencies) || maxAgencies < 1 || maxAgencies > 999) return { kind: 'error', message: 'Maximum agencies must be 1–999.' };
  const pinMax = num('pin_max_attempts');
  const pinLock = num('pin_lock_seconds');
  if (!Number.isInteger(pinMax) || pinMax < 1 || pinMax > 50) return { kind: 'error', message: 'PIN attempts must be 1–50.' };
  if (!Number.isInteger(pinLock) || pinLock < 5 || pinLock > 3600) return { kind: 'error', message: 'PIN lock must be 5–3600 seconds.' };
  const leadIn = num('lead_in_seconds');
  if (!Number.isInteger(leadIn) || leadIn < 0 || leadIn > 10) return { kind: 'error', message: 'Read-in must be 0–10 seconds.' };
  const domain = text('email_domain').replace(/^@/, '').toLowerCase();
  if (domain && !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) return { kind: 'error', message: 'The email domain looks wrong (e.g. imi.edu).' };

  const next: EventSettings = {
    registration: {
      open: on('registration_open'),
      eligibility: text('eligibility') || DEFAULT_SETTINGS.registration.eligibility,
      emailDomain: domain || null,
      emailHint: text('email_hint') || DEFAULT_SETTINGS.registration.emailHint,
      fee: text('fee') || DEFAULT_SETTINGS.registration.fee,
      closesAt,
      maxAgencies,
      smallTeams: on('small_teams'),
    },
    event: { startsAt, venue: text('venue') || DEFAULT_SETTINGS.event.venue },
    prelim: { requiresCheckin: on('requires_checkin'), leadInSeconds: leadIn },
    round1: {
      showFundPublicly: on('show_fund_publicly'),
      insiderTipAssignment: text('insider_tip_assignment') === 'manual' ? 'manual' : 'random',
    },
    round2: { cutoffTiebreak: text('cutoff_tiebreak') || DEFAULT_SETTINGS.round2.cutoffTiebreak },
    zeroHour: {
      heroTiebreak: HERO_TIEBREAK_PRESETS[text('hero_tiebreak')] ?? DEFAULT_SETTINGS.zeroHour.heroTiebreak,
      revealOrderTiebreak: 'agency_id',
    },
    prizes: { winner: text('prize_winner') || null, runnerUp: text('prize_runner_up') || null },
    security: { pinMaxAttempts: pinMax, pinLockSeconds: pinLock },
    // Dry run is switched on the command centre, not here: keep whatever it is.
    dryRun: (await getEventState()).settings.dryRun,
  };

  const settings = serializeSettings(next);
  const { error } = await serviceDb()
    .from('event_state')
    .update({ settings, updated_at: new Date().toISOString(), updated_by: me.userId })
    .eq('id', true);
  if (error) return { kind: 'error', message: error.message };
  await audit(me, 'settings.save', settings);
  revalidatePath('/', 'layout');
  return { kind: 'ok' };
}
