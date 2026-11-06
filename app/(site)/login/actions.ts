'use server';

import { redirect } from 'next/navigation';
import { serviceDb } from '@/lib/db/server';
import { getEventState } from '@/lib/event-state';
import { hashPin, isValidPin, verifyPin } from '@/lib/auth/pin';
import { endAgencySession, startAgencySession } from '@/lib/auth/agency';
import { normalizeAgencyId } from '@/lib/registration';

export type AgencyLoginState = { kind: 'idle' } | { kind: 'error'; message: string; agencyId: string };

const DENIED = 'Access denied. Check your agency ID and PIN.';
// Compared against when the agency ID doesn't exist, so a wrong ID takes as long as a wrong PIN.
let decoyHash: Promise<string> | null = null;

export async function loginAgency(_prev: AgencyLoginState, formData: FormData): Promise<AgencyLoginState> {
  const rawId = String(formData.get('agency_id') ?? '');
  const pin = String(formData.get('pin') ?? '').trim();
  const agencyId = normalizeAgencyId(rawId);
  const fail = (message: string): AgencyLoginState => ({ kind: 'error', message, agencyId: rawId });

  if (!agencyId || !isValidPin(pin)) return fail('Enter your agency ID (like A07) and your 4-digit PIN.');

  const state = await getEventState();
  if (!state.live) return fail('Login is offline right now. Try again shortly.');

  const db = serviceDb();
  const { data: auth, error } = await db
    .from('agency_auth')
    .select('pin_hash, locked_until, first_login_at')
    .eq('agency_id', agencyId)
    .maybeSingle();
  if (error) return fail('Signal interference. Try again.');

  if (!auth) {
    decoyHash ??= hashPin('0000');
    await verifyPin(pin, await decoyHash);
    return fail(DENIED);
  }

  if (auth.locked_until && Date.parse(auth.locked_until) > Date.now()) {
    const s = Math.ceil((Date.parse(auth.locked_until) - Date.now()) / 1000);
    return fail(`Too many wrong PINs. This agency ID is locked for ${s} more second${s === 1 ? '' : 's'}.`);
  }

  // Spec: new agency logins close when question 1 opens; agencies that signed in before may return.
  if (!auth.first_login_at) {
    const { data: started } = await db.rpc('quiz_has_started');
    if (started === true) return fail('Joining has closed: the prelim has begun. Find an organiser.');
  }

  const ok = await verifyPin(pin, auth.pin_hash);
  const { data: lockedUntil } = await db.rpc('record_pin_attempt', { p_agency: agencyId, p_ok: ok });
  if (!ok) {
    if (typeof lockedUntil === 'string' && Date.parse(lockedUntil) > Date.now()) {
      return fail(`Too many wrong PINs. This agency ID is locked for ${state.settings.security.pinLockSeconds} seconds.`);
    }
    return fail(DENIED);
  }

  // During the prelim, one phone per agency: a new sign-in signs the other phones out.
  await startAgencySession(agencyId, { single: state.phase === 'prelim' });
  redirect(state.phase === 'prelim' ? '/play' : '/me');
}

export async function logoutAgency() {
  await endAgencySession();
  redirect('/login');
}
