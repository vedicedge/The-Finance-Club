import { EVENT, ROUNDS } from '@/lib/config';

/** The full run-sheet from the spec, as minutes after the start (event clock 0:00). */
export type RunSheetItem = { offsetMin: number; lengthMin: number; segment: string; detail?: string };

export const RUN_SHEET: RunSheetItem[] = [
  { offsetMin: 0, lengthMin: 10, segment: 'Welcome and rules' },
  { offsetMin: 10, lengthMin: 15, segment: `Prelim: ${ROUNDS.prelim}`, detail: '15 questions on your phone' },
  { offsetMin: 25, lengthMin: 10, segment: 'Top 16 announced; break and auction setup' },
  { offsetMin: 35, lengthMin: 50, segment: `Round 1: ${ROUNDS.round1}`, detail: 'Insider Tips, Marquee Auction, Secret Identity Bids, Last Call, Breaking News' },
  { offsetMin: 85, lengthMin: 35, segment: `Round 2: ${ROUNDS.round2}`, detail: 'Posters 5 min + tower and slingshot challenge 30 min' },
  { offsetMin: 120, lengthMin: 9, segment: 'Break: top 8 seated; envelopes dealt' },
  { offsetMin: 129, lengthMin: 31, segment: `Round 3: ${ROUNDS.round3}`, detail: 'Four 7-minute mission cycles' },
  { offsetMin: 160, lengthMin: 20, segment: `${ROUNDS.zeroHour}: last choice, reveal and prizes` },
  { offsetMin: 180, lengthMin: 0, segment: 'Event ends' },
];

/** 130 → "2:10" (event clock). */
export function eventClock(offsetMin: number): string {
  return `${Math.floor(offsetMin / 60)}:${String(offsetMin % 60).padStart(2, '0')}`;
}

const timeFmt = new Intl.DateTimeFormat('en-IN', {
  timeZone: EVENT.timeZone,
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});

/** Start time + offset → "5:40 pm" in India time. */
export function wallClock(startsAtIso: string, offsetMin: number): string {
  return timeFmt.format(new Date(Date.parse(startsAtIso) + offsetMin * 60_000)).toLowerCase().replace(/\s/g, ' ');
}

const dateFmt = new Intl.DateTimeFormat('en-IN', {
  timeZone: EVENT.timeZone,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

/** "Wednesday, 25 November 2026" in India time. */
export function longDate(iso: string): string {
  return dateFmt.format(new Date(iso));
}

const dayMonthFmt = new Intl.DateTimeFormat('en-IN', { timeZone: EVENT.timeZone, day: 'numeric', month: 'long', year: 'numeric' });
const shortFmt = new Intl.DateTimeFormat('en-IN', { timeZone: EVENT.timeZone, day: 'numeric', month: 'short' });

/** "25 November 2026", as on the poster's date line. */
export function posterDate(iso: string): string {
  return dayMonthFmt.format(new Date(iso));
}

/** "25 Nov". */
export function shortDate(iso: string): string {
  return shortFmt.format(new Date(iso));
}
