-- Doomsday — 8 November: one projector link, a view-only projector role, and a name for every
-- gear card.
--
-- 1. Card and series names. Each of the 60 gear cards gets its own name (card_name), and each
--    SERIES (the cards that share a Power and a minimum bid) gets a display name of its own
--    (series_name), different from every card name: H08–H11 are the "Tunnel & Rail Bases"
--    series. gear_name stays as the series' internal key, with its original values, because
--    Breaking News and Team-Ups match on it: they still hit a whole series exactly as before,
--    and the secret seed needs no change. Screens show card_name and series_name only. Names
--    are public (Appendix B is printed and shown openly at the auction).
-- 2. A 'projector' crew role: can view the projector screens and nothing else.
-- 3. event_state.projector: what /projector shows. 'auto' follows the event phase; any other
--    value pins a screen (or a "back shortly" slide, or blackout) until it is set back.
--
-- Safe to run more than once: every step checks or overwrites, so running it again after it
-- has worked (or after a run that stopped part-way) finishes the job without errors.

-- ---------------------------------------------------------------- 1. card names

alter table public.gear_cards add column if not exists card_name text;

update public.gear_cards g
   set card_name = v.card_name
  from (values
    ('H01', 'Sky Fortress over Mahanagar'),
    ('H02', 'Aravalli Cave Base'),
    ('H03', 'Cyber City Glass Tower'),
    ('H04', 'Sky-Bridge Penthouse'),
    ('H05', 'Hauz Khas Rooftop HQ'),
    ('H06', 'Chandni Chowk Haveli Terrace'),
    ('H07', 'Lodhi Colony Mural Rooftop'),
    ('H08', 'Old Metro Depot'),
    ('H09', 'Abandoned Ticket-Hall Bunker'),
    ('H10', 'Yamuna Bank Train Yard'),
    ('H11', 'Basement Parking Level B3'),
    ('H12', 'Mama ji''s Basement'),
    ('H13', 'Laxmi Nagar PG Room'),
    ('H14', 'Chai Tapri Back Room'),
    ('H15', 'Society Water-Tank Terrace'),
    ('S01', 'Nano-Armour Mk II'),
    ('S02', 'Stealth Kurta'),
    ('S03', 'Bulletproof Bandhgala'),
    ('S04', 'Thunderproof Sherwani'),
    ('S05', 'Khadi Kevlar Jacket'),
    ('S06', 'Pashmina Camouflage Shawl'),
    ('S07', 'Mirror-Work Laser Deflector Vest'),
    ('S08', 'Reflective Rickshaw Raincoat'),
    ('S09', 'Dhaba Chef''s Fireproof Apron'),
    ('S10', 'Rush-Hour Metro Padding'),
    ('S11', 'Monsoon Gumboot Suit'),
    ('S12', 'Gully Cricket Pads'),
    ('S13', 'Nani''s Hand-Knitted Sweater Armour'),
    ('S14', 'Monkey-Cap Stealth Mask'),
    ('S15', 'Steel-Bucket Helmet'),
    ('G01', 'Jugaad Jetpack'),
    ('G02', 'Tiffin Shield'),
    ('G03', 'Chai-Powered Drone'),
    ('G04', 'Pressure-Cooker Sonic Cannon'),
    ('G05', 'Auto-Rickshaw Hover Kit'),
    ('G06', 'Scooter-Sidecar Rocket'),
    ('G07', 'Cycle-Rickshaw Turbo Pedals'),
    ('G08', 'Metro Card Teleporter'),
    ('G09', 'Inverter Battery Power Core'),
    ('G10', 'Desert-Cooler Freeze Ray'),
    ('G11', 'Kite-String Grappling Hook'),
    ('G12', 'Mosquito-Bat Taser'),
    ('G13', 'Rolling-Pin Nunchaku'),
    ('G14', 'Chappal Boomerang'),
    ('G15', 'Half-Charged Power Bank'),
    ('K01', 'Robo-Chotu'),
    ('K02', 'Sheru the Ex-Army Dog'),
    ('K03', 'Hacker Didi'),
    ('K04', 'Retired Spy Nani'),
    ('K05', 'Talking Kabootar'),
    ('K06', 'Rooftop Monkey Squad'),
    ('K07', 'Ullu the Night-Watch Owl'),
    ('K08', 'Dabbawala Network'),
    ('K09', 'Shortcut-Expert Auto Bhaiya'),
    ('K10', 'Mohalla Cricket Team'),
    ('K11', 'Momo-Stall Informant'),
    ('K12', 'Cousin Bunty'),
    ('K13', 'Turbo the Tortoise'),
    ('K14', 'Stray Goat with Attitude'),
    ('K15', 'Billu the Sleepy Cat')
  ) as v(id, card_name)
 where g.id = v.id;

-- The Jugaad Kit rows (and any card not listed above) keep their series name.
update public.gear_cards set card_name = gear_name where card_name is null;

alter table public.gear_cards alter column card_name set not null;
create unique index if not exists gear_cards_card_name_key on public.gear_cards (card_name) where phase <> 'jugaad';

-- Series display names, keyed by the series' internal key (gear_name).
alter table public.gear_cards add column if not exists series_name text;

update public.gear_cards g
   set series_name = v.series_name
  from (values
    ('Sky Fortress over Mahanagar', 'Sky Command'),
    ('Aravalli Cave Base', 'Hidden Fortresses'),
    ('Cyber City Glass Tower', 'High-Rise Hideouts'),
    ('Hauz Khas Rooftop HQ', 'Rooftop Lairs'),
    ('Old Metro Depot', 'Tunnel & Rail Bases'),
    ('Mama ji''s Basement', 'Budget Bunkers'),
    ('Nano-Armour Mk II', 'Prototype Armour'),
    ('Stealth Kurta', 'Shadow Wear'),
    ('Bulletproof Bandhgala', 'Royal Battle Wear'),
    ('Khadi Kevlar Jacket', 'Handloom Tactical'),
    ('Reflective Rickshaw Raincoat', 'Commuter Gear'),
    ('Gully Cricket Pads', 'Hand-Me-Down Armour'),
    ('Jugaad Jetpack', 'Flight Tech'),
    ('Tiffin Shield', 'Steel Shielding'),
    ('Chai-Powered Drone', 'Kitchen Arsenal'),
    ('Auto-Rickshaw Hover Kit', 'Turbo Rides'),
    ('Metro Card Teleporter', 'Household Hacks'),
    ('Mosquito-Bat Taser', 'Last-Resort Weapons'),
    ('Robo-Chotu', 'Robot Allies'),
    ('Sheru the Ex-Army Dog', 'Canine Corps'),
    ('Hacker Didi', 'Undercover Family'),
    ('Talking Kabootar', 'Animal Brigade'),
    ('Dabbawala Network', 'Street Intelligence'),
    ('Cousin Bunty', 'Reluctant Recruits'),
    ('Jugaad Kit', 'Last-Call Rescue')
  ) as v(gear_name, series_name)
 where g.gear_name = v.gear_name;

-- Any series not listed above keeps its key as its name.
update public.gear_cards set series_name = gear_name where series_name is null;
alter table public.gear_cards alter column series_name set not null;

comment on column public.gear_cards.gear_name is
  'The series'' internal key (original names, unchanged). Breaking News and Team-Ups match on this. Not shown on screens.';
comment on column public.gear_cards.series_name is 'The series'' display name, shown on screens and printed sheets.';
comment on column public.gear_cards.card_name is 'The card''s own name, printed on the card and shown on screens.';

-- Held cards carry their own name too (added at the end so dependent views stay valid).
create or replace view public.v_held_gear with (security_invoker = true) as
select s.agency_id,
       s.category,
       s.card_id,
       g.gear_name,
       g.power,
       s.price,
       s.phase,
       s.sold_at,
       s.id as sale_id,
       g.card_name,
       g.series_name
  from public.sales s
  join public.gear_cards g on g.id = s.card_id
 where s.voided_at is null;

-- ---------------------------------------------------------------- 2. the projector role

alter table public.organisers drop constraint if exists organisers_roles_check;
alter table public.organisers add constraint organisers_roles_check
  check (roles <@ array['admin', 'quiz_host', 'ledger_keeper', 'scorer', 'social_lead',
                        'anchor', 'auctioneer', 'floater', 'projector']::text[]);

-- ---------------------------------------------------------------- 3. what the projector shows

alter table public.event_state add column if not exists projector text not null default 'auto'
  check (projector in ('auto', 'welcome', 'quiz', 'auction', 'board', 'reveal', 'holding', 'blank'));

comment on column public.event_state.projector is
  '/projector: auto follows the phase; welcome, quiz, auction, board, reveal, holding (back shortly) or blank pin a screen.';

-- ---------------------------------------------------------------- version

create or replace function public.schema_version()
returns text
language sql
immutable
as $$ select '20261108001800'::text $$;

revoke all on function public.schema_version() from public, anon, authenticated;
grant execute on function public.schema_version() to service_role;
