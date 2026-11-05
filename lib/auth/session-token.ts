import { createHash, randomBytes } from 'node:crypto';

/**
 * Agency session tokens. The browser holds the random token in an httpOnly cookie; the
 * database (agency_sessions) stores only its SHA-256 hash, so a database leak cannot be
 * replayed as a login.
 */

export const AGENCY_SESSION_COOKIE = 'doomsday_agency';
/** Sessions last until the morning after the event; the agency can always log in again. */
export const AGENCY_SESSION_TTL_S = 60 * 60 * 24 * 30;

export function newSessionToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
