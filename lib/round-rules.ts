import { ROUNDS } from '@/lib/config';

/**
 * One page of rules per round, for the projector before the round starts (organisers' request,
 * 15 November). Short lines, read from the back of the hall; the rulebook has the full text.
 */
export type RoundRules = { eyebrow: string; title: string; rules: string[]; art: 'prelim' | 'bazaar' | 'skyline' | 'vault' | 'zerohour' };

export const ROUND_RULES: Record<'prelim' | 'round1' | 'round2' | 'round3' | 'zero_hour', RoundRules> = {
  prelim: {
    eyebrow: 'Round 0 · Prelim · Rules',
    title: ROUNDS.prelim,
    art: 'prelim',
    rules: [
      '15 questions in four categories, played one category at a time. Each has its own colour.',
      'Your captain answers on one phone. Tap once: the answer locks.',
      'Faster correct answers score more: up to 1,000 points (2,000 in Share Bazaar). Wrong or late: 0.',
      'The top 16 go to Power Bazaar. A tie: less total time on correct answers wins.',
    ],
  },
  round1: {
    eyebrow: 'Round 1 · Rules',
    title: ROUNDS.round1,
    art: 'bazaar',
    rules: [
      '₹50 Cr each. Sign one HQ, one Suit, one Gadget and one Sidekick.',
      'Insider Tip: ₹2 Cr, one per team, on My Agency during a 60-second window.',
      'Marquee Auction: the 8 top cards, live with paddles.',
      'Secret Identity Bids: a blind bid on My Agency, 20 seconds per card. Highest wins; a tie goes to the earlier bid.',
      'Bids in ₹0.5 Cr steps, never above your fund left. One card per category.',
      'Missing a category after Last Call: a Jugaad Kit, ₹8 Cr each. Fund left counts half in your Hero Score.',
    ],
  },
  round2: {
    eyebrow: 'Round 2 · Rules',
    title: ROUNDS.round2,
    art: 'skyline',
    rules: [
      'Poster duel: draw your hero. Votes on the club’s Instagram stories; the winner gets +₹5 Cr if it also makes the top 10.',
      '90 seconds to memorise your tower, 10 minutes to rebuild it from memory.',
      '8 minutes to build a slingshot, then one shot to knock your tower down.',
      'Tower Score = (Accuracy + Speed + Destruction) ÷ 3. The top 10 go to the Vault.',
      'Soft foam only. Nobody in the target area.',
    ],
  },
  round3: {
    eyebrow: 'Round 3 · Rules',
    title: ROUNDS.round3,
    art: 'vault',
    rules: [
      'Each finalist holds a sealed, numbered envelope with a secret multiplier (×0.25 to ×3). Read yours; keep it sealed.',
      'Force Field: one per team, ₹5 Cr, bought on My Agency in a 60-second window. It blocks one swap.',
      'Four mini games on paper. The first fully correct sheet wins.',
      'The winner chooses: swap envelopes with any team, X-Ray one envelope, or take ₹5 Cr.',
      'Chai Pe Charcha: deals and bluffs allowed; cash deals go on the ledger. Opening another team’s envelope: ₹5 Cr fine.',
      'Hero Score = Power Level × multiplier + Fund left ÷ 2.',
    ],
  },
  zero_hour: {
    eyebrow: 'Zero Hour',
    title: ROUNDS.zeroHour,
    art: 'zerohour',
    rules: [
      'Every envelope is opened and every Hero Score calculated.',
      'Results on stage: 3rd place, then 2nd, then 1st.',
      'A tie: more fund left wins, then the higher Power Level, then a coin toss.',
    ],
  },
};

/** The rules page for a phase: the round now running, or the next one before the event starts. */
export function rulesFor(phase: string): RoundRules {
  if (phase === 'round1' || phase === 'round2' || phase === 'round3' || phase === 'zero_hour') return ROUND_RULES[phase];
  if (phase === 'ended') return ROUND_RULES.zero_hour;
  return ROUND_RULES.prelim;
}
