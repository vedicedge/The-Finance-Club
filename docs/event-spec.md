# Doomsday — Event Bible & Website Spec

> Transcribed from `Plan.pdf` (29 pages, dated Nov 5, 2026, by DosaJr). This file is the
> source of truth for rules, scoring, data and scope. Where the website makes a choice the
> spec leaves open, it is listed in `docs/decisions.md`, not edited in here.
>
> This repository is public, so the event secrets (Appendix A questions and answers, the
> Team-Ups and the Breaking News cards) are redacted below and kept in the git-ignored
> `supabase/private/` folder. Everything else is verbatim.

## Amendments (agreed with the organisers on 5 Nov 2026)

These override the text below wherever they conflict.

| # | Change | Effect on the website |
|---|---|---|
| A1 | **No Fan Club.** Agencies knocked out in the prelim, Round 1 or Round 2 are simply eliminated. There is no "Predict the final top 3" form and no Biggest Fan lucky draw. | Status is "In the game" or "Eliminated in round X". No `/predict` page, no `predictions` table, no Biggest Fan award. |
| A2 | **Round 2A poster duels are voted on Instagram stories** (not feed-post likes). The duel winner is rewarded; Round 2B (the tower game) decides who is eliminated. | The social-media lead types each duel's story-vote counts at the cutoff. The ₹5 Cr poster bonus rule is unchanged (winner or bye, credited only if it also makes the top 8). |
| A3 | **IMI students only: every founder registers with an @imi.edu email.** | The register form reminds teams to use their IMI email ID; any other email is rejected (also enforced by the database). |
| A4 | **PINs are shown on screen at registration only.** The admin emails them personally if needed. | No automatic email. PINs are stored scrambled, so a lost PIN is reset from the admin agencies page, which shows the new PIN once. |
| A5 | **Insider Tips are bought by agencies themselves** (7 Nov 2026). The ledger keeper opens a 1-minute window shown on the projector; during it each agency in the game may buy one tip (₹2 Cr) on its My Agency page, and the site picks the card at random. | Self-service tips with a database-timed window; the console lists each purchase as it happens. Price, one-per-agency and the random card are unchanged. |

Doomsday is the finance club's 3-hour intra-college event on **Nov 25, 2026**. 50+ agencies of
3 founders start with a virtual ₹50 crore, and one surviving hero agency wins Mahanagar. This
doc is the single source for how the event runs, what participants and organisers each do, and
what the in-house website must build.

## Event flow

**Five stages cut 50+ agencies to one Hero Agency**

| Stage | Format | Cut |
|---|---|---|
| **Prelim · Hero Ya Zero?** | 15 min · website quiz · 50+ agencies → top 16. Speed + correct answers; 7 of 15 questions are finance | top 16 |
| **Round 1 · Power Bazaar** | 50 min · physical auction + website ledger · 16 agencies. Start ₹50 Cr · win 4 gear cards → Power Level + fund left | survivors (0–2 out) |
| **Round 2 · Operation: Skyline** | 35 min · handmade posters + tower and slingshot → top 8. Poster duel winner +₹5 Cr only if it reaches the top 8 | top 8 |
| **Round 3 · The Doomsday Vault** | 31 min · 4 paper puzzle races · 8 sealed Mission File envelopes. Force Field −₹5 Cr · mission winner: Swap, X-Ray or +₹6 Cr | 8 finalists |
| **Zero Hour · one Hero Agency** | 20 min · envelopes opened in ascending Power Level. Hero Score = Power Level × Battle Outcome + Fund left ÷ 2 | 1 winner |

Eliminated agencies join the **Fan Club**: like poster duel posts, cheer the takedowns, predict
the final top 3, Biggest Fan lucky draw.

The prelim and Round 1 run on the website; Rounds 2 and 3 are played physically, with
organisers entering results so every agency can track its status and the leaderboard live.

## Story, theme and tone

Professor Kalyug has announced a doomsday attack on the city of Mahanagar for 25 November. Each
team is a newly founded hero agency with ₹50 crore of funding; it must build a hero, win public
support and survive the final battle. Tagline: **Fund it ★ Build it ★ Save the city.**

| Element | Value |
|---|---|
| Event name | Doomsday (working name; earlier drafts: Hero Inc. — The Doomsday Protocol). Anything new added to the event or website must fit the doomsday story |
| Villain | Professor Kalyug |
| City | Mahanagar (Delhi-flavoured: Aravallis, Hauz Khas, Cyber City, the Metro) |
| Team unit | Agency of exactly 3 founders, ID A01, A02… |
| Currency | Virtual ₹ crore, tracked on one Fund Ledger |
| Winner title | Mahanagar's Hero Agency of the Year |
| Visual style | Comic book: navy background, yellow and red accents, halftone dots, speech bubbles, "FUNDED!" stamps (matches the event plan PDF) |
| Language | English with Hinglish round names and jokes |
| Optional dress code | Come as your own hero |

**Tone rules (apply to the website, quiz, posters and anchor script)**

- Humour targets situations, never people, communities or bodies.
- Posters must be original artwork; the club can refuse offensive submissions.
- Use real Marvel and DC hero names only as quiz content. The website itself should use the
  event's own art (the shield logo, Mahanagar skyline) and no copyrighted character images or logos.

## Core rules: agencies, money and the Hero Score

The winner is the agency with the highest Hero Score at Zero Hour. It rewards a strong hero
(Power Level), luck and risk management in Round 3 (Battle Outcome), and cash discipline
throughout (Fund left).

```
Hero Score = Power Level × Battle Outcome + Fund left ÷ 2
```

Example: Power Level 28, Battle Outcome ×1.5, Fund left ₹18 Cr → 28 × 1.5 + 18 ÷ 2 = 42 + 9 = **51**.

**Agency rules**

- Exactly 3 founders, named at registration; no changes after that. All three should be present
  from Round 1 onward.
- Each agency picks a name and gets an ID (A01, A02…) used on the quiz, paddles, posters, forms
  and ledger.
- One phone per agency for the quiz and any mission form.

**Money rules**

- All money is virtual ₹ crore on one Fund Ledger, kept by 2 ledger keepers and mirrored on the website.
- Bids and payments move in ₹0.5 Cr steps. No agency may spend more than its fund left.
- Transfers between agencies are allowed only in Round 3's Chai Pe Charcha and must be reported
  to a ledger keeper.

**Every money movement in the event**

| When | Amount | Rule |
|---|---|---|
| Round 1 start | +₹50 Cr | Starting fund for every qualified agency |
| Round 1 | −₹2 Cr | Optional sealed Insider Tip |
| Round 1 | −winning bid | Each gear card won |
| Round 1 | −₹8 Cr | Forced Jugaad Kit (Power 2) if missing exactly one category |
| Round 2 | +₹5 Cr | Poster duel winner, only if it also reaches the top 8 in the tower game (also applies to a bye) |
| Round 3 | −₹5 Cr | Force Field for one mission |
| Round 3 | +₹6 Cr | Mission winner's cash option, instead of Swap or X-Ray |
| Round 3 | ± any | Chai Pe Charcha deals between agencies, reported to the ledger |
| Round 3 | −₹5 Cr | Fine for opening another agency's Mission File |

Fund left at Zero Hour = Round 1 leftover + poster bonus + mission cash + net Chai Pe Charcha
receipts − Force Fields − fines. Round 1 leftover already includes gear, Jugaad Kit and tip
payments; never deduct them twice.

Power Level = the Power of the 4 gear cards + Team-Up bonuses + Breaking News changes. It is
fixed after Round 1.

## Prelim — Hero Ya Zero? (15 min, on the website)

A 15-question live quiz cuts 50+ agencies to the top 16. It runs on the in-house website:
questions on the projector, answers on one phone per agency, scores computed on the server.
Faster correct answers score more.

| Segment | Questions | Options | Timer (T) | Weight (W) | Max points |
|---|---|---|---|---|---|
| Marvel Ya DC? | 4 | 2 | 10 s | 1 | 4,000 |
| Teen Clue, Ek Hero | 4 (2 Marvel, 2 DC) | 4 | 10 s | 1 | 4,000 |
| Box Office Ka Hisaab (finance) | 4 | 4 | 20 s | 2 | 8,000 |
| Hero Ka Business (finance + business) | 3 | 4 | 10 s | 1 | 3,000 |
| **Total** | **15** | | | | **19,000** |

**Scoring** (t = seconds from question open to answer received, measured on the server to 0.1 s)

```
points = round(1000 × W × (1 − t / 2T))   if correct and t ≤ T, else 0
```

A correct answer earns 500 × W at the last moment and 1,000 × W instantly; halves round up.
Examples: Marvel Ya DC? correct at 2.0 s = 900; Box Office correct at 12.0 s = 1,400; any wrong
answer = 0.

**Ranking:** total points, highest first. Tie-break 1: lower sum of response times on correct
answers. Tie-break 2, for 16th place only: one sudden-death question on stage (Appendix A).

**Participant side**

1. Before 0:10, one founder logs in on the website with the agency ID and PIN from registration.
2. Joining closes when question 1 opens. A dropped phone can log back in as the same agency;
   missed questions score 0.
3. Each question shows its segment name, so agencies know whether they have 10 or 20 seconds.
   Tap one option; the answer locks on tap.
4. After each question the phone shows right/wrong and points earned; the projector shows the
   correct answer.
5. At the end, the projector shows the final board. Top 16 go to Power Bazaar; everyone else
   joins the Fan Club.

**Organiser side**

1. Quiz host loads the 15 live questions (pre-shuffled once; same order for everyone) and checks
   the spares are ready.
2. Host opens each question for all agencies at once from the host console; the server stamps
   the open time.
3. If a question breaks or is disputed, the host voids it and opens a spare from the same segment.
4. Host publishes the final board; scorers confirm ties; the anchor runs sudden death if 16th
   place is tied.
5. Export the CSV (agency, q1–q15 points, total, correct count, total correct time) and freeze
   the top 16 for Round 1.

| Clock | Step | Length |
|---|---|---|
| 0:10 | Join and rules | 5 min |
| 0:15 | 15 questions with answer reveals | 8 min |
| 0:23 | Final board and tie-break | 2 min |

## Round 1 — Power Bazaar (50 min, physical auction + website ledger)

The top 16 agencies each sign one HQ, one Suit, one Gadget and one Sidekick from 60 gear cards,
using a ₹50 Cr fund. Bidding is physical (shield paddles and slates); every result is entered on
the website, which keeps the Fund Ledger and shows each agency its gear and fund left in real
time. Round 1 sets each agency's **Power Level** and **fund left**.

**The cards:** 15 per category, one fewer than the agencies, so someone always misses out. Each
card shows a public Power (1–10) and a minimum bid. The top 2 cards per category are the 8
Marquee lots. Full list in Appendix B.

**Auction phases**

| Clock | Phase | Length | How it works |
|---|---|---|---|
| 0:35 | Rules | 3 min | Anchor explains phases, bid rules and the Jugaad Kit |
| 0:38 | Insider Tips | 2 min | An agency may buy one sealed tip for ₹2 Cr; it privately reveals one upcoming Breaking News card |
| 0:40 | Marquee Auction | 10 min | 8 lots, live with paddles, about 75 s each; opening bid = card's minimum |
| 0:50 | Secret Identity Bids | 22 min | The other 52 cards, one at a time, about 25 s each, on slates |
| 1:12 | Last Call | 3 min | Unsold cards re-auctioned live, only to agencies still missing that category, from the minimum |
| 1:15 | Breaking News | 6 min | Reveal the 6 news cards and the 3 Team-Ups (+3 each) |
| 1:21 | Ledger check | 4 min | Ledger keepers and agencies confirm gear, Power Level and fund left |

**One Secret Identity Bid (about 25 s)**

1. **Show (5 s):** the card appears on the projector with its Power and minimum bid.
2. **Write (10 s):** every agency still without that category writes a bid on its slate, or "PASS".
3. **Unmask (10 s):** on "3, 2, 1, mask utaro!" all slates go up together. The highest valid bid
   wins and pays at once.

**Bid rules**

- Valid bid: at least the card's minimum, at most the agency's fund left, in ₹0.5 Cr steps.
  Anything else counts as a pass.
- One card per category per agency. Winning bids are final and come off the ledger at once.
- Tie for highest: tied agencies re-bid once on slates; still tied, coin toss.
- No valid bid: the card goes unsold to Last Call. Cards run one category at a time, in a
  shuffled order.
- Missing exactly one category after Last Call: the agency must take the Jugaad Kit (Power 2) for ₹8 Cr.
- Missing two or more categories, or unable to pay for the Jugaad Kit: eliminated. Expect 0–2 agencies out.

**Participant side**

- Bring the shield paddle (Marquee and Last Call) and slate + marker (Secret Bids) given at the
  start of the round.
- Track your own fund on the website's "My Agency" page; it updates after every sale.
- Decide whether the ₹2 Cr tip is worth it, and how much of the ₹50 Cr to keep: fund left counts
  half in the Hero Score.
- At the ledger check, confirm the 4 cards and fund left shown on your page with a ledger keeper.

**Organiser side**

- Auctioneer runs lots; the projector shows the current card from the website's auction screen.
- Ledger keeper 1 enters each sale on the website (card, agency, price); the site rejects a price
  below the minimum, above the agency's fund left, off the ₹0.5 Cr step, or in a category the
  agency already holds.
- Ledger keeper 2 checks slates and hands over the physical gear card.
- After Last Call, the site lists agencies missing a category; apply the Jugaad Kit or
  elimination, then apply news and Team-Ups and lock Round 1.

## Round 2 — Operation: Skyline (35 min, physical)

Up to 16 agencies make a handmade poster for their hero, then play a physical tower-and-slingshot
challenge. The 8 highest Tower Scores reach Round 3. Posters only earn cash; they never affect
qualification. Everything is played on the floor; organisers enter results on the website, and
agencies see them on the leaderboard once published.

### Part A — Signal Before the Storm (handmade posters, 5 min)

- **Make (5 min):** each agency draws a poster on the sheet provided, showing its agency ID, the
  hero built in Round 1, the hero's identity and the doomsday mission. Original artwork only.
- **Pairings:** drawn randomly after Round 1 (the website can run the draw). An odd number of
  agencies gives one a bye.
- **Post:** volunteers photograph each poster; the social-media lead posts each as its own
  Instagram feed post on the club account, labelled with agency ID and opponent. No story polls.
  All posts go live before the tower reference viewing begins.
- **Vote:** likes count until the last team's slingshot shot. At that moment the social-media lead
  screenshots every post's like count; only cutoff counts are used.
- **Result:** higher likes wins each duel; a tie is settled by rock-paper-scissors. The winner (or
  a bye) gets **₹5 Cr only if it also finishes in the top 8** of the tower game. A losing opponent
  never inherits the bonus.

### Part B — Skyline: Build. Break. (30 min)

| Step | Time | What happens |
|---|---|---|
| Reference viewing | 1 min 30 s | Each team sees a different colour-coded block-tower photo; then all references are hidden |
| Tower building | 10 min | All teams build from memory at once. Record completion time; freeze and photograph each build |
| Slingshot construction | 8 min | Build a launcher from supplied props. No practice shots; safety inspection before firing |
| Single-shot takedown | 6 min | One shot per team in controlled lanes; record blocks fallen. Close Instagram voting after the last shot |
| Judge and qualify | 4 min 30 s | Compute scores, settle cutoff ties, announce top 8, credit eligible poster bonuses |

**Tower Score** (use unrounded scores for ranking)

- Accuracy A = 100 × blocks in the correct position and colour ÷ blocks in the reference.
- Speed S = 100 × (1 − build time ÷ 10 min). Time runs from the reference being hidden to the team
  declaring its build final; an unfinished build freezes at 10 min with S = 0.
- Destruction D = 100 × built blocks that fall after the shot ÷ blocks in the frozen build; D = 0
  if nothing was built.
- Tower Score = (A + S + D) ÷ 3. Highest 8 qualify. A tie at the cutoff is settled by
  rock-paper-scissors or a short quiz, announced before play.

Example: 18 of 20 blocks correct (A = 90), built in 6 min (S = 40), 15 of 20 blocks fall (D = 75)
→ (90 + 40 + 75) ÷ 3 = 68.33.

**Participant side:** make the poster, ask friends and the Fan Club to like your post, memorise
the tower in 90 seconds, rebuild it, build a safe launcher, take one shot. Check the leaderboard
for your Tower Score and whether the ₹5 Cr landed.

**Organiser side:** prepare equal-difficulty tower references and matching block kits; capture and
post posters fast; marshal the firing lanes; record per team the correct blocks, reference block
count, build time, frozen block count and blocks fallen; enter these on the website, which
computes A, S, D and the Tower Score; enter cutoff like counts; publish the top 8. Soft foam
projectiles only; nobody in the target area.

## Round 3 — The Doomsday Vault (31 min, physical)

The 8 finalists each hold one sealed Mission File envelope with a secret Battle Outcome
multiplier. Four 4-minute puzzle races, played seated on paper, let winners swap envelopes, peek
at a rival's, or take ₹6 Cr. Envelopes open only at Zero Hour.

**Mission File envelopes (one per finalist)**

| Battle Outcome | Envelopes | Multiplier |
|---|---|---|
| City saved, statue unveiled | 1 | ×3 |
| Trending #1 across India | 1 | ×2 |
| Clean win, zero damage | 2 | ×1.5 |
| Saved the day, just about | 1 | ×1 |
| ₹100 crore property damage bill | 2 | ×0.5 |
| Villain escaped | 1 | ×0.25 |

Number the outside of each envelope E1–E8 so the website can track who holds which; the
multiplier inside stays secret until Zero Hour.

**The four missions** (first fully correct submission wins; no partial credit; one submission per agency)

| # | Mission | Task | Answer must specify |
|---|---|---|---|
| 1 | The Multiverse Grid | Sort 16 movie titles or pictures into 4 groups of 4 and name each connection | All four groups + category labels |
| 2 | Across the Multiverse | Complete a compact Marvel/DC crossword | Every answer in the grid |
| 3 | Before the World Ends | Put 5 movies or events in chronological order | Release-date or in-universe order, stated on the sheet |
| 4 | The Shutdown Key | Solve superhero hints into a 4-character code | Character order and case-sensitivity, stated on the sheet |

**Submitting on paper:** a team hands its answer sheet to a scorer, who writes the arrival order on
it (1, 2, 3…). Scorers check sheets in arrival order; the first fully correct sheet wins. A wrong
sheet is final. No correct sheet by the buzzer = no winner, no reward. (This replaces the Google
Form in the original plan so Round 3 stays fully physical.)

**The 7-minute mission cycle**

| Step | Time | What happens |
|---|---|---|
| Force Field window | 30 s | Raise paddle and pay ₹5 Cr to block swaps on your envelope until this mission's winner has chosen |
| Play | 4 min | All 8 agencies solve at once; one paper submission each |
| Results | 1 min | Scorers confirm the winner, if any |
| Winner's choice | 30 s | **Swap** envelopes with any unprotected agency (unseen), **X-Ray** one agency's envelope privately with a marshal, or take **₹6 Cr** |
| Chai Pe Charcha | 1 min | Information sales, cash deals and bluffing; lying is allowed; cash deals reported to a ledger keeper |

Mission 4 is different: its winner's choice moves to the start of Zero Hour, its Force Fields stay
active until then, and its choice + chai slot becomes a 90-second transition with no trading.

| Clock | Segment |
|---|---|
| 2:00–2:09 | Break: top 8 seated, envelopes shuffled and dealt face down |
| 2:09–2:12 | Recap: envelopes, one-submission rule, powers |
| 2:12–2:19 | Mission 1 cycle |
| 2:19–2:26 | Mission 2 cycle |
| 2:26–2:33 | Mission 3 cycle |
| 2:33–2:40 | Mission 4, results and transition |

**Removed from earlier drafts:** no Yellow card / Plot Armour, no Red card / Multiverse Glitch, no
power cards inside envelopes, no reward for mission runners-up.

**Participant side:** read your own envelope privately and keep a poker face; keep it sealed on the
table in view; decide each mission whether a ₹5 Cr Force Field is worth the signal it sends; solve
fast but submit only when sure; trade or bluff in Chai Pe Charcha. Your website page shows your
fund, Power Level, envelope number and Force Field status, never the multiplier.

**Organiser side:** only the anchor moves envelopes, visibly. Opening another agency's envelope =
₹5 Cr fine. No talking between agencies during missions. Ledger keepers enter on the website each
Force Field, each winner's choice (with the swap or X-Ray target), each Chai Pe Charcha cash
transfer and each fine. Scorers' correctness decisions are final.

## Zero Hour, prizes and the full run-sheet

Zero Hour (20 min) closes the event: Mission 4's winner makes the last Swap, X-Ray or cash call,
then all 8 envelopes are opened on stage in ascending Power Level order, each Hero Score appears
on the projector, and the highest score wins.

**Awards**

| Award | Decided by | Reward |
|---|---|---|
| Mahanagar's Hero Agency of the Year | Highest Hero Score | Winner prize (to confirm) |
| Overall Runner-up | Second-highest Hero Score | Runner-up prize (to confirm) |
| Best Launch Poster | Most likes at the Round 2 cutoff | Recognition only; no extra cash |
| Biggest Fan | Lucky draw among correct top-3 predictions from club-page followers | Lucky-draw prize (to confirm) |

**Fan Club:** agencies eliminated earlier stay on as the Fan Club. They like poster posts, cheer
the takedowns, and at 2:09 get a "Predict the final top 3" form. The show ends with the 30-second
teaser for the club's next event.

**Full run-sheet** (clock times assume a 5:30 pm start in the auditorium; confirm)

| Event clock | Time | Segment | Length |
|---|---|---|---|
| 0:00 | 5:30 pm | Welcome and rules | 10 min |
| 0:10 | 5:40 pm | Prelim: Hero Ya Zero? | 15 min |
| 0:25 | 5:55 pm | Top 16 announced; break and auction setup | 10 min |
| 0:35 | 6:05 pm | Round 1: Power Bazaar | 50 min |
| 1:25 | 6:55 pm | Round 2: Operation: Skyline (posters 5 + challenge 30) | 35 min |
| 2:00 | 7:30 pm | Break: top 8 seated; envelopes dealt | 9 min |
| 2:09 | 7:39 pm | Round 3: The Doomsday Vault | 31 min |
| 2:40 | 8:10 pm | Zero Hour: last choice, reveal and prizes | 20 min |
| 3:00 | 8:30 pm | Event ends | 180 min total |

## Participant journey

An agency uses the website for three things: registering, playing the prelim, and checking its
live status and the leaderboard. Everything else happens on the floor.

| Stage | What the agency does | What it sees on the website |
|---|---|---|
| Before 25 Nov | Registers: agency name + 3 founders' names, sections, phone numbers, emails; one founder is captain | Confirmation with agency ID (A07) and a 4-digit PIN; rules, rounds and schedule pages |
| Check-in | All 3 founders report at the desk | — |
| Prelim (0:10) | Captain logs in on one phone; answers 15 questions | Question options, lock-in, right/wrong + points after each; final rank |
| After prelim | Top 16 move to auction seats; others join the Fan Club | "Qualified for Power Bazaar" or "Welcome to the Fan Club" |
| Round 1 (0:35) | Bids with paddle and slate; may buy the ₹2 Cr tip | My Agency: fund left, gear won, tip bought; after Breaking News, Power Level with Team-Up and news effects |
| Round 2 (1:25) | Makes the handmade poster; builds tower and slingshot; takes one shot | Duel opponent; after results, Tower Score (A, S, D), rank, top-8 status, ₹5 Cr bonus if earned |
| Round 3 (2:09) | Holds envelope; buys Force Fields; solves puzzles on paper; trades in Chai Pe Charcha | My Agency: envelope number, Force Field status, fund left after every deal; public log of mission winners and their choices |
| Zero Hour (2:40) | Watches the reveal | Final leaderboard with Hero Scores once revealed |
| Fan Club (any time after elimination) | Likes poster posts, cheers; submits top-3 prediction at 2:09 | Leaderboard and prediction form |

**What an agency can see on its own My Agency page at any moment**

- Agency ID, name, founders, status (In the game / Fan Club / Eliminated in round X)
- Prelim score and rank
- Fund left, with a ledger of every credit and debit (time, reason, amount, running balance)
- Gear cards held, Power of each, Team-Ups, Breaking News effects, total Power Level
- Round 2: poster duel opponent and result, Tower Score breakdown, bonus status
- Round 3: envelope number held (E1–E8), swap history, Force Field status for the current mission
- Provisional score parts: Power Level and Fund left ÷ 2. The Hero Score itself appears only at
  the reveal, because it needs the secret multiplier

**What everyone sees on the public leaderboard**

- Prelim: rank and points (shown after the final board)
- Round 1 onward: agency, Power Level, status, and fund left (see open decision 4)
- Round 2: Tower Scores and top 8 once published
- Round 3: mission winners and their choice (Swap with whom, X-Ray, or cash); never X-Ray targets or multipliers
- Zero Hour: Hero Scores, revealed one by one

## Organiser side: crew, kit and checklist

The event needs a 16-person crew. Everyone with a website job gets their own organiser login,
limited to the screens their role needs.

| Role | People | Main job | Website access |
|---|---|---|---|
| Anchor | 1 | Runs the show, explains rules, moves envelopes in Round 3, runs the reveal | Reveal screen (projector) |
| Quiz host | 1 | Opens questions, voids/replaces broken ones, publishes the prelim board | Quiz host console |
| Auctioneer | 1 | Calls Marquee and Last Call lots, runs slate reveals | Auction projector screen |
| Ledger keepers | 2 | Enter every sale and money movement; check slates; hand over gear cards | Ledger console (full write) |
| Poster capture/upload | 2 | Photograph handmade posters, send to social-media lead | — |
| Social-media lead | 1 | Posts duels, screenshots likes at cutoff | Enter cutoff like counts |
| Scorers | 2 | Tower scoring, Round 3 answer checking in arrival order | Round 2/3 result entry |
| Build/firing marshals | 4 | Block kits, timing, freeze-and-photograph, launcher safety, firing lanes | — |
| Floaters | 2 | Registration desk, runners, backup for any role | Check-in screen |

**Kit**

- Projector, mics, laptop for the host console, stable Wi-Fi (plus a phone hotspot as backup)
- 60 printed gear cards, Jugaad Kit card, 8 Breaking News cards, 3 Team-Up cards, 16 sealed Insider Tip envelopes
- 16 shield-shaped paddles with agency IDs, 16 slates + markers
- Poster sheets, sketch pens and colours for 16 agencies
- Tower reference photos, 16 matched coloured block kits, timers, build-photo capture
- Approved slingshot props, soft foam projectiles, taped firing lanes
- 8 numbered Mission File envelopes (E1–E8), 4 printed puzzle packs × 8, answer keys
- Printed backup ledger sheet and backup score sheets in case the website goes down

**Pre-event checklist**

- [ ] Website live; registration open; agency IDs and PINs sent
- [ ] Live 15 questions chosen and shuffled; spares loaded
- [ ] Full quiz dry run with 10+ phones on the auditorium Wi-Fi
- [ ] Gear cards, news cards, tip envelopes printed and checked against Appendix B
- [ ] Breaking News 6 drawn and sealed in order before bidding
- [ ] Tower references tested for equal difficulty; block kits counted
- [ ] Slingshot props and safety limits approved; lanes marked
- [ ] Round 3 puzzle packs written and solved by someone who has not seen the answers
- [ ] Mission Files filled and numbered; multiplier map entered on the website by one admin only
- [ ] Instagram post captions pre-written for all duel slots
- [ ] Full timing dry run of posting, judging and puzzles
- [ ] Backup paper ledger printed

## Website spec: scope, stack, roles and pages

Build one Next.js site on Vercel that handles registration, the live prelim quiz and the Fund
Ledger, and shows read-only status for the physical rounds. Organisers enter physical results;
the site does all the maths and never sends secret data to a browser that should not see it.

**Scope**

| In scope | Out of scope |
|---|---|
| Public event info: story, rounds, rules, schedule | Playing Rounds 2 and 3 online (both are physical) |
| Registration with agency IDs and PINs | Poster uploads (posters are handmade and posted to Instagram by volunteers) |
| Live prelim quiz: phone + projector + host console | Reading Instagram likes automatically (social-media lead types cutoff counts) |
| Round 1 auction screen and Fund Ledger | Payments or real money of any kind |
| Round 2 and 3 result entry by organisers; My Agency page and public leaderboard | |
| Zero Hour reveal screen and Fan Club top-3 prediction | |

**Recommended stack** (Claude Code friendly, same host as the Section E site)

- Next.js (App Router) + TypeScript + Tailwind, deployed on Vercel
- Supabase: Postgres database, Realtime for live updates, Row Level Security
- Agencies log in with agency ID + 4-digit PIN (server checks it, sets an httpOnly session
  cookie). Organisers log in with Supabase Auth email links and have a role
- All scoring, validation and secret lookups run in server actions or route handlers, never in the browser

**Roles**

| Role | Can |
|---|---|
| Public | Read info pages, leaderboard, register |
| Agency | Play the prelim, see its own My Agency page, submit the Fan Club prediction once eliminated |
| Quiz host | Run the quiz: open/close/void questions, publish the board, run sudden death |
| Ledger keeper | Record sales, tips, Jugaad Kits, eliminations, Force Fields, choices, transfers, fines, manual adjustments |
| Scorer | Enter tower measurements, mission winners |
| Social lead | Enter duel pairings and cutoff like counts |
| Anchor | Drive projector screens and the reveal |
| Admin | Everything above + event phase, settings, envelope multipliers, user roles |

**Pages**

| Route | Who | Purpose |
|---|---|---|
| `/` | Public | Comic-style landing: story, date, CTA to register |
| `/rounds` | Public | Prelim + 3 rounds + Zero Hour, how each works, rewards |
| `/rules` | Public | Agency, money and Hero Score rules; FAQ |
| `/register` | Public | Agency name, 3 founders, captain; returns ID + PIN |
| `/login` | Agency | Agency ID + PIN |
| `/play` | Agency | Phone quiz screen: waiting, question, locked, result |
| `/me` | Agency | My Agency: status, fund + ledger, gear + Power Level, Round 2 and 3 status, envelope number |
| `/leaderboard` | Public | Phase-aware leaderboard (prelim → Power/fund → top 8 → Hero Scores) |
| `/predict` | Agency (Fan Club) | Pick the final top 3 once, after 2:09 |
| `/screen/quiz` | Projector | Question, timer, answer reveal, live board |
| `/screen/auction` | Projector | Current lot (card, Power, minimum), last sale, agencies still needing the category |
| `/screen/board` | Projector | Big leaderboard between rounds |
| `/screen/reveal` | Projector | Zero Hour: open envelopes one by one, Hero Score maths animated |
| `/admin` | Organisers | Event phase switcher, live counts, alerts |
| `/admin/agencies` | Admin, floaters | Registrations, check-in, edit founders before lock |
| `/admin/quiz` | Quiz host | Host console |
| `/admin/auction` | Ledger keepers | Sale entry, tips, Last Call list, Jugaad Kit, news, Team-Ups, lock Round 1 |
| `/admin/round2` | Scorers, social lead | Pairings, tower measurements, like counts, publish top 8 |
| `/admin/round3` | Ledger keepers, scorers | Deal envelopes, Force Fields, mission winners and choices, transfers, fines |
| `/admin/ledger` | Ledger keepers | Full ledger, manual adjustment with reason, undo last entry |

## Website spec: data model and secrets

Every number on the site is derived from a few event tables and one append-only ledger. Secrets
(answer keys, multipliers, X-Ray targets, unrevealed news) live in separate tables that no
browser can read; only server code with the service key touches them.

**Tables** (Postgres / Supabase; money as `numeric(5,1)` in ₹ crore). 🔒 = secret.

| Table | Key columns | Notes |
|---|---|---|
| `event_state` | phase, current_question_id, current_card_id, current_mission, settings (jsonb) | Single row. Phase: registration → checkin → prelim → round1 → round2 → round3 → zero_hour → ended |
| `agencies` | id (A01…), name, pin_hash, status, eliminated_in | Status: registered, checked_in, active, fan_club, eliminated |
| `founders` | id, agency_id, name, section, phone, email, is_captain | Exactly 3 per agency; locked after registration closes |
| `questions` | id (M1, T1, B1, H1, S1…), segment, prompt, options[], timer_s, weight, is_live, order_no, status, opened_at | Status: pending, open, closed, void. Public fields only |
| `question_keys` 🔒 | question_id, correct_index | Secret |
| `answers` | agency_id, question_id, option_index, received_at, response_time_s, is_correct, points | Unique (agency, question); written only by the server |
| `gear_cards` | id (H01…), category, gear_name, power, min_bid, phase (marquee / secret) | 60 rows + Jugaad Kit |
| `sales` | card_id, agency_id, price, phase (marquee / secret / last_call), sold_at | Unique card_id; unique (agency, category) |
| `team_ups` | gear_a, gear_b, bonus (3) | 3 rows; public after Breaking News |
| `breaking_news` 🔒 | id (N1…), headline, affects_gear, delta, draw_order, revealed_at | 🔒 until revealed_at is set |
| `insider_tips` 🔒 | agency_id, news_id | news_id visible only to that agency |
| `ledger_entries` | id, agency_id, amount (±), reason, ref, note, created_by, created_at, voided | Append-only. Reasons: start_fund, gear, tip, jugaad_kit, poster_bonus, force_field, mission_cash, transfer, fine, adjustment |
| `poster_duels` | agency_a, agency_b (null = bye), likes_a, likes_b, winner, tiebreak | Likes are cutoff counts typed by the social lead |
| `tower_results` | agency_id, correct_blocks, reference_blocks, build_time_s, frozen_blocks, blocks_fallen, published | A, S, D and score computed |
| `envelopes` | id (E1–E8), holder_agency_id | Public: who holds which number |
| `envelope_contents` 🔒 | envelope_id, outcome_label, multiplier | Secret until the reveal |
| `envelope_moves` | mission, from_agency, to_agency, kind (deal / swap), created_at | Swap history |
| `force_fields` | agency_id, mission | Paid via a linked ledger entry |
| `missions` | no (1–4), name, winner_agency_id, choice (swap / xray / cash / none), swap_target | Public |
| `xray_log` 🔒 | mission, agency_id, target_agency_id | Organisers only |
| `reveals` | envelope_id, revealed_at, reveal_order | Drives the reveal screen |
| `predictions` | agency_id, pick_1, pick_2, pick_3 | Fan Club, one per agency |
| `audit_log` | actor, action, payload, created_at | Every organiser write |

**Derived values** (SQL views or server functions; never stored by hand)

- **Fund left** = sum of non-voided ledger entries for the agency.
- **Power Level** = Power of the cards in `sales` for the agency + 3 per matched Team-Up + revealed
  news deltas on held gear. The Jugaad Kit is a gear_cards row (Power 2), so assigning it as a
  sale covers its Power.
- **Tower Score** = (A + S + D) ÷ 3 from `tower_results`.
- **Hero Score** = Power Level × multiplier of the held envelope + Fund left ÷ 2, computed only for
  envelopes in `reveals`.

**Security rules**

- Row Level Security on every table. Public reads go through views that leave out secret columns.
- 🔒 tables have no policies for anon or agency users; only server code using the service role reads them.
- The quiz API never sends `correct_index` to a phone; it returns right/wrong only after the question closes.
- PINs are stored hashed; limit PIN attempts per agency ID.
- Every organiser write records who did it in `audit_log`; ledger fixes are new entries or voids, never edits.

## Website spec: logic, live updates and build order

The two pieces that must be exactly right are the quiz timer/scoring and the ledger validation;
everything else is forms and views on top of them.

**Prelim quiz engine**

1. Host clicks **Open** → server sets the question to `open` and stamps `opened_at` with database
   time, then broadcasts prompt, options, segment and timer on a Realtime channel. No answer key goes out.
2. Phone taps an option → server action checks the session, that the question is open and that the
   agency has not answered; stamps `received_at` with database time.
3. Server computes t = received_at − opened_at (rounded to 0.1 s); if t > T the answer scores 0.
   Otherwise it looks up `question_keys` and applies: points = round(1000 × W × (1 − t ÷ 2T)),
   halves rounding up (`Math.floor(x + 0.5)`).
4. Server auto-closes the question at T; the host clicks **Reveal** to show the right option on the
   projector and results on phones.
5. **Void** marks a question void (excluded from totals); the host then opens a spare from the same segment.
6. Ranking: total desc, then sum of t on correct answers asc. The board flags a tie at 16th for sudden death.
7. Logins: new agency logins close when question 1 opens; an agency already registered can log back in on any phone.
8. Export CSV: agency, q1–q15 points, total, correct count, total correct time.

Unit-test the formula with the worked examples: T 10, W 1, t 2.0 → 900; T 20, W 2, t 12.0 → 1,400;
wrong → 0; t 10.0 on a 10 s question → 500; t 10.1 → 0.

**Ledger rules the server enforces**

| Action | Checks | Writes |
|---|---|---|
| Record sale | Card unsold; agency active and holds no card in that category; price ≥ min bid, ≤ fund left, multiple of 0.5 | `sales` row + ledger −price, one transaction |
| Insider tip | Tips phase; one per agency; fund ≥ 2 | Ledger −2; tip linked to a drawn news card |
| Close Round 1 | After Last Call | Missing 1 category → Jugaad Kit sale + ledger −8 (eliminate if fund < 8); missing 2+ → eliminate; reveal news; lock |
| Publish Round 2 | All tower rows entered; cutoff ties resolved by organiser | Top 8 → active, rest → fan_club; +5 to qualified duel winners and byes |
| Force Field | Window open for this mission; fund ≥ 5 | `force_fields` row + ledger −5 |
| Winner's choice | Mission has a winner | Swap: target has no Force Field this mission → swap holders + log. X-Ray: secret log. Cash: ledger +6 |
| Transfer | Chai Pe Charcha window; payer fund ≥ amount; 0.5 steps | Two ledger entries (−payer, +payee), one transaction |
| Fine | — | Ledger −5 |
| Undo | Ledger keeper | Void the entry (and its linked sale or row), never delete |

**Live updates**

- Realtime subscriptions for the quiz (phones, projector, host) and the auction projector.
- Simple 5-second polling for `/me`, `/leaderboard` and `/screen/board`; easier to make reliable on crowded Wi-Fi.

**Zero Hour reveal**

The reveal screen lists the 8 finalists in ascending Power Level. The anchor clicks **Next**; the
server writes a `reveals` row, and the screen shows the envelope's outcome, multiplier and Hero
Score maths. After 8 reveals it shows the final ranking, winner and runner-up.

**Build order for Claude Code** (event on Nov 25, 2026)

| Milestone | Done by | Contents |
|---|---|---|
| 1. Foundation | Nov 8, 2026 | Next.js + Supabase project, schema, seed data from Appendices A and B, roles |
| 2. Public site + registration | Nov 11, 2026 | Landing, rounds, rules, register, agency login, `/me` skeleton; open registration |
| 3. Prelim quiz | Nov 15, 2026 | Phone, projector, host console, scoring tests, CSV export |
| 4. Auction + ledger | Nov 18, 2026 | Auction screen, ledger console, tips, Close Round 1, `/me` live |
| 5. Rounds 2–3, leaderboard, reveal | Nov 21, 2026 | Result entry, publishing, envelopes, choices, transfers, reveal screen, predictions |
| 6. Dry run | Nov 23, 2026 | 10+ phones on auditorium Wi-Fi, full mock auction, printed backups |

**How to start in Claude Code:** export this doc as Markdown, put it in the repo as
`docs/event-spec.md`, and ask Claude Code to build milestone 1 from it, then one milestone per session.

**Fallbacks:** if the site fails during the prelim, run the same live 15 on Kahoot. If it fails
later, ledger keepers continue on the printed ledger sheet and re-enter afterwards.

## Appendix A: prelim question bank

38 questions for 15 live slots (2.5x buffer) plus 3 sudden-death questions. **Live** marks the
recommended 15; a spare always replaces a question from the same segment. Seed these into
`questions` and `question_keys`; never ship the Answer column to the browser.

> **Redacted in this public repository.** The questions, options, answers and working are
> event secrets (participants could read them here before the prelim). They are in
> `supabase/private/seed_secrets.sql` (git-ignored) and in the original PDF.

| Segment | Question IDs | Live (recommended 15) | Options | Timer | Weight |
|---|---|---|---|---|---|
| Marvel Ya DC? | M1–M10 | M1–M4 | 2 (A = Marvel, B = DC) | 10 s | 1 |
| Teen Clue, Ek Hero | T1–T10 (Marvel: odd, DC: even) | T1–T4 (2 Marvel + 2 DC) | 4 | 10 s | 1 |
| Box Office Ka Hisaab — finance | B1–B10 | B1–B4 | 4 | 20 s | 2 |
| Hero Ka Business — business and finance concepts | H1–H8 | H1–H3 | 4 | 10 s | 1 |
| Sudden death — 16th place only | S1–S3 | — (first correct answer wins) | 4 | 20 s | — |

## Appendix B: gear cards, Team-Ups and Breaking News

60 cards: 15 per category, each with 1 flagship, 1 runner-up, then 2, 3, 4 and 4 copies of cheaper
gear. Seed one `gear_cards` row per physical card (H01–H15, S01–S15, G01–G15, K01–K15) plus the Jugaad Kit.

| Category | Gear | Power | Min bid | Cards | Card IDs | Phase |
|---|---|---|---|---|---|---|
| HQ | Sky Fortress over Mahanagar | 10 | ₹10 Cr | 1 | H01 | Marquee |
| HQ | Aravalli Cave Base | 9 | ₹8 Cr | 1 | H02 | Marquee |
| HQ | Cyber City Glass Tower | 8 | ₹7 Cr | 2 | H03–H04 | Secret bids |
| HQ | Hauz Khas Rooftop HQ | 6 | ₹5 Cr | 3 | H05–H07 | Secret bids |
| HQ | Old Metro Depot | 5 | ₹4 Cr | 4 | H08–H11 | Secret bids |
| HQ | Mama ji's Basement | 3 | ₹2 Cr | 4 | H12–H15 | Secret bids |
| Suit | Nano-Armour Mk II | 10 | ₹10 Cr | 1 | S01 | Marquee |
| Suit | Stealth Kurta | 9 | ₹8 Cr | 1 | S02 | Marquee |
| Suit | Bulletproof Bandhgala | 8 | ₹7 Cr | 2 | S03–S04 | Secret bids |
| Suit | Khadi Kevlar Jacket | 6 | ₹5 Cr | 3 | S05–S07 | Secret bids |
| Suit | Reflective Rickshaw Raincoat | 5 | ₹4 Cr | 4 | S08–S11 | Secret bids |
| Suit | Gully Cricket Pads | 3 | ₹2 Cr | 4 | S12–S15 | Secret bids |
| Gadget | Jugaad Jetpack | 10 | ₹10 Cr | 1 | G01 | Marquee |
| Gadget | Tiffin Shield | 9 | ₹8 Cr | 1 | G02 | Marquee |
| Gadget | Chai-Powered Drone | 8 | ₹7 Cr | 2 | G03–G04 | Secret bids |
| Gadget | Auto-Rickshaw Hover Kit | 6 | ₹5 Cr | 3 | G05–G07 | Secret bids |
| Gadget | Metro Card Teleporter | 5 | ₹4 Cr | 4 | G08–G11 | Secret bids |
| Gadget | Mosquito-Bat Taser | 3 | ₹2 Cr | 4 | G12–G15 | Secret bids |
| Sidekick | Robo-Chotu | 10 | ₹10 Cr | 1 | K01 | Marquee |
| Sidekick | Sheru the Ex-Army Dog | 9 | ₹8 Cr | 1 | K02 | Marquee |
| Sidekick | Hacker Didi | 8 | ₹7 Cr | 2 | K03–K04 | Secret bids |
| Sidekick | Talking Kabootar | 6 | ₹5 Cr | 3 | K05–K07 | Secret bids |
| Sidekick | Dabbawala Network | 5 | ₹4 Cr | 4 | K08–K11 | Secret bids |
| Sidekick | Cousin Bunty | 2 | ₹1 Cr | 4 | K12–K15 | Secret bids |
| Any (forced) | Jugaad Kit | 2 | ₹8 Cr fixed | unlimited | JK | After Last Call |

Budget check: all four flagships cost ₹40 Cr at minimum (Power 40); a balanced mid set costs ₹20 Cr
(Power 24 + [redacted]); the cheapest set costs ₹7 Cr (Power 11).

**Team-Ups (+3 Power each, revealed in Breaking News)** and **Breaking News** (prepare 8; draw 6
and seal them in order before bidding, so Insider Tips reveal a card that will really be played)

> **Redacted in this public repository.** Which gear pairs form the 3 Team-Ups, and the 8 news
> cards with their Power changes, are secret until Breaking News (an Insider Tip costs ₹2 Cr
> precisely because they are). They are in `supabase/private/seed_secrets.sql` (git-ignored) and
> in the original PDF.

## Open decisions before the event

Ten items still need a club decision; the first four block the website build or registration, so
settle them first.

| # | Decision | Why it matters | Suggested default |
|---|---|---|---|
| 1 | Registration rules: eligibility, deadline, fee, maximum agencies | The register page and its limits | IMI Delhi students only; free; closes 2 days before the event; cap at 60 agencies (180 people in a 200-seat auditorium) |
| 2 | Start time and venue | Run-sheet clock times on the site | 5:30 pm, auditorium |
| 3 | Hero Score tie for 1st or 2nd | The reveal screen needs a rule | Higher fund left wins; then higher Power Level; then coin toss |
| 4 | Show other agencies' fund left on the public leaderboard during Round 1? | It changes bidding strategy | Hide fund left publicly until Round 1 locks; each agency sees only its own |
| 5 | Prize amounts for winner, runner-up and Biggest Fan | Awards page and the anchor's script | To confirm with seniors |
| 6 | Round 3 puzzle content (grid, crossword, timeline, code) | Packs must be tested before the event | Write and test all four by the dry run |
| 7 | Slingshot props and safety limits | Marshals need a fixed list | Craft sticks, cardboard, rubber bands, soft foam balls only |
| 8 | Tower cutoff tie-break method | Must be announced before play | Rock-paper-scissors |
| 9 | Poster posting time | 16 handmade posters must be photographed and posted before the 90 s tower reference; the run-sheet has no gap for this | Pre-write captions; 2 photographers; brief the tower rules while posts go live |
| 10 | Jugaad Kit cards in the database | A sale is unique per card, but more than one agency may need a Jugaad Kit | Seed 4 rows (JK1–JK4) |
