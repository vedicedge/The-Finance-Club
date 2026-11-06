import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, isoToIstLocal, istLocalToIso, parseSettings, serializeSettings } from '@/lib/settings';
import { eventClock, RUN_SHEET, wallClock } from '@/lib/schedule';
import { PHASES, PHASE_INFO, isPhase } from '@/lib/phases';

describe('settings', () => {
  it('falls back to defaults for missing or malformed values', () => {
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
    const s = parseSettings({ registration: { max_agencies: 'lots', closes_at: 'soon' }, security: { pin_max_attempts: 0 } });
    expect(s.registration.maxAgencies).toBe(60);
    expect(s.registration.closesAt).toBe(DEFAULT_SETTINGS.registration.closesAt);
    expect(s.security.pinMaxAttempts).toBe(5);
  });

  it('round-trips through the database shape', () => {
    const custom = { ...DEFAULT_SETTINGS, prizes: { winner: '₹10,000', runnerUp: '₹5,000' } };
    expect(parseSettings(serializeSettings(custom))).toEqual(custom);
  });

  it('an explicit null email domain turns the IMI check off; a missing one keeps the default', () => {
    expect(parseSettings({ registration: { email_domain: null } }).registration.emailDomain).toBeNull();
    expect(parseSettings({ registration: { email_domain: '@IMI.edu' } }).registration.emailDomain).toBe('imi.edu');
    expect(parseSettings({ registration: {} }).registration.emailDomain).toBe('imi.edu');
  });

  it('dry run mode is off unless switched on', () => {
    expect(parseSettings({}).dryRun.enabled).toBe(false);
    expect(parseSettings({ dry_run: { enabled: true } }).dryRun.enabled).toBe(true);
    expect(serializeSettings(parseSettings({ dry_run: { enabled: true } })).dry_run).toEqual({ enabled: true });
  });

  it('reads datetime-local input as India time', () => {
    expect(istLocalToIso('2026-11-25T17:30')).toBe('2026-11-25T17:30:00+05:30');
    expect(isoToIstLocal('2026-11-25T17:30:00+05:30')).toBe('2026-11-25T17:30');
    expect(isoToIstLocal('2026-11-25T12:00:00Z')).toBe('2026-11-25T17:30');
    expect(istLocalToIso('tomorrow')).toBeNull();
  });
});

describe('run-sheet', () => {
  it('matches the spec clock and wall times for a 5:30 pm start', () => {
    const start = '2026-11-25T17:30:00+05:30';
    const rows = RUN_SHEET.map((r) => `${eventClock(r.offsetMin)} ${wallClock(start, r.offsetMin)}`);
    expect(rows).toEqual([
      '0:00 5:30 pm', '0:10 5:40 pm', '0:25 5:55 pm', '0:35 6:05 pm', '1:25 6:55 pm',
      '2:00 7:30 pm', '2:09 7:39 pm', '2:40 8:10 pm', '3:00 8:30 pm',
    ]);
  });

  it('segment lengths add up to 180 minutes', () => {
    expect(RUN_SHEET.reduce((t, r) => t + r.lengthMin, 0)).toBe(180);
  });
});

describe('phases', () => {
  it('every phase has a threat level, rising to Critical at Zero Hour', () => {
    for (const p of PHASES) expect(PHASE_INFO[p].threat).toBeTruthy();
    expect(PHASE_INFO.zero_hour.tone).toBe('critical');
    expect(isPhase('round2')).toBe(true);
    expect(isPhase('fan_club')).toBe(false);
  });
});
