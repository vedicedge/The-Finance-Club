import 'server-only';
import { connection } from 'next/server';
import { serviceDb } from '@/lib/db/server';
import { publicEnv } from '@/lib/env';
import { isPhase, type Phase } from '@/lib/phases';
import { DEFAULT_SETTINGS, parseSettings, type EventSettings } from '@/lib/settings';

export type EventState = {
  phase: Phase;
  step: string | null;
  alert: string | null;
  settings: EventSettings;
  /** Agencies registered so far (for "slots left"). */
  agencyCount: number;
  /** False when the server is not connected to the database yet (shows defaults). */
  live: boolean;
};

const OFFLINE: EventState = {
  phase: 'registration',
  step: null,
  alert: null,
  settings: DEFAULT_SETTINGS,
  agencyCount: 0,
  live: false,
};

/** The live event state for public pages. Never throws: falls back to defaults if offline. */
export async function getEventState(): Promise<EventState> {
  await connection(); // always read at request time, never at build time
  if (!publicEnv() || !process.env.SUPABASE_SECRET_KEY) return OFFLINE;
  try {
    const db = serviceDb();
    const [state, agencies] = await Promise.all([
      db.from('event_state').select('phase, step, alert, settings').maybeSingle(),
      db.from('agencies').select('id', { count: 'exact', head: true }),
    ]);
    if (state.error || !state.data) return OFFLINE;
    return {
      phase: isPhase(state.data.phase) ? state.data.phase : 'registration',
      step: state.data.step,
      alert: state.data.alert,
      settings: parseSettings(state.data.settings),
      agencyCount: agencies.count ?? 0,
      live: true,
    };
  } catch {
    return OFFLINE;
  }
}

/** Whether new agencies can register right now, and why not. */
export function registrationStatus(s: EventState): { open: boolean; reason?: 'closed' | 'deadline' | 'full' | 'phase' } {
  const r = s.settings.registration;
  if (s.phase !== 'registration') return { open: false, reason: 'phase' };
  if (!r.open) return { open: false, reason: 'closed' };
  if (Date.now() >= Date.parse(r.closesAt)) return { open: false, reason: 'deadline' };
  if (s.agencyCount >= r.maxAgencies) return { open: false, reason: 'full' };
  return { open: true };
}
