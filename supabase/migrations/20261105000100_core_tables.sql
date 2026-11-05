-- Doomsday — core tables (see docs/event-spec.md, "Website spec: data model and secrets").
--
-- Conventions
--   * Money is numeric(5,1) in ₹ crore and always moves in ₹0.5 steps.
--   * Every timestamp that matters for scoring or ordering is stamped by the database
--     (clock_timestamp()), never by a phone or browser.
--   * Tables marked SECRET are never readable by browsers (see the security migration):
--     question_keys, breaking_news, insider_tips, envelope_contents, xray_log,
--     agency_auth, agency_sessions.
--   * Fund left, Power Level, Tower Score and Hero Score are derived in views, never stored.

-- ---------------------------------------------------------------- helpers

-- True when x is a whole number of ₹0.5 Cr steps.
create or replace function public.is_half_step(x numeric)
returns boolean
language sql
immutable
as $$ select x is not null and (x * 2) = trunc(x * 2) $$;

-- ---------------------------------------------------------------- agencies

create sequence public.agency_number_seq start 1;

create table public.agencies (
  id            text primary key check (id ~ '^A[0-9]{2,3}$'),
  name          text not null check (length(btrim(name)) between 2 and 40),
  status        text not null default 'registered'
                check (status in ('registered', 'checked_in', 'active', 'fan_club', 'eliminated')),
  eliminated_in text check (eliminated_in in ('prelim', 'round1', 'round2', 'round3')),
  checked_in_at timestamptz,
  created_at    timestamptz not null default clock_timestamp()
);
create unique index agencies_name_key on public.agencies (lower(btrim(name)));

create table public.founders (
  id         bigint generated always as identity primary key,
  agency_id  text not null references public.agencies (id) on delete cascade,
  name       text not null check (length(btrim(name)) between 2 and 60),
  section    text not null check (length(btrim(section)) between 1 and 20),
  phone      text not null check (phone ~ '^[0-9]{10}$'),
  email      text not null check (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  is_captain boolean not null default false,
  created_at timestamptz not null default clock_timestamp()
);
create index founders_agency_idx on public.founders (agency_id);
create unique index founders_one_captain on public.founders (agency_id) where is_captain;
-- One person can only found one agency.
create unique index founders_email_key on public.founders (lower(email));
create unique index founders_phone_key on public.founders (phone);

-- SECRET: PIN hash and login throttling live apart from agencies so no public read can touch them.
create table public.agency_auth (
  agency_id       text primary key references public.agencies (id) on delete cascade,
  pin_hash        text not null,
  failed_attempts integer not null default 0,
  locked_until    timestamptz,
  first_login_at  timestamptz,
  last_login_at   timestamptz
);

-- SECRET: agency login sessions (only a SHA-256 hash of the cookie token is stored).
create table public.agency_sessions (
  token_hash  text primary key,
  agency_id   text not null references public.agencies (id) on delete cascade,
  created_at  timestamptz not null default clock_timestamp(),
  expires_at  timestamptz not null,
  revoked_at  timestamptz,
  user_agent  text
);
create index agency_sessions_agency_idx on public.agency_sessions (agency_id);

-- ---------------------------------------------------------------- organisers

-- Organisers sign in with Supabase Auth; this table gives them roles.
create table public.organisers (
  user_id      uuid primary key,  -- auth.users.id (FK added in the security migration)
  email        text not null unique,
  display_name text,
  roles        text[] not null default '{}'
               check (roles <@ array['admin', 'quiz_host', 'ledger_keeper', 'scorer', 'social_lead',
                                     'anchor', 'auctioneer', 'floater']::text[]),
  active       boolean not null default true,
  created_at   timestamptz not null default clock_timestamp()
);

-- ---------------------------------------------------------------- prelim quiz

create table public.questions (
  id          text primary key check (id ~ '^[MTBHS][0-9]{1,2}$'),
  segment     text not null
              check (segment in ('marvel_ya_dc', 'teen_clue', 'box_office', 'hero_business', 'sudden_death')),
  side        text check (side in ('Marvel', 'DC')),
  prompt      text not null,
  options     text[] not null check (array_length(options, 1) in (2, 4)),
  timer_s     smallint not null check (timer_s in (10, 20)),
  weight      smallint not null check (weight in (1, 2)),
  is_live     boolean not null default false,  -- Appendix A "Live" recommendation
  order_no    smallint check (order_no between 1 and 15),  -- slot in the live 15 after the shuffle
  replaces_id text references public.questions (id),       -- set when a spare takes a voided slot
  status      text not null default 'pending' check (status in ('pending', 'open', 'closed', 'void')),
  opened_at   timestamptz,
  closed_at   timestamptz,
  revealed_at timestamptz
);
-- A slot holds one non-void question; a voided question keeps its slot number for the record.
create unique index questions_slot_key on public.questions (order_no) where status <> 'void';

-- SECRET: the answer key. Never selected by any code path that serves a phone or projector
-- before the question is revealed.
create table public.question_keys (
  question_id   text primary key references public.questions (id) on delete cascade,
  correct_index smallint not null check (correct_index between 0 and 3),
  working       text
);

create table public.answers (
  agency_id       text not null references public.agencies (id),
  question_id     text not null references public.questions (id),
  option_index    smallint not null check (option_index between 0 and 3),
  received_at     timestamptz not null default clock_timestamp(),
  response_time_s numeric(6, 1) not null check (response_time_s >= 0),
  is_correct      boolean not null,
  points          integer not null check (points >= 0),
  primary key (agency_id, question_id)
);
create index answers_question_idx on public.answers (question_id);

-- Sudden death for 16th place: the quiz host records the order the tied agencies finished in.
create table public.prelim_tiebreaks (
  agency_id     text primary key references public.agencies (id),
  tiebreak_rank smallint not null check (tiebreak_rank >= 1),
  question_id   text references public.questions (id),
  note          text,
  created_by    uuid,
  created_at    timestamptz not null default clock_timestamp()
);

-- ---------------------------------------------------------------- Round 1: gear, news, team-ups

create table public.gear_cards (
  id        text primary key check (id ~ '^([HSGK](0[1-9]|1[0-5])|JK[0-9]+)$'),
  category  text not null check (category in ('HQ', 'Suit', 'Gadget', 'Sidekick', 'Any')),
  gear_name text not null,
  power     smallint not null check (power between 1 and 10),
  min_bid   numeric(5, 1) not null check (min_bid > 0 and public.is_half_step(min_bid)),
  phase     text not null check (phase in ('marquee', 'secret', 'jugaad')),
  lot_order smallint unique  -- running order of the lots, set when the auction order is shuffled
);

create table public.team_ups (
  id          smallint primary key,
  name        text not null,
  gear_a      text not null,  -- matches gear_cards.gear_name (covers ranges like H05–H07)
  gear_b      text not null,
  bonus       smallint not null default 3,
  revealed_at timestamptz     -- public only after Breaking News
);

-- SECRET until revealed_at is set.
create table public.breaking_news (
  id           text primary key check (id ~ '^N[0-9]+$'),
  headline     text not null,
  affects_gear text not null,  -- matches gear_cards.gear_name
  delta        smallint not null check (delta between -10 and 10 and delta <> 0),
  draw_order   smallint unique check (draw_order between 1 and 6),  -- null = not drawn
  revealed_at  timestamptz,
  check (revealed_at is null or draw_order is not null)
);

-- ---------------------------------------------------------------- the Fund Ledger (append-only)

create table public.ledger_entries (
  id         bigint generated always as identity primary key,
  agency_id  text not null references public.agencies (id),
  amount     numeric(5, 1) not null check (amount <> 0 and public.is_half_step(amount)),
  reason     text not null check (reason in ('start_fund', 'gear', 'tip', 'jugaad_kit', 'poster_bonus',
                                             'force_field', 'mission_cash', 'transfer', 'fine', 'adjustment')),
  ref        text,      -- what the entry is about, e.g. 'card:H01', 'mission:2'
  note       text,
  txn_id     uuid not null default gen_random_uuid(),  -- entries written together (a transfer's two legs)
  created_by uuid,      -- organiser user id; null = written by the system
  created_at timestamptz not null default clock_timestamp()
);
create index ledger_entries_agency_idx on public.ledger_entries (agency_id);
create index ledger_entries_txn_idx on public.ledger_entries (txn_id);

-- A void is a new row, never an edit of the entry it cancels.
create table public.ledger_voids (
  entry_id   bigint primary key references public.ledger_entries (id),
  reason     text not null check (length(btrim(reason)) >= 3),
  created_by uuid,
  created_at timestamptz not null default clock_timestamp()
);

create table public.sales (
  id              bigint generated always as identity primary key,
  card_id         text not null references public.gear_cards (id),
  agency_id       text not null references public.agencies (id),
  category        text not null check (category in ('HQ', 'Suit', 'Gadget', 'Sidekick')),  -- slot filled
  price           numeric(5, 1) not null check (price > 0 and public.is_half_step(price)),
  phase           text not null check (phase in ('marquee', 'secret', 'last_call', 'jugaad')),
  ledger_entry_id bigint not null unique references public.ledger_entries (id),
  sold_at         timestamptz not null default clock_timestamp(),
  created_by      uuid,
  voided_at       timestamptz  -- set once, together with a ledger_voids row
);
create unique index sales_card_key on public.sales (card_id) where voided_at is null;
create unique index sales_agency_category_key on public.sales (agency_id, category) where voided_at is null;

-- SECRET: which news card each tip revealed (shown only to that agency).
create table public.insider_tips (
  id              bigint generated always as identity primary key,
  agency_id       text not null references public.agencies (id),
  news_id         text not null references public.breaking_news (id),
  ledger_entry_id bigint not null unique references public.ledger_entries (id),
  created_by      uuid,
  created_at      timestamptz not null default clock_timestamp(),
  voided_at       timestamptz
);
create unique index insider_tips_agency_key on public.insider_tips (agency_id) where voided_at is null;

-- ---------------------------------------------------------------- Round 2

create table public.poster_duels (
  id              smallint generated always as identity primary key,
  agency_a        text not null unique references public.agencies (id),
  agency_b        text unique references public.agencies (id),  -- null = bye
  likes_a         integer check (likes_a >= 0),
  likes_b         integer check (likes_b >= 0),
  tiebreak_winner text references public.agencies (id),         -- rock-paper-scissors result
  winner          text generated always as (
                    case
                      when agency_b is null then agency_a
                      when likes_a is null or likes_b is null then null
                      when likes_a > likes_b then agency_a
                      when likes_b > likes_a then agency_b
                      else tiebreak_winner
                    end) stored,
  created_at      timestamptz not null default clock_timestamp(),
  check (agency_b is null or agency_b <> agency_a),
  check (tiebreak_winner is null or tiebreak_winner in (agency_a, agency_b))
);

create table public.tower_results (
  agency_id        text primary key references public.agencies (id),
  correct_blocks   smallint not null check (correct_blocks >= 0),
  reference_blocks smallint not null check (reference_blocks > 0),
  build_time_s     integer not null check (build_time_s between 0 and 600),  -- 600 = unfinished
  frozen_blocks    smallint not null check (frozen_blocks >= 0),
  blocks_fallen    smallint not null check (blocks_fallen >= 0),
  cutoff_rank      smallint,  -- organiser's order for a tie at the top-8 cutoff
  published        boolean not null default false,
  updated_by       uuid,
  updated_at       timestamptz not null default clock_timestamp(),
  check (correct_blocks <= reference_blocks),
  check (blocks_fallen <= frozen_blocks)
);

-- ---------------------------------------------------------------- Round 3 and Zero Hour

-- Public catalogue of the six Battle Outcomes and how many envelopes carry each.
create table public.battle_outcomes (
  label      text primary key,
  multiplier numeric(4, 2) not null check (multiplier > 0),
  envelopes  smallint not null check (envelopes > 0),
  sort_order smallint not null unique
);

create table public.envelopes (
  id text primary key check (id ~ '^E[1-8]$')
);

-- SECRET until the reveal. Entered by one admin from the filled physical envelopes.
create table public.envelope_contents (
  envelope_id   text primary key references public.envelopes (id),
  outcome_label text not null references public.battle_outcomes (label),
  entered_by    uuid,
  entered_at    timestamptz not null default clock_timestamp()
);

create table public.missions (
  no               smallint primary key check (no between 1 and 4),
  name             text not null,
  winner_agency_id text references public.agencies (id),
  choice           text check (choice in ('swap', 'xray', 'cash', 'none')),
  swap_target      text references public.agencies (id),
  decided_at       timestamptz,
  check (choice is distinct from 'swap' or swap_target is not null),
  check (swap_target is null or swap_target <> winner_agency_id)
);

-- Who holds which envelope is derived from these rows (deal, then swaps).
create table public.envelope_moves (
  id          bigint generated always as identity primary key,
  envelope_id text not null references public.envelopes (id),
  mission     smallint check (mission between 1 and 4),  -- null for the deal
  from_agency text references public.agencies (id),       -- null for the deal
  to_agency   text not null references public.agencies (id),
  kind        text not null check (kind in ('deal', 'swap')),
  move_group  uuid not null default gen_random_uuid(),     -- a swap's two moves share a group
  created_by  uuid,
  created_at  timestamptz not null default clock_timestamp(),
  voided_at   timestamptz,
  check ((kind = 'deal') = (from_agency is null))
);
create index envelope_moves_envelope_idx on public.envelope_moves (envelope_id, id);

create table public.force_fields (
  id              bigint generated always as identity primary key,
  agency_id       text not null references public.agencies (id),
  mission         smallint not null check (mission between 1 and 4),
  ledger_entry_id bigint not null unique references public.ledger_entries (id),
  created_by      uuid,
  created_at      timestamptz not null default clock_timestamp(),
  voided_at       timestamptz
);
create unique index force_fields_agency_mission_key on public.force_fields (agency_id, mission)
  where voided_at is null;

-- SECRET: organisers only.
create table public.xray_log (
  id               bigint generated always as identity primary key,
  mission          smallint not null check (mission between 1 and 4),
  agency_id        text not null references public.agencies (id),
  target_agency_id text not null references public.agencies (id),
  created_by       uuid,
  created_at       timestamptz not null default clock_timestamp(),
  check (agency_id <> target_agency_id)
);

create table public.reveals (
  envelope_id  text primary key references public.envelopes (id),
  reveal_order smallint not null unique check (reveal_order between 1 and 8),
  revealed_at  timestamptz not null default clock_timestamp(),
  created_by   uuid
);

create table public.predictions (
  agency_id  text primary key references public.agencies (id),
  pick_1     text not null references public.agencies (id),
  pick_2     text not null references public.agencies (id),
  pick_3     text not null references public.agencies (id),
  created_at timestamptz not null default clock_timestamp(),
  check (pick_1 <> pick_2 and pick_1 <> pick_3 and pick_2 <> pick_3)
);

-- ---------------------------------------------------------------- event state and audit

create table public.event_state (
  id                   boolean primary key default true check (id),  -- exactly one row
  phase                text not null default 'registration'
                       check (phase in ('registration', 'checkin', 'prelim', 'round1', 'round2',
                                        'round3', 'zero_hour', 'ended')),
  step                 text,  -- sub-step inside a phase, e.g. 'tips' in round1, 'force_field' in round3
  current_question_id  text references public.questions (id),
  current_card_id      text references public.gear_cards (id),
  current_mission      smallint check (current_mission between 1 and 4),
  prelim_published_at  timestamptz,
  round1_locked_at     timestamptz,
  round2_published_at  timestamptz,
  settings             jsonb not null default '{}'::jsonb,
  alert                text,  -- banner text shown on every page while set
  updated_at           timestamptz not null default clock_timestamp(),
  updated_by           uuid
);

create table public.audit_log (
  id          bigint generated always as identity primary key,
  actor       uuid,
  actor_email text,
  action      text not null,
  payload     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default clock_timestamp()
);
create index audit_log_created_idx on public.audit_log (created_at desc);
