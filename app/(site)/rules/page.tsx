import type { Metadata } from 'next';
import { EVENT } from '@/lib/config';
import { getEventState } from '@/lib/event-state';
import { longDate } from '@/lib/schedule';
import { H3, Note, PageHero, Section, Table } from '@/components/site/Prose';

export const metadata: Metadata = { title: 'Rules & FAQ' };

const TIEBREAK_LABEL = { fund_left: 'higher fund left', power_level: 'higher Power Level', coin_toss: 'a coin toss' } as const;

export default async function RulesPage() {
  const { settings } = await getEventState();
  const r = settings.registration;
  const tiebreak = settings.zeroHour.heroTiebreak.map((t) => TIEBREAK_LABEL[t]).join(', then ');

  const faq: [string, React.ReactNode][] = [
    [
      'Who can register?',
      <>
        {r.eligibility}. Teams of exactly three founders
        {r.emailDomain && <>, each registering with their own @{r.emailDomain} email ID</>}. Entry: {r.fee.toLowerCase()}.
        Registration closes {longDate(r.closesAt)} or when {r.maxAgencies} agencies have signed up.
      </>,
    ],
    ['Can we change a founder later?', 'No. The three founders are fixed at registration. Organisers can only correct typos while registration is open.'],
    ['We lost our PIN.', 'Come to the check-in desk or contact an organiser. They will reset it and show you a new PIN once.'],
    ['How many phones do we need?', 'One per agency for the quiz. Your captain logs in with the agency ID and PIN. During the prelim, signing in on a new phone signs the old one out.'],
    ['What if our phone dies during the quiz?', 'Log back in on any phone with the same agency ID and PIN. Questions you missed score 0.'],
    ['Do all three founders need to be there?', 'Yes, all three should be present from Round 1 onward.'],
    ['Is the money real?', 'No. Every rupee in Doomsday is virtual ₹ crore on the Fund Ledger. There are no payments of any kind.'],
    ['What if two agencies tie on Hero Score?', `For 1st or 2nd place: ${tiebreak}.`],
    ['Is there a dress code?', 'Optional: come as your own hero.'],
  ];

  return (
    <>
      <PageHero eyebrow="Protocol" title="Rules & FAQ" art="kalyug">
        The winner is the agency with the highest Hero Score at Zero Hour: a strong hero, luck and nerve in the Vault, and
        cash discipline throughout.
      </PageHero>

      <Section eyebrow="The formula" title="Hero Score">
        <p className="display panel corners px-4 py-7 text-center text-[clamp(1.4rem,4vw,2.2rem)] leading-snug text-bone [--corner-inset:6px] [--corner-size:12px]">
          <span className="whitespace-nowrap text-glow">Power Level</span> × <span className="whitespace-nowrap text-toxic">Battle Outcome</span> +{' '}
          <span className="whitespace-nowrap">Fund left ÷ 2</span>
        </p>
        <Note>Example: Power Level 28, Battle Outcome ×1.5, fund left ₹18 Cr → 28 × 1.5 + 18 ÷ 2 = 42 + 9 = 51.</Note>
        <ul>
          <li>
            <strong>Power Level</strong> = the Power of your 4 gear cards + Team-Up bonuses + Breaking News changes. It is
            fixed after Round 1.
          </li>
          <li>
            <strong>Battle Outcome</strong> = the multiplier inside the Mission File envelope you hold when the envelopes open.
          </li>
          <li>
            <strong>Fund left</strong> = Round 1 leftover + poster bonus + mission cash + net Chai Pe Charcha deals − Force
            Fields − fines.
          </li>
        </ul>
      </Section>

      <Section eyebrow="Your agency" title="Agency rules">
        <ul>
          <li>Exactly 3 founders, named at registration; no changes after that. All three should be present from Round 1 onward.</li>
          <li>Each agency picks a name and gets an ID (A01, A02…) used on the quiz, paddles, posters, forms and the ledger.</li>
          <li>One phone per agency for the quiz.</li>
        </ul>
      </Section>

      <Section eyebrow="The Fund Ledger" title="Money rules">
        <ul>
          <li>All money is virtual ₹ crore on one Fund Ledger, kept by 2 ledger keepers and mirrored on this website.</li>
          <li>Bids and payments move in ₹0.5 Cr steps. No agency may spend more than its fund left.</li>
          <li>Transfers between agencies are allowed only in Round 3&apos;s Chai Pe Charcha, and must be reported to a ledger keeper.</li>
        </ul>
        <H3>Every money movement in the event</H3>
        <Table
          head={['When', 'Amount', 'Rule']}
          numeric={[1]}
          rows={[
            ['Round 1 start', '+₹50 Cr', 'Starting fund for every qualified agency'],
            ['Round 1', '−₹2 Cr', 'Optional sealed Insider Tip'],
            ['Round 1', '−winning bid', 'Each gear card won'],
            ['Round 1', '−₹8 Cr each', 'Forced Jugaad Kit (Power 2) for every category still missing after Last Call'],
            ['Round 2', '+₹5 Cr', 'Poster duel winner (or a bye), only if it also reaches the top 8 in the tower game'],
            ['Round 3', '−₹5 Cr', 'Force Field for one mission'],
            ['Round 3', '+₹6 Cr', "Mission winner's cash option, instead of Swap or X-Ray"],
            ['Round 3', '± any', 'Chai Pe Charcha deals between agencies, reported to the ledger'],
            ['Round 3', '−₹5 Cr', "Fine for opening another agency's Mission File"],
          ]}
        />
        <p>
          Every credit and debit appears on your My Agency page with its time, reason and running balance. Mistakes are
          fixed by a new entry or by voiding the wrong one — never by editing.
        </p>
      </Section>

      <Section eyebrow="Conduct" title="Tone">
        <ul>
          <li>Humour targets situations, never people, communities or bodies.</li>
          <li>Posters must be original artwork; the club can refuse offensive submissions.</li>
        </ul>
      </Section>

      <Section eyebrow="Questions" title="FAQ">
        <div className="divide-y divide-line/70 border-y border-line/70">
          {faq.map(([q, a]) => (
            <details key={q} className="group py-1" open>
              <summary className="flex list-none items-center justify-between gap-4 py-4 [&::-webkit-details-marker]:hidden">
                <span className="font-display text-lg font-semibold tracking-[0.02em] text-bone">{q}</span>
                <span className="font-display flex-none text-xl text-glow transition-transform group-open:rotate-45" aria-hidden="true">
                  +
                </span>
              </summary>
              <div className="pb-5 text-bone/85">{a}</div>
            </details>
          ))}
        </div>
        <p className="text-sm text-steel">
          Anything else: ask an organiser from {EVENT.club}. The organisers&apos; decisions on scoring are final.
        </p>
      </Section>
    </>
  );
}
