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
      <PageHero eyebrow="Run-sheet" title="Schedule">
        {longDate(start)} · {settings.event.venue}. Three hours, start to finish.
      </PageHero>
      <Section eyebrow="Doomsday" title="Hour by hour">
        <ol className="border-t border-line-strong">
          {RUN_SHEET.map((r) => (
            <li key={r.offsetMin} className="grid grid-cols-[5.5rem_1fr] gap-x-4 border-b border-line/70 py-3.5 sm:grid-cols-[7rem_1fr]">
              <span>
                <span className="num block text-lg text-torch">{wallClock(start, r.offsetMin)}</span>
                <span className="num block text-xs text-steel">
                  {eventClock(r.offsetMin)}
                  {r.lengthMin ? ` · ${r.lengthMin} min` : ''}
                </span>
              </span>
              <span>
                <span className="block text-bone">{r.segment}</span>
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
