-- The multiplier map takes any outcome in any envelope (no fixed counts). Safe to run more than once.
create or replace function public.r3_set_envelope_contents(p_map jsonb, p_actor uuid)
returns void
language plpgsql
as $$
begin
  if exists (select 1 from public.reveals) then
    raise exception 'reveal_started' using hint = 'Envelopes are being opened; the map is final.';
  end if;
  if (select count(*) from jsonb_each_text(p_map) m join public.envelopes e on e.id = m.key
        join public.battle_outcomes b on b.label = m.value) <> 8
     or (select count(*) from jsonb_object_keys(p_map)) <> 8 then
    raise exception 'bad_map' using hint = 'Give each of E1–E8 one Battle Outcome.';
  end if;
  delete from public.envelope_contents where true;
  insert into public.envelope_contents (envelope_id, outcome_label, entered_by)
  select key, value, p_actor from jsonb_each_text(p_map);
end;
$$;


create or replace function public.schema_version()
returns text
language sql
immutable
as $$ select '20261109002200'::text $$;
