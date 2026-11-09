/**
 * Simple mode: "what to do next". A pure function from a snapshot of the event to the one step
 * to take now, plus a short done / now / later list for the current phase. The command centre
 * shows it when Simple mode is on; app/admin/guide/actions.ts carries out the step's button.
 */
import { placesAnnounced } from '@/lib/zero-hour';
import type { Area } from '@/lib/auth/roles';
import { ROUNDS } from '@/lib/config';
import type { Phase } from '@/lib/phases';

export type GuideSnapshot = {
  phase: Phase;
  step: string | null;
  now: number; // ms, server clock
  dryRun: boolean;
  agencies: { total: number; checkedIn: number; active: number };
  quiz: {
    shuffled: boolean;
    /** Live slots in order (non-void question in each). */
    slots: { no: number; id: string; prompt: string; options: string[]; answer: number | null; openedAt: number | null; timerS: number; revealed: boolean }[];
    published: boolean;
    frozen: boolean;
    suddenDeathPending: boolean;
  };
  r1: {
    fundsStarted: boolean;
    newsDrawn: boolean;
    tipsClosesAt: number | null;
    tipsSold: number;
    locked: boolean;
    newsTotal: number;
    newsRevealed: number;
    teamUpsTotal: number;
    teamUpsRevealed: number;
    recapOn: boolean;
    /** Unsold lots in the current bidding step, and the one on the projector. */
    lotsLeft: number;
    /** Of those, lots at least one team can still buy (missing the category, enough money). */
    sellable: number;
    lot: null | { id: string; name: string; category: string; power: number; minBid: number; sold: boolean };
    /** Agencies that can still buy the lot: in the game, missing its category, with money for the minimum. */
    buyers: { id: string; name: string; fund: number }[];
    /** Agencies still missing a category (Jugaad Kits or elimination at the ledger check). */
    missing: number;
  };
  r2: { duels: number; duelsDecided: number; towersNeeded: number; towersEntered: number; cutoffPending: boolean; published: boolean };
  r3: {
    multipliersEntered: boolean;
    dealt: boolean;
    mission: number | null;
    finalists: { id: string; name: string; forceFields: number[] }[];
    missions: { no: number; name: string; winner: string | null; choice: string | null }[];
  };
  zh: { opened: number; total: number };
};

/** Every button Simple mode can press. The server action maps each to the console's own logic. */
export type GuideActionId =
  | 'start-checkin' | 'start-prelim' | 'quiz-shuffle' | 'quiz-open' | 'quiz-reveal' | 'quiz-publish' | 'quiz-freeze'
  | 'start-round1' | 'r1-funds' | 'r1-draw' | 'r1-tips' | 'r1-marquee' | 'r1-first-lot' | 'r1-sale' | 'r1-skip'
  | 'r1-secret' | 'r1-lastcall' | 'r1-news' | 'r1-news-next' | 'r1-teamups' | 'r1-recap' | 'r1-check' | 'r1-jugaad' | 'r1-lock'
  | 'start-round2' | 'r2-draw' | 'r2-publish' | 'start-round3'
  | 'r3-ff-window' | 'r3-ff-buy' | 'r3-play' | 'r3-results' | 'r3-winner' | 'r3-choice-window' | 'r3-swap' | 'r3-xray' | 'r3-cash'
  | 'r3-chai' | 'r3-next-mission' | 'start-zero-hour' | 'zh-next' | 'end-event';

export type GuideButton = { action: GuideActionId; label: string; confirm?: string; arg?: string; ghost?: boolean };

/** What the step needs from the organiser. */
export type GuideNow = {
  key: string; // stable id of this step, checked when its button is pressed
  title: string;
  body: string;
  /** Who may do it (the console area whose roles apply). */
  area: Area;
  roleLabel: string;
  buttons: GuideButton[];
  /** A place in the full console for typing data in (scores, map, deal…). */
  link?: { href: string; label: string };
  /** Counts down to this time (question timer, tips window). */
  until?: number;
  /** Extra panels: the sale form, Force Field buttons, the winner and choice forms. */
  form?: 'sale' | 'force-fields' | 'winner' | 'choice';
  /** A question, shown to the quiz host with its answer. */
  question?: { prompt: string; options: string[]; answer: number | null };
  progress?: string;
};

export type GuideItem = { label: string; status: 'done' | 'now' | 'later' };
export type Guide = { phaseTitle: string; now: GuideNow; items: GuideItem[] };

const ADMIN = { area: 'settings' as const, roleLabel: 'Admin' };
const HOST = { area: 'quiz' as const, roleLabel: 'Quiz host' };
const KEEPER = { area: 'ledger' as const, roleLabel: 'Ledger keeper' };
const AUCTION = { area: 'auction' as const, roleLabel: 'Ledger keeper or auctioneer' };
const R2 = { area: 'round2' as const, roleLabel: 'Social-media lead or scorer' };
const R3 = { area: 'round3' as const, roleLabel: 'Ledger keeper or scorer' };

/** Builds the list for a phase: steps before `nowIndex` are done, after it later. */
function items(labels: string[], nowIndex: number): GuideItem[] {
  return labels.map((label, i) => ({ label, status: i < nowIndex ? 'done' : i === nowIndex ? 'now' : 'later' }));
}

export function buildGuide(s: GuideSnapshot): Guide {
  switch (s.phase) {
    case 'registration':
      return {
        phaseTitle: 'Registration',
        items: items(['Teams register on the website', 'Doors open: start check-in'], 0),
        now: {
          key: 'registration',
          title: s.dryRun ? 'Dry run: testers join by typing a name' : 'Registration is open',
          body: s.dryRun
            ? `${s.agencies.total} agencies so far. Testers open the register page on their phones and type a name. When everyone is in, start check-in.`
            : `${s.agencies.total} teams have registered. Nothing to do until the doors open on the day.`,
          ...ADMIN,
          buttons: [{ action: 'start-checkin', label: 'Doors are open: start check-in', confirm: 'Registration will close' }],
        },
      };

    case 'checkin': {
      const left = s.agencies.total - s.agencies.checkedIn;
      return {
        phaseTitle: 'Check-in',
        items: items(['Check teams in as they arrive', 'Start the prelim quiz'], 0),
        now: {
          key: 'checkin',
          title: 'Check teams in as they arrive',
          body: `${s.agencies.checkedIn} of ${s.agencies.total} teams are checked in${left ? ` (${left} still to come)` : ''}. Only checked-in teams can play the quiz. When everyone who came is in, start the prelim.`,
          ...ADMIN,
          link: { href: '/admin/agencies', label: 'Open the check-in list' },
          buttons: [{ action: 'start-prelim', label: 'Start the prelim quiz', confirm: 'Everyone who is here is checked in' }],
          progress: `${s.agencies.checkedIn} / ${s.agencies.total} checked in`,
        },
      };
    }

    case 'prelim':
      return prelim(s);
    case 'round1':
      return round1(s);
    case 'round2':
      return round2(s);
    case 'round3':
      return round3(s);
    case 'zero_hour':
      return zeroHour(s);
    case 'ended':
      return {
        phaseTitle: 'Event over',
        items: [],
        now: { key: 'ended', title: 'The event is over', body: 'The winner is on the projector and the leaderboard. Thank you, crew.', ...ADMIN, buttons: [] },
      };
  }
}

// ---------------------------------------------------------------- prelim

function prelim(s: GuideSnapshot): Guide {
  const q = s.quiz;
  const labels = ['Shuffle the 15 questions', 'Play the 15 questions', 'Publish the board', 'Freeze the top 16', `Start ${ROUNDS.round1}`];
  const base = { phaseTitle: `Prelim · ${ROUNDS.prelim}` };
  if (!q.shuffled) {
    return { ...base, items: items(labels, 0), now: { key: 'quiz-shuffle', title: 'Shuffle the 15 questions', body: 'Fixes one random order of the live questions, the same for every phone. Do it once, before question 1.', ...HOST, buttons: [{ action: 'quiz-shuffle', label: 'Shuffle the questions' }] } };
  }
  const played = q.slots.filter((x) => x.openedAt !== null).length;
  const progress = `${q.slots.filter((x) => x.revealed).length} / ${q.slots.length} revealed`;
  // A question that has been opened but not revealed: wait for its timer, then reveal.
  const open = q.slots.find((x) => x.openedAt !== null && !x.revealed);
  if (open) {
    const ends = open.openedAt! + open.timerS * 1000;
    const question = { prompt: open.prompt, options: open.options, answer: open.answer };
    if (s.now < ends) {
      return { ...base, items: items(labels, 1), now: { key: `quiz-wait-${open.id}`, title: `Question ${open.no} is live`, body: 'Teams are answering on their phones. The Reveal button appears when the timer ends.', ...HOST, buttons: [], until: ends, question, progress } };
    }
    return { ...base, items: items(labels, 1), now: { key: `quiz-reveal-${open.id}`, title: `Reveal the answer to question ${open.no}`, body: 'Time is up. Revealing shows the answer on the projector and each phone shows right or wrong and its points.', ...HOST, buttons: [{ action: 'quiz-reveal', label: `Reveal the answer to question ${open.no}`, arg: open.id }], question, progress } };
  }
  const next = q.slots.find((x) => x.openedAt === null);
  if (next) {
    return { ...base, items: items(labels, 1), now: { key: `quiz-open-${next.id}`, title: `Open question ${next.no} of ${q.slots.length}`, body: played === 0 ? 'Check the projector shows the quiz, then open the first question. Phones show a 3-2-1 read-in, then the clock starts.' : 'Read it out once it is on the screen. Phones get a 3-2-1 read-in before the clock starts.', ...HOST, buttons: [{ action: 'quiz-open', label: `Open question ${next.no}`, arg: next.id }], question: { prompt: next.prompt, options: next.options, answer: next.answer }, progress } };
  }
  if (!q.published) {
    return { ...base, items: items(labels, 2), now: { key: 'quiz-publish', title: 'Publish the final board', body: 'All questions are revealed. Publishing shows the final board on the projector and each team’s rank on its phone.', ...HOST, buttons: [{ action: 'quiz-publish', label: 'Publish the final board' }], progress } };
  }
  if (q.suddenDeathPending) {
    return { ...base, items: items(labels, 3), now: { key: 'quiz-sudden-death', title: 'Tie for 16th: run the sudden death', body: 'Two or more teams are level across the cut. Show a sudden-death question in the quiz console, then enter who finished first.', ...HOST, buttons: [], link: { href: '/admin/quiz', label: 'Open the sudden death in the quiz console' } } };
  }
  if (!q.frozen) {
    return { ...base, items: items(labels, 3), now: { key: 'quiz-freeze', title: 'Freeze the top 16', body: 'The top 16 go to the Power Bazaar; everyone else is eliminated. Phones then show “Qualified” or “Eliminated”.', ...HOST, buttons: [{ action: 'quiz-freeze', label: 'Freeze the top 16', confirm: 'The board is final' }] } };
  }
  return { ...base, items: items(labels, 4), now: { key: 'start-round1', title: `Start ${ROUNDS.round1}`, body: 'The top 16 are frozen. Move the event to Round 1: the projector switches to the auction.', ...ADMIN, buttons: [{ action: 'start-round1', label: `Start ${ROUNDS.round1}` }] } };
}

// ---------------------------------------------------------------- Round 1

function round1(s: GuideSnapshot): Guide {
  const r = s.r1;
  const labels = ['Credit starting funds', 'Draw the Breaking News', 'Insider Tips window', 'Marquee Auction', 'Secret Identity Bids', 'Last Call', 'Breaking News and Team-Ups', 'Ledger check and lock', `Start ${ROUNDS.round2}`];
  const base = { phaseTitle: `Round 1 · ${ROUNDS.round1}` };
  const step = s.step;
  if (r.locked) {
    return { ...base, items: items(labels, 8), now: { key: 'start-round2', title: `Start ${ROUNDS.round2}`, body: 'Round 1 is locked: Power Levels and funds are final. Move the event to Round 2.', ...ADMIN, buttons: [{ action: 'start-round2', label: `Start ${ROUNDS.round2}` }] } };
  }
  if (!r.fundsStarted) {
    return { ...base, items: items(labels, 0), now: { key: 'r1-funds', title: 'Credit the starting funds', body: `Gives ₹50 Cr to each of the ${s.agencies.active} teams in the game (and shuffles the lot order).`, ...KEEPER, buttons: [{ action: 'r1-funds', label: `Credit ₹50 Cr to ${s.agencies.active} teams` }] } };
  }
  if (!r.newsDrawn) {
    return { ...base, items: items(labels, 1), now: { key: 'r1-draw', title: 'Draw the 6 Breaking News cards', body: 'The site picks 6 of the 8 at random. Seal the physical cards in the order it shows. (To enter a draw you made by hand, use the full console.)', ...KEEPER, buttons: [{ action: 'r1-draw', label: 'Draw 6 at random' }], link: { href: '/admin/auction', label: 'Enter a hand-made draw instead' } } };
  }
  const bidding = step === 'marquee' || step === 'secret' || step === 'last_call';
  const afterTips = bidding || step === 'news' || step === 'ledger_check';
  if (!afterTips) {
    if (r.tipsClosesAt !== null && s.now < r.tipsClosesAt) {
      return { ...base, items: items(labels, 2), now: { key: 'r1-tips-wait', title: 'Insider Tips window is open', body: `Teams buy on their My Agency page (₹2 Cr, one each). ${r.tipsSold} bought so far. Wait for the countdown.`, ...AUCTION, buttons: [], until: r.tipsClosesAt } };
    }
    if (r.tipsClosesAt === null) {
      return { ...base, items: items(labels, 2), now: { key: 'r1-tips', title: 'Open the Insider Tips window', body: 'A 60-second countdown on the projector. Each team may buy one tip on its phone; the site picks the headline.', ...AUCTION, buttons: [{ action: 'r1-tips', label: 'Open the 60-second window' }, { action: 'r1-marquee', label: 'Skip tips: start the Marquee Auction', ghost: true }] } };
    }
    return { ...base, items: items(labels, 3), now: { key: 'r1-marquee', title: 'Start the Marquee Auction', body: `The tips window is closed (${r.tipsSold} bought). The 8 Marquee lots go next, live with paddles.`, ...AUCTION, buttons: [{ action: 'r1-marquee', label: 'Start the Marquee Auction' }] } };
  }
  if (bidding) {
    const idx = step === 'marquee' ? 3 : step === 'secret' ? 4 : 5;
    const stepName = step === 'marquee' ? 'Marquee Auction' : step === 'secret' ? 'Secret Identity Bids' : 'Last Call';
    const nextAction: GuideButton =
      step === 'marquee' ? { action: 'r1-secret', label: 'Start Secret Identity Bids' }
        : step === 'secret' ? { action: 'r1-lastcall', label: 'Start Last Call' }
          : { action: 'r1-news', label: 'Go to Breaking News' };
    // Finished when no lot in this step can still be bought by anyone (never cycle through dead lots).
    if (r.sellable === 0) {
      return { ...base, items: items(labels, idx), now: { key: `r1-done-${step}`, title: `${stepName} is finished`, body: r.lotsLeft === 0 ? 'No lots left in this step.' : `${r.lotsLeft} unsold lot${r.lotsLeft === 1 ? '' : 's'} left, but no team that still needs that category can pay for ${r.lotsLeft === 1 ? 'it' : 'them'}.`, ...AUCTION, buttons: [nextAction] } };
    }
    if (!r.lot || r.lot.sold) {
      return { ...base, items: items(labels, idx), now: { key: `r1-lot-${step}-${r.lot?.id ?? 'none'}`, title: `${stepName}: put the next lot up`, body: `${r.sellable} lot${r.sellable === 1 ? '' : 's'} still to sell in this step. The projector shows the lot you put up.`, ...AUCTION, buttons: [{ action: r.lot ? 'r1-skip' : 'r1-first-lot', label: r.lot ? 'Next lot' : 'Show the first lot' }, { ...nextAction, ghost: true, label: `Finish early: ${nextAction.label.toLowerCase()}` }] } };
    }
    return {
      ...base,
      items: items(labels, idx),
      now: {
        key: `r1-sell-${r.lot.id}`,
        title: `${stepName}: ${r.lot.id} · ${r.lot.name}`,
        body: r.buyers.length
          ? `${r.lot.category} · Power ${r.lot.power} · minimum ₹${r.lot.minBid} Cr. Pick the winning team and the price, or move on if nobody bids.`
          : `Nobody who still needs a ${r.lot.category} can afford it. Move to the next lot.`,
        ...KEEPER,
        form: r.buyers.length ? 'sale' : undefined,
        buttons: [{ action: 'r1-skip', label: 'No sale: next lot', ghost: r.buyers.length > 0 }, { ...nextAction, ghost: true, label: `Finish early: ${nextAction.label.toLowerCase()}` }],
        progress: `${r.sellable} lot${r.sellable === 1 ? '' : 's'} still to sell in this step`,
      },
    };
  }
  if (step === 'news') {
    if (r.newsRevealed < r.newsTotal) {
      return { ...base, items: items(labels, 6), now: { key: `r1-news-${r.newsRevealed}`, title: `Reveal headline ${r.newsRevealed + 1} of ${r.newsTotal}`, body: 'Each headline appears on the projector and changes one card’s Power. Let the room react before the next.', ...AUCTION, buttons: [{ action: 'r1-news-next', label: `Reveal headline ${r.newsRevealed + 1}` }] } };
    }
    if (r.teamUpsRevealed < r.teamUpsTotal) {
      return { ...base, items: items(labels, 6), now: { key: 'r1-teamups', title: 'Reveal the 3 Team-Ups', body: 'A team holding both cards of a pair gets +3 Power.', ...AUCTION, buttons: [{ action: 'r1-teamups', label: 'Reveal the Team-Ups' }] } };
    }
    if (!r.recapOn) {
      return { ...base, items: items(labels, 6), now: { key: 'r1-recap', title: 'Show everything once on the projector', body: 'One screen with all headlines and Team-Ups and who holds each card, so every team can check its Power Level.', ...AUCTION, buttons: [{ action: 'r1-recap', label: 'Show all news on the projector' }, { action: 'r1-check', label: 'Skip: go to the ledger check', ghost: true }] } };
    }
    return { ...base, items: items(labels, 6), now: { key: 'r1-check', title: 'Go to the ledger check', body: 'The recap is on the projector. When teams have read it, go to the ledger check.', ...AUCTION, buttons: [{ action: 'r1-check', label: 'Go to the ledger check' }] } };
  }
  // ledger check (or any other step after bidding)
  if (step !== 'ledger_check') {
    return { ...base, items: items(labels, 6), now: { key: 'r1-news-step', title: 'Go to Breaking News', body: 'Bidding is over. Reveal the headlines next.', ...AUCTION, buttons: [{ action: 'r1-news', label: 'Go to Breaking News' }] } };
  }
  if (r.missing > 0) {
    return { ...base, items: items(labels, 7), now: { key: 'r1-jugaad', title: 'Give out Jugaad Kits', body: `${r.missing} team${r.missing === 1 ? ' is' : 's are'} still missing a category. Each missing category costs a Jugaad Kit (Power 2, ₹8 Cr); a team that cannot pay is eliminated.`, ...KEEPER, buttons: [{ action: 'r1-jugaad', label: 'Apply Jugaad Kits & eliminations' }] } };
  }
  return { ...base, items: items(labels, 7), now: { key: 'r1-lock', title: 'Lock Round 1', body: 'Teams check their four cards, Power Level and fund left on their phones. Then lock: Power Levels become final.', ...KEEPER, buttons: [{ action: 'r1-lock', label: 'Lock Round 1', confirm: 'Teams have checked their gear and funds' }] } };
}

// ---------------------------------------------------------------- Round 2

function round2(s: GuideSnapshot): Guide {
  const r = s.r2;
  const labels = ['Draw the poster duels', 'Enter votes and tower results', 'Publish the top 8', `Start ${ROUNDS.round3}`];
  const base = { phaseTitle: `Round 2 · ${ROUNDS.round2}` };
  if (r.published) {
    return { ...base, items: items(labels, 3), now: { key: 'start-round3', title: `Start ${ROUNDS.round3}`, body: 'The top 8 are through. Move the event to Round 3.', ...ADMIN, buttons: [{ action: 'start-round3', label: `Start ${ROUNDS.round3}` }] } };
  }
  if (r.duels === 0) {
    return { ...base, items: items(labels, 0), now: { key: 'r2-draw', title: 'Draw the poster duel pairings', body: 'Random pairs (one bye if the number is odd). Post each pair on Instagram.', area: 'round2', roleLabel: 'Social-media lead', buttons: [{ action: 'r2-draw', label: 'Draw the pairings' }] } };
  }
  const entered = `Votes ${r.duelsDecided} / ${r.duels} duels · Towers ${r.towersEntered} / ${r.towersNeeded}`;
  if (r.duelsDecided < r.duels || r.towersEntered < r.towersNeeded) {
    return { ...base, items: items(labels, 1), now: { key: 'r2-entry', title: 'Enter the story votes and tower results', body: 'Votes at the cutoff (the last slingshot shot). For each tower: correct blocks, reference blocks, build time (m:ss, or DNF), blocks fallen, blocks in the frozen build.', ...R2, buttons: [], link: { href: '/admin/round2', label: 'Open the Round 2 entry sheet' }, progress: entered } };
  }
  if (r.cutoffPending) {
    return { ...base, items: items(labels, 1), now: { key: 'r2-cutoff', title: 'Tie at 8th place', body: 'Settle it the way you announced (e.g. rock-paper-scissors), then enter the order.', ...R2, buttons: [], link: { href: '/admin/round2', label: 'Enter the tie-break order' } } };
  }
  return { ...base, items: items(labels, 2), now: { key: 'r2-publish', title: 'Publish Round 2', body: 'The top 8 go to the Vault, the rest are eliminated, and duel winners in the top 8 get +₹5 Cr.', area: 'round2', roleLabel: 'Scorer', buttons: [{ action: 'r2-publish', label: 'Publish the results', confirm: 'All votes and towers are final' }], progress: entered } };
}

// ---------------------------------------------------------------- Round 3

function round3(s: GuideSnapshot): Guide {
  const r = s.r3;
  const labels = ['Multiplier map', 'Run the round offline', 'Start Zero Hour'];
  const base = { phaseTitle: `Round 3 · ${ROUNDS.round3}` };
  const consoleLink = { href: '/admin/round3', label: 'Open the Round 3 console' };
  if (!r.multipliersEntered) {
    return { ...base, items: items(labels, 0), now: { key: 'r3-map', title: 'Enter the multiplier map', body: 'What is inside each numbered envelope. Secret: an admin enters it, nobody else sees it.', ...ADMIN, buttons: [], link: { href: '/admin/round3', label: 'Enter the map' } } };
  }
  if (!r.dealt) {
    return { ...base, items: items(labels, 1), now: { key: 'r3-offline', title: 'Run Round 3 offline', body: 'The projector shows the Round 3 cover. Record each Chai Pe Charcha transfer and each fine on the Round 3 console as it happens. After the last mission, record who holds which envelope.', ...R3, buttons: [], link: consoleLink } };
  }
  return { ...base, items: items(labels, 2), now: { key: 'start-zero-hour', title: 'Start Zero Hour', body: 'Every finalist’s envelope is recorded. You can still correct it on the Round 3 console until the results are calculated.', ...ADMIN, buttons: [{ action: 'start-zero-hour', label: 'Start Zero Hour' }], link: consoleLink } };
}

// ---------------------------------------------------------------- Zero Hour

function zeroHour(s: GuideSnapshot): Guide {
  const labels = ['Calculate the results', 'Announce 3rd, 2nd, then 1st', 'End the event'];
  const base = { phaseTitle: 'Zero Hour' };
  const board = { href: '/admin/results', label: 'Open the Final leaderboard' };
  const anchor = { area: 'reveal' as const, roleLabel: 'Anchor' };
  if (s.zh.opened < s.zh.total || s.zh.total === 0) {
    return { ...base, items: items(labels, 0), now: { key: 'zh-calc', title: 'Calculate the results', body: 'The site ranks the finalists from the recorded envelopes. Nothing shows on the projector or on phones yet.', ...anchor, buttons: [], link: board } };
  }
  const n = placesAnnounced('zero_hour', s.step);
  if (n < 3) {
    const place = ['3rd', '2nd', '1st'][n];
    return { ...base, items: items(labels, 1), now: { key: `zh-announce-${n}`, title: `Announce ${place} place`, body: 'Each press on the Final leaderboard puts the next place on the projector. Participants see no result until 1st place is out.', ...anchor, buttons: [], link: board, progress: `${n} / 3 announced` } };
  }
  return { ...base, items: items(labels, 2), now: { key: 'end-event', title: 'The winner is announced', body: 'If 1st place is a tie, the anchor runs the coin toss on stage. Then end the event.', ...ADMIN, buttons: [{ action: 'end-event', label: 'End the event' }] } };
}
