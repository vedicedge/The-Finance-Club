'use server';

import { revalidatePath } from 'next/cache';
import { requireOrganiser } from '@/lib/auth/organiser';
import { serviceDb } from '@/lib/db/server';
import { audit } from '@/lib/audit';
import { generatePin, hashPin } from '@/lib/auth/pin';
import { getEventState } from '@/lib/event-state';
import { emailMatchesDomain, normalizeEmail, normalizePhone } from '@/lib/registration';

export type PinResetState = { kind: 'idle' } | { kind: 'done'; pin: string } | { kind: 'error'; message: string };
export type FounderEditState = { kind: 'idle' } | { kind: 'ok' } | { kind: 'error'; message: string };

/** Check an agency in at the desk, or undo a check-in made by mistake. */
export async function setCheckedIn(agencyId: string, checkedIn: boolean): Promise<void> {
  const me = await requireOrganiser('agencies');
  const { error } = await serviceDb()
    .from('agencies')
    .update(checkedIn ? { status: 'checked_in', checked_in_at: new Date().toISOString() } : { status: 'registered', checked_in_at: null })
    .eq('id', agencyId)
    .in('status', ['registered', 'checked_in']);
  if (error) throw error;
  await audit(me, checkedIn ? 'agency.check_in' : 'agency.undo_check_in', { agency_id: agencyId });
  revalidatePath('/admin/agencies');
}

/** Issues a new PIN, shown once to the organiser, and signs the agency out of every phone. */
export async function resetPin(agencyId: string, _prev: PinResetState): Promise<PinResetState> {
  const me = await requireOrganiser('agencies');
  const pin = generatePin();
  const db = serviceDb();
  const { data, error } = await db
    .from('agency_auth')
    .update({ pin_hash: await hashPin(pin), failed_attempts: 0, locked_until: null })
    .eq('agency_id', agencyId)
    .select('agency_id');
  if (error || !data?.length) return { kind: 'error', message: error?.message ?? 'Agency not found.' };
  await db.from('agency_sessions').update({ revoked_at: new Date().toISOString() }).eq('agency_id', agencyId).is('revoked_at', null);
  await audit(me, 'agency.reset_pin', { agency_id: agencyId });
  return { kind: 'done', pin };
}

/** Fix a founder's details. The database refuses once registration has closed. */
export async function updateFounder(founderId: number, _prev: FounderEditState, formData: FormData): Promise<FounderEditState> {
  const me = await requireOrganiser('agencies');
  const { settings } = await getEventState();
  const name = String(formData.get('name') ?? '').trim().replace(/\s+/g, ' ');
  const section = String(formData.get('section') ?? '').trim();
  const phone = normalizePhone(String(formData.get('phone') ?? ''));
  const email = normalizeEmail(String(formData.get('email') ?? ''));
  if (name.length < 2 || section.length < 1) return { kind: 'error', message: 'Name and section are required.' };
  if (!phone) return { kind: 'error', message: 'Enter a 10-digit Indian mobile number.' };
  if (!emailMatchesDomain(email, settings.registration.emailDomain)) {
    return { kind: 'error', message: `Email must end in @${settings.registration.emailDomain}.` };
  }
  const { error } = await serviceDb().from('founders').update({ name, section, phone, email }).eq('id', founderId);
  if (error) {
    const msg = error.message.includes('locked')
      ? 'Founders are locked: registration has closed.'
      : error.message.includes('_key')
        ? 'That email or phone already belongs to another founder.'
        : error.message;
    return { kind: 'error', message: msg };
  }
  await audit(me, 'founder.update', { founder_id: founderId, name, section, phone, email });
  revalidatePath('/admin/agencies');
  return { kind: 'ok' };
}

/** Remove a duplicate or test registration. Only while registration is open. */
export async function removeAgency(agencyId: string, formData: FormData): Promise<void> {
  const me = await requireOrganiser('agencies');
  if (formData.get('confirm') !== agencyId) throw new Error(`Type ${agencyId} to confirm removal.`);
  const { error } = await serviceDb().from('agencies').delete().eq('id', agencyId);
  if (error) {
    throw new Error(
      error.message.includes('locked')
        ? 'Registration has closed, so agencies can no longer be removed.'
        : `Could not remove ${agencyId}: ${error.message}`,
    );
  }
  await audit(me, 'agency.remove', { agency_id: agencyId });
  revalidatePath('/admin/agencies');
}
