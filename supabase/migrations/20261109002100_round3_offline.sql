-- Round 3 runs offline. The site only records Chai Pe Charcha transfers, fines and, at the end,
-- who holds which envelope; Zero Hour then calculates the results and the anchor announces
-- 3rd, 2nd and 1st place one at a time.
-- Safe to run more than once.

-- 1. Transfers any time during Round 3 (there is no mission cycle on the site any more).
create or replace function public.r3_transfer(p_from text, p_to text, p_amount numeric, p_note text, p_actor uuid)
returns uuid
language plpgsql
as $$
declare
  txn uuid := gen_random_uuid();
begin
  if (select phase from public.event_state) <> 'round3' then
    raise exception 'window_closed' using hint = 'Transfers are recorded during Round 3.';
  end if;
  if p_from = p_to then raise exception 'same_agency'; end if;
  if p_amount is null or p_amount <= 0 or not public.is_half_step(p_amount) then
    raise exception 'bad_step' using hint = 'Transfers move in ₹0.5 Cr steps.';
  end if;
  perform public.lock_active_agency(least(p_from, p_to));
  perform public.lock_active_agency(greatest(p_from, p_to));
  if public.fund_left(p_from) < p_amount then
    raise exception 'insufficient_fund' using hint = format('%s has only ₹%s Cr.', p_from, public.fund_left(p_from));
  end if;
  insert into public.ledger_entries (agency_id, amount, reason, ref, note, txn_id, created_by) values
    (p_from, -p_amount, 'transfer', 'to:' || p_to, nullif(btrim(coalesce(p_note, '')), ''), txn, p_actor),
    (p_to, p_amount, 'transfer', 'from:' || p_from, nullif(btrim(coalesce(p_note, '')), ''), txn, p_actor);
  return txn;
end;
$$;

-- 2. Who holds which envelope: recorded at the end of Round 3 (or at Zero Hour before the
--    results are calculated), and correctable until then.
create or replace function public.r3_deal(p_map jsonb, p_actor uuid)
returns void
language plpgsql
as $$
declare
  v_final integer;
begin
  if (select phase from public.event_state) not in ('round3', 'zero_hour') then
    raise exception 'not_round3' using hint = 'Envelopes are recorded in Round 3 or at Zero Hour.';
  end if;
  if exists (select 1 from public.reveals) then
    raise exception 'reveal_started' using hint = 'The results are calculated; the envelopes are final.';
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

-- 3. The projector's Round 3 cover.
alter table public.event_state drop constraint if exists event_state_projector_check;
alter table public.event_state add constraint event_state_projector_check
  check (projector in ('auto', 'welcome', 'quiz', 'auction', 'board', 'cover', 'reveal', 'holding', 'blank'));

create or replace function public.schema_version()
returns text
language sql
immutable
as $$ select '20261109002100'::text $$;
