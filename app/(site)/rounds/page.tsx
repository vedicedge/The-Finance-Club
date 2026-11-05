import type { Metadata } from 'next';
import { ROUNDS } from '@/lib/config';
import { getEventState } from '@/lib/event-state';
import { H3, Note, PageHero, Section, Table } from '@/components/site/Prose';

export const metadata: Metadata = { title: 'Rounds' };

export default async function RoundsPage() {
  const { settings } = await getEventState();
  const prize = (v: string | null) => v ?? 'Classified — to be announced';

  return (
    <>
      <PageHero eyebrow="Mission briefing" title="The rounds">
        Five stages cut 50+ agencies down to one Hero Agency. The prelim and Round 1 run on this website; Rounds 2 and 3
        are played on the floor, and organisers post the results here.
      </PageHero>

      <nav aria-label="Rounds" className="border-b border-line/60">
        <ol className="mx-auto flex max-w-4xl flex-wrap gap-x-6 gap-y-2 px-[var(--gutter)] py-4 text-sm text-steel">
          {[
            ['#prelim', 'Prelim'],
            ['#round-1', 'Round 1'],
            ['#round-2', 'Round 2'],
            ['#round-3', 'Round 3'],
            ['#zero-hour', 'Zero Hour'],
          ].map(([href, label]) => (
            <li key={href}>
              <a href={href} className="hover:text-torch">
                {label}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <Section id="prelim" eyebrow="Prelim · 15 min · on your phone" title={ROUNDS.prelim} meta="50+ agencies → top 16">
        <p>
          A 15-question live quiz. Questions appear on the projector; your captain answers on one phone. Scores are
          worked out on the server, and faster correct answers score more. 7 of the 15 questions are finance.
        </p>
        <Table
          head={['Segment', 'Questions', 'Options', 'Timer', 'Weight', 'Max points']}
          numeric={[1, 2, 5]}
          wide
          rows={[
            ['Marvel Ya DC?', '4', '2', '10 s', '×1', '4,000'],
            ['Teen Clue, Ek Hero', '4', '4', '10 s', '×1', '4,000'],
            ['Box Office Ka Hisaab (finance)', '4', '4', '20 s', '×2', '8,000'],
            ['Hero Ka Business (finance + business)', '3', '4', '10 s', '×1', '3,000'],
            [<strong key="t">Total</strong>, <strong key="q">15</strong>, '', '', '', <strong key="m">19,000</strong>],
          ]}
        />
        <H3>Scoring</H3>
        <p>
          A correct answer earns <strong>1,000 × weight</strong> instantly, falling evenly to <strong>500 × weight</strong>{' '}
          at the buzzer. A wrong answer, or no answer in time, scores 0. Time is measured by the server from the moment
          the question opens, not by your phone.
        </p>
        <Note>
          Example: a Marvel Ya DC? answer that is right at 2.0 s scores 900. A Box Office answer that is right at 12.0 s
          scores 1,400.
        </Note>
        <H3>What you do</H3>
        <ul>
          <li>Before the prelim starts, your captain logs in with your agency ID and PIN.</li>
          <li>Joining closes when question 1 opens. If your phone drops, log back in on any phone; missed questions score 0.</li>
          <li>Each question shows its segment, so you know whether you have 10 or 20 seconds. Your answer locks on tap.</li>
          <li>After each question your phone shows right or wrong and the points earned.</li>
        </ul>
        <p>
          Ranking is by total points. Ties are broken by the lower total time on correct answers; a tie for 16th place is
          settled by one sudden-death question on stage. The top 16 go to Power Bazaar; everyone else is eliminated.
        </p>
      </Section>

      <Section id="round-1" eyebrow="Round 1 · 50 min · live auction" title={ROUNDS.round1} meta="16 agencies · start ₹50 Cr">
        <p>
          Each agency signs one <strong>HQ</strong>, one <strong>Suit</strong>, one <strong>Gadget</strong> and one{' '}
          <strong>Sidekick</strong> from 60 gear cards, using its ₹50 Cr. There are 15 cards per category, one fewer than
          the agencies, so someone always misses out. Every card shows a public Power (1–10) and a minimum bid. Bidding is
          physical, with shield paddles and slates; every sale goes on the Fund Ledger here, and your My Agency page
          updates after each one.
        </p>
        <Table
          head={['Phase', 'Length', 'How it works']}
          rows={[
            ['Insider Tips', '2 min', 'Buy one sealed tip for ₹2 Cr; it privately reveals one upcoming Breaking News card.'],
            ['Marquee Auction', '10 min', 'The top 2 cards of each category: 8 lots, live with paddles, opening at the minimum bid.'],
            ['Secret Identity Bids', '22 min', 'The other 52 cards, one at a time: 5 s to show, 10 s to write a bid or PASS, then "3, 2, 1, mask utaro!"'],
            ['Last Call', '3 min', 'Unsold cards re-auctioned live, only to agencies still missing that category.'],
            ['Breaking News', '6 min', 'The 6 news cards and the 3 Team-Ups (+3 Power each) are revealed.'],
            ['Ledger check', '4 min', 'Confirm your 4 cards, Power Level and fund left with a ledger keeper.'],
          ]}
        />
        <H3>Bid rules</H3>
        <ul>
          <li>A valid bid is at least the card&apos;s minimum, at most your fund left, in ₹0.5 Cr steps. Anything else counts as a pass.</li>
          <li>One card per category. Winning bids are final and come off your fund at once.</li>
          <li>Tie for the highest bid: the tied agencies re-bid once on slates; still tied, a coin toss.</li>
          <li>
            Missing exactly one category after Last Call: you must take the <strong>Jugaad Kit</strong> (Power 2) for ₹8 Cr.
            Missing two or more, or unable to pay for the Jugaad Kit: eliminated.
          </li>
        </ul>
        <p>Round 1 fixes your Power Level and your fund left. Fund left counts half in the Hero Score, so spend with care.</p>
      </Section>

      <Section id="round-2" eyebrow="Round 2 · 35 min · on the floor" title={ROUNDS.round2} meta="→ top 8">
        <H3>Part A — Signal Before the Storm (posters, 5 min)</H3>
        <ul>
          <li>Draw a poster for your hero: your agency ID, the hero built in Round 1, its identity and its doomsday mission. Original artwork only.</li>
          <li>Agencies are paired at random for poster duels (an odd number gives one agency a bye).</li>
          <li>Each duel is voted on the club&apos;s Instagram story. Votes count until the last slingshot shot.</li>
          <li>
            The duel winner (or a bye) earns <strong>+₹5 Cr</strong>, credited only if it also finishes in the top 8 of the
            tower game. Posters never decide who is eliminated.
          </li>
        </ul>
        <H3>Part B — Skyline: Build. Break. (30 min)</H3>
        <Table
          head={['Step', 'Time', 'What happens']}
          rows={[
            ['Reference viewing', '1 min 30 s', 'Each team sees a different colour-coded block tower; then all references are hidden.'],
            ['Tower building', '10 min', 'Rebuild it from memory. Build time is recorded; the build is frozen and photographed.'],
            ['Slingshot construction', '8 min', 'Build a launcher from the props supplied. No practice shots; safety check first.'],
            ['Single-shot takedown', '6 min', 'One shot per team in a marked lane; blocks fallen are counted.'],
            ['Judge and qualify', '4 min 30 s', 'Scores computed, cutoff ties settled, top 8 announced, poster bonuses credited.'],
          ]}
        />
        <Note>
          Tower Score = (Accuracy + Speed + Destruction) ÷ 3, each out of 100. Accuracy = blocks in the right place and
          colour ÷ blocks in the reference. Speed = 1 − build time ÷ 10 min (an unfinished build scores 0). Destruction =
          blocks that fall after your shot ÷ blocks in your build. Example: (90 + 40 + 75) ÷ 3 = 68.33. A tie at the
          cutoff is settled by: {settings.round2.cutoffTiebreak.toLowerCase()}.
        </Note>
        <p>The 8 highest Tower Scores go to the Vault; everyone else is eliminated.</p>
      </Section>

      <Section id="round-3" eyebrow="Round 3 · 31 min · seated, on paper" title={ROUNDS.round3} meta="8 finalists">
        <p>
          Each finalist holds one sealed <strong>Mission File</strong> (numbered E1–E8) carrying a secret Battle Outcome
          multiplier. Keep it sealed on the table. Envelopes open only at Zero Hour.
        </p>
        <Table
          head={['Battle Outcome', 'Envelopes', 'Multiplier']}
          numeric={[1, 2]}
          rows={[
            ['City saved, statue unveiled', '1', '×3'],
            ['Trending #1 across India', '1', '×2'],
            ['Clean win, zero damage', '2', '×1.5'],
            ['Saved the day, just about', '1', '×1'],
            ['₹100 crore property damage bill', '2', '×0.5'],
            ['Villain escaped', '1', '×0.25'],
          ]}
        />
        <H3>Four missions, seven minutes each</H3>
        <Table
          head={['Step', 'Time', 'What happens']}
          rows={[
            ['Force Field', '30 s', 'Pay ₹5 Cr to block swaps on your envelope until this mission’s winner has chosen.'],
            ['Play', '4 min', 'All 8 agencies solve the same puzzle. One paper submission each; a wrong sheet is final.'],
            ['Results', '1 min', 'Scorers check sheets in arrival order. The first fully correct sheet wins.'],
            ['Winner’s choice', '30 s', 'Swap envelopes with any unprotected agency (unseen), X-Ray one envelope privately, or take ₹6 Cr.'],
            ['Chai Pe Charcha', '1 min', 'Information sales, cash deals and bluffing. Lying is allowed; cash deals go on the ledger.'],
          ]}
        />
        <ul>
          <li>Missions: The Multiverse Grid, Across the Multiverse, Before the World Ends, The Shutdown Key.</li>
          <li>Mission 4&apos;s winner chooses at the start of Zero Hour; its Force Fields stay up until then.</li>
          <li>Opening another agency&apos;s envelope costs a ₹5 Cr fine. Only the anchor moves envelopes.</li>
        </ul>
      </Section>

      <Section id="zero-hour" eyebrow="Finale · 20 min" title={ROUNDS.zeroHour} meta="→ one Hero Agency">
        <p>
          Mission 4&apos;s winner makes the last swap, X-Ray or cash call. Then all 8 envelopes are opened on stage, in
          ascending Power Level, and each Hero Score appears on the projector:
        </p>
        <p className="font-display text-center text-2xl text-bone">
          <span className="text-torch">Power Level</span> × <span className="text-toxic">Battle Outcome</span> + Fund left ÷ 2
        </p>
        <Table
          head={['Award', 'Decided by', 'Reward']}
          rows={[
            ["Mahanagar's Hero Agency of the Year", 'Highest Hero Score', prize(settings.prizes.winner)],
            ['Overall Runner-up', 'Second-highest Hero Score', prize(settings.prizes.runnerUp)],
            ['Best Launch Poster', 'Most story votes at the Round 2 cutoff', 'Recognition'],
          ]}
        />
      </Section>
    </>
  );
}
