-- Round 2 can send the top 8 (the spec) or the top 10 to Round 3, chosen at publish time.
-- Adds envelopes E9 and E10; the map and the results use only the envelopes in play.
-- Safe to run more than once.

alter table public.envelopes drop constraint if exists envelopes_id_check;
alter table public.envelopes add constraint envelopes_id_check check (id ~ '^E([1-9]|10)$');
insert into public.envelopes (id) values ('E9'), ('E10') on conflict do nothing;

drop function if exists public.r2_publish(text[], uuid);
create or replace function public.r2_publish(p_qualifiers text[], p_actor uuid, p_top integer default 8)
returns void
language plpgsql
as $$
declare
  v_active   integer;
  v_missing  text;
  v_undec    text;
begin
  if p_top not in (8, 10) then raise exception 'bad_qualifiers' using hint = 'Send the top 8 or the top 10.'; end if;
  perform 1 from public.event_state for update;
  perform public.round2_state();
  select count(*) into v_active from public.agencies where status = 'active';
  select string_agg(a.id, ', ' order by a.id) into v_missing
    from public.agencies a
   where a.status = 'active' and not exists (select 1 from public.tower_results t where t.agency_id = a.id);
  if v_missing is not null then
    raise exception 'tower_missing' using hint = format('No tower result yet for %s.', v_missing);
  end if;
  if not exists (select 1 from public.poster_duels) then
    raise exception 'no_duels' using hint = 'Draw the poster duel pairings first.';
  end if;
  select string_agg(coalesce(agency_a || ' v ' || agency_b, agency_a), ', ') into v_undec
    from public.poster_duels where winner is null;
  if v_undec is not null then
    raise exception 'duel_undecided' using hint = format('Enter votes for: %s.', v_undec);
  end if;
  if coalesce(array_length(p_qualifiers, 1), 0) <> least(p_top, v_active)
     or (select count(*) from public.agencies where status = 'active' and id = any (p_qualifiers)) <> least(p_top, v_active) then
    raise exception 'bad_qualifiers';
  end if;

  insert into public.ledger_entries (agency_id, amount, reason, ref, note, created_by)
  select d.winner, 5, 'poster_bonus', 'duel:' || d.id,
         case when d.agency_b is null then 'Poster duel bye' else 'Poster duel won' end, p_actor
    from public.poster_duels d
   where d.winner = any (p_qualifiers);

  update public.agencies set status = 'eliminated', eliminated_in = 'round2'
   where status = 'active' and not (id = any (p_qualifiers));
  update public.tower_results set published = true where true;
  update public.event_state set round2_published_at = clock_timestamp() where id;
end;
$$;
revoke all on function public.r2_publish(text[], uuid, integer) from public, anon, authenticated;
grant execute on function public.r2_publish(text[], uuid, integer) to service_role;

-- The map: one outcome for each envelope given (8 to 10 of E1–E10).
create or replace function public.r3_set_envelope_contents(p_map jsonb, p_actor uuid)
returns void
language plpgsql
as $$
declare
  n integer := (select count(*) from jsonb_object_keys(p_map));
begin
  if exists (select 1 from public.reveals) then
    raise exception 'reveal_started' using hint = 'Envelopes are being opened; the map is final.';
  end if;
  if n not between 8 and 10 or (select count(*) from jsonb_each_text(p_map) m join public.envelopes e on e.id = m.key
        join public.battle_outcomes b on b.label = m.value) <> n then
    raise exception 'bad_map' using hint = 'Give each envelope in play one Battle Outcome.';
  end if;
  delete from public.envelope_contents where true;
  insert into public.envelope_contents (envelope_id, outcome_label, entered_by)
  select key, value, p_actor from jsonb_each_text(p_map);
end;
$$;

-- The results: every envelope a finalist holds must be in the map.
create or replace function public.zh_next_reveal(p_actor uuid)
returns text
language plpgsql
as $$
declare
  v_env text;
begin
  perform 1 from public.event_state for update;
  if (select phase from public.event_state) <> 'zero_hour' then
    raise exception 'not_zero_hour' using hint = 'Switch the event to Zero Hour first.';
  end if;
  if exists (select 1 from public.v_envelope_holders h where h.holder_agency_id is not null
               and not exists (select 1 from public.envelope_contents c where c.envelope_id = h.envelope_id)) then
    raise exception 'multipliers_missing' using hint = 'An envelope a finalist holds is not in the multiplier map.';
  end if;
  select h.envelope_id into v_env
    from public.v_envelope_holders h
    join public.v_power_level p on p.agency_id = h.holder_agency_id
   where h.holder_agency_id is not null
     and not exists (select 1 from public.reveals r where r.envelope_id = h.envelope_id)
   order by p.power_level asc, h.holder_agency_id asc
   limit 1;
  if v_env is null then raise exception 'all_revealed' using hint = 'Every envelope is open.'; end if;
  insert into public.reveals (envelope_id, reveal_order, created_by)
  values (v_env, (select count(*) + 1 from public.reveals), p_actor);
  return v_env;
end;
$$;

create or replace function public.schema_version()
returns text
language sql
immutable
as $$ select '20261110002300'::text $$;
