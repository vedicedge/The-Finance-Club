import Link from 'next/link';
import { canAccess } from '@/lib/auth/roles';
import type { Organiser } from '@/lib/auth/organiser';
import { AUTO_SCREEN, PROJECTOR_SCREENS, SCREEN_LABEL, projectorScreen, type ProjectorMode } from '@/lib/projector';
import { PHASE_INFO, type Phase } from '@/lib/phases';
import { setProjector } from '@/app/admin/actions';
import { announceNext } from '@/app/admin/results/actions';
import { RESULT_BUTTON, resultStage } from '@/lib/zero-hour';

/**
 * The command centre's projector control: what the auditorium sees now (with a live preview),
 * automatic or pinned, and the Zero Hour "next envelope" button, so nobody touches the
 * projector laptop during the event.
 */
export function ProjectorPanel({
  organiser,
  phase,
  step,
  mode,
  available,
}: {
  organiser: Organiser;
  phase: Phase;
  step: string | null;
  mode: ProjectorMode;
  /** False until the 8 November database update has been run. */
  available: boolean;
}) {
  if (!canAccess(organiser.roles, 'projector')) return null;
  const screen = projectorScreen(mode, phase);
  const canReveal = canAccess(organiser.roles, 'reveal');
  const stage = resultStage(phase, step);
  const btn = 'btn !min-h-0 !px-3 !py-2 !text-[0.7rem]';
  return (
    <section id="projector" className="panel mt-10 grid gap-6 px-5 py-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="eyebrow">Projector</h2>
          <Link href="/projector" target="_blank" className="text-sm text-glow underline underline-offset-4">
            Open the projector link ↗
          </Link>
        </div>
        <p className="mt-3 text-lg text-bone">
          Showing <span className="font-semibold text-glow">{SCREEN_LABEL[screen]}</span>
          <span className="text-sm text-steel">
            {' '}
            · {mode === 'auto' ? `automatic (follows the phase: ${PHASE_INFO[phase].label})` : 'pinned until you set it back to automatic'}
          </span>
        </p>
        {!available && (
          <p className="mt-3 rounded-sm border border-ember/40 bg-ember/10 px-3 py-2 text-sm text-ember">
            Pinning needs the newest database update (8 November). Until then the projector stays automatic.
          </p>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          <form action={setProjector.bind(null, 'auto')}>
            <button className={`${btn} ${mode === 'auto' ? 'btn-primary' : 'btn-ghost'}`} disabled={!available}>
              Automatic
            </button>
          </form>
          {PROJECTOR_SCREENS.map((s) => (
            <form key={s} action={setProjector.bind(null, s)}>
              <button
                className={`${btn} ${mode === s ? 'btn-primary' : 'btn-ghost'} ${s === 'blank' ? 'hover:!border-ember hover:!text-ember' : ''}`}
                disabled={!available}
              >
                {SCREEN_LABEL[s]}
              </button>
            </form>
          ))}
        </div>
        <p className="mt-3 text-xs text-steel">
          Automatic: Welcome before the prelim, then the quiz, Power Bazaar, a Round 2 cover (then its results), the Round 3 cover,
          and the Zero Hour results (3rd, 2nd, then 1st). Pin a screen for breaks or announcements; Blackout shows nothing. Now on automatic it would show{' '}
          {SCREEN_LABEL[AUTO_SCREEN[phase]]}.
        </p>

        {phase === 'zero_hour' && canReveal && (
          <div className="mt-5 flex flex-wrap items-center gap-2">
            {stage < 5 ? (
              <form action={announceNext}>
                <button className="btn btn-primary">{RESULT_BUTTON[stage]}</button>
              </form>
            ) : (
              <p className="text-sm text-glow">The Doomsday cover is on the projector.</p>
            )}
            <Link href="/admin/results" className="btn btn-ghost">Final leaderboard →</Link>
          </div>
        )}
      </div>

      <figure className="min-w-0">
        <div className="relative aspect-video overflow-hidden rounded-sm border border-line-strong bg-black">
          <iframe src="/projector?preview=1" title="Projector preview" className="pointer-events-none absolute inset-0 size-full" loading="lazy" />
        </div>
        <figcaption className="mt-2 text-xs text-steel">Live preview: what the auditorium sees.</figcaption>
      </figure>
    </section>
  );
}
