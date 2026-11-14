-- 14 November: organisers' requests after testing.
--   1. Secret Identity Bids on phones: the ledger keeper opens a 20-second bidding window for the
--      card on the projector; each agency that still needs that category types a blind bid on
--      My Agency (changeable until the window closes). When it closes, the highest valid bid wins
--      (a tie goes to the bid that reached the site first) and the sale is recorded at once.
--   2. Round 3 run step by step from the console: map, Force Field window, envelopes, then each
--      mini game's winner and choice (Swap with a team, X-Ray, or ₹5 Cr). A Force Field played
--      against a swap blocks it and uses up the winner's choice. Swaps move the envelopes on the
--      site, so who holds what at Zero Hour is always known.
--   3. Fix: Zero Hour can open 10 envelopes (the reveal order was capped at 8).
-- Safe to run more than once.

-- ---------------------------------------------------------------- 3. ten envelopes at Zero Hour

alter table public.reveals drop constraint if exists reveals_reveal_order_check;
alter table public.reveals add constraint reveals_reveal_order_check check (reveal_order between 1 and 10);

-- ---------------------------------------------------------------- 1. blind bids

alter table public.event_state add column if not exists bid_card_id text references public.gear_cards (id);
alter table public.event_state add column if not exists bid_closes_at timestamptz;
alter table public.event_state add column if not exists bid_settled_at timestamptz;

create table if not exists public.blind_bids (
  card_id   text not null references public.gear_cards (id),
  agency_id text not null references public.agencies (id) on delete cascade,
  amount    numeric(5, 1) not null check (amount > 0 and public.is_half_step(amount)),
  placed_at timestamptz not null default clock_timestamp(),
  primary key (card_id, agency_id)
);
alter table public.blind_bids enable row level security;
comment on table public.blind_bids is
  'Secret Identity Bids typed on My Agency. SECRET until the card''s window closes; server code only.';

-- The ledger keeper opens the window for one secret lot (it also goes on the projector).
create or replace function public.r1_open_bidding(p_card text, p_seconds integer, p_actor uuid)
returns timestamptz
language plpgsql
as $$
declare
  v       public.event_state%rowtype;
  c       public.gear_cards%rowtype;
  v_close timestamptz;
begin
  v := public.round1_state();
  perform 1 from public.event_state where id for update;
  if v.step is distinct from 'secret' then
    raise exception 'not_secret' using hint = 'Phone bidding runs in the Secret Identity Bids step.';
  end if;
  if v.bid_card_id is not null and v.bid_settled_at is null and v.bid_closes_at > clock_timestamp() then
    raise exception 'bidding_open' using hint = format('Bidding on %s is still open.', v.bid_card_id);
  end if;
  if v.bid_card_id is not null and v.bid_settled_at is null then
    perform public.r1_settle_bidding(p_actor);
  end if;
  if p_seconds is null or p_seconds not between 5 and 120 then
    raise exception 'bad_window' using hint = 'The bidding window must be 5 s to 2 min long.';
  end if;
  select * into c from public.gear_cards where id = p_card;
  if not found or c.phase <> 'secret' then
    raise exception 'wrong_lot' using hint = 'Only Secret Identity cards are bid on by phone.';
  end if;
  if exists (select 1 from public.sales where card_id = p_card and voided_at is null) then
    raise exception 'card_sold' using hint = format('%s is already sold.', p_card);
  end if;
  delete from public.blind_bids where card_id = p_card;  -- a card reopened starts from no bids
  v_close := clock_timestamp() + make_interval(secs => p_seconds);
  update public.event_state
     set current_card_id = p_card, bid_card_id = p_card, bid_closes_at = v_close, bid_settled_at = null,
         updated_at = clock_timestamp(), updated_by = p_actor
   where id;
  return v_close;
end;
$$;

-- An agency places (or changes, or with a null amount withdraws) its blind bid from My Agency.
create or replace function public.r1_agency_bid(p_token_hash text, p_amount numeric)
returns void
language plpgsql
as $$
declare
  v_agency text;
  v        public.event_state%rowtype;
  c        public.gear_cards%rowtype;
  v_fund   numeric;
begin
  v_agency := public.session_agency(p_token_hash);
  if v_agency is null then raise exception 'not_signed_in'; end if;
  select * into v from public.event_state where id;
  if v.phase <> 'round1' or v.round1_locked_at is not null or v.step is distinct from 'secret'
     or v.bid_card_id is null or v.bid_settled_at is not null or clock_timestamp() > v.bid_closes_at then
    raise exception 'bidding_closed' using hint = 'Bidding on this card has closed.';
  end if;
  if not exists (select 1 from public.agencies where id = v_agency and status = 'active') then
    raise exception 'agency_not_active' using hint = 'Only agencies still in the game can bid.';
  end if;
  select * into c from public.gear_cards where id = v.bid_card_id;
  if exists (select 1 from public.sales where agency_id = v_agency and category = c.category and voided_at is null) then
    raise exception 'category_held' using hint = format('You already hold a %s card.', c.category);
  end if;
  if p_amount is null then
    delete from public.blind_bids where card_id = c.id and agency_id = v_agency;
    return;
  end if;
  if not public.is_half_step(p_amount) or p_amount <= 0 then
    raise exception 'bad_step' using hint = 'Bids move in ₹0.5 Cr steps.';
  end if;
  if p_amount < c.min_bid then
    raise exception 'below_minimum' using hint = format('The minimum bid is ₹%s Cr.', c.min_bid);
  end if;
  v_fund := public.fund_left(v_agency);
  if p_amount > v_fund then
    raise exception 'over_fund' using hint = format('You have only ₹%s Cr left.', v_fund);
  end if;
  insert into public.blind_bids (card_id, agency_id, amount, placed_at)
  values (c.id, v_agency, p_amount, clock_timestamp())
  on conflict (card_id, agency_id) do update set amount = excluded.amount, placed_at = excluded.placed_at;
end;
$$;

-- Once the window has closed: the highest valid bid wins (a tie goes to the earlier bid) and the
-- sale is recorded. Safe to call again and again; it settles a window only once. Returns the
-- winning agency, or null when nobody bid validly (the card then waits for Last Call).
create or replace function public.r1_settle_bidding(p_actor uuid)
returns text
language plpgsql
as $$
declare
  v  public.event_state%rowtype;
  c  public.gear_cards%rowtype;
  b  record;
begin
  -- Fast path without a lock: the projector and the consoles call this on every refresh.
  if not exists (select 1 from public.event_state
                  where id and bid_card_id is not null and bid_settled_at is null and bid_closes_at <= clock_timestamp()) then
    return null;
  end if;
  select * into v from public.event_state where id for update;
  if v.bid_card_id is null or v.bid_settled_at is not null or v.bid_closes_at > clock_timestamp() then
    return null;
  end if;
  update public.event_state set bid_settled_at = clock_timestamp() where id;
  if v.phase <> 'round1' or v.round1_locked_at is not null or v.step is distinct from 'secret' then
    return null;
  end if;
  select * into c from public.gear_cards where id = v.bid_card_id;
  if exists (select 1 from public.sales where card_id = c.id and voided_at is null) then
    return null;
  end if;
  for b in
    select bb.agency_id, bb.amount
      from public.blind_bids bb
      join public.agencies a on a.id = bb.agency_id and a.status = 'active'
     where bb.card_id = c.id
       and bb.amount >= c.min_bid
       and bb.amount <= public.fund_left(bb.agency_id)
       and not exists (select 1 from public.sales s where s.agency_id = bb.agency_id and s.category = c.category and s.voided_at is null)
     order by bb.amount desc, bb.placed_at asc, bb.agency_id asc
  loop
    perform public.r1_record_sale(c.id, b.agency_id, b.amount, p_actor);
    return b.agency_id;
  end loop;
  return null;
end;
$$;

-- ---------------------------------------------------------------- 2. Round 3, step by step

alter table public.missions add column if not exists ff_blocked boolean not null default false;

create or replace view public.v_public_missions as
select no, name, winner_agency_id, choice,
       case when choice = 'swap' then swap_target end as swap_target,
       decided_at,
       ff_blocked
  from public.missions;

-- Who holds which envelope: recorded once, before the first mini game result.
create or replace function public.r3_deal(p_map jsonb, p_actor uuid)
returns void
language plpgsql
as $$
declare
  v_final integer;
begin
  if (select phase from public.event_state) not in ('round3', 'zero_hour') then
    raise exception 'not_round3' using hint = 'Envelopes are recorded in Round 3.';
  end if;
  if exists (select 1 from public.reveals) then
    raise exception 'reveal_started' using hint = 'The results are calculated; the envelopes are final.';
  end if;
  if exists (select 1 from public.missions where choice is not null) then
    raise exception 'missions_started' using hint = 'A mini game is already recorded; undo the mini games to change the envelopes.';
  end if;
  select count(*) into v_final from public.agencies where status = 'active';
  if (select count(*) from jsonb_each_text(p_map) m
        join public.agencies a on a.id = m.key and a.status = 'active'
        join public.envelopes e on e.id = m.value) <> v_final
     or (select count(*) from jsonb_object_keys(p_map)) <> v_final
     or (select count(distinct value) from jsonb_each_text(p_map)) <> v_final then
    raise exception 'bad_deal' using hint = 'Give every finalist a different envelope.';
  end if;
  update public.envelope_moves set voided_at = clock_timestamp() where voided_at is null;
  insert into public.envelope_moves (envelope_id, to_agency, kind, created_by)
  select value, key, 'deal', p_actor from jsonb_each_text(p_map);
end;
$$;

-- One mini game's result: the winner (null = no correct sheet) and the winner's choice.
--   swap: p_target's envelope and the winner's change hands, unless p_ff_played: the target plays
--         its (unused) Force Field, the swap is blocked and the choice is used up;
--   xray: the winner looks at p_target's envelope privately (logged, secret);
--   cash: +₹5 Cr to the winner.
create or replace function public.r3_record_minigame(
  p_mission integer, p_winner text, p_choice text, p_target text, p_ff_played boolean, p_actor uuid)
returns void
language plpgsql
as $$
declare
  m      public.missions%rowtype;
  env_w  text;
  env_t  text;
  g      uuid := gen_random_uuid();
begin
  perform 1 from public.event_state where id for update;
  if (select phase from public.event_state where id) <> 'round3' then
    raise exception 'not_round3' using hint = 'Mini game results are recorded in Round 3.';
  end if;
  if exists (select 1 from public.reveals) then raise exception 'reveal_started'; end if;
  if p_mission is null or p_mission not between 1 and 4 then raise exception 'no_mission'; end if;
  if not exists (select 1 from public.envelope_moves where kind = 'deal' and voided_at is null) then
    raise exception 'no_deal' using hint = 'Record who holds which envelope first.';
  end if;
  if exists (select 1 from public.missions where no < p_mission and choice is null) then
    raise exception 'previous_mission' using hint = 'Record the earlier mini games first.';
  end if;
  select * into m from public.missions where no = p_mission for update;
  if m.choice is not null then
    raise exception 'choice_made' using hint = format('Mini game %s is already recorded; undo it first.', p_mission);
  end if;

  if p_winner is null then
    update public.missions set winner_agency_id = null, choice = 'none', swap_target = null, ff_blocked = false,
           decided_at = clock_timestamp() where no = p_mission;
    return;
  end if;
  select envelope_id into env_w from public.v_envelope_holders where holder_agency_id = p_winner;
  if env_w is null then raise exception 'not_finalist' using hint = format('%s holds no envelope.', p_winner); end if;

  if p_choice = 'cash' then
    perform public.lock_active_agency(p_winner);
    insert into public.ledger_entries (agency_id, amount, reason, ref, note, created_by)
    values (p_winner, 5, 'mission_cash', 'mission:' || p_mission, 'Mini game ' || p_mission || ' cash', p_actor);
    update public.missions set winner_agency_id = p_winner, choice = 'cash', swap_target = null, ff_blocked = false,
           decided_at = clock_timestamp() where no = p_mission;
    return;
  end if;

  if p_choice not in ('swap', 'xray') then raise exception 'bad_choice' using hint = 'Choose Swap, X-Ray or cash.'; end if;
  if p_target is null or p_target = p_winner then
    raise exception 'bad_target' using hint = 'Pick another team.';
  end if;
  select envelope_id into env_t from public.v_envelope_holders where holder_agency_id = p_target;
  if env_t is null then raise exception 'bad_target' using hint = format('%s holds no envelope.', p_target); end if;

  if p_choice = 'xray' then
    insert into public.xray_log (mission, agency_id, target_agency_id, created_by) values (p_mission, p_winner, p_target, p_actor);
    update public.missions set winner_agency_id = p_winner, choice = 'xray', swap_target = null, ff_blocked = false,
           decided_at = clock_timestamp() where no = p_mission;
    return;
  end if;

  -- swap
  if coalesce(p_ff_played, false) then
    update public.force_fields set used_at = clock_timestamp()
     where agency_id = p_target and mission is null and voided_at is null and used_at is null;
    if not found then
      raise exception 'no_force_field' using hint = format('%s has no unused Force Field.', p_target);
    end if;
  else
    insert into public.envelope_moves (envelope_id, mission, from_agency, to_agency, kind, move_group, created_by) values
      (env_w, p_mission, p_winner, p_target, 'swap', g, p_actor),
      (env_t, p_mission, p_target, p_winner, 'swap', g, p_actor);
  end if;
  update public.missions set winner_agency_id = p_winner, choice = 'swap', swap_target = p_target,
         ff_blocked = coalesce(p_ff_played, false), decided_at = clock_timestamp() where no = p_mission;
end;
$$;

-- Takes back the most recently recorded mini game (its swap, Force Field use or cash).
create or replace function public.r3_undo_minigame(p_mission integer, p_actor uuid)
returns void
language plpgsql
as $$
declare
  m   public.missions%rowtype;
  led bigint;
begin
  perform 1 from public.event_state where id for update;
  if exists (select 1 from public.reveals) then
    raise exception 'reveal_started' using hint = 'The results are calculated; Round 3 is final.';
  end if;
  select * into m from public.missions where no = p_mission for update;
  if m.choice is null then raise exception 'nothing_to_undo' using hint = 'That mini game is not recorded.'; end if;
  if exists (select 1 from public.missions where no > p_mission and choice is not null) then
    raise exception 'later_mission' using hint = 'Undo the later mini games first.';
  end if;
  if m.choice = 'swap' and not m.ff_blocked then
    update public.envelope_moves set voided_at = clock_timestamp()
     where mission = p_mission and kind = 'swap' and voided_at is null;
  elsif m.choice = 'swap' and m.ff_blocked then
    update public.force_fields set used_at = null
     where agency_id = m.swap_target and mission is null and voided_at is null and used_at is not null;
  elsif m.choice = 'cash' then
    select id into led from public.v_ledger
     where reason = 'mission_cash' and ref = 'mission:' || p_mission and not voided order by id desc limit 1;
    if led is not null then perform public.ledger_void(led, 'Mini game result corrected', p_actor); end if;
  end if;
  update public.missions set winner_agency_id = null, choice = null, swap_target = null, ff_blocked = false, decided_at = null
   where no = p_mission;
end;
$$;

-- ---------------------------------------------------------------- reset also clears the new state

create or replace function public.admin_reset_event(p_keep_registrations boolean, p_actor uuid)
returns void
language plpgsql
as $$
begin
  perform set_config('doomsday.allow_reset', 'on', true);
  set constraints public.agencies_have_three_founders, public.founders_exactly_three immediate;
  truncate public.answers, public.prelim_tiebreaks, public.ledger_voids, public.sales, public.insider_tips,
           public.force_fields, public.envelope_moves, public.xray_log, public.reveals, public.poster_duels,
           public.tower_results, public.envelope_contents, public.blind_bids, public.ledger_entries;
  update public.missions set winner_agency_id = null, choice = null, swap_target = null, decided_at = null, ff_blocked = false where true;
  update public.event_state
     set phase = 'registration', step = null, current_question_id = null, current_card_id = null,
         current_mission = null, prelim_published_at = null, prelim_frozen_at = null, round1_locked_at = null,
         round2_published_at = null, alert = null, tips_closes_at = null, r1_screen = null,
         bid_card_id = null, bid_closes_at = null, bid_settled_at = null, ff_closes_at = null,
         updated_at = clock_timestamp(), updated_by = p_actor where id;
  update public.questions
     set status = 'pending', order_no = null, replaces_id = null, opened_at = null, closed_at = null, revealed_at = null where true;
  update public.breaking_news set draw_order = null, revealed_at = null where true;
  update public.team_ups set revealed_at = null where true;
  update public.gear_cards set lot_order = null where true;

  if p_keep_registrations then
    delete from public.agencies where is_test; -- founders, PINs and sessions go with them
    update public.agencies set status = 'registered', eliminated_in = null, checked_in_at = null where true;
    update public.agency_auth set failed_attempts = 0, locked_until = null where true;
  else
    truncate public.agency_sessions, public.agency_auth, public.founders;
    delete from public.agencies where true;
  end if;
  set constraints public.agencies_have_three_founders, public.founders_exactly_three deferred;
end;
$$;

do $$
declare
  f text;
begin
  foreach f in array array[
    'r1_open_bidding(text, integer, uuid)', 'r1_agency_bid(text, numeric)', 'r1_settle_bidding(uuid)',
    'r3_deal(jsonb, uuid)', 'r3_record_minigame(integer, text, text, text, boolean, uuid)', 'r3_undo_minigame(integer, uuid)',
    'admin_reset_event(boolean, uuid)']
  loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to service_role', f);
  end loop;
end;
$$;
revoke all on table public.blind_bids from public, anon, authenticated;
grant all on table public.blind_bids to service_role;

create or replace function public.schema_version()
returns text
language sql
immutable
as $$ select '20261114002600'::text $$;
