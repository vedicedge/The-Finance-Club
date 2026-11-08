-- Doomsday — 8 November: a Jugaad Kit for every missing category.
--
-- After Last Call, an agency still missing cards gets one Jugaad Kit (Power 2, ₹8 Cr) for EACH
-- missing category: missing two means two kits for ₹16 Cr. An agency that cannot pay for all the
-- kits it needs (₹8 Cr × missing categories) is eliminated in Round 1, as before. Before this,
-- missing two or more categories meant elimination.
--
-- There are 4 Jugaad Kit cards (JK1–JK4). With 15 cards per category and 16 agencies, four kits
-- cover every case where the auction sells all its cards. If more are ever needed, the button stops
-- with a message and nothing is applied (an admin can add JK5 in the SQL editor and press again).
--
-- Safe to run more than once.

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

    -- ₹8 Cr for every missing category, or out.
    v_fund := public.fund_left(a.id);
    if v_fund < 8 * cardinality(v_miss) then
      update public.agencies set status = 'eliminated', eliminated_in = 'round1' where id = a.id;
      v_out := v_out || jsonb_build_object('agency', a.id, 'action', 'eliminated', 'missing', to_jsonb(v_miss),
                                           'fund', v_fund);
      continue;
    end if;

    foreach v_cat in array v_miss loop
      select g.id into v_card
        from public.gear_cards g
       where g.phase = 'jugaad'
         and not exists (select 1 from public.sales s where s.card_id = g.id and s.voided_at is null)
       order by g.id
       limit 1
       for update;
      if v_card is null then
        raise exception 'no_jugaad_kit_left'
          using hint = 'All Jugaad Kits are used, so nothing was applied. An admin can add JK5 (and more) in the Supabase SQL editor, then press the button again.';
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

revoke all on function public.r1_apply_jugaad(uuid) from public, anon, authenticated;
grant execute on function public.r1_apply_jugaad(uuid) to service_role;

-- ---------------------------------------------------------------- version

create or replace function public.schema_version()
returns text
language sql
immutable
as $$ select '20261108001900'::text $$;

revoke all on function public.schema_version() from public, anon, authenticated;
grant execute on function public.schema_version() to service_role;
