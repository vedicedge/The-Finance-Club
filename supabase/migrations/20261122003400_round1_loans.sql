-- Doomsday — 22 November: Round 1 loans. No team is eliminated in the Power Bazaar. A bid or a
-- sale above a team's fund left is allowed, and Jugaad Kits are always given: the shortfall is a
-- loan from The Finance Club, shown as a negative fund. It counts in the Hero Score (fund ÷ 2),
-- so a loan lowers the final score. Safe to run more than once.

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
  -- No fund check: a price above the fund left becomes a loan from The Finance Club (negative fund).

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
  -- A bid above the fund left is allowed: the difference becomes a loan from The Finance Club.
  insert into public.blind_bids (card_id, agency_id, amount, placed_at)
  values (c.id, v_agency, p_amount, clock_timestamp())
  on conflict (card_id, agency_id) do update set amount = excluded.amount, placed_at = excluded.placed_at;
end;
$$;

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
       and not exists (select 1 from public.sales s where s.agency_id = bb.agency_id and s.category = c.category and s.voided_at is null)
     order by bb.amount desc, bb.placed_at asc, bb.agency_id asc
  loop
    perform public.r1_record_sale(c.id, b.agency_id, b.amount, p_actor);
    return b.agency_id;
  end loop;
  return null;
end;
$$;

create or replace function public.r1_apply_jugaad(p_actor uuid)
returns jsonb
language plpgsql
as $$
declare
  v       public.event_state%rowtype;
  a       record;
  v_miss  text[];
  v_cat   text;
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

    -- ₹8 Cr for every missing category. Nobody is eliminated: a team short of funds takes the
    -- difference as a loan from The Finance Club (its fund goes below zero).

    foreach v_cat in array v_miss loop
      select g.id into v_card
        from public.gear_cards g
       where g.phase = 'jugaad'
         and not exists (select 1 from public.sales s where s.card_id = g.id and s.voided_at is null)
       order by length(g.id), g.id
       limit 1
       for update;
      if v_card is null then
        raise exception 'no_jugaad_kit_left'
          using hint = 'All Jugaad Kits are used, so nothing was applied. An admin can add more (JK65 and up) in the Supabase SQL editor, then press the button again.';
      end if;

      insert into public.ledger_entries (agency_id, amount, reason, ref, note, created_by)
      values (a.id, -8, 'jugaad_kit', 'card:' || v_card, 'Jugaad Kit for ' || v_cat, p_actor)
      returning id into v_led;
      insert into public.sales (card_id, agency_id, category, price, phase, ledger_entry_id, created_by)
      values (v_card, a.id, v_cat, 8, 'jugaad', v_led, p_actor);
      v_out := v_out || jsonb_build_object('agency', a.id, 'action', 'jugaad_kit', 'category', v_cat, 'card', v_card);
    end loop;
  end loop;
  return v_out;
end;
$$;

revoke all on function public.r1_record_sale(text, text, numeric, uuid) from public, anon, authenticated;
grant execute on function public.r1_record_sale(text, text, numeric, uuid) to service_role;
revoke all on function public.r1_agency_bid(text, numeric) from public, anon, authenticated;
grant execute on function public.r1_agency_bid(text, numeric) to service_role;
revoke all on function public.r1_apply_jugaad(uuid) from public, anon, authenticated;
grant execute on function public.r1_apply_jugaad(uuid) to service_role;
revoke all on function public.r1_settle_bidding(uuid) from public, anon, authenticated;
grant execute on function public.r1_settle_bidding(uuid) to service_role;

-- ---------------------------------------------------------------- version

create or replace function public.schema_version()
returns text
language sql
immutable
as $$ select '20261122003400'::text $$;

revoke all on function public.schema_version() from public, anon, authenticated;
grant execute on function public.schema_version() to service_role;
