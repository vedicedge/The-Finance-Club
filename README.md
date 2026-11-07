# Doomsday — The Finance Club

The in-house website for **Doomsday**, the finance club's 3-hour event on 25 November 2026.
Professor Kalyug has announced a doomsday attack on Mahanagar; hero agencies race to fund, build
and save the city.

- **Spec (source of truth):** [`docs/event-spec.md`](docs/event-spec.md) — event secrets redacted, see below
- **Choices where the spec is open:** [`docs/decisions.md`](docs/decisions.md)
- **Look and feel:** [`docs/design-refs/README.md`](docs/design-refs/README.md) — built around the event poster; art in [`scripts/art/README.md`](scripts/art/README.md)

Stack: Next.js 16 (App Router) + TypeScript + Tailwind 4, Supabase (Postgres, Auth, Realtime,
Row Level Security), deployed on Vercel. The event name lives in one place: `lib/config.ts`.

## Build status

| Milestone | Due | Status |
|---|---|---|
| 1. Foundation — project, schema, seed data, roles | 8 Nov | **Done** |
| 2. Public site + registration | 11 Nov | **Done** |
| 3. Prelim quiz | 15 Nov | **Done** |
| 4. Auction + ledger | 18 Nov | **Done** |
| 5. Rounds 2–3, leaderboard, reveal | 21 Nov | **Done** |
| 6. Dry run | 23 Nov | Next — **Dry run mode**, the [dry-run checklist](docs/dry-run-checklist.md) and printable backup sheets are ready |

## How the security works

Browsers never query the database. Phones, projectors and organiser consoles talk to the Next.js
server, which checks the agency session or the organiser's role, then uses the Supabase secret
(service-role) key. Row Level Security is on for every table with no policies, and every grant to
the browser roles is revoked, so the public key can read nothing. Secret tables (answer keys,
envelope multipliers, X-Ray log, unrevealed news, Insider Tips, PIN hashes, sessions) are only
ever read inside server code. Scoring and money rules are enforced in the database as well as the
server; the ledger is append-only (fixes are voids or new entries).

### Event secrets and this public repository

This repository is **public**, so the quiz questions and answers, the Team-Ups and the Breaking
News cards are **not** committed. They live in `supabase/private/seed_secrets.sql`, which is
git-ignored. Keep that file somewhere private (the club drive). If the repository is made
private, they can become a normal migration.

## Setting up (one time)

### 1. Supabase project

1. Create a project at [supabase.com](https://supabase.com). Choose region **Mumbai (ap-south-1)**:
   every quiz answer goes phone → Vercel → Supabase, and that delay counts against the agency.
2. Apply the migrations in `supabase/migrations/` (in filename order). The command centre's
   **Database updates** tile (and a red strip on every organiser page) says if one is missing. Either:
   ```bash
   npx supabase login
   ```
   ```bash
   npx supabase link --project-ref YOUR-PROJECT-REF
   ```
   ```bash
   npx supabase db push
   ```
   or paste each file into **SQL Editor** and run them in order.
3. **Load the secret seed:** paste `supabase/private/seed_secrets.sql` into the SQL Editor and run it.
4. **Authentication → Sign In / Providers → Email:** turn **off** "Allow new users to sign up"
   (crew are added by the admin).
5. **Authentication → URL Configuration:** set Site URL to the Vercel URL, and add
   `https://YOUR-DOMAIN/auth/confirm` to Redirect URLs.
6. **Email sending (recommended):** Supabase's built-in email sender allows only a few emails per
   hour. Set up custom SMTP under **Authentication → Emails → SMTP Settings** (for example the
   club's Gmail with an app password). Until then, give crew passwords on the Crew page.
7. *(Optional, lets a sign-in link work on a different device from the one that asked for it.)*
   In **Authentication → Emails → Magic Link**, change the link to
   `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/admin`.

### 2. Vercel

1. Import this repository in Vercel (framework: Next.js).
2. **Settings → Environment Variables:** add the four variables from `.env.example`.
3. **Settings → Functions → Function Region:** Mumbai (`bom1`), next to the database.
4. Deploy.

### 3. First admin

1. Supabase → **Authentication → Users → Add user**: your email and a password, "Auto confirm".
2. Make sure that email is in `BOOTSTRAP_ADMIN_EMAILS` on Vercel.
3. Sign in at `/admin/login`. You become admin on first sign-in. Add the rest of the crew on
   **Crew & roles** (`/admin/users`).

## Developing locally

```bash
npm install
```
```bash
cp .env.example .env.local
```
```bash
npm run dev
```

### Tests

```bash
npm test
```
Unit tests: quiz scoring (the spec's worked examples 900 / 1,400 / 500 / 0), Tower Score (68.33),
Hero Score (51), money steps, PIN hashing, session tokens and role access.

```bash
npm run test:db
```
Database tests: starts a throwaway local Postgres (needs the Postgres server binaries, e.g.
`apt install postgresql`), applies every migration and the secret seed if present, and checks the
security grants, append-only ledger, voids, founder rules, derived views (fund left, Power Level,
Tower Score, Hero Score, envelope holders) and that the SQL scoring functions match the
TypeScript ones for every tenth of a second. One test plays the whole evening through the
database functions the consoles call: a dry run with test agencies, the reset that keeps
registrations, then the real event with 18 agencies from the prelim to the last envelope.
Tests that need the secret seed skip when it is not present. If the Postgres server headers are
installed (`apt install postgresql-server-dev-16`), the test database also loads a stand-in for
Supabase's `safeupdate` guard (`scripts/db/safeupdate`), which refuses an UPDATE or DELETE without
a WHERE clause the way Supabase's API does; `npm test` also checks the migrations for that.

## Project layout

```
app/                  pages and route handlers (App Router)
  (site)/             public site: landing, rounds, rules, schedule, register, login, My Agency
  play/               phone quiz screen
  screen/              projectors (16:9): quiz/, auction/, board/, reveal/
  api/quiz/           phone quiz state + answer endpoints; api/screen/ for the projector
  admin/              command centre: systems check, phase + alert, agencies & check-in,
                      quiz host console + CSV, Power Bazaar console, Fund Ledger,
                      Round 2 and Round 3 consoles, settings (+ reset), crew & roles,
                      print/ (A4 backup sheets and the dry-run checklist)
  auth/confirm/       where organiser sign-in links land
components/           shared UI (skyline, threat bar, countdown, dossier, admin shell, print sheets)
  art/                the poster, Kalyug, wordmark and the scene art (see scripts/art/README.md)
assets/art/           the poster and all site images (statically imported, optimised by Next)
lib/
  config.ts           event name and round names (change the name here)
  scoring/            quiz, tower and hero maths (pure, unit-tested)
  registration.ts     registration checks (@imi.edu, phones, agency IDs)
  settings.ts         admin settings with defaults (open decisions)
  quiz/               board ranking (tie-breaks), CSV, phone timer helpers, server loaders
  round1/             Power Bazaar steps, lot order, Round 1 loader
  ledger.ts           running balance and ledger labels
  agency-view.ts      what an agency sees about itself on My Agency
  round2/, round3/    Round 2 ranking (top 8) and loaders; Round 3 loader
  zero-hour*.ts       Hero Score ranking and the reveal loader
  leaderboard.ts      public leaderboard (public facts only)
  print/              backup-sheet loaders (no secrets) and the dry-run checklist
  event-state.ts      live phase, alert and settings for every page
  auth/               roles, organiser auth, agency PINs and session tokens
  db/server.ts        service-role client (server-only)
supabase/
  migrations/         schema, integrity rules, views, scoring functions, security, public seed
  private/            git-ignored event secrets (seed_secrets.sql)
scripts/db/           local Postgres harness for the database tests
scripts/art/          how the site art is made (poster fixes, skies, scene renders, optional AI art)
tests/                unit/ and db/ tests
docs/                 spec, decisions, dry-run checklist, design references
```
