import { describe, expect, it } from 'vitest';
import {
  normalizeAgencyId,
  normalizePhone,
  registrationErrorMessage,
  validateRegistration,
  validateTeamEdit,
} from '@/lib/registration';

const valid = (): Record<string, string> => ({
  agency_name: 'Rakshak Labs',
  f0_name: 'Aanya Sharma', f0_section: 'E', f0_phone: '98765 43210', f0_email: 'Aanya.S@IMI.edu',
  f1_name: 'Kabir Mehta', f1_section: 'E', f1_phone: '+91 91234-56789', f1_email: 'kabir@imi.edu',
  f2_name: "Zoya D'Souza", f2_section: 'F', f2_phone: '08123456789', f2_email: 'zoya@imi.edu',
});

describe('registration form', () => {
  it('teams of 1 or 2 only when small teams are allowed', () => {
    const duo = { ...valid(), f2_name: '', f2_section: '', f2_phone: '', f2_email: '' };
    expect(validateRegistration(duo, 'imi.edu').ok).toBe(false);
    const r = validateRegistration(duo, 'imi.edu', true);
    expect(r.ok && r.value.founders.length).toBe(2);
    const half = validateRegistration({ ...duo, f2_name: 'Zoya' }, 'imi.edu', true);
    expect(!half.ok && half.errors.f2_phone).toBeTruthy();
  });

  it('accepts a valid agency and normalises phones and emails; founder 1 is captain', () => {
    const r = validateRegistration(valid(), 'imi.edu');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.founders.map((f) => f.phone)).toEqual(['9876543210', '9123456789', '8123456789']);
    expect(r.value.founders[0].email).toBe('aanya.s@imi.edu');
    expect(r.value.founders.map((f) => f.isCaptain)).toEqual([true, false, false]);
  });

  it('rejects any non-IMI email (amendment A3) and look-alike domains', () => {
    const r = validateRegistration({ ...valid(), f1_email: 'kabir@gmail.com', f2_email: 'zoya@imi.edu.in' }, 'imi.edu');
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors.f1_email).toMatch(/@imi.edu/);
    expect(r.errors.f2_email).toMatch(/@imi.edu/);
  });

  it('allows other domains when the setting is cleared', () => {
    expect(validateRegistration({ ...valid(), f1_email: 'kabir@gmail.com' }, null).ok).toBe(true);
  });

  it('needs all three founders filled in', () => {
    const r = validateRegistration({ ...valid(), f2_name: '', f2_phone: '', f2_email: '', f2_section: '' }, 'imi.edu');
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(Object.keys(r.errors).sort()).toEqual(['f2_email', 'f2_name', 'f2_phone', 'f2_section']);
  });

  it('refuses the same person twice', () => {
    const r = validateRegistration({ ...valid(), f2_email: 'kabir@imi.edu', f2_phone: '9123456789' }, 'imi.edu');
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors.f2_email).toMatch(/own email/);
    expect(r.errors.f2_phone).toMatch(/own phone/);
  });

  it('checks the agency name', () => {
    for (const bad of ['', 'A', '<script>', 'x'.repeat(41)]) {
      expect(validateRegistration({ ...valid(), agency_name: bad }, 'imi.edu').ok, bad).toBe(false);
    }
    expect(validateRegistration({ ...valid(), agency_name: '  Chai  & Code 2.0! ' }, 'imi.edu').ok).toBe(true);
  });
});

describe('normalisers', () => {
  it('phones: Indian mobiles only', () => {
    expect(normalizePhone('9876543210')).toBe('9876543210');
    expect(normalizePhone('+919876543210')).toBe('9876543210');
    expect(normalizePhone('919876543210')).toBe('9876543210');
    expect(normalizePhone('(98765) 43210')).toBe('9876543210');
    expect(normalizePhone('1234567890')).toBeNull();
    expect(normalizePhone('98765')).toBeNull();
  });

  it('agency IDs: forgiving input, canonical output', () => {
    expect(normalizeAgencyId('a7')).toBe('A07');
    expect(normalizeAgencyId('A07')).toBe('A07');
    expect(normalizeAgencyId(' 12 ')).toBe('A12');
    expect(normalizeAgencyId('A100')).toBe('A100');
    expect(normalizeAgencyId('A0')).toBeNull();
    expect(normalizeAgencyId('B07')).toBeNull();
    expect(normalizeAgencyId('')).toBeNull();
  });

  it('turns database errors into form messages', () => {
    expect(registrationErrorMessage('duplicate key value violates unique constraint "agencies_name_key"').field).toBe('agency_name');
    expect(registrationErrorMessage('registration_full').text).toMatch(/slots/);
    expect(registrationErrorMessage('duplicate key value violates unique constraint "founders_email_key"').text).toMatch(/email/);
  });
});

describe('last-minute team change at the desk', () => {
  const row = (i: number, name: string, phone: string, email: string) => ({
    [`f${i}_name`]: name, [`f${i}_section`]: 'E', [`f${i}_phone`]: phone, [`f${i}_email`]: email,
  });
  it('keeps the filled rows (a blank row is a member removed) and the chosen captain', () => {
    const r = validateTeamEdit({ ...row(0, 'Riya Sen', '9876543210', 'riya@imi.edu'), ...row(2, 'Kabir Das', '9876543211', 'kabir@imi.edu'), captain: '2', reason: 'Member unwell' }, 'imi.edu');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.founders.map((f) => [f.name, f.isCaptain])).toEqual([['Riya Sen', false], ['Kabir Das', true]]);
  });
  it('needs a captain among the members, IMI emails and a reason', () => {
    expect(validateTeamEdit({ ...row(0, 'Riya Sen', '9876543210', 'riya@imi.edu'), captain: '1', reason: 'x change' }, 'imi.edu').ok).toBe(false);
    expect(validateTeamEdit({ ...row(0, 'Riya Sen', '9876543210', 'riya@gmail.com'), captain: '0', reason: 'swap' }, 'imi.edu').ok).toBe(false);
    expect(validateTeamEdit({ ...row(0, 'Riya Sen', '9876543210', 'riya@imi.edu'), captain: '0', reason: '' }, 'imi.edu').ok).toBe(false);
    expect(validateTeamEdit({ captain: '0', reason: 'all gone' }, 'imi.edu').ok).toBe(false);
  });
});
