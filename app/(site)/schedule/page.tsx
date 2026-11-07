import type { Metadata } from 'next';
import { getEventState } from '@/lib/event-state';
import { eventClock, longDate, RUN_SHEET, wallClock } from '@/lib/schedule';
import { PageHero, Section } from '@/components/site/Prose';

export const metadata: Metadata = { title: 'Schedule' };

export default async function SchedulePage() {
  const { settings } = await getEventState();
  const start = settings.event.startsAt;

  return (
    <>
      <PageHero eyebrow="Run-sheet" title="Schedule" art="zerohour">
        {longDate(start)} · {settings.event.venue}. Three hours, start to finish.
      </PageHero>
      <Section eyebrow="Doomsday" title="Hour by hour">
        <ol className="relative ml-1 border-l border-glow/30">
          {RUN_SHEET.map((r) => (
            <li key={r.offsetMin} className="relative grid grid-cols-[5.5rem_1fr] gap-x-4 py-3.5 !pl-6 sm:grid-cols-[7rem_1fr]">
              <span className="absolute top-[1.35rem] -left-[5px] size-[9px] rotate-45 border border-glow bg-abyss" aria-hidden="true" />
              <span>
                <span className="num block text-lg text-glow">{wallClock(start, r.offsetMin)}</span>
                <span className="num block text-xs text-steel">
                  {eventClock(r.offsetMin)}
                  {r.lengthMin ? ` · ${r.lengthMin} min` : ''}
                </span>
              </span>
              <span className="border-b border-line/60 pb-3.5">
                <span className="font-display block font-semibold tracking-[0.03em] text-bone">{r.segment}</span>
                {r.detail && <span className="mt-0.5 block text-sm text-steel">{r.detail}</span>}
              </span>
            </li>
          ))}
        </ol>
        <p className="text-sm text-steel">
          Arrive before the start: all three founders check in at the registration desk, and your captain logs in on the
          quiz phone before the prelim begins.
        </p>
      </Section>
    </>
  );
}
