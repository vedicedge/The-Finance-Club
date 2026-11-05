import { randomInt, randomBytes, scrypt as scryptCb, timingSafeEqual, type ScryptOptions } from 'node:crypto';

/**
 * Agency PINs: 4 digits, stored only as a salted scrypt hash (spec: Security rules).
 * A 4-digit PIN is weak on its own; the login route also throttles attempts per agency ID
 * (settings.security.pin_max_attempts / pin_lock_seconds).
 */

const N = 16384;
const R = 8;
const P = 1;
const KEYLEN = 32;

function scrypt(password: string, salt: Buffer, keylen: number, options: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCb(password, salt, keylen, options, (err, key) => (err ? reject(err) : resolve(key)));
  });
}

export function isValidPin(pin: string): boolean {
  return /^[0-9]{4}$/.test(pin);
}

/** A uniformly random 4-digit PIN, "0000"–"9999". */
export function generatePin(): string {
  return randomInt(0, 10_000).toString().padStart(4, '0');
}

export async function hashPin(pin: string): Promise<string> {
  if (!isValidPin(pin)) throw new RangeError('PIN must be exactly 4 digits');
  const salt = randomBytes(16);
  const key = await scrypt(pin, salt, KEYLEN, { N, r: R, p: P });
  return `scrypt$${N}$${R}$${P}$${salt.toString('base64')}$${key.toString('base64')}`;
}

export async function verifyPin(pin: string, stored: string): Promise<boolean> {
  if (!isValidPin(pin)) return false;
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [, n, r, p, saltB64, keyB64] = parts;
  const expected = Buffer.from(keyB64, 'base64');
  const key = await scrypt(pin, Buffer.from(saltB64, 'base64'), expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
  });
  return key.length === expected.length && timingSafeEqual(key, expected);
}
