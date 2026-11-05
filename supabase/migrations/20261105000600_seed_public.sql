-- Doomsday — public seed data (safe to keep in a public repository).
--
-- Appendix B gear cards (printed and shown openly at the auction), the 4 Jugaad Kit rows,
-- the Battle Outcome catalogue (published in the rules), envelope numbers, missions and the
-- event_state row with every open-decision default as an admin-editable setting.
--
-- NOT here, on purpose: Appendix A questions and answers, Team-Ups and Breaking News.
-- Those are secret until the event and live in supabase/private/seed_secrets.sql, which is
-- git-ignored. See README "Load the secret seed".

-- ---------------------------------------------------------------- Appendix B: 60 gear cards

insert into public.gear_cards (id, category, gear_name, power, min_bid, phase)
select prefix || lpad(n::text, 2, '0'), category, gear_name, power, min_bid, phase
  from (values
    -- category,  prefix, gear name,                      power, min bid, phase,    first, last
    ('HQ',       'H', 'Sky Fortress over Mahanagar',      10, 10.0, 'marquee',  1,  1),
    ('HQ',       'H', 'Aravalli Cave Base',                9,  8.0, 'marquee',  2,  2),
    ('HQ',       'H', 'Cyber City Glass Tower',            8,  7.0, 'secret',   3,  4),
    ('HQ',       'H', 'Hauz Khas Rooftop HQ',              6,  5.0, 'secret',   5,  7),
    ('HQ',       'H', 'Old Metro Depot',                   5,  4.0, 'secret',   8, 11),
    ('HQ',       'H', 'Mama ji''s Basement',               3,  2.0, 'secret',  12, 15),
    ('Suit',     'S', 'Nano-Armour Mk II',                10, 10.0, 'marquee',  1,  1),
    ('Suit',     'S', 'Stealth Kurta',                     9,  8.0, 'marquee',  2,  2),
    ('Suit',     'S', 'Bulletproof Bandhgala',             8,  7.0, 'secret',   3,  4),
    ('Suit',     'S', 'Khadi Kevlar Jacket',               6,  5.0, 'secret',   5,  7),
    ('Suit',     'S', 'Reflective Rickshaw Raincoat',      5,  4.0, 'secret',   8, 11),
    ('Suit',     'S', 'Gully Cricket Pads',                3,  2.0, 'secret',  12, 15),
    ('Gadget',   'G', 'Jugaad Jetpack',                   10, 10.0, 'marquee',  1,  1),
    ('Gadget',   'G', 'Tiffin Shield',                     9,  8.0, 'marquee',  2,  2),
    ('Gadget',   'G', 'Chai-Powered Drone',                8,  7.0, 'secret',   3,  4),
    ('Gadget',   'G', 'Auto-Rickshaw Hover Kit',           6,  5.0, 'secret',   5,  7),
    ('Gadget',   'G', 'Metro Card Teleporter',             5,  4.0, 'secret',   8, 11),
    ('Gadget',   'G', 'Mosquito-Bat Taser',                3,  2.0, 'secret',  12, 15),
    ('Sidekick', 'K', 'Robo-Chotu',                       10, 10.0, 'marquee',  1,  1),
    ('Sidekick', 'K', 'Sheru the Ex-Army Dog',             9,  8.0, 'marquee',  2,  2),
    ('Sidekick', 'K', 'Hacker Didi',                       8,  7.0, 'secret',   3,  4),
    ('Sidekick', 'K', 'Talking Kabootar',                  6,  5.0, 'secret',   5,  7),
    ('Sidekick', 'K', 'Dabbawala Network',                 5,  4.0, 'secret',   8, 11),
    ('Sidekick', 'K', 'Cousin Bunty',                      2,  1.0, 'secret',  12, 15)
  ) as g(category, prefix, gear_name, power, min_bid, phase, first_no, last_no)
  cross join lateral generate_series(g.first_no, g.last_no) as n;

-- Jugaad Kit: Power 2, ₹8 Cr fixed, any category, after Last Call. Open decision 10: 4 rows.
insert into public.gear_cards (id, category, gear_name, power, min_bid, phase) values
  ('JK1', 'Any', 'Jugaad Kit', 2, 8.0, 'jugaad'),
  ('JK2', 'Any', 'Jugaad Kit', 2, 8.0, 'jugaad'),
  ('JK3', 'Any', 'Jugaad Kit', 2, 8.0, 'jugaad'),
  ('JK4', 'Any', 'Jugaad Kit', 2, 8.0, 'jugaad');

-- ---------------------------------------------------------------- Round 3 catalogue

insert into public.battle_outcomes (label, multiplier, envelopes, sort_order) values
  ('City saved, statue unveiled',     3.00, 1, 1),
  ('Trending #1 across India',        2.00, 1, 2),
  ('Clean win, zero damage',          1.50, 2, 3),
  ('Saved the day, just about',       1.00, 1, 4),
  ('₹100 crore property damage bill', 0.50, 2, 5),
  ('Villain escaped',                 0.25, 1, 6);

insert into public.envelopes (id)
select 'E' || n from generate_series(1, 8) as n;

insert into public.missions (no, name) values
  (1, 'The Multiverse Grid'),
  (2, 'Across the Multiverse'),
  (3, 'Before the World Ends'),
  (4, 'The Shutdown Key');

-- ---------------------------------------------------------------- event state + settings

-- Every "Open decision" default from the spec, plus the website's own defaults, as settings
-- the admin panel can change. See docs/decisions.md.
insert into public.event_state (id, phase, settings) values (true, 'registration', $json$
{
  "registration": {
    "open": true,
    "eligibility": "IMI Delhi students only",
    "email_domain": null,
    "fee": "Free",
    "closes_at": "2026-11-23T23:59:00+05:30",
    "max_agencies": 60
  },
  "event": {
    "starts_at": "2026-11-25T17:30:00+05:30",
    "venue": "Auditorium"
  },
  "prelim": {
    "requires_checkin": true
  },
  "round1": {
    "show_fund_publicly": false,
    "insider_tip_assignment": "random"
  },
  "round2": {
    "cutoff_tiebreak": "Rock-paper-scissors"
  },
  "zero_hour": {
    "hero_tiebreak": ["fund_left", "power_level", "coin_toss"],
    "reveal_order_tiebreak": "agency_id"
  },
  "prizes": {
    "winner": null,
    "runner_up": null,
    "biggest_fan": null
  },
  "predictions": {
    "match": "exact_order",
    "close_on": "first_reveal"
  },
  "security": {
    "pin_max_attempts": 5,
    "pin_lock_seconds": 60
  }
}
$json$::jsonb);
