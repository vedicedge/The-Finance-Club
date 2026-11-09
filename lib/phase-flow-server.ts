import 'server-only';
import { serviceDb } from '@/lib/db/server';
import type { FlowState } from '@/lib/phase-flow';

export async function loadFlowState(): Promise<FlowState> {
  const db = serviceDb();
  const [st, active, held, map] = await Promise.all([
    db.from('event_state').select('phase, prelim_frozen_at, round1_locked_at, round2_published_at').single(),
    db.from('agencies').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    db.from('v_envelope_holders').select('envelope_id', { count: 'exact', head: true }).not('holder_agency_id', 'is', null),
    db.from('envelope_contents').select('envelope_id', { count: 'exact', head: true }),
  ]);
  if (st.error) throw st.error;
  return {
    phase: st.data.phase as string,
    prelimFrozen: Boolean(st.data.prelim_frozen_at),
    round1Locked: Boolean(st.data.round1_locked_at),
    round2Published: Boolean(st.data.round2_published_at),
    envelopesRecorded: (active.count ?? 0) > 0 && held.count === active.count && (map.count ?? 0) >= Math.max(8, active.count ?? 0),
  };
}
