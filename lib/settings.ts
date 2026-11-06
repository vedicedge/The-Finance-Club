/**
 * Admin-editable settings (event_state.settings). Every "Open decision" default from the spec
 * lives here; docs/decisions.md lists them. Parsing is tolerant: a missing or malformed value
 * falls back to its default, so the site never breaks on a half-filled settings row.
 */

export type HeroTiebreak = 'fund_left' | 'power_level' | 'coin_toss';

/** The Hero Score tie-break orders offered on the settings screen (open decision 3). */
export const HERO_TIEBREAK_PRESETS: Record<string, HeroTiebreak[]> = {
  'fund,power,coin': ['fund_left', 'power_level', 'coin_toss'],
  'power,fund,coin': ['power_level', 'fund_left', 'coin_toss'],
  coin: ['coin_toss'],
};

export type EventSettings = {
  registration: {
    open: boolean;
    eligibility: string;
    emailDomain: string | null;
    emailHint: string;
    fee: string;
    closesAt: string; // ISO timestamp
    maxAgencies: number;
  };
  event: { startsAt: string; venue: string };
  prelim: { requiresCheckin: boolean; leadInSeconds: number };
  round1: { showFundPublicly: boolean; insiderTipAssignment: 'random' | 'manual' };
  round2: { cutoffTiebreak: string };
  zeroHour: { heroTiebreak: HeroTiebreak[]; revealOrderTiebreak: 'agency_id' };
  prizes: { winner: string | null; runnerUp: string | null };
  security: { pinMaxAttempts: number; pinLockSeconds: number };
  /** Rehearsal mode: name-only test agencies with one member (see docs/decisions.md). */
  dryRun: { enabled: boolean };
};

export const DEFAULT_SETTINGS: EventSettings = {
  registration: {
    open: true,
    eligibility: 'IMI Delhi students only',
    emailDomain: 'imi.edu',
    emailHint: 'Use your IMI email ID (ending in @imi.edu) for every founder. Other email addresses will not be accepted.',
    fee: 'Free',
    closesAt: '2026-11-23T23:59:00+05:30',
    maxAgencies: 60,
  },
  event: { startsAt: '2026-11-25T17:30:00+05:30', venue: 'Auditorium' },
  prelim: { requiresCheckin: true, leadInSeconds: 3 },
  round1: { showFundPublicly: false, insiderTipAssignment: 'random' },
  round2: { cutoffTiebreak: 'Rock-paper-scissors' },
  zeroHour: { heroTiebreak: ['fund_left', 'power_level', 'coin_toss'], revealOrderTiebreak: 'agency_id' },
  prizes: { winner: null, runnerUp: null },
  security: { pinMaxAttempts: 5, pinLockSeconds: 60 },
  dryRun: { enabled: false },
};

type Json = Record<string, unknown>;
const obj = (v: unknown): Json => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Json) : {});
const str = (v: unknown, d: string) => (typeof v === 'string' && v.trim() !== '' ? v.trim() : d);
const strOrNull = (v: unknown) => (typeof v === 'string' && v.trim() !== '' ? v.trim() : null);
const bool = (v: unknown, d: boolean) => (typeof v === 'boolean' ? v : d);
const int = (v: unknown, d: number, min: number, max: number) =>
  typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max ? v : d;
const isoTime = (v: unknown, d: string) => (typeof v === 'string' && !Number.isNaN(Date.parse(v)) ? v : d);

/** Database JSON (snake_case) → typed settings, with defaults for anything missing. */
export function parseSettings(raw: unknown): EventSettings {
  const d = DEFAULT_SETTINGS;
  const r = obj(raw);
  const reg = obj(r.registration);
  const ev = obj(r.event);
  const pre = obj(r.prelim);
  const r1 = obj(r.round1);
  const r2 = obj(r.round2);
  const zh = obj(r.zero_hour);
  const pz = obj(r.prizes);
  const sec = obj(r.security);
  const dry = obj(r.dry_run);
  const tiebreak = Array.isArray(zh.hero_tiebreak)
    ? zh.hero_tiebreak.filter((t): t is HeroTiebreak => t === 'fund_left' || t === 'power_level' || t === 'coin_toss')
    : [];
  return {
    registration: {
      open: bool(reg.open, d.registration.open),
      eligibility: str(reg.eligibility, d.registration.eligibility),
      // An explicit null/empty turns the email-domain check off.
      emailDomain: 'email_domain' in reg ? strOrNull(reg.email_domain)?.replace(/^@/, '').toLowerCase() ?? null : d.registration.emailDomain,
      emailHint: str(reg.email_hint, d.registration.emailHint),
      fee: str(reg.fee, d.registration.fee),
      closesAt: isoTime(reg.closes_at, d.registration.closesAt),
      maxAgencies: int(reg.max_agencies, d.registration.maxAgencies, 1, 999),
    },
    event: { startsAt: isoTime(ev.starts_at, d.event.startsAt), venue: str(ev.venue, d.event.venue) },
    prelim: {
      requiresCheckin: bool(pre.requires_checkin, d.prelim.requiresCheckin),
      leadInSeconds: int(pre.lead_in_seconds, d.prelim.leadInSeconds, 0, 10),
    },
    round1: {
      showFundPublicly: bool(r1.show_fund_publicly, d.round1.showFundPublicly),
      insiderTipAssignment: r1.insider_tip_assignment === 'manual' ? 'manual' : 'random',
    },
    round2: { cutoffTiebreak: str(r2.cutoff_tiebreak, d.round2.cutoffTiebreak) },
    zeroHour: {
      heroTiebreak: tiebreak.length ? tiebreak : d.zeroHour.heroTiebreak,
      revealOrderTiebreak: 'agency_id',
    },
    prizes: { winner: strOrNull(pz.winner), runnerUp: strOrNull(pz.runner_up) },
    security: {
      pinMaxAttempts: int(sec.pin_max_attempts, d.security.pinMaxAttempts, 1, 50),
      pinLockSeconds: int(sec.pin_lock_seconds, d.security.pinLockSeconds, 5, 3600),
    },
    dryRun: { enabled: bool(dry.enabled, d.dryRun.enabled) },
  };
}

/** Typed settings → database JSON (snake_case). */
export function serializeSettings(s: EventSettings): Json {
  return {
    registration: {
      open: s.registration.open,
      eligibility: s.registration.eligibility,
      email_domain: s.registration.emailDomain,
      email_hint: s.registration.emailHint,
      fee: s.registration.fee,
      closes_at: s.registration.closesAt,
      max_agencies: s.registration.maxAgencies,
    },
    event: { starts_at: s.event.startsAt, venue: s.event.venue },
    prelim: { requires_checkin: s.prelim.requiresCheckin, lead_in_seconds: s.prelim.leadInSeconds },
    round1: { show_fund_publicly: s.round1.showFundPublicly, insider_tip_assignment: s.round1.insiderTipAssignment },
    round2: { cutoff_tiebreak: s.round2.cutoffTiebreak },
    zero_hour: { hero_tiebreak: s.zeroHour.heroTiebreak, reveal_order_tiebreak: s.zeroHour.revealOrderTiebreak },
    prizes: { winner: s.prizes.winner, runner_up: s.prizes.runnerUp },
    security: { pin_max_attempts: s.security.pinMaxAttempts, pin_lock_seconds: s.security.pinLockSeconds },
    dry_run: { enabled: s.dryRun.enabled },
  };
}

/**
 * "2026-11-25T17:30" typed into a datetime-local box means India time. Returns an ISO string
 * with the +05:30 offset, or null if the value is not a valid date-time.
 */
export function istLocalToIso(local: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local.trim());
  if (!m) return null;
  const iso = `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:00+05:30`;
  return Number.isNaN(Date.parse(iso)) ? null : iso;
}

/** ISO timestamp → the "YYYY-MM-DDTHH:mm" India-time value a datetime-local box expects. */
export function isoToIstLocal(iso: string): string {
  const shifted = new Date(Date.parse(iso) + 330 * 60_000);
  return shifted.toISOString().slice(0, 16);
}
