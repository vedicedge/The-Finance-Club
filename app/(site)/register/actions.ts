'use server';

import { serviceDb } from '@/lib/db/server';
import { getEventState, registrationStatus } from '@/lib/event-state';
import { generatePin, hashPin } from '@/lib/auth/pin';
import { startAgencySession } from '@/lib/auth/agency';
import { registrationErrorMessage, validateRegistration } from '@/lib/registration';

export type RegisterState =
  | { kind: 'idle' }
  | { kind: 'error'; message?: string; errors?: Record<string, string>; values: Record<string, string> }
  | { kind: 'done'; agencyId: string; agencyName: string; pin: string; captain: string };

const FIELDS = ['agency_name', ...[0, 1, 2].flatMap((i) => ['name', 'section', 'phone', 'email'].map((f) => `f${i}_${f}`))];

export async function registerAgency(_prev: RegisterState, formData: FormData): Promise<RegisterState> {
  const values = Object.fromEntries(FIELDS.map((f) => [f, String(formData.get(f) ?? '')]));

  // Honeypot: people never see this field; bots tend to fill it.
  if (String(formData.get('website') ?? '') !== '') return { kind: 'error', message: 'Signal interference. Try again.', values };

  const state = await getEventState();
  if (!state.live) return { kind: 'error', message: 'Registration is offline right now. Try again shortly.', values };
  const status = registrationStatus(state);
  if (!status.open) {
    return {
      kind: 'error',
      message: status.reason === 'full' ? 'All agency slots are taken.' : 'Registration is closed.',
      values,
    };
  }

  const checked = validateRegistration(values, state.settings.registration.emailDomain);
  if (!checked.ok) return { kind: 'error', errors: checked.errors, message: 'Some details need fixing.', values };

  const pin = generatePin();
  const { data, error } = await serviceDb().rpc('register_agency', {
    p_name: checked.value.agencyName,
    p_founders: checked.value.founders.map((f) => ({
      name: f.name,
      section: f.section,
      phone: f.phone,
      email: f.email,
      is_captain: f.isCaptain,
    })),
    p_pin_hash: await hashPin(pin),
  });
  if (error || typeof data !== 'string') {
    const mapped = registrationErrorMessage(`${error?.message ?? ''} ${error?.details ?? ''}`);
    return {
      kind: 'error',
      message: mapped.text,
      errors: mapped.field ? { [mapped.field]: mapped.text } : undefined,
      values,
    };
  }

  // Signed in straight away on this phone, so the agency can open My Agency.
  await startAgencySession(data, { single: false });
  return { kind: 'done', agencyId: data, agencyName: checked.value.agencyName, pin, captain: checked.value.founders[0].name };
}
