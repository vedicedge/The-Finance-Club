/** Round 1 · Power Bazaar steps (spec: Auction phases), stored in event_state.step. */

export const R1_STEPS = [
  { id: 'rules', label: 'Rules', clock: '0:35', length: '3 min', note: 'Anchor explains phases, bid rules and the Jugaad Kit.' },
  { id: 'tips', label: 'Insider Tips', clock: '0:38', length: '2 min', note: 'A 1-minute window: agencies buy one tip (₹2 Cr) on My Agency.' },
  { id: 'marquee', label: 'Marquee Auction', clock: '0:40', length: '10 min', note: '8 lots, live with paddles, from the minimum.' },
  { id: 'secret', label: 'Secret Identity Bids', clock: '0:50', length: '22 min', note: '52 cards on slates: show 5 s, write 10 s, unmask 10 s.' },
  { id: 'last_call', label: 'Last Call', clock: '1:12', length: '3 min', note: 'Unsold cards, live, only to agencies missing that category.' },
  { id: 'news', label: 'Breaking News', clock: '1:15', length: '6 min', note: 'Reveal the 6 headlines and the 3 Team-Ups.' },
  { id: 'ledger_check', label: 'Ledger check', clock: '1:21', length: '4 min', note: 'Confirm gear, Power Level and fund left; then lock.' },
] as const;

export type R1Step = (typeof R1_STEPS)[number]['id'];

export function isR1Step(v: unknown): v is R1Step {
  return typeof v === 'string' && R1_STEPS.some((s) => s.id === v);
}

/** Length of the self-service Insider Tips window (organisers' request: 1 minute). */
export const TIPS_WINDOW_SECONDS = 60;

export const CATEGORIES = ['HQ', 'Suit', 'Gadget', 'Sidekick'] as const;
export type Category = (typeof CATEGORIES)[number];
