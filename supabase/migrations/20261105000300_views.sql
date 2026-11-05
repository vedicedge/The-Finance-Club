-- Doomsday — derived values. Nothing here is stored by hand; every number comes from the
-- event tables and the append-only ledger (spec: "Derived values").
--
-- These views are for server code only (no browser grants; see the security migration).
-- Views whose names start with v_public_ never expose a secret column, so they are the
-- only ones code serving public pages should read.

-- ---------------------------------------------------------------- ledger and fund

create view public.v_ledger as
select e.id,
       e.agency_id,
       e.amount,
       e.reason,
       e.ref,
       e.note,
       e.txn_id,
       e.created_by,
       e.created_at,
       (v.entry_id is not null) as voided,
       v.reason                 as void_reason,
       v.created_at             as voided_at
  from public.ledger_entries e
  left join public.ledger_voids v on v.entry_id = e.id;

-- Fund left = sum of non-voided ledger entries.
create view public.v_fund_left as
select a.id as agency_id,
       coalesce(sum(e.amount) filter (where v.entry_id is null and e.id is not null), 0)::numeric(6, 1)
         as fund_left
  from public.agencies a
  left join public.ledger_entries e on e.agency_id = a.id
  left join public.ledger_voids v on v.entry_id = e.id
 group by a.id;

-- ---------------------------------------------------------------- gear and Power Level

create view public.v_held_gear as
select s.agency_id,
       s.category,
       s.card_id,
       g.gear_name,
       g.power,
       s.price,
       s.phase,
       s.sold_at,
       s.id as sale_id
  from public.sales s
  join public.gear_cards g on g.id = s.card_id
 where s.voided_at is null;

-- Power Level = Power of held cards + 3 per matched Team-Up + revealed news deltas on held gear.
-- Team-Ups and news only count once revealed, so the Power Level is fixed after Round 1.
create view public.v_power_level as
with gear as (
  select agency_id, count(*) as cards, sum(power) as gear_power
    from public.v_held_gear
   group by agency_id
), news as (
  select h.agency_id, sum(n.delta) as news_delta
    from public.v_held_gear h
    join public.breaking_news n on n.affects_gear = h.gear_name and n.revealed_at is not null
   group by h.agency_id
), team as (
  select a.agency_id, sum(t.bonus) as team_up_bonus
    from public.team_ups t
    join public.v_held_gear a on a.gear_name = t.gear_a
    join public.v_held_gear b on b.gear_name = t.gear_b and b.agency_id = a.agency_id
   where t.revealed_at is not null
   group by a.agency_id
)
select ag.id                                   as agency_id,
       coalesce(gear.cards, 0)::integer        as cards,
       coalesce(gear.gear_power, 0)::integer   as gear_power,
       coalesce(team.team_up_bonus, 0)::integer as team_up_bonus,
       coalesce(news.news_delta, 0)::integer   as news_delta,
       (coalesce(gear.gear_power, 0) + coalesce(team.team_up_bonus, 0) + coalesce(news.news_delta, 0))::integer
         as power_level
  from public.agencies ag
  left join gear on gear.agency_id = ag.id
  left join news on news.agency_id = ag.id
  left join team on team.agency_id = ag.id;

-- ---------------------------------------------------------------- prelim

-- Totals over scored questions (void questions and sudden death excluded).
create view public.v_prelim_scores as
select a.id                                                          as agency_id,
       coalesce(sum(ans.points), 0)::integer                          as total_points,
       (count(ans.question_id) filter (where ans.is_correct))::integer as correct_count,
       coalesce(sum(ans.response_time_s) filter (where ans.is_correct), 0)::numeric(7, 1)
                                                                      as correct_time_s,
       count(ans.question_id)::integer                                 as answered
  from public.agencies a
  left join public.answers ans
         on ans.agency_id = a.id
        and exists (select 1 from public.questions q
                     where q.id = ans.question_id and q.status <> 'void' and q.segment <> 'sudden_death')
 group by a.id;

-- ---------------------------------------------------------------- Round 2

-- Unrounded A, S, D and Tower Score (rank on the unrounded value).
create view public.v_tower_scores as
select t.agency_id,
       (100.0 * t.correct_blocks / t.reference_blocks)                              as accuracy,
       (100.0 * (1 - t.build_time_s / 600.0))                                       as speed,
       (case when t.frozen_blocks = 0 then 0
             else 100.0 * t.blocks_fallen / t.frozen_blocks end)                   as destruction,
       ((100.0 * t.correct_blocks / t.reference_blocks)
        + (100.0 * (1 - t.build_time_s / 600.0))
        + (case when t.frozen_blocks = 0 then 0
                else 100.0 * t.blocks_fallen / t.frozen_blocks end)) / 3            as tower_score,
       t.cutoff_rank,
       t.published
  from public.tower_results t;

-- ---------------------------------------------------------------- Round 3 and Zero Hour

-- Who holds each envelope: the latest non-voided move.
create view public.v_envelope_holders as
select e.id as envelope_id,
       m.to_agency as holder_agency_id
  from public.envelopes e
  left join lateral (
        select mv.to_agency
          from public.envelope_moves mv
         where mv.envelope_id = e.id and mv.voided_at is null
         order by mv.id desc
         limit 1) m on true;

-- Hero Score, only for envelopes already revealed at Zero Hour.
create view public.v_hero_scores as
select r.reveal_order,
       r.envelope_id,
       r.revealed_at,
       h.holder_agency_id                      as agency_id,
       bo.label                                as outcome_label,
       bo.multiplier,
       p.power_level,
       f.fund_left,
       (p.power_level * bo.multiplier + f.fund_left / 2) as hero_score
  from public.reveals r
  join public.v_envelope_holders h on h.envelope_id = r.envelope_id
  join public.envelope_contents ec on ec.envelope_id = r.envelope_id
  join public.battle_outcomes bo on bo.label = ec.outcome_label
  join public.v_power_level p on p.agency_id = h.holder_agency_id
  join public.v_fund_left f on f.agency_id = h.holder_agency_id;

-- ---------------------------------------------------------------- safe-for-public views

create view public.v_public_agencies as
select id, name, status, eliminated_in
  from public.agencies;

create view public.v_public_news as
select id, headline, affects_gear, delta, draw_order, revealed_at
  from public.breaking_news
 where revealed_at is not null;

create view public.v_public_team_ups as
select id, name, gear_a, gear_b, bonus, revealed_at
  from public.team_ups
 where revealed_at is not null;

create view public.v_public_missions as
select no, name, winner_agency_id, choice,
       case when choice = 'swap' then swap_target end as swap_target,
       decided_at
  from public.missions;
