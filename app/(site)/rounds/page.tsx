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

      <nav aria-label="Rounds" className="sticky top-0 z-20 border-b border-line/60 bg-abyss/85 backdrop-blur-md">
        <ol className="mx-auto flex max-w-4xl gap-2 overflow-x-auto px-[var(--gutter)] py-3 [scrollbar-width:none]">
          {[
            ['#prelim', '01 Prelim'],
            ['#round-1', '02 Round 1'],
            ['#round-2', '03 Round 2'],
            ['#round-3', '04 Round 3'],
            ['#zero-hour', '05 Zero Hour'],
          ].map(([href, label]) => (
            <li key={href} className="flex-none">
              <a
                href={href}
                className="font-display block border border-line-strong px-3 py-1.5 text-[0.72rem] font-semibold tracking-[0.14em] whitespace-nowrap text-steel uppercase hover:border-glow hover:text-glow"
              >
                {label}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <Section id="prelim" index="01" scene="prelim" eyebrow="Prelim · 15 min · on your phone" title={ROUNDS.prelim} meta="50+ agencies → top 16">
        <p>
          A 15-question live quiz. Questions appear on the projector; your captain answers on one phone. Scores are
          worked out on the server, and faster correct answers score more. 7 of the 15 questions are finance.
        </p>
        <Table
          head={['Category (in this order)', 'Questions', 'Options', 'Timer', 'Weight', 'Max points']}
          numeric={[1, 2, 5]}
          wide
          rows={[
            ['Marvel Ya DC? Company Edition (violet)', '4', '2', '10 s', '×1', '4,000'],
            ['Teen Clue, Ek Hero (blue)', '4', '4', '10 s', '×1', '4,000'],
            ['Superhero Share Bazaar (green)', '4', '4', '20 s', '×2', '8,000'],
            ['Hero Ka Business (white)', '3', '4', '10 s', '×1', '3,000'],
            [<strong key="t">Total</strong>, <strong key="q">15</strong>, '', '', '', <strong key="m">19,000</strong>],
          ]}
        />
        <p>
          The quiz plays one category at a time, in the order above. Each category has its own colour on the projector
          and your phone, and opens with a short intro saying what to do.
        </p>
        <H3>Scoring</H3>
        <p>
          A correct answer earns <strong>1,000 × weight</strong> instantly, falling evenly to <strong>500 × weight</strong>{' '}
          at the buzzer. A wrong answer, or no answer in time, scores 0. Time is measured by the server from the moment
          the question opens, not by your phone.
        </p>
        <Note>
          Example: a Marvel Ya DC? answer that is right at 2.0 s scores 900. A Superhero Share Bazaar answer that is right
          at 12.0 s scores 1,400.
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

      <Section id="round-1" index="02" scene="bazaar" eyebrow="Round 1 · 50 min · live auction" title={ROUNDS.round1} meta="16 agencies · start ₹50 Cr">
        <p>
          Each agency signs one <strong>HQ</strong>, one <strong>Suit</strong>, one <strong>Gadget</strong> and one{' '}
          <strong>Sidekick</strong> from 60 gear cards, using its ₹50 Cr. There are 15 cards per category, one fewer than
          the agencies, so someone always misses out. Every card shows a public Power (1–10) and a minimum bid. Bidding is
          live with shield paddles in the Marquee Auction and Last Call, and on your phone for the Secret Identity Bids;
          every sale goes on the Fund Ledger here, and your My Agency page updates after each one.
        </p>
        <Table
          head={['Phase', 'Length', 'How it works']}
          rows={[
            ['Insider Tips', '1 min', 'Buy one tip for ₹2 Cr on My Agency while the window is open; it privately reveals one upcoming Breaking News card.'],
            ['Marquee Auction', '10 min', 'The top 2 cards of each category: 8 lots, live with paddles, opening at the minimum bid.'],
            ['Secret Identity Bids', '22 min', 'The other 52 cards, one at a time: type a blind bid on My Agency within 20 seconds (or pass). At 0:00 every bid appears on the projector and the highest wins.'],
            ['Last Call', '3 min', 'Unsold cards re-auctioned live, only to agencies still missing that category.'],
            ['Breaking News', '6 min', 'The 6 news cards and the 3 Team-Ups (+3 Power each) are revealed.'],
            ['Ledger check', '4 min', 'Confirm your 4 cards, Power Level and fund left with a ledger keeper.'],
          ]}
        />
        <H3>Bid rules</H3>
        <ul>
          <li>A valid bid is at least the card&apos;s minimum, at most your fund left, in ₹0.5 Cr steps. Anything else counts as a pass.</li>
          <li>One card per category. Winning bids are final and come off your fund at once.</li>
          <li>Tie for the highest bid: live lots, the tied agencies re-bid once, then a coin toss; phone bids, the bid that reached the site first wins.</li>
          <li>Your phone warns you when your fund left gets close to what you still need to finish your hero.</li>
          <li>
            Still missing a category after Last Call: you must take a <strong>Jugaad Kit</strong> (Power 2) for ₹8 Cr for
            each missing category (two missing: two kits, ₹16 Cr). Unable to pay for all of them: eliminated.
          </li>
        </ul>
        <p>Round 1 fixes your Power Level and your fund left. Fund left counts half in the Hero Score, so spend with care.</p>
      </Section>

      <Section id="round-2" index="03" scene="skyline" eyebrow="Round 2 · 35 min · on the floor" title={ROUNDS.round2} meta="→ top 10">
        <H3>Part A — Signal Before the Storm (posters, 5 min)</H3>
        <ul>
          <li>Draw a poster for your hero: your agency ID, the hero built in Round 1, its identity and its doomsday mission. Original artwork only.</li>
          <li>Agencies are paired at random for poster duels (an odd number gives one agency a bye).</li>
          <li>Each duel is voted on the club&apos;s Instagram story. Votes count until the last slingshot shot.</li>
          <li>
            The duel winner (or a bye) earns <strong>+₹5 Cr</strong>, credited only if it also finishes in the top 10 of the
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
            ['Judge and qualify', '4 min 30 s', 'Scores computed, cutoff ties settled, top 10 announced, poster bonuses credited.'],
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

      <Section id="round-3" index="04" scene="vault" eyebrow="Round 3 · 31 min · seated, on paper" title={ROUNDS.round3} meta="10 finalists">
        <p>
          Each finalist holds one sealed <strong>Mission File</strong>, a numbered envelope carrying a secret Battle Outcome
          multiplier: one each of ×3, ×2, ×0.5 and ×0.25, the rest ×1 and ×1.5. Keep it sealed on the table. Envelopes open
          only at Zero Hour.
        </p>
        <H3>Force Field: one, for the whole round</H3>
        <p>
          Once you have read your envelope, a 60-second window opens on the projector. In it you may buy{' '}
          <strong>one Force Field for ₹5 Cr</strong> on My Agency; nobody else sees who bought one. Play it once, when a mini
          game winner tries to swap envelopes with you: the swap is blocked and the winner’s choice is used up.
        </p>
        <H3>Four mini games</H3>
        <Table
          head={['Step', 'What happens']}
          rows={[
            ['Play', 'All finalists solve the same puzzle on paper. One submission each; a wrong sheet is final.'],
            ['Result', 'Scorers check sheets in arrival order. The first fully correct sheet wins.'],
            ['Winner’s choice', 'Swap envelopes with any team (unseen), X-Ray one envelope privately, or take ₹5 Cr.'],
            ['Chai Pe Charcha', 'Information sales, cash deals and bluffing. Lying is allowed; cash deals go on the ledger.'],
          ]}
        />
        <ul>
          <li>Mini games: The Multiverse Grid, Across the Multiverse, Before the World Ends, The Shutdown Key.</li>
          <li>Opening another agency&apos;s envelope costs a ₹5 Cr fine. Only the anchor moves envelopes.</li>
        </ul>
      </Section>

      <Section id="zero-hour" index="05" scene="zerohour" eyebrow="Finale · 20 min" title={ROUNDS.zeroHour} meta="→ one Hero Agency">
        <p>
          The envelopes are opened and every finalist’s Hero Score is calculated. Then the results are announced on stage: 3rd
          place, 2nd place, and finally the Hero Agency of the Year.
        </p>
        <p className="display panel corners px-4 py-6 text-center text-[clamp(1.3rem,3.6vw,2rem)] leading-snug text-bone [--corner-inset:6px] [--corner-size:12px]">
          <span className="whitespace-nowrap text-glow">Power Level</span> × <span className="whitespace-nowrap text-toxic">Battle Outcome</span> +{' '}
          <span className="whitespace-nowrap">Fund left ÷ 2</span>
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
