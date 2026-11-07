import { canAccess } from '@/lib/auth/roles';
import type { Organiser } from '@/lib/auth/organiser';
import { NEXT_PHASE, canAdvance, phaseLabel, type NextPhase as To } from '@/lib/phase-flow';
import { loadFlowState } from '@/lib/phase-flow-server';
import { goToPhase } from '@/app/admin/actions';

/**
 * "Round 1 is locked. Next: Round 2 →" on a console, once its round is finished. Admins get
 * the button; other roles are told who moves the event on. Renders nothing until ready.
 */
export async function NextPhase({ organiser, to }: { organiser: Organiser; to: To }) {
  const state = await loadFlowState();
  if (!canAdvance(to, state)) return null;
  const admin = canAccess(organiser.roles, 'settings');
  return (
    <section className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-sm border border-glow bg-glow/10 px-5 py-4">
      <p className="text-bone">
        {NEXT_PHASE[to].done} Next: <strong>{phaseLabel(to)}</strong>.
        {!admin && <span className="block text-sm text-steel">An admin starts it from here or the command centre.</span>}
      </p>
      {admin && (
        <form action={goToPhase.bind(null, to)}>
          <button className="btn btn-primary">Start {phaseLabel(to)} →</button>
        </form>
      )}
    </section>
  );
}
