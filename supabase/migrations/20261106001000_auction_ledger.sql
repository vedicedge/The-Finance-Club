-- Doomsday — Milestone 4: Round 1 Power Bazaar and the Fund Ledger
-- (spec: Round 1, "Ledger rules the server enforces", "Every money movement").
--
-- Every money action locks the agency's row first, so two ledger keepers can never spend the
-- same crore twice, then checks the rule, then writes the sale/tip and its ledger entry in one
-- transaction. Fixes are voids (new rows) or new entries, never edits.
--
-- Round 1 steps (event_state.step while phase = 'round1'):
--   rules → tips → marquee → secret → last_call → news → ledger_check

-- ---------------------------------------------------------------- helpers

create or replace function public.fund_left(p_agency text)
returns numeric
language sql
stable
as $$
  select coalesce(sum(e.amount), 0)
    from public.ledger_entries e
   where e.agency_id = p_agency
     and not exists (select 1 from public.ledger_voids v where v.entry_id = e.id)
$$;

-- Locks an agency row for the rest of the transaction and checks it is still in the game.
create or replace function public.lock_active_agency(p_agency text)
returns void
language plpgsql
as $$
begin
  perform 1 from public.agencies where id = p_agency and status = 'active' for update;
  if not found then
    raise exception 'agency_not_active' using hint = format('%s is not an agency in the game.', p_agency);
  end if;
end;
$$;

-- Round 1 is running and not locked. Returns the event state.
create or replace function public.round1_state()
returns public.event_state
language plpgsql
as $$
declare
  v public.event_state%rowtype;
begin
  select * into v from public.event_state;
  if v.phase <> 'round1' then
    raise exception 'not_round1' using hint = 'Switch the event to Round 1 · Power Bazaar first.';
  end if;
  if v.round1_locked_at is not null then
    raise exception 'round1_locked' using hint = 'Round 1 is locked; Power Levels are final.';
  end if;
  return v;
end;
$$;

-- Categories an agency still lacks (active sales only).
create or replace function public.missing_categories(p_agency text)
returns text[]
language sql
stable
as $$
  select coalesce(array_agg(c order by c), '{}')
    from unnest(array['HQ', 'Suit', 'Gadget', 'Sidekick']) as c
   where not exists (select 1 from public.sales s
                      where s.agency_id = p_agency and s.category = c and s.voided_at is null)
$$;

-- ---------------------------------------------------------------- Round 1 start

-- "Round 1 start: +₹50 Cr starting fund for every qualified agency." Once.
create or replace function public.r1_start_funds(p_actor uuid)
returns integer
language plpgsql
as $$
declare
  v public.event_state%rowtype;
  n integer;
begin
  select * into v from public.event_state for update;
  perform public.round1_state();
  if v.prelim_frozen_at is null then
    raise exception 'prelim_not_frozen' using hint = 'Freeze the top 16 in the quiz console first.';
  end if;
  if exists (select 1 from public.v_ledger where reason = 'start_fund' and not voided) then
    raise exception 'already_started' using hint = 'Starting funds have already been credited.';
  end if;
  insert into public.ledger_entries (agency_id, amount, reason, ref, created_by)
  select id, 50, 'start_fund', 'round1', p_actor from public.agencies where status = 'active';
  get diagnostics n = row_count;
  return n;
end;
$$;

-- Running order of the lots: the 8 Marquee lots in card order, then the 52 Secret Identity Bid
-- cards "one category at a time, in a shuffled order". Allowed until the first sale.
create or replace function public.r1_shuffle_lots()
returns void
language plpgsql
as $$
begin
  if exists (select 1 from public.sales where voided_at is null) then
    raise exception 'auction_started' using hint = 'The lot order is fixed once a card has been sold.';
  end if;
  update public.gear_cards set lot_order = null;
  update public.gear_cards g
     set lot_order = m.rn
    from (select id, row_number() over (order by id)::smallint as rn from public.gear_cards where phase = 'marquee') m
   where g.id = m.id;
  update public.gear_cards g
     set lot_order = s.rn
    from (select g2.id, (8 + row_number() over (order by c.r, random()))::smallint as rn
            from public.gear_cards g2
            join (select category, random() as r from (select distinct category from public.gear_cards where phase = 'secret') x) c
              on c.category = g2.category
           where g2.phase = 'secret') s
   where g.id = s.id;
end;
$$;

-- ---------------------------------------------------------------- sales

-- "Record sale: card unsold; agency active and holds no card in that category; price ≥ min bid,
-- ≤ fund left, multiple of 0.5 → sales row + ledger −price, one transaction."
create or replace function public.r1_record_sale(p_card text, p_agency text, p_price numeric, p_actor uuid)
returns bigint
language plpgsql
as $$
declare
  v      public.event_state%rowtype;
  c      public.gear_cards%rowtype;
  v_fund numeric;
  v_led  bigint;
  v_sale bigint;
begin
  v := public.round1_state();
  if coalesce(v.step, '') not in ('marquee', 'secret', 'last_call') then
    raise exception 'not_bidding' using hint = 'Sales are recorded in the Marquee, Secret Identity Bids or Last Call step.';
  end if;

  select * into c from public.gear_cards where id = p_card for update;
  if not found then raise exception 'no_card' using hint = 'Unknown card.'; end if;
  if c.phase = 'jugaad' then
    raise exception 'jugaad_is_automatic' using hint = 'Jugaad Kits are assigned when Round 1 closes.';
  end if;
  if v.step = 'marquee' and c.phase <> 'marquee' then
    raise exception 'wrong_lot' using hint = 'Only the 8 Marquee lots sell in the Marquee Auction.';
  end if;
  if v.step = 'secret' and c.phase <> 'secret' then
    raise exception 'wrong_lot' using hint = 'Marquee cards that went unsold return in Last Call.';
  end if;
  if exists (select 1 from public.sales where card_id = p_card and voided_at is null) then
    raise exception 'card_sold' using hint = format('%s is already sold.', p_card);
  end if;

  perform public.lock_active_agency(p_agency);
  if exists (select 1 from public.sales where agency_id = p_agency and category = c.category and voided_at is null) then
    raise exception 'category_held' using hint = format('%s already holds a %s card.', p_agency, c.category);
  end if;
  if not public.is_half_step(p_price) then
    raise exception 'bad_step' using hint = 'Prices move in ₹0.5 Cr steps.';
  end if;
  if p_price < c.min_bid then
    raise exception 'below_minimum' using hint = format('The minimum bid for %s is ₹%s Cr.', p_card, c.min_bid);
  end if;
  v_fund := public.fund_left(p_agency);
  if p_price > v_fund then
    raise exception 'over_fund' using hint = format('%s has only ₹%s Cr left.', p_agency, v_fund);
  end if;

  insert into public.ledger_entries (agency_id, amount, reason, ref, note, created_by)
  values (p_agency, -p_price, 'gear', 'card:' || p_card, c.gear_name, p_actor)
  returning id into v_led;
  insert into public.sales (card_id, agency_id, category, price, phase, ledger_entry_id, created_by)
  values (p_card, p_agency, c.category, p_price,
          case when v.step = 'last_call' then 'last_call' else c.phase end, v_led, p_actor)
  returning id into v_sale;
  return v_sale;
end;
$$;

-- ---------------------------------------------------------------- Insider Tips and Breaking News

-- "Breaking News: prepare 8; draw 6 and seal them in order before bidding."
create or replace function public.r1_set_news_draw(p_ids text[])
returns void
language plpgsql
as $$
begin
  if (select round1_locked_at from public.event_state) is not null then raise exception 'round1_locked'; end if;
  if exists (select 1 from public.insider_tips where voided_at is null) then
    raise exception 'tips_sold' using hint = 'Tips have been sold against this draw; it can no longer change.';
  end if;
  if exists (select 1 from public.breaking_news where revealed_at is not null) then
    raise exception 'news_revealed';
  end if;
  if coalesce(array_length(p_ids, 1), 0) <> 6
     or (select count(distinct x) from unnest(p_ids) x) <> 6
     or (select count(*) from public.breaking_news where id = any (p_ids)) <> 6 then
    raise exception 'bad_draw' using hint = 'Pick 6 different news cards.';
  end if;
  update public.breaking_news set draw_order = null;
  update public.breaking_news b
     set draw_order = d.ord
    from unnest(p_ids) with ordinality as d(id, ord)
   where b.id = d.id;
end;
$$;

-- "Insider tip: tips phase; one per agency; fund ≥ 2 → ledger −2; tip linked to a drawn news card."
create or replace function public.r1_buy_tip(p_agency text, p_actor uuid, p_news text default null)
returns text
language plpgsql
as $$
declare
  v      public.event_state%rowtype;
  v_news text;
  v_led  bigint;
begin
  v := public.round1_state();
  if v.step is distinct from 'tips' then
    raise exception 'not_tips_window' using hint = 'Tips are sold only in the Insider Tips step.';
  end if;
  perform public.lock_active_agency(p_agency);
  if exists (select 1 from public.insider_tips where agency_id = p_agency and voided_at is null) then
    raise exception 'tip_already_bought' using hint = format('%s already has a tip.', p_agency);
  end if;
  if public.fund_left(p_agency) < 2 then
    raise exception 'insufficient_fund' using hint = format('%s needs ₹2 Cr for a tip.', p_agency);
  end if;
  if not exists (select 1 from public.breaking_news where draw_order is not null) then
    raise exception 'news_not_drawn' using hint = 'Enter the 6 drawn Breaking News cards first.';
  end if;

  if coalesce(v.settings #>> '{round1,insider_tip_assignment}', 'random') = 'manual' then
    select id into v_news from public.breaking_news where id = p_news and draw_order is not null;
    if v_news is null then raise exception 'pick_drawn_news' using hint = 'Pick one of the 6 drawn news cards.'; end if;
  else
    select id into v_news from public.breaking_news where draw_order is not null order by random() limit 1;
  end if;

  insert into public.ledger_entries (agency_id, amount, reason, ref, created_by)
  values (p_agency, -2, 'tip', 'tip', p_actor)
  returning id into v_led;
  insert into public.insider_tips (agency_id, news_id, ledger_entry_id, created_by)
  values (p_agency, v_news, v_led, p_actor);
  return v_news;
end;
$$;

-- Reveals the next drawn news card, in the sealed order. Returns its id.
create or replace function public.r1_reveal_next_news()
returns text
language plpgsql
as $$
declare
  v_id text;
begin
  perform public.round1_state();
  select id into v_id from public.breaking_news
   where draw_order is not null and revealed_at is null
   order by draw_order limit 1 for update;
  if v_id is null then raise exception 'all_news_revealed' using hint = 'All 6 headlines are out.'; end if;
  update public.breaking_news set revealed_at = clock_timestamp() where id = v_id;
  return v_id;
end;
$$;

create or replace function public.r1_reveal_team_ups()
returns void
language plpgsql
as $$
begin
  perform public.round1_state();
  update public.team_ups set revealed_at = clock_timestamp() where revealed_at is null;
end;
$$;

-- ---------------------------------------------------------------- Close Round 1

-- "Missing exactly one category after Last Call: the agency must take the Jugaad Kit (Power 2)
-- for ₹8 Cr. Missing two or more categories, or unable to pay for the Jugaad Kit: eliminated."
-- Returns what it did, one object per affected agency.
create or replace function public.r1_apply_jugaad(p_actor uuid)
returns jsonb
language plpgsql
as $$
declare
  v       public.event_state%rowtype;
  a       record;
  v_miss  text[];
  v_card  text;
  v_led   bigint;
  v_fund  numeric;
  v_out   jsonb := '[]'::jsonb;
begin
  v := public.round1_state();
  if coalesce(v.step, '') not in ('last_call', 'news', 'ledger_check') then
    raise exception 'too_early' using hint = 'Jugaad Kits are applied after Last Call.';
  end if;

  for a in select id from public.agencies where status = 'active' order by id for update loop
    v_miss := public.missing_categories(a.id);
    continue when cardinality(v_miss) = 0;

    v_fund := public.fund_left(a.id);
    if cardinality(v_miss) >= 2 or v_fund < 8 then
      update public.agencies set status = 'eliminated', eliminated_in = 'round1' where id = a.id;
      v_out := v_out || jsonb_build_object('agency', a.id, 'action', 'eliminated', 'missing', to_jsonb(v_miss),
                                           'fund', v_fund);
      continue;
    end if;

    select g.id into v_card
      from public.gear_cards g
     where g.phase = 'jugaad'
       and not exists (select 1 from public.sales s where s.card_id = g.id and s.voided_at is null)
     order by g.id
     limit 1
     for update;
    if v_card is null then
      raise exception 'no_jugaad_kit_left' using hint = 'All Jugaad Kit rows are used. An admin can add JK5 and more.';
    end if;

    insert into public.ledger_entries (agency_id, amount, reason, ref, note, created_by)
    values (a.id, -8, 'jugaad_kit', 'card:' || v_card, 'Jugaad Kit for ' || v_miss[1], p_actor)
    returning id into v_led;
    insert into public.sales (card_id, agency_id, category, price, phase, ledger_entry_id, created_by)
    values (v_card, a.id, v_miss[1], 8, 'jugaad', v_led, p_actor);
    v_out := v_out || jsonb_build_object('agency', a.id, 'action', 'jugaad_kit', 'category', v_miss[1], 'card', v_card);
  end loop;
  return v_out;
end;
$$;

-- "…reveal news; lock." Every agency still in the game must hold all four categories.
create or replace function public.r1_lock()
returns void
language plpgsql
as $$
declare
  v_pending text;
begin
  perform 1 from public.event_state for update;
  perform public.round1_state();
  select string_agg(id, ', ' order by id) into v_pending
    from public.agencies
   where status = 'active' and cardinality(public.missing_categories(id)) > 0;
  if v_pending is not null then
    raise exception 'jugaad_pending' using hint = format('Still missing a category: %s. Apply Jugaad Kits first.', v_pending);
  end if;
  update public.breaking_news set revealed_at = clock_timestamp() where draw_order is not null and revealed_at is null;
  update public.team_ups set revealed_at = clock_timestamp() where revealed_at is null;
  update public.event_state set round1_locked_at = clock_timestamp(), step = 'locked';
end;
$$;

-- ---------------------------------------------------------------- ledger fixes

-- "Undo: void the entry (and its linked sale or row), never delete."
-- After Round 1 locks, Round 1 purchases can no longer be voided: Power Levels are final.
create or replace function public.ledger_void(p_entry bigint, p_reason text, p_actor uuid)
returns void
language plpgsql
as $$
declare
  e public.ledger_entries%rowtype;
begin
  select * into e from public.ledger_entries where id = p_entry;
  if not found then raise exception 'no_entry'; end if;
  perform 1 from public.agencies where id = e.agency_id for update;
  if exists (select 1 from public.ledger_voids where entry_id = p_entry) then
    raise exception 'already_void' using hint = 'That entry is already void.';
  end if;
  if e.reason in ('gear', 'jugaad_kit', 'tip') and (select round1_locked_at from public.event_state) is not null then
    raise exception 'round1_locked' using hint = 'Round 1 is locked; its purchases can no longer be voided.';
  end if;
  if length(btrim(coalesce(p_reason, ''))) < 3 then
    raise exception 'reason_required' using hint = 'Say why the entry is being voided.';
  end if;
  insert into public.ledger_voids (entry_id, reason, created_by) values (p_entry, btrim(p_reason), p_actor);
end;
$$;

-- "Undo last entry": voids the most recent entry this ledger keeper made.
create or replace function public.ledger_undo_last(p_actor uuid, p_reason text)
returns bigint
language plpgsql
as $$
declare
  v_id bigint;
begin
  select e.id into v_id
    from public.ledger_entries e
   where e.created_by = p_actor
     and not exists (select 1 from public.ledger_voids v where v.entry_id = e.id)
   order by e.id desc
   limit 1;
  if v_id is null then raise exception 'nothing_to_undo' using hint = 'You have no entries left to undo.'; end if;
  perform public.ledger_void(v_id, coalesce(nullif(btrim(p_reason), ''), 'Undo last entry'), p_actor);
  return v_id;
end;
$$;

-- "Manual adjustment with reason." Any agency, ₹0.5 Cr steps, a note is required.
create or replace function public.ledger_adjust(p_agency text, p_amount numeric, p_note text, p_actor uuid)
returns bigint
language plpgsql
as $$
declare
  v_id bigint;
begin
  perform 1 from public.agencies where id = p_agency for update;
  if not found then raise exception 'no_agency'; end if;
  if p_amount = 0 or not public.is_half_step(p_amount) then
    raise exception 'bad_step' using hint = 'Adjustments move in ₹0.5 Cr steps and cannot be zero.';
  end if;
  if length(btrim(coalesce(p_note, ''))) < 3 then
    raise exception 'reason_required' using hint = 'Say why: every adjustment needs a note.';
  end if;
  insert into public.ledger_entries (agency_id, amount, reason, ref, note, created_by)
  values (p_agency, p_amount, 'adjustment', 'manual', btrim(p_note), p_actor)
  returning id into v_id;
  return v_id;
end;
$$;

-- ---------------------------------------------------------------- lockdown

do $$
declare
  f text;
begin
  foreach f in array array[
    'fund_left(text)', 'lock_active_agency(text)', 'round1_state()', 'missing_categories(text)',
    'r1_start_funds(uuid)', 'r1_shuffle_lots()', 'r1_record_sale(text, text, numeric, uuid)',
    'r1_set_news_draw(text[])', 'r1_buy_tip(text, uuid, text)', 'r1_reveal_next_news()',
    'r1_reveal_team_ups()', 'r1_apply_jugaad(uuid)', 'r1_lock()',
    'ledger_void(bigint, text, uuid)', 'ledger_undo_last(uuid, text)', 'ledger_adjust(text, numeric, text, uuid)']
  loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to service_role', f);
  end loop;
end;
$$;
