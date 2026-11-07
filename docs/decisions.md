# Decisions log

Choices the website makes where `docs/event-spec.md` is open, unclear or silent. Each one is
either an admin setting (stored in `event_state.settings`, editable from the admin panel once
Milestone 2 adds the settings screen) or noted as fixed behaviour. None of them adds a rule, round
or money mechanic.

## Open decisions from the spec → admin settings

| # | Decision | Default in use | Setting |
|---|---|---|---|
| 1 | Registration rules | IMI Delhi students only, **@imi.edu emails required** (amendment A3); free; closes 23 Nov 2026 23:59 IST; cap 60 agencies | `registration.eligibility`, `.email_domain` (`imi.edu`; clear it to turn the check off), `.email_hint`, `.fee`, `.closes_at`, `.max_agencies`, `.open` |
| 2 | Start time and venue | 5:30 pm IST, auditorium | `event.starts_at`, `event.venue` |
| 3 | Hero Score tie for 1st/2nd | Higher fund left, then higher Power Level, then coin toss (anchor enters it) | `zero_hour.hero_tiebreak` |
| 4 | Others' fund left public in Round 1 | Hidden until Round 1 locks; each agency sees only its own | `round1.show_fund_publicly` |
| 5 | Prize amounts | Shown as "Classified — to be announced" until set (no Biggest Fan prize: amendment A1) | `prizes.winner`, `.runner_up` |
| 8 | Tower cutoff tie-break | Rock-paper-scissors (organiser enters the result) | `round2.cutoff_tiebreak` |
| 10 | Jugaad Kit rows | JK1–JK4 seeded; admin can add more if ever needed | gear_cards rows |

Decisions 6, 7 and 9 (puzzle content, slingshot props, poster posting time) do not affect the site.

## Amendments from the organisers (5 Nov 2026)

Recorded at the top of `docs/event-spec.md`: A1 no Fan Club (no predictions, no Biggest Fan),
A2 Round 2A duels voted on Instagram stories (`poster_duels.votes_a/votes_b`), A3 @imi.edu
founder emails only, A4 PINs shown on screen only, A5 (7 Nov) Insider Tips bought by agencies on
My Agency in a 1-minute window.

## Website defaults (also settings)

| Topic | Default | Setting |
|---|---|---|
| Must an agency be checked in to play the prelim? | Yes | `prelim.requires_checkin` |
| Read-in before each question's clock starts | 3 seconds | `prelim.lead_in_seconds` (0–10) |
| Insider Tip: which drawn news card it reveals | Site picks one of the 6 drawn cards at random; shown only on that agency's My Agency page | `round1.insider_tip_assignment` (`random` / `manual`) |
| Reveal order when Power Levels tie | Agency ID order | `zero_hour.reveal_order_tiebreak` |
| PIN brute-force protection | 5 wrong PINs → 60 s lock for that agency ID | `security.pin_max_attempts`, `.pin_lock_seconds` |

## Spec ambiguities resolved (fixed behaviour)

- **Rounding t.** t = received_at − opened_at (both database time), rounded to 0.1 s half-up,
  then compared with T. So 10.04 s → 10.0 s (in time), 10.05 s → 10.1 s (0 points).
- **"New agency logins close when Q1 opens."** An agency that never logged in before Q1 opens is
  locked out of the quiz; one that did can log back in on any phone. During the prelim phase only,
  signing in on a new phone signs the agency's other phones out (one phone per agency for the
  quiz); before that, all three founders can be signed in on their own phones.
- **Registration signs the phone in.** After registering, that phone is signed in to My Agency
  straight away; the ID and PIN are shown once on the confirmation screen.
- **Sudden death "on stage".** The projector shows the question to the tied agencies; the quiz host
  records the finishing order. It is not played on phones.
- **Jugaad Kit category.** A Jugaad Kit sale records the category slot it fills, so the
  one-card-per-category rule holds.
- **Voids, not edits.** The spec's `ledger_entries.voided` column would be an edit. A void is
  instead a new row in `ledger_voids`; "voided" is derived. Voiding an entry also voids its linked
  sale, tip or Force Field, and the other leg of a transfer. Sales, tips, Force Fields and envelope
  moves can only change by being voided, once.
- **Envelope holder** is derived from the deal and swap history (`envelope_moves`), so a wrong
  swap can be undone by voiding it.
- **Sub-steps.** `event_state.step` records the step inside a round (e.g. Insider Tips window,
  Force Field window), which the ledger checks need.
- **Negative fund from a fine.** Allowed: a fine always applies (the Fine rule has no check).
- **Floater and auctioneer roles** are added: the crew table gives them screens (check-in, auction
  projector) but the Roles table does not list them.
- **Founders** can be corrected by organisers only while registration is open; locked after.
- **One person, one agency.** A founder's email and phone must be unique across agencies.
- **/schedule** page added (asked for in the brief; not in the spec's page list).
- **PIN delivery** (amendment A4): shown once on the registration confirmation; never emailed by
  the site. A lost PIN is reset by an organiser, and the new PIN is shown once to pass on.

## Prelim quiz (Milestone 3)

- **Read-in.** When the host opens a question, the projector and every phone show it with a
  3-2-1 countdown; answers are accepted, and t is measured, only from the end of the countdown
  (`opened_at`, database time). Phones on crowded Wi-Fi receive the question up to a second
  apart, so starting the clock on the host's click would penalise slow connections. The formula,
  T and W are unchanged.
- **Live updates by polling, not Realtime.** Phones poll every second while a question is live
  (two when idle) and the projector every second. The read-in makes a one-second polling delay
  irrelevant to scoring, polling survives Wi-Fi drops without reconnect logic, and it keeps the
  Supabase client library off cheap phones. Realtime can still be added later if wanted.
- **Correctness stays in the database.** The answer is marked and scored inside the database
  when it is locked; the phone is told only "locked" (or "late"). Right/wrong, points and the
  correct option reach a phone only after the host reveals the question, and the phone's running
  total counts revealed questions only (otherwise a jump in the total would give the answer away).
- **Late answers.** An answer that reaches the server after T is recorded with 0 points (spec:
  "if t > T the answer scores 0") and the phone says so.
- **Reveal waits for the timer**, so no agency's answering time can be cut short.
- **A skipped reveal can't block the quiz.** If the host moves on without revealing a question,
  its row in the live 15 (and the Publish panel) offers *Reveal*, and the next question opens only
  once every finished question is revealed or voided.
- **Void after reveal** is allowed (a disputed question) until the board is published.
- **The order** of the live 15 is shuffled once by the host and can be re-shuffled only until
  question 1 opens.
- **Sudden death** is shown on the projector from the host console; the host records the
  finishing order of the tied agencies. Phones show "Tie-break on stage".
- **Freezing the top 16** marks them "In the game" and everyone else "Eliminated · Prelim". The
  ₹50 Cr starting fund is credited when Round 1 starts (Milestone 4).

## Power Bazaar and the Fund Ledger (Milestone 4)

- **Starting funds** are credited with one button in the Power Bazaar console once Round 1 has
  started (after the top 16 are frozen): +₹50 Cr to every agency in the game, once.
- **Steps** (event_state.step): Rules → Insider Tips → Marquee → Secret Identity Bids → Last Call →
  Breaking News → Ledger check. Tips sell only in the Insider Tips step; sales are recorded only
  in Marquee (the 8 Marquee lots), Secret Identity Bids (the other 52) or Last Call (any unsold
  card). Every other ledger check is exactly the spec's table, enforced in the database.
- **Lot order**: the 8 Marquee lots run in card-ID order (G01, G02, H01, H02, K01 …); the 52 secret cards run
  one category at a time, categories and cards shuffled once before the first sale. Recording a
  sale of the lot on the projector moves the projector to the next lot.
- **Breaking News draw**: entered in the console (6 cards in their sealed order) or drawn at
  random there; it cannot change once a tip has been sold. Headlines are revealed one at a time
  on the projector in the Breaking News step; locking Round 1 reveals any left, and the Team-Ups.
- **Insider Tips** (amendment A5): the ledger keeper or auctioneer opens a 60-second window from the
  console (it needs the starting funds credited and the Breaking News draw entered). The projector
  counts down; each agency in the game buys one tip for ₹2 Cr on its My Agency page, with a
  confirm step; the window is timed by the database. The site picks one of the 6 drawn cards at
  random and shows it only on that agency's page ("eyes only"); several agencies can draw the
  same card. The console lists each purchase as it lands (marked NEW for 20 s) with the card,
  for the record. An organiser can still record a tip for an agency during the Tips step, as a
  fallback (e.g. a dead phone).
- **News recap** (requested 7 Nov 2026): the Breaking News panel of the Power Bazaar console has
  *Show all news & Team-Ups on the projector*: one screen with all 6 headlines (card hit, who
  holds it, the change) and the 3 Team-Ups (who holds both cards), so every agency can check its
  Power Level. The database allows it only once every drawn headline and the Team-Ups are
  revealed (locking Round 1 reveals any left); *Back to the normal view*, changing step or the
  reset turns it off.
- **Next round**: once a round is finished (top 16 frozen, Round 1 locked, Round 2 published,
  Mission 4 decided), its console and the command centre show *Start <next round> →* to admins.
  It moves only forward, one round at a time; the command centre's phase switcher remains for
  anything else.
- **Close Round 1** is two buttons: *Apply Jugaad Kits & eliminations* (missing one category and
  ₹8 Cr in the fund → the next free Jugaad Kit row; missing two or more, or short of ₹8 Cr →
  eliminated in Round 1), then *Lock Round 1*, which refuses while anyone in the game still
  lacks a category.
- **After the lock**, Round 1 purchases (gear, Jugaad Kits, tips) can no longer be voided:
  Power Levels are final. Other entries can still be voided.
- **Undo** voids the most recent entry made by the ledger keeper who clicks it, so two keepers
  never undo each other's work. Voiding a sale returns the card to the auction and the money to
  the fund. Every void and adjustment needs a reason.
- **Funds on the projector** stay hidden until Round 1 locks (open decision 4), unless the
  setting shows them.

## Rounds 2–3, leaderboard and Zero Hour (Milestone 5)

- **Round 2 roles.** The social-media lead draws the duel pairings (random; one bye for an odd
  number; redraw allowed until votes are in) and types the story-vote counts at the cutoff; a tie
  needs the rock-paper-scissors winner. Scorers enter tower measurements (build time as m:ss, or
  DNF = 10:00 and Speed 0) and publish. A tie at 8th place is settled by the announced method and
  entered as an order; publishing refuses until it is.
- **Publishing Round 2** keeps the top 8, eliminates the rest in Round 2, and credits +₹5 Cr to
  each duel winner or bye that made the top 8. Best Launch Poster (most story votes) is shown as
  recognition only.
- **Multiplier map**: entered on the Round 3 console by an admin only, checked against the spec's
  distribution, and never sent to any screen until that envelope is opened.
- **The deal** records which finalist holds which envelope; it can be redone until the first
  Force Field, winner or choice.
- **Mission cycle**: Force Field → Play → Results → Winner's choice → Chai Pe Charcha, moved by
  ledger keepers or scorers. Force Fields only in their window; swaps refuse a protected target;
  transfers only in a Chai Pe Charcha window (missions 1–3). Mission 4's choice is made at the
  start of Zero Hour and must be made before the first envelope opens.
- **Undo a choice** before the reveal: a swap is voided (envelopes go back), cash is voided. An
  X-Ray cannot be un-seen, so its secret log row stays.
- **Fines** always apply (a fund can go below zero), as before.
- **Zero Hour**: the anchor clicks *Next envelope* (or presses →) on the reveal screen; envelopes
  open in ascending Power Level, ties by agency ID. After the eighth, the final ranking applies
  open decision 3 (higher fund left, then higher Power Level); if still level for 1st or 2nd, the
  screen calls a coin toss on stage.
- **Public leaderboard** shows only public facts: prelim board (after publishing), Power Levels and
  status (funds hidden until Round 1 locks unless the setting shows them), Tower Scores and the
  top 8 (after publishing), the mission log (swap targets yes, X-Ray targets never) and Hero Scores
  as envelopes open. It is cached at the edge for 4 seconds.
- **Reset** (Settings → Danger zone, admin, type RESET): clears all game data and puts the event
  back to Registration, keeping registrations (agencies back to "registered") or deleting them.
  Settings, crew and the audit log stay.

## Dry run mode (requested 6 Nov 2026)

- **Command centre → Start dry run mode** (admin). While it is on, every page shows a DRY RUN
  strip, and the register page asks only for a name: that creates a one-person **test agency**
  (no IMI email, no section or phone), signs that phone in and checks the agency in, ready for the
  rounds. Test agencies can join until the prelim starts, whatever the real deadline, flag or cap.
- **Real registrations are untouched**: they still need exactly 3 founders and @imi.edu emails,
  don't count test agencies against the cap of 60, don't appear on the dry run's boards, and are
  never eliminated by it. The full form stays reachable at `/register?full=1` while registration
  is open.
- **After the rehearsal**: Settings → Danger zone → reset with "keep registrations" deletes the
  test agencies and puts every real agency back to "registered". Then End dry run mode.
- Test agencies use placeholder contact details that can never clash with a real founder.

## Printable backups (requested 6 Nov 2026)

- **Command centre → Print & backups** (every crew role): black-on-white A4 sheets for check-in,
  the Power Bazaar lot tally and fund tracker, a backup Fund Ledger, Round 2 duels and tower
  scores, Round 3 deal/missions/transfers/fines and Zero Hour Hero Scores, plus the dry-run
  checklist (`docs/dry-run-checklist.md`, generated from `lib/print/checklist.ts`).
- Each sheet prefills what is already on the site (agencies, cards, sales, results) and leaves
  the rest blank. Nothing secret is printed: no answer keys, multipliers, X-Ray targets, Insider
  Tip cards or unrevealed Breaking News and Team-Ups; those tables are never read for printing.
- Paper is a fallback only: every line written while the site is down is entered on the site
  afterwards, so the Fund Ledger stays the one record.

## Fixes from the 30-agency playthrough (7 Nov 2026)

A full run of the event on the real site (30 agencies, 28 phones in the prelim, every console)
found these; all are fixed and re-tested:

- **Changing phones.** The phone an agency registers on now counts as its first login, the dry-run
  reset keeps that mark, and the "joining has closed" rule applies only during the prelim. Before,
  an agency that never typed its PIN could not sign in on another phone after question 1 opened,
  for the rest of the event. An organiser's PIN reset also lets the agency in.
- **Prelim login warning.** During the prelim the login page says that signing in signs the
  agency's other phones out (one phone per agency), so only the captain should sign in.
- **Tied poster duels.** The rock-paper-scissors picker is always shown; before, a tie could not be
  saved at all, because the picker only appeared once a tie was already saved.
- **Refused saves keep what was typed** (duel votes, tower measurements).
- **Undo names the entry** it will void and needs a tick; it refuses if a newer entry appeared.
- **Publishing the prelim board** puts the board on the projector.
- **Crediting the starting funds shuffles the lots** if nobody has, so secret cards never run in
  printed card order.

## Safety nets (7 Nov 2026)

- **Database updates check.** Each migration is pasted into the Supabase SQL editor by hand, so one
  can be missed. The newest migration defines `schema_version()`; the command centre shows
  "Database updates: Up to date / Update missing", and every organiser page shows a red strip
  while the database is behind the deployed code. Every new migration must bump the version
  (a unit test enforces it).
- **Coin toss at Zero Hour.** If 1st (or 2nd) place is still level after the tie-breaks, the
  reveal screen and the public leaderboard say a coin toss is coming and name both agencies; no
  winner or runner-up is shown before it. The anchor announces the result of the toss.

## Secrets and the public repository

The repository `vedicedge/The-Finance-Club` is public. The spec's Appendix A (questions and
answers), Team-Ups and Breaking News are therefore kept out of git, in
`supabase/private/seed_secrets.sql` (git-ignored), and redacted from `docs/event-spec.md`.
If the repository is made private, they can move into a normal migration.

## Visual direction

Redesigned on 7 November around the club's event poster (`assets/art/poster.jpg`): green on
near-black, Cinzel capitals, the eclipse and the hooded Professor Kalyug, cinematic film-strip
frames and viewfinder corners from the Pinterest references. Details in
`docs/design-refs/README.md` and `scripts/art/README.md`. The spec's comic-book styling is not
used. All art is original or cut from the club's own poster; no Marvel/DC imagery. The poster
itself is not shown on the site (its date, venue and club line are still being finalised); the
hero uses the club's character art of Professor Kalyug (hood to waist) and the poster's
lettering instead. The hero fits the first screen on phones and laptops: art, wordmark, clock
and the register button, with no scrolling.

## Projector and gear cards (8 November)

- **One projector link: `/projector`.** The projector laptop opens it once, full screen, signed in
  with a view-only **Projector** crew account (Crew & roles → role "Projector (view only)"; it can
  open the projector screens and nothing else, and signing in sends it straight to `/projector`).
  The screen follows the event phase: Welcome (registration, check-in) → Prelim quiz → Power
  Bazaar → Leaderboard (Rounds 2 and 3) → Zero Hour reveal (also after the event ends). The
  command centre's **Projector** panel can pin any screen, a "Back shortly" slide or a blackout
  until it is set back to Automatic, and shows a live preview. The anchor opens each envelope
  with **Open next envelope** in the command centre or the Vault console. The old per-screen
  links (`/screen/quiz` etc.) still work.
- **60 named cards in series.** Every gear card has its own name and picture. Cards that share a
  Power and minimum bid form a series named after the original card, and Breaking News and
  Team-Ups still name a series, so the game and the secret seed are unchanged (spec Appendix B).
- **Card pictures:** one per card, added later by the club as `public/cards/<card ID>.webp`
  (plus `JK.webp` and `back.webp`); a card without one shows its category icon. Pictures are
  not shown publicly before the auction.
