/**
 * Registration input checks (spec: Agency rules; amendment A3: @imi.edu emails only).
 * Pure functions, used by the server action and the unit tests. The database enforces the
 * same rules again (3 founders, or 1–3 when small teams are allowed; 1 captain, unique email/phone, email domain).
 */

export type FounderInput = { name: string; section: string; phone: string; email: string; isCaptain: boolean };
export type RegistrationInput = { agencyName: string; founders: FounderInput[] };
export type RegistrationResult =
  | { ok: true; value: RegistrationInput }
  | { ok: false; errors: Record<string, string> };

export const FOUNDER_SLOTS = [0, 1, 2] as const;

const collapse = (s: string) => s.trim().replace(/\s+/g, ' ');

/** Accepts "98765 43210", "+91 98765-43210", "098765 43210" → "9876543210"; null if not an Indian mobile. */
export function normalizePhone(raw: string): string | null {
  let digits = raw.replace(/[\s\-().]/g, '');
  if (digits.startsWith('+91')) digits = digits.slice(3);
  else if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  return /^[6-9][0-9]{9}$/.test(digits) ? digits : null;
}

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function emailMatchesDomain(email: string, domain: string | null): boolean {
  if (!domain) return true;
  return email.endsWith(`@${domain.toLowerCase()}`);
}

/** "a7", "A07", "07", " 7 " → "A07"; null if it can't be an agency ID. */
export function normalizeAgencyId(raw: string): string | null {
  const m = /^a?0*([0-9]{1,3})$/i.exec(raw.trim());
  if (!m) return null;
  const n = Number(m[1]);
  if (n < 1) return null;
  return `A${String(n).padStart(2, '0')}`;
}

const AGENCY_NAME = /^[\p{L}\p{N}][\p{L}\p{N} '&.\-!]*$/u;
const PERSON_NAME = /^[\p{L}][\p{L} .'\-]*$/u;
const SECTION = /^[\p{L}\p{N}][\p{L}\p{N} .\-/]*$/u;
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * Validates the register form. Field names: agency_name and f{0,1,2}_{name,section,phone,email}.
 * Founder 1 (index 0) is the captain.
 */
export function validateRegistration(form: Record<string, string>, emailDomain: string | null, smallTeams = false): RegistrationResult {
  const errors: Record<string, string> = {};
  const agencyName = collapse(form.agency_name ?? '');
  if (agencyName.length < 2 || agencyName.length > 40) errors.agency_name = 'Agency name must be 2–40 characters.';
  else if (!AGENCY_NAME.test(agencyName)) errors.agency_name = 'Use letters, numbers, spaces and & \' . - ! only.';

  // With small teams allowed, founders 2 and 3 may be left blank (a team of 1 or 2).
  const slots = FOUNDER_SLOTS.filter(
    (i) => i === 0 || !smallTeams || ['name', 'section', 'phone', 'email'].some((k) => (form[`f${i}_${k}`] ?? '').trim() !== ''),
  );
  const founders: FounderInput[] = slots.map((i) => {
    const name = collapse(form[`f${i}_name`] ?? '');
    const section = collapse(form[`f${i}_section`] ?? '');
    const phoneRaw = form[`f${i}_phone`] ?? '';
    const email = normalizeEmail(form[`f${i}_email`] ?? '');

    if (name.length < 2 || name.length > 60 || !PERSON_NAME.test(name)) errors[`f${i}_name`] = 'Enter the full name (letters only).';
    if (section.length < 1 || section.length > 20 || !SECTION.test(section)) errors[`f${i}_section`] = 'Enter the section, e.g. E.';
    const phone = normalizePhone(phoneRaw);
    if (!phone) errors[`f${i}_phone`] = 'Enter a 10-digit Indian mobile number.';
    if (!EMAIL.test(email)) errors[`f${i}_email`] = 'Enter a valid email address.';
    else if (!emailMatchesDomain(email, emailDomain)) errors[`f${i}_email`] = `Use the IMI email ID ending in @${emailDomain}.`;

    return { name, section, phone: phone ?? '', email, isCaptain: i === 0 };
  });

  // The same person cannot be two founders.
  founders.forEach((a, x) => {
    founders.forEach((b, y) => {
      if (y <= x) return;
      const j = slots[y];
      if (a.email && a.email === b.email) errors[`f${j}_email`] = 'Each founder needs their own email.';
      if (a.phone && a.phone === b.phone) errors[`f${j}_phone`] = 'Each founder needs their own phone number.';
    });
  });

  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, value: { agencyName, founders } };
}

/** Maps a database error from register_agency to a message for the form. */
export function registrationErrorMessage(message: string): { field?: string; text: string } {
  if (message.includes('registration_closed')) return { text: 'Registration is closed.' };
  if (message.includes('registration_full')) return { text: 'All agency slots are taken.' };
  if (message.includes('agencies_name_key')) return { field: 'agency_name', text: 'Another agency already has this name.' };
  if (message.includes('founders_email_key')) return { text: 'One of these emails is already registered with another agency.' };
  if (message.includes('founders_phone_key')) return { text: 'One of these phone numbers is already registered with another agency.' };
  if (message.includes('must be @')) return { text: 'Every founder must use an IMI email ID.' };
  return { text: 'The registration could not be saved. Please try again.' };
}

/**
 * A last-minute team change at the desk (organisers' request, 15 November): 1 to 3 members,
 * one captain (the slot picked in `captain`). A row left completely blank is a member removed.
 */
export function validateTeamEdit(form: Record<string, string>, emailDomain: string | null): RegistrationResult & { reason?: string } {
  const errors: Record<string, string> = {};
  const filled = FOUNDER_SLOTS.filter((i) => ['name', 'section', 'phone', 'email'].some((k) => (form[`f${i}_${k}`] ?? '').trim() !== ''));
  if (filled.length === 0) errors.form = 'A team needs at least one member.';
  const captain = Number(form.captain ?? '-1');
  if (filled.length > 0 && !filled.includes(captain as 0 | 1 | 2)) errors.captain = 'Pick the captain among the members you kept.';
  const founders: FounderInput[] = filled.map((i) => {
    const name = collapse(form[`f${i}_name`] ?? '');
    const section = collapse(form[`f${i}_section`] ?? '');
    const phone = normalizePhone(form[`f${i}_phone`] ?? '');
    const email = normalizeEmail(form[`f${i}_email`] ?? '');
    if (name.length < 2 || name.length > 60 || !PERSON_NAME.test(name)) errors[`f${i}_name`] = `Member ${i + 1}: enter the full name (letters only).`;
    if (section.length < 1 || section.length > 20 || !SECTION.test(section)) errors[`f${i}_section`] = `Member ${i + 1}: enter the section.`;
    if (!phone) errors[`f${i}_phone`] = `Member ${i + 1}: enter a 10-digit Indian mobile number.`;
    if (!EMAIL.test(email)) errors[`f${i}_email`] = `Member ${i + 1}: enter a valid email address.`;
    else if (!emailMatchesDomain(email, emailDomain)) errors[`f${i}_email`] = `Member ${i + 1}: use the IMI email ID ending in @${emailDomain}.`;
    return { name, section, phone: phone ?? '', email, isCaptain: i === captain };
  });
  const reason = collapse(form.reason ?? '');
  if (reason.length < 3) errors.reason = 'Write a short reason for the change.';
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, value: { agencyName: '', founders }, reason };
}
