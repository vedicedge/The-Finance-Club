import { NextResponse } from 'next/server';
import { getOrganiser } from '@/lib/auth/organiser';
import { canAccess } from '@/lib/auth/roles';
import { serviceDb } from '@/lib/db/server';
import { isPhase, type Phase } from '@/lib/phases';
import { isProjectorMode, projectorScreen, type ProjectorMode } from '@/lib/projector';
import { parseSettings } from '@/lib/settings';

/**
 * What /projector should show right now: the phase, the projector mode (auto or pinned) and the
 * screen that follows from them, plus what the welcome slide needs. Public facts only.
 */
export async function GET() {
  const headers = { 'Cache-Control': 'no-store' };
  const organiser = await getOrganiser();
  if (!organiser || !canAccess(organiser.roles, 'screens')) {
    return NextResponse.json({ error: 'not_signed_in' }, { status: 401, headers });
  }
  const db = serviceDb();
  let row = await db.from('event_state').select('phase, projector, settings').maybeSingle();
  // Before the 8 November database update the projector column is missing: show auto.
  if (row.error) row = (await db.from('event_state').select('phase, settings').maybeSingle()) as typeof row;
  const phase: Phase = isPhase(row.data?.phase) ? row.data.phase : 'registration';
  const raw = (row.data as { projector?: unknown } | null)?.projector;
  const mode: ProjectorMode = isProjectorMode(raw) ? raw : 'auto';
  const settings = parseSettings(row.data?.settings);
  const agencies = await db.from('agencies').select('id', { count: 'exact', head: true }).eq('is_test', false);

  return NextResponse.json(
    {
      now: new Date().toISOString(),
      phase,
      mode,
      screen: projectorScreen(mode, phase),
      startsAt: settings.event.startsAt,
      venue: settings.event.venue,
      agencies: agencies.count ?? 0,
    },
    { headers },
  );
}
