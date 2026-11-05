-- Doomsday — amendments agreed with the organisers on 5 Nov 2026 (docs/event-spec.md, "Amendments").
--
--   A1. No Fan Club. Eliminated agencies are simply eliminated (status 'eliminated' with
--       eliminated_in); there is no top-3 prediction and no Biggest Fan lucky draw.
--   A2. Round 2A poster duels are voted on Instagram stories, so the counts the social-media
--       lead types in are story votes, not feed-post likes.
--   A3. Registration is for IMI students only: every founder email must be an @imi.edu address.

-- ---------------------------------------------------------------- A1. no Fan Club

update public.agencies set status = 'eliminated' where status = 'fan_club';
alter table public.agencies drop constraint agencies_status_check;
alter table public.agencies
  add constraint agencies_status_check
  check (status in ('registered', 'checked_in', 'active', 'eliminated'));

drop table public.predictions;

update public.event_state
   set settings = (settings #- '{predictions}') #- '{prizes,biggest_fan}';

-- ---------------------------------------------------------------- A2. story votes

alter table public.poster_duels rename column likes_a to votes_a;
alter table public.poster_duels rename column likes_b to votes_b;
alter table public.poster_duels rename constraint poster_duels_likes_a_check to poster_duels_votes_a_check;
alter table public.poster_duels rename constraint poster_duels_likes_b_check to poster_duels_votes_b_check;

-- ---------------------------------------------------------------- A3. @imi.edu emails only

update public.event_state
   set settings = jsonb_set(
         jsonb_set(settings, '{registration,email_domain}', '"imi.edu"'),
         '{registration,email_hint}',
         '"Use your IMI email ID (ending in @imi.edu) for every founder. Other email addresses will not be accepted."');

-- Enforced in the database too, so no code path can register a non-IMI founder.
-- Clearing registration.email_domain in the settings turns the check off.
create or replace function public.guard_founder_email_domain()
returns trigger
language plpgsql
as $$
declare
  v_domain text;
begin
  select nullif(lower(btrim(settings #>> '{registration,email_domain}')), '')
    into v_domain
    from public.event_state;
  if v_domain is not null
     and right(lower(btrim(new.email)), length(v_domain) + 1) <> '@' || v_domain then
    raise exception 'Founder emails must be @% addresses (got %)', v_domain, new.email
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger founders_email_domain
  before insert or update of email on public.founders
  for each row execute function public.guard_founder_email_domain();

-- Same lockdown as every other function (see the security migration).
revoke all on function public.guard_founder_email_domain() from public, anon, authenticated;
grant execute on function public.guard_founder_email_domain() to service_role;
