/**
 * Event identity. Change the name here and it changes everywhere on the site.
 * (The spec's earlier working title was "Hero Inc. — The Doomsday Protocol".)
 */
export const EVENT = {
  name: 'Doomsday',
  tagline: 'Fund it ★ Build it ★ Save the city.',
  club: 'The Finance Club',
  villain: 'Professor Kalyug',
  city: 'Mahanagar',
  winnerTitle: "Mahanagar's Hero Agency of the Year",
  /** Default start; the live value is the admin setting `event.starts_at`. */
  defaultStartsAt: '2026-11-25T17:30:00+05:30',
  timeZone: 'Asia/Kolkata',
} as const;

/** Round names exactly as in the spec. */
export const ROUNDS = {
  prelim: 'Hero Ya Zero?',
  round1: 'Power Bazaar',
  round2: 'Operation: Skyline',
  round3: 'The Doomsday Vault',
  zeroHour: 'Zero Hour',
} as const;
