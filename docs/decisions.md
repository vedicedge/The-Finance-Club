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
founder emails only, A4 PINs shown on screen only.

## Website defaults (also settings)

| Topic | Default | Setting |
|---|---|---|
| Must an agency be checked in to play the prelim? | Yes | `prelim.requires_checkin` |
| Insider Tip: which drawn news card it reveals | Site picks one of the 6 drawn cards at random; shown only on that agency's My Agency page | `round1.insider_tip_assignment` (`random` / `manual`) |
| Reveal order when Power Levels tie | Agency ID order | `zero_hour.reveal_order_tiebreak` |
| PIN brute-force protection | 5 wrong PINs → 60 s lock for that agency ID | `security.pin_max_attempts`, `.pin_lock_seconds` |

## Spec ambiguities resolved (fixed behaviour)

- **Rounding t.** t = received_at − opened_at (both database time), rounded to 0.1 s half-up,
  then compared with T. So 10.04 s → 10.0 s (in time), 10.05 s → 10.1 s (0 points).
- **"New agency logins close when Q1 opens."** An agency that never logged in before Q1 opens is
  locked out of the quiz; one that did can log back in on any phone, and the newest phone takes over.
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

## Secrets and the public repository

The repository `vedicedge/The-Finance-Club` is public. The spec's Appendix A (questions and
answers), Team-Ups and Breaking News are therefore kept out of git, in
`supabase/private/seed_secrets.sql` (git-ignored), and redacted from `docs/event-spec.md`.
If the repository is made private, they can move into a normal migration.

## Visual direction

Colours and mood from the reference images (`docs/design-refs/README.md`); type from the Section E
site (Cormorant Garamond, Pinyon Script, Inter). The spec's comic-book styling is not used.
