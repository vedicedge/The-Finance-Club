import 'server-only';
import { serviceDb } from '@/lib/db/server';
import type { FlowState } from '@/lib/phase-flow';

export async function loadFlowState(): Promise<FlowState> {
  const db = serviceDb();
  const [st, m4] = await Promise.all([
    db.from('event_state').select('phase, prelim_frozen_at, round1_locked_at, round2_published_at').single(),
    db.from('missions').select('winner_agency_id, choice').eq('no', 4).maybeSingle(),
  ]);
  if (st.error) throw st.error;
  return {
    phase: st.data.phase as string,
    prelimFrozen: Boolean(st.data.prelim_frozen_at),
    round1Locked: Boolean(st.data.round1_locked_at),
    round2Published: Boolean(st.data.round2_published_at),
    mission4Decided: Boolean(m4.data?.winner_agency_id) || m4.data?.choice === 'none',
  };
}
