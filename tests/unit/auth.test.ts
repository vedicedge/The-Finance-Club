import { describe, expect, it } from 'vitest';
import { generatePin, hashPin, isValidPin, verifyPin } from '@/lib/auth/pin';
import { hashSessionToken, newSessionToken } from '@/lib/auth/session-token';
import { AREAS, areasFor, canAccess, ROLES, type Role } from '@/lib/auth/roles';

describe('agency PINs', () => {
  it('generates 4-digit PINs, including leading zeros', () => {
    for (let i = 0; i < 500; i++) expect(generatePin()).toMatch(/^[0-9]{4}$/);
  });

  it('hashes with a random salt and verifies only the right PIN', async () => {
    const a = await hashPin('0427');
    const b = await hashPin('0427');
    expect(a).not.toBe(b);
    expect(a).not.toContain('0427');
    expect(await verifyPin('0427', a)).toBe(true);
    expect(await verifyPin('0428', a)).toBe(false);
    expect(await verifyPin('427', a)).toBe(false);
    expect(await verifyPin('0427', 'garbage')).toBe(false);
  });

  it('rejects anything that is not exactly 4 digits', () => {
    for (const bad of ['', '123', '12345', 'abcd', '12 3', '١٢٣٤']) expect(isValidPin(bad)).toBe(false);
  });
});

describe('agency session tokens', () => {
  it('are long and random, and only their hash is stored', () => {
    const t = newSessionToken();
    expect(t.length).toBeGreaterThanOrEqual(43);
    expect(newSessionToken()).not.toBe(t);
    expect(hashSessionToken(t)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashSessionToken(t)).toBe(hashSessionToken(t));
  });
});

describe('organiser roles', () => {
  it('admin can reach every area', () => {
    for (const area of Object.keys(AREAS) as (keyof typeof AREAS)[]) expect(canAccess(['admin'], area)).toBe(true);
  });

  it('each role reaches only its own screens', () => {
    const can = (role: Role) => areasFor([role]);
    expect(can('quiz_host')).toEqual(['dashboard', 'quiz', 'screens']);
    expect(can('ledger_keeper')).toEqual(['dashboard', 'auction', 'ledger', 'round3', 'screens']);
    expect(can('scorer')).toEqual(['dashboard', 'round2', 'round3', 'screens']);
    expect(can('social_lead')).toEqual(['dashboard', 'round2', 'screens']);
    expect(can('anchor')).toEqual(['dashboard', 'reveal', 'screens']);
    expect(can('auctioneer')).toEqual(['dashboard', 'auction', 'screens']);
    expect(can('floater')).toEqual(['dashboard', 'agencies', 'screens']);
  });

  it('only admin can change settings or crew roles', () => {
    for (const role of ROLES.filter((r) => r !== 'admin')) {
      expect(canAccess([role], 'settings')).toBe(false);
      expect(canAccess([role], 'users')).toBe(false);
    }
  });

  it('roles combine', () => {
    expect(canAccess(['scorer', 'floater'], 'agencies')).toBe(true);
    expect(canAccess([], 'dashboard')).toBe(false);
  });
});
