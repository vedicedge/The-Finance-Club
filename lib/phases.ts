/** Event phases (spec: event_state) and the threat level the site shows for each. */

export const PHASES = ['registration', 'checkin', 'prelim', 'round1', 'round2', 'round3', 'zero_hour', 'ended'] as const;
export type Phase = (typeof PHASES)[number];

export function isPhase(value: unknown): value is Phase {
  return typeof value === 'string' && (PHASES as readonly string[]).includes(value);
}

export type ThreatTone = 'calm' | 'warn' | 'danger' | 'critical' | 'clear';

export const PHASE_INFO: Record<Phase, { label: string; threat: string; tone: ThreatTone; status: string }> = {
  registration: { label: 'Registration', threat: 'Guarded', tone: 'calm', status: 'Agency registration open' },
  checkin: { label: 'Check-in', threat: 'Elevated', tone: 'warn', status: 'Agencies reporting for check-in' },
  prelim: { label: 'Prelim · Hero Ya Zero?', threat: 'High', tone: 'warn', status: 'Prelim live' },
  round1: { label: 'Round 1 · Power Bazaar', threat: 'High', tone: 'warn', status: 'Power Bazaar in session' },
  round2: { label: 'Round 2 · Operation: Skyline', threat: 'Severe', tone: 'danger', status: 'Operation: Skyline under way' },
  round3: { label: 'Round 3 · The Doomsday Vault', threat: 'Severe', tone: 'danger', status: 'The Doomsday Vault is open' },
  zero_hour: { label: 'Zero Hour', threat: 'Critical', tone: 'critical', status: 'Zero Hour: envelopes opening' },
  ended: { label: 'Event over', threat: 'All clear', tone: 'clear', status: 'Mahanagar stands' },
};
