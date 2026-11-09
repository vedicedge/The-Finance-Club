/** The printable sheets (Command centre → Print & backups) and when each is used. */
export const SHEETS = {
  checklist: { title: 'Dry-run checklist', when: 'Before and during the rehearsal; the last part is the event-day pre-flight.' },
  checkin: { title: 'Check-in desk', when: 'Check-in. Lists every agency with its founders; tick when all are present.' },
  auction: { title: 'Power Bazaar · lot tally & fund tracker', when: 'Round 1. Every lot in running order, and each agency’s fund and gear.' },
  ledger: { title: 'Backup Fund Ledger', when: 'Any round, only while the site is down. Re-enter every line afterwards.' },
  round2: { title: 'Operation: Skyline · duels & tower scores', when: 'Round 2. Story-vote counts and the tower measurements, with the formula.' },
  round3: { title: 'The Doomsday Vault · deal, missions, transfers & fines', when: 'Round 3. Who holds which card and what each mission winner chose.' },
  'zero-hour': { title: 'Zero Hour · Hero Scores', when: 'Zero Hour. Work the Hero Scores by hand as the cards open.' },
  all: { title: 'Full set of backup sheets', when: 'Everything above except the checklist, in one print.' },
} as const;

export type SheetId = keyof typeof SHEETS;

export function isSheet(v: string): v is SheetId {
  return Object.hasOwn(SHEETS, v);
}
