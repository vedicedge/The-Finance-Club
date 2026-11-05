-- Doomsday — scoring maths that must match lib/scoring exactly.
-- tests/db/parity.test.ts checks these against the TypeScript versions over every tenth of a second.

-- Response time t: seconds from question open to answer received, both stamped by the database,
-- rounded to 0.1 s (half up).
create or replace function public.response_time_s(p_opened timestamptz, p_received timestamptz)
returns numeric
language sql
immutable
as $$
  select round(extract(epoch from (p_received - p_opened))::numeric, 1)
$$;

-- Prelim points (spec: Prelim quiz engine, step 3):
--   points = round(1000 × W × (1 − t ÷ 2T)) if correct and t ≤ T, else 0; halves round up.
-- Numeric arithmetic is exact here (t has one decimal; 2T is 20 or 40), so floor(x + 0.5)
-- is the same as Math.floor(x + 0.5) on exact values.
create or replace function public.quiz_points(p_t numeric, p_timer_s integer, p_weight integer, p_correct boolean)
returns integer
language sql
immutable
as $$
  select case
           when not coalesce(p_correct, false) then 0
           when p_t is null or p_t < 0 or p_t > p_timer_s then 0
           else floor(1000 * p_weight * (1 - p_t / (2 * p_timer_s)) + 0.5)::integer
         end
$$;

-- Tower Score parts (spec: Round 2). Used by v_tower_scores; kept here for tests.
create or replace function public.tower_score(
  p_correct integer, p_reference integer, p_build_time_s integer, p_frozen integer, p_fallen integer)
returns numeric
language sql
immutable
as $$
  select ((100.0 * p_correct / p_reference)
          + (100.0 * (1 - least(p_build_time_s, 600) / 600.0))
          + (case when p_frozen = 0 then 0 else 100.0 * p_fallen / p_frozen end)) / 3
$$;

-- Hero Score = Power Level × multiplier + Fund left ÷ 2 (spec: Core rules).
create or replace function public.hero_score(p_power_level integer, p_multiplier numeric, p_fund_left numeric)
returns numeric
language sql
immutable
as $$
  select p_power_level * p_multiplier + p_fund_left / 2
$$;
