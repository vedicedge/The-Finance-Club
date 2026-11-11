-- Settings → Questions & cards: an admin uploads an Excel workbook that adds or replaces prelim
-- questions (with their secret answers) and Power Bazaar gear cards. All or nothing.
-- Safe to run more than once.

create or replace function public.admin_import_content(p_questions jsonb, p_cards jsonb, p_actor uuid)
returns jsonb
language plpgsql
as $$
declare
  v_phase text := (select phase from public.event_state where id);
  v_live  integer;
  nq      integer := coalesce(jsonb_array_length(p_questions), 0);
  nc      integer := coalesce(jsonb_array_length(p_cards), 0);
begin
  perform 1 from public.event_state where id for update;
  if nq > 0 then
    if public.quiz_has_started() then
      raise exception 'quiz_started' using hint = 'Questions can be changed only before the first prelim question opens.';
    end if;
    insert into public.questions (id, segment, side, prompt, options, timer_s, weight, is_live)
    select q.id, q.segment, q.side, q.prompt, q.options, q.timer_s, q.weight, q.is_live
      from jsonb_to_recordset(p_questions)
        as q(id text, segment text, side text, prompt text, options text[], timer_s smallint, weight smallint, is_live boolean)
    on conflict (id) do update
       set segment = excluded.segment, side = excluded.side, prompt = excluded.prompt, options = excluded.options,
           timer_s = excluded.timer_s, weight = excluded.weight, is_live = excluded.is_live;
    insert into public.question_keys (question_id, correct_index, working)
    select q.id, q.correct_index, q.working
      from jsonb_to_recordset(p_questions) as q(id text, correct_index smallint, working text)
    on conflict (question_id) do update set correct_index = excluded.correct_index, working = excluded.working;
    -- The live set may have changed: the quiz host shuffles again.
    update public.questions set order_no = null, replaces_id = null where true;
    select count(*) into v_live from public.questions where is_live and segment <> 'sudden_death';
    if v_live <> 15 then
      raise exception 'live_set_size' using hint = format('Exactly 15 questions must be live (Live = Yes); the upload would make %s.', v_live);
    end if;
  end if;
  if nc > 0 then
    if v_phase in ('round1', 'round2', 'round3', 'zero_hour', 'ended') or exists (select 1 from public.sales) then
      raise exception 'auction_started' using hint = 'Cards can be changed only before Round 1 starts.';
    end if;
    insert into public.gear_cards (id, category, card_name, series_name, gear_name, power, min_bid, phase)
    select c.id, c.category, c.card_name, c.series_name, c.gear_name, c.power, c.min_bid, c.phase
      from jsonb_to_recordset(p_cards)
        as c(id text, category text, card_name text, series_name text, gear_name text, power smallint, min_bid numeric, phase text)
    on conflict (id) do update
       set category = excluded.category, card_name = excluded.card_name, series_name = excluded.series_name,
           gear_name = excluded.gear_name, power = excluded.power, min_bid = excluded.min_bid, phase = excluded.phase;
  end if;
  return jsonb_build_object('questions', nq, 'cards', nc);
end;
$$;

revoke all on function public.admin_import_content(jsonb, jsonb, uuid) from public, anon, authenticated;
grant execute on function public.admin_import_content(jsonb, jsonb, uuid) to service_role;

create or replace function public.schema_version()
returns text
language sql
immutable
as $$ select '20261111002500'::text $$;
