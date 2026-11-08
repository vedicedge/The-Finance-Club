/**
 * The dry-run checklist. One source for both the printable sheet (/admin/print/checklist) and
 * docs/dry-run-checklist.md; a unit test fails if the two drift apart.
 * Items use two inline marks only: `code` and **bold**.
 */

export type ChecklistGroup = { title?: string; items: string[] };
export type ChecklistSection = { title: string; intro?: string; groups: ChecklistGroup[] };

export const CHECKLIST_TITLE = 'Dry-run checklist';
export const CHECKLIST_INTRO =
  'A full rehearsal with the crew, on real phones and the auditorium Wi-Fi, before 25 Nov. Tick each line as you go. ' +
  'Allow about 3 hours for the full run, or run the prelim and Round 1 only if time is short.';

export const CHECKLIST: ChecklistSection[] = [
  {
    title: 'The day before',
    groups: [
      {
        items: [
          'Merge the latest pull request on GitHub and wait until Vercel shows the new deployment as **Ready**.',
          'In the Supabase SQL editor, run any migration not run yet, in file-name order from `supabase/migrations/` (20 files; the last is `20261108002000_small_teams.sql`).',
          'If the secret seed has never been run, run `supabase/private/seed_secrets.sql` once.',
          'Command centre: **Database updates** says “Up to date”, and Seed data says **OK** on every row.',
          'Every crew member with a website job signs in once at `/admin/login`; an admin gives each their role in Crew & roles (quiz host, 2 ledger keepers, auctioneer, 2 scorers, social-media lead, anchor, 2 floaters).',
          'Settings: start time, venue, registration deadline, read-in (3 s) and PIN lock look right.',
          'Testers are crew only: the rehearsal plays the real quiz questions, Breaking News and Team-Ups.',
          'Pick a quiet slot (e.g. late evening). While dry run mode is on, the register page offers the name-only test form (real teams use `/register?full=1`) and the leaderboard shows test agencies; once the rehearsal moves past Registration, real registration is closed until the reset.',
          'Print this checklist and one set of backup sheets (Command centre → Print & backups).',
        ],
      },
    ],
  },
  {
    title: 'Set up the room (30 minutes before)',
    groups: [
      {
        items: [
          'Projector laptop on the auditorium Wi-Fi: sign in with the **Projector (view only)** account, open `/projector` and press F for full screen. It follows the event stage by itself and reads from the back row. From the command centre’s **Projector** panel, practise pinning a screen, **Back shortly** and **Blackout**, then set it back to **Automatic**.',
          'Host laptop signed in on `/admin/quiz`; ledger keepers on `/admin/auction` and `/admin/ledger`; scorers and social-media lead on `/admin/round2` and `/admin/round3`.',
          'Phone hotspot charged and switched on as the backup network.',
          'Command centre → **Start dry run mode**. Every page shows the DRY RUN strip.',
          'Each tester opens the site on their own phone → Register → types a name. The phone is signed in and the test agency is checked in. Write each ID and PIN (shown once) on the check-in sheet. Aim for 10 or more phones.',
          'Agencies & check-in lists every test agency with a TEST badge.',
        ],
      },
    ],
  },
  {
    title: 'Run the event, phase by phase',
    groups: [
      {
        title: 'Prelim · Hero Ya Zero?',
        items: [
          'Command centre → phase **Prelim**. Phones show the waiting screen.',
          'Quiz host: shuffle the live 15, open question 1. The 3-2-1 read-in shows on the projector and every phone, then the timer runs.',
          'Testers answer at different speeds; one answers after the timer ends and sees "late" (0 points).',
          'Reveal: only now do phones show right/wrong and points.',
          'Practise: void a question and bring in a spare; reload a phone mid-question; put a phone in airplane mode for 10 s and back.',
          'Sign one test agency in on a second phone after question 1: it gets in, and the first phone is signed out (one phone per agency during the prelim). The login page warns about this.',
          'Type a wrong PIN 5 times on the login page: that ID locks for 60 s.',
          'Every live question must be revealed or voided before publishing. Publish the board, check `/leaderboard` and the projector, export the CSV, then freeze the top 16 (with 16 or fewer testers, everyone goes through).',
        ],
      },
      {
        title: 'Round 1 · Power Bazaar',
        items: [
          'After freezing, press **Start Round 1 · Power Bazaar →** (quiz console). Power Bazaar console → credit starting funds (+₹50 Cr each, once).',
          'Enter the Breaking News draw (or draw at random) before the first tip.',
          'Insider Tips: press **Open the 60-second window**. The projector counts down; two testers buy a tip on My Agency (₹2 Cr, with a confirm step) and the console marks each purchase NEW. Only that agency’s page shows its tip; after 0:00 the Buy button disappears.',
          'Marquee and Secret Identity Bids: record sales; the projector moves to the next lot. Try sales the site must refuse: below the minimum, above the fund left, not a ₹0.5 Cr step, a second card in the same category.',
          'Undo the last entry, and void a sale with a reason: the card returns to the auction and the money to the fund.',
          'Last Call, then Breaking News: reveal the headlines one at a time, then the Team-Ups.',
          '**Apply Jugaad Kits & eliminations** (one kit at ₹8 Cr for each missing category; a team that cannot pay for all its kits is eliminated), then **Lock Round 1**. Press **Show all news & Team-Ups on the projector**: every headline and Team-Up, with who holds each card. Testers check gear, Power Level and fund left on My Agency, as at the real ledger check; then **Back to the normal view**.',
        ],
      },
      {
        title: 'Round 2 · Operation: Skyline',
        items: [
          'After the lock, press **Start Round 2 →** on the Power Bazaar console. Social-media lead draws the duel pairings (an odd number gives one bye).',
          'At the cutoff, type each duel’s story-vote counts; make one a tie and enter the rock-paper-scissors winner.',
          'Scorers enter tower results: correct blocks, reference blocks, build time as m:ss (make one a DNF = 10:00), frozen blocks, blocks fallen. Work one Tower Score by hand on the Round 2 sheet and compare.',
          'Publish: the top 8 stay in, the rest are eliminated in Round 2, and each duel winner or bye in the top 8 gets +₹5 Cr.',
        ],
      },
      {
        title: 'Round 3 · The Doomsday Vault',
        items: [
          'After publishing, press **Start Round 3 →** on the Round 2 console. One admin enters a test multiplier map on the Round 3 console (any spread the spec allows). The reset deletes it.',
          'Record the deal: which finalist holds which envelope (E1–E8).',
          'Each mission: Force Field (₹5 Cr) → Play → Results → Winner’s choice → Chai Pe Charcha. Try a swap with a protected agency (refused), an X-Ray (organisers only), the ₹6 Cr cash choice, a Chai Pe Charcha transfer and a ₹5 Cr fine.',
          'Undo one choice before the reveal.',
        ],
      },
      {
        title: 'Zero Hour',
        items: [
          'Once Mission 4’s result is in, press **Start Zero Hour →**. Record Mission 4’s choice before the first envelope opens.',
          'Anchor: **Open next envelope** in the command centre or the Vault console. Envelopes open in ascending Power Level, ties by agency ID. Work one Hero Score by hand on the Zero Hour sheet and compare.',
          'After the eighth, the final ranking shows; a tie for 1st or 2nd that survives fund left and Power Level shows a coin-toss call.',
          'Phase **Event over**.',
        ],
      },
    ],
  },
  {
    title: 'Fallback drills (use the backup sheets)',
    groups: [
      {
        items: [
          'Site down mid-auction: for 5 minutes the auctioneer keeps calling lots; ledger keeper 1 writes each sale on the lot tally and the backup ledger, keeper 2 updates the fund tracker. Then enter every line on the site and tick "On site": the site’s fund left must match the paper.',
          'Wi-Fi down: move the projector laptop and a few phones to the hotspot. Pages recover by themselves (they poll every 1–5 s).',
          'Projector laptop restarts: reopen `/projector`; it picks up the current state.',
          'A phone dies mid-prelim: the captain signs in on another phone with ID + PIN.',
          'Lost PIN: Agencies & check-in → reset PIN; the new PIN shows once.',
          'Time each segment against the run-sheet (prelim 15 min, Round 1 50, Round 2 35, Round 3 31, Zero Hour 20) and note where you ran over.',
        ],
      },
    ],
  },
  {
    title: 'After the rehearsal',
    groups: [
      {
        items: [
          'Settings → Danger zone → reset with **keep registrations** (type RESET). Test agencies are deleted and real agencies go back to "registered". The quiz order, Breaking News draw, lot order, multiplier map and all money are cleared; settings, crew and the audit log stay.',
          'Command centre → **End dry run mode**. The DRY RUN strip disappears.',
          'Check: phase is Registration, `/leaderboard` is empty, Agencies & check-in shows only real teams, Seed data says OK.',
          'Write down what went wrong, who fixes it, and by when.',
        ],
      },
    ],
  },
  {
    title: 'Event day pre-flight (25 Nov)',
    groups: [
      {
        items: [
          'No DRY RUN strip anywhere (dry run mode is off).',
          'Registration closed (deadline passed, or closed in Settings); phase **Check-in** when the doors open.',
          'Floaters check agencies in on Agencies & check-in; the printed check-in sheet is the backup.',
          'Before Round 3, one admin enters the real multiplier map from the filled envelopes. No screen shows it until each envelope opens.',
          'Breaking News: the 6 drawn and sealed in order, and entered on the console before the first tip.',
          'Projector (`/projector`, Automatic), consoles, chargers and hotspot set up as in the rehearsal.',
          'A fresh set of backup sheets printed, with pens and clipboards for the ledger keepers and scorers.',
        ],
      },
    ],
  },
];

/** The checklist as Markdown, for docs/dry-run-checklist.md. */
export function checklistMarkdown(): string {
  const out: string[] = [
    `# ${CHECKLIST_TITLE}`,
    '',
    CHECKLIST_INTRO,
    '',
    'Printable copy: Command centre → Print & backups → Dry-run checklist (`/admin/print/checklist`).',
    `This file is generated from \`lib/print/checklist.ts\`; edit that file, then run \`npm run docs:checklist\`.`,
  ];
  for (const section of CHECKLIST) {
    out.push('', `## ${section.title}`);
    if (section.intro) out.push('', section.intro);
    for (const group of section.groups) {
      if (group.title) out.push('', `### ${group.title}`);
      out.push('', ...group.items.map((i) => `- [ ] ${i}`));
    }
  }
  return out.join('\n') + '\n';
}
