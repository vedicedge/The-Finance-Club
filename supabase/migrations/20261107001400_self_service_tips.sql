-- Self-service Insider Tips (organisers' request, 7 Nov 2026).
--
-- The ledger keeper opens a timed Insider Tips window (1 minute on the site). While it is open,
-- each agency in the game may buy one tip for ₹2 Cr from its own My Agency page; the site
-- picks one of the 6 drawn Breaking News cards at random and shows it only to that agency.
-- The window is measured in database time, so every phone gets the same minute. The price,
-- the one-tip limit and the ledger entry are unchanged: both paths go through r1_buy_tip.
-- An organiser can still record a tip from the console while the step is Insider Tips
-- (e.g. for an agency whose phone died).

alter table public.event_state add column if not exists tips_closes_at timestamptz;

-- ---------------------------------------------------------------- open the window

create or replace function public.r1_open_tips_window(p_seconds integer, p_actor uuid)
returns timestamptz
language plpgsql
as $$
declare
  v_close timestamptz;
begin
  perform public.round1_state();
  if p_seconds is null or p_seconds not between 10 and 600 then
    raise exception 'bad_window' using hint = 'The window must be 10 s to 10 min long.';
  end if;
  if not exists (select 1 from public.v_ledger where reason = 'start_fund' and not voided) then
    raise exception 'funds_not_started' using hint = 'Credit the starting funds first.';
  end if;
  if not exists (select 1 from public.breaking_news where draw_order is not null) then
    raise exception 'news_not_drawn' using hint = 'Enter the 6 drawn Breaking News cards first.';
  end if;
  v_close := clock_timestamp() + make_interval(secs => p_seconds);
  update public.event_state
     set step = 'tips', tips_closes_at = v_close, updated_at = clock_timestamp(), updated_by = p_actor
   where id;
  return v_close;
end;
$$;

-- ---------------------------------------------------------------- an agency buys its own tip

create or replace function public.r1_agency_buy_tip(p_token_hash text)
returns text
language plpgsql
as $$
declare
  v_agency text;
  v        public.event_state%rowtype;
  v_news   text;
begin
  v_agency := public.session_agency(p_token_hash);
  if v_agency is null then raise exception 'not_signed_in'; end if;
  select * into v from public.event_state where id;
  if v.phase <> 'round1' or v.round1_locked_at is not null or v.step is distinct from 'tips'
     or v.tips_closes_at is null or clock_timestamp() > v.tips_closes_at then
    raise exception 'tips_closed' using hint = 'The Insider Tips window is closed.';
  end if;
  -- Always one of the drawn cards at random here, whatever the console's assignment setting.
  select id into v_news from public.breaking_news where draw_order is not null order by random() limit 1;
  return public.r1_buy_tip(v_agency, null, v_news);
end;
$$;

-- ---------------------------------------------------------------- lockdown

do $$
declare
  f text;
begin
  foreach f in array array['r1_open_tips_window(integer, uuid)', 'r1_agency_buy_tip(text)']
  loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to service_role', f);
  end loop;
end;
$$;
