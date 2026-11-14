-- Round 3: one Force Field per finalist for the whole round, bought privately on My Agency
-- during a 1-minute window the organisers open after the envelopes are dealt. It is played
-- once, whenever the agency chooses; the organisers mark it used. Safe to run more than once.

alter table public.force_fields alter column mission drop not null;  -- null: the one Round 3 Force Field
alter table public.force_fields add column if not exists used_at timestamptz;
alter table public.event_state add column if not exists ff_closes_at timestamptz;

-- Force Field rows stay void-only, except that the organisers may mark one used (or not).
create or replace function public.allow_void_only()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    raise exception '% rows are never deleted; void them instead', tg_table_name
      using errcode = 'insufficient_privilege';
  end if;
  if old.voided_at is not null then
    raise exception '% row % is already void', tg_table_name, old.id
      using errcode = 'insufficient_privilege';
  end if;
  if tg_table_name = 'force_fields' and new.voided_at is null
     and (to_jsonb(new) - 'used_at') = (to_jsonb(old) - 'used_at') then
    return new;
  end if;
  if new.voided_at is null
     or (to_jsonb(new) - 'voided_at') is distinct from (to_jsonb(old) - 'voided_at') then
    raise exception '% rows can only be voided, not edited', tg_table_name
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;

create or replace function public.r3_open_ff_window(p_seconds integer, p_actor uuid)
returns timestamptz
language plpgsql
as $$
declare
  v_close timestamptz;
begin
  if (select phase from public.event_state where id) <> 'round3' then
    raise exception 'not_round3' using hint = 'The Force Field window opens in Round 3.';
  end if;
  if p_seconds is null or p_seconds not between 10 and 600 then
    raise exception 'bad_window' using hint = 'The window must be 10 s to 10 min long.';
  end if;
  v_close := clock_timestamp() + make_interval(secs => p_seconds);
  update public.event_state set ff_closes_at = v_close, updated_at = clock_timestamp(), updated_by = p_actor where id;
  return v_close;
end;
$$;

create or replace function public.r3_agency_buy_ff(p_token_hash text)
returns void
language plpgsql
as $$
declare
  v_agency text;
  v_close  timestamptz;
  led      bigint;
begin
  v_agency := public.session_agency(p_token_hash);
  if v_agency is null then raise exception 'not_signed_in'; end if;
  select ff_closes_at into v_close from public.event_state where id and phase = 'round3';
  if v_close is null or clock_timestamp() > v_close then
    raise exception 'ff_closed' using hint = 'The Force Field window is closed.';
  end if;
  perform public.lock_active_agency(v_agency);
  if exists (select 1 from public.force_fields where agency_id = v_agency and voided_at is null) then
    raise exception 'ff_already_bought' using hint = 'Your agency already has its Force Field.';
  end if;
  if public.fund_left(v_agency) < 5 then
    raise exception 'insufficient_fund' using hint = 'A Force Field costs ₹5 Cr.';
  end if;
  insert into public.ledger_entries (agency_id, amount, reason, ref, note)
  values (v_agency, -5, 'force_field', 'r3:force_field', 'Force Field (Round 3)')
  returning id into led;
  insert into public.force_fields (agency_id, mission, ledger_entry_id) values (v_agency, null, led);
end;
$$;

create or replace function public.r3_set_ff_used(p_agency text, p_used boolean, p_actor uuid)
returns void
language plpgsql
as $$
begin
  if (select phase from public.event_state where id) not in ('round3', 'zero_hour') then
    raise exception 'not_round3' using hint = 'Force Fields are played in Round 3 or at Zero Hour.';
  end if;
  update public.force_fields set used_at = case when p_used then clock_timestamp() end
   where agency_id = p_agency and voided_at is null;
  if not found then raise exception 'no_force_field' using hint = format('%s has no Force Field.', p_agency); end if;
end;
$$;

do $$
declare
  f text;
begin
  foreach f in array array['r3_open_ff_window(integer, uuid)', 'r3_agency_buy_ff(text)', 'r3_set_ff_used(text, boolean, uuid)']
  loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to service_role', f);
  end loop;
end;
$$;

create or replace function public.schema_version()
returns text
language sql
immutable
as $$ select '20261111002400'::text $$;
