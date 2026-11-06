import { describe, expect, it } from 'vitest';
import { agency, hasDb, hasSecrets, sql } from './helpers';

/**
 * The whole evening, in the database, the way the crew will run it:
 *   1. a dry run with name-only test agencies while two real teams are registered,
 *   2. Settings → Danger zone → reset with "keep registrations", then End dry run mode,
 *   3. the real event with 18 agencies, from registration to the last envelope.
 * Every console action is the same database function the site calls. Lines starting
 * "chk" are the checkpoints; everything else the functions print is ignored.
 * Needs the secret seed (questions, keys, news, Team-Ups), like the quiz tests.
 */

const K = '00000000-0000-0000-0000-0000000000a1';
const MAP = `'{"E1":"City saved, statue unveiled","E2":"Trending #1 across India","E3":"Clean win, zero damage","E4":"Clean win, zero damage","E5":"Saved the day, just about","E6":"₹100 crore property damage bill","E7":"₹100 crore property damage bill","E8":"Villain escaped"}'::jsonb`;

/** The n-th (0-based) agency still in the game, in ID order. */
const nth = (n: number) => `(select id from agencies where status = 'active' order by id offset ${n} limit 1)`;
const fund = (who: string) => `fund_left(${who})`;

/** Prelim: every checked-in agency answers every live question; answer speed and accuracy vary by agency. */
const prelim = `
  update event_state set phase = 'prelim', settings = jsonb_set(settings, '{prelim,lead_in_seconds}', '0');
  select quiz_shuffle();
  do $$
  declare q record; a record; k smallint; n integer := 0;
  begin
    for q in select id, timer_s from questions where order_no is not null order by order_no loop
      perform quiz_open_question(q.id);
      select correct_index into k from question_keys where question_id = q.id;
      for a in select s.token_hash, row_number() over (order by s.agency_id) as rn
                 from agency_sessions s join agencies g on g.id = s.agency_id
                where g.status = 'checked_in' and s.revoked_at is null loop
        -- Agency number rn answers after 0.5 + 0.2·rn seconds; every third answer (rotating) is wrong.
        update questions set opened_at = clock_timestamp() - make_interval(secs => 0.5 + 0.2 * a.rn) where id = q.id;
        perform quiz_submit_answer(a.token_hash, q.id, case when (a.rn + n) % 3 = 0 then ((k + 1) % 2)::integer else k end);
      end loop;
      update questions set opened_at = clock_timestamp() - make_interval(secs => q.timer_s + 1) where id = q.id;
      perform quiz_reveal_question(q.id);
      n := n + 1;
    end loop;
  end $$;
  select quiz_publish_board();
  -- The host freezes the board's top 16 (here: most points, then fastest; agencies of the current kind).
  select quiz_freeze_top16(array(
    select p.agency_id from v_prelim_scores p join agencies a on a.id = p.agency_id
     where a.is_test = coalesce((select (settings #>> '{dry_run,enabled}')::boolean from event_state), false)
       and a.status = 'checked_in'
     order by p.total_points desc, p.correct_time_s, p.agency_id limit 16));`;

/**
 * Round 1: start funds, news draw, one tip, Marquee (8 lots to the first 8 agencies), secret
 * bids at the minimum until each category runs out. The 3rd agency passes on Sidekicks (→ Jugaad
 * Kit); with 16 agencies the cards run out for the last one (→ eliminated).
 */
const round1 = `
  update event_state set phase = 'round1', step = 'rules';
  select r1_start_funds('${K}');
  select r1_set_news_draw(array(select id from breaking_news order by id limit 6));
  update event_state set step = 'tips';
  select r1_buy_tip(${nth(0)}, '${K}');
  select r1_shuffle_lots();
  update event_state set step = 'marquee';
  do $$
  declare c record; i integer := 0;
  begin
    for c in select id, min_bid from gear_cards where phase = 'marquee' order by lot_order loop
      perform r1_record_sale(c.id, (select id from agencies where status = 'active' order by id offset i limit 1), c.min_bid, '${K}');
      i := i + 1;
    end loop;
  end $$;
  update event_state set step = 'secret';
  do $$
  declare a record; c record; card record;
  begin
    for a in select id, row_number() over (order by id) as rn from agencies where status = 'active' order by id loop
      for c in select unnest(array['HQ', 'Suit', 'Gadget', 'Sidekick']) as category loop
        continue when exists (select 1 from sales where agency_id = a.id and category = c.category and voided_at is null);
        continue when a.rn = 3 and c.category = 'Sidekick';
        select g.id, g.min_bid into card from gear_cards g
         where g.phase = 'secret' and g.category = c.category
           and not exists (select 1 from sales s where s.card_id = g.id and s.voided_at is null)
         order by g.lot_order limit 1;
        continue when card.id is null;
        perform r1_record_sale(card.id, a.id, card.min_bid, '${K}');
      end loop;
    end loop;
  end $$;
  update event_state set step = 'last_call';
  update event_state set step = 'news';
  select r1_reveal_next_news() from generate_series(1, 6);
  select r1_reveal_team_ups();
  update event_state set step = 'ledger_check';
  select r1_apply_jugaad('${K}');
  select r1_lock();`;

/** Round 2: duels (side A wins), towers with distinct scores, publish the top 8. */
const round2 = `
  update event_state set phase = 'round2', step = null;
  select r2_draw_pairings();
  select r2_set_votes(id, 10, case when agency_b is null then null else 4 end, null) from poster_duels order by id;
  select r2_save_tower(id, 20 - (rn % 7)::integer, 20, (300 + rn * 7)::integer, 20, (5 + rn % 4)::integer, '${K}')
    from (select id, row_number() over (order by id) as rn from agencies where status = 'active') x;
  select r2_publish(array(
    select t.agency_id from v_tower_scores t join agencies a on a.id = t.agency_id
     where a.status = 'active' order by t.tower_score desc, t.agency_id limit 8), '${K}');`;

/** Round 3 and Zero Hour: four missions (Force Field, swap, X-Ray, cash, transfer, fine), then 8 reveals. */
const round3 = `
  update event_state set phase = 'round3', step = null;
  select r3_set_envelope_contents(${MAP}, '${K}');
  select r3_deal((select jsonb_object_agg(id, 'E' || rn) from (select id, row_number() over (order by id) as rn from agencies where status = 'active') x), '${K}');
  -- Mission 1: the 2nd finalist buys a Force Field; the 1st wins and swaps with the 3rd.
  select r3_set_mission(1, 'force_field'); select r3_force_field(${nth(1)}, '${K}');
  select r3_set_mission(1, 'play'); select r3_set_mission(1, 'results'); select r3_set_winner(1, ${nth(0)}, '${K}');
  select r3_set_mission(1, 'choice'); select r3_choose(1, 'swap', ${nth(2)}, '${K}');
  select r3_set_mission(1, 'chai'); select r3_transfer(${nth(4)}, ${nth(5)}, 2.5, 'information sale', '${K}');
  -- Mission 2: the 4th wins and X-Rays the 5th. Mission 3: the 6th wins and takes ₹6 Cr.
  select r3_set_mission(2, 'force_field'); select r3_set_mission(2, 'results'); select r3_set_winner(2, ${nth(3)}, '${K}');
  select r3_set_mission(2, 'choice'); select r3_choose(2, 'xray', ${nth(4)}, '${K}');
  select r3_set_mission(3, 'results'); select r3_set_winner(3, ${nth(5)}, '${K}');
  select r3_set_mission(3, 'choice'); select r3_choose(3, 'cash', null, '${K}');
  select r3_fine(${nth(6)}, 'opened another agency''s envelope', '${K}');
  -- Mission 4: the 8th wins; the choice (a swap with the 2nd) is made at the start of Zero Hour.
  select r3_set_mission(4, 'force_field'); select r3_set_mission(4, 'results'); select r3_set_winner(4, ${nth(7)}, '${K}');
  update event_state set phase = 'zero_hour', step = null;
  select r3_choose(4, 'swap', ${nth(1)}, '${K}');
  select zh_next_reveal('${K}') from generate_series(1, 8);
  update event_state set phase = 'ended';`;

/** Checkpoints after a full run. */
const finalChecks = (label: string) => `
  select 'chk ${label} statuses', string_agg(status || coalesce('/' || eliminated_in, '') || ':' || n, ',' order by status, eliminated_in)
    from (select status, eliminated_in, count(*) as n from agencies where is_test = coalesce((select (settings #>> '{dry_run,enabled}')::boolean from event_state), false)
           group by status, eliminated_in) x;
  select 'chk ${label} finalists hold 4 categories', bool_and(n = 4) from (
    select a.id, count(h.category) as n from agencies a left join v_held_gear h on h.agency_id = a.id where a.status = 'active' group by a.id) x;
  select 'chk ${label} envelopes', count(*), count(distinct holder_agency_id) from v_envelope_holders where holder_agency_id is not null;
  select 'chk ${label} reveals', count(*) from reveals;
  select 'chk ${label} hero scores match the formula', count(*), bool_and(h.hero_score = hero_score(h.power_level, h.multiplier, h.fund_left))
    from v_hero_scores h;
  select 'chk ${label} only the fined agency is ever below zero', count(*) from v_fund_left f join agencies a on a.id = f.agency_id
   where f.fund_left < 0 and a.id <> ${nth(6)};
  select 'chk ${label} ledger', count(*) filter (where reason = 'start_fund'), count(*) filter (where reason = 'poster_bonus') > 0,
         count(*) filter (where reason = 'transfer')
    from v_ledger where not voided;`;

const sessions = (ids: string[]) =>
  `insert into agency_sessions (token_hash, agency_id, expires_at) values ${ids.map((id) => `('tok-${id}', '${id}', now() + interval '1 day')`).join(', ')};`;
const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => `A${String(from + i).padStart(2, '0')}`);
/** Three founders (captain first) for agency number \`n\` (a SQL integer expression). */
const foundersOf = (n: string) => {
  const one = (name: string, prefix: string, captain: boolean) =>
    `jsonb_build_object('name', '${name} ' || ${n}, 'section', 'E', 'phone', '${prefix}' || lpad(${n}::text, 8, '0'),
       'email', '${name.toLowerCase()}' || ${n} || '@imi.edu', 'is_captain', ${captain})`;
  return `jsonb_build_array(${one('Captain', '98', true)}, ${one('Second', '97', false)}, ${one('Third', '96', false)})`;
};

describe.skipIf(!hasDb || !hasSecrets)('the whole evening: dry run, reset, real event', () => {
  it('runs end to end, and the reset leaves only the real registrations behind', () => {
    const lines = sql(`
      update event_state set settings = jsonb_set(settings, '{registration,closes_at}', '"2099-01-01T00:00:00+05:30"');
      ${agency('A01', 'Real Agency One')} ${agency('A02', 'Real Agency Two')}

      -- ---------------- 1. Dry run: 10 testers type a name each.
      update event_state set settings = jsonb_set(settings, '{dry_run,enabled}', 'true');
      select register_test_agency('Tester ' || n, 'scrypt$hash') from generate_series(1, 10) n;
      ${sessions(range(3, 12))}
      select 'chk dry ids', string_agg(id, ',' order by id) from agencies where is_test;
      ${prelim}
      select 'chk dry after prelim', count(*) filter (where status = 'active'), count(*) filter (where status = 'eliminated') from agencies where is_test;
      ${round1}
      select 'chk dry jugaad', count(*) from sales where card_id like 'JK%' and voided_at is null;
      ${round2}
      ${round3}
      ${finalChecks('dry')}
      select 'chk dry real teams untouched', string_agg(id || ':' || status, ',' order by id) from agencies where not is_test;

      -- ---------------- 2. Reset (keep registrations), then End dry run mode.
      select admin_reset_event(true, '${K}');
      update event_state set settings = jsonb_set(settings, '{dry_run,enabled}', 'false');
      select 'chk reset agencies', string_agg(id || ':' || status, ',' order by id), count(*) filter (where is_test) from agencies;
      select 'chk reset game data', (select count(*) from ledger_entries) + (select count(*) from sales) + (select count(*) from answers)
        + (select count(*) from insider_tips) + (select count(*) from poster_duels) + (select count(*) from tower_results)
        + (select count(*) from envelope_moves) + (select count(*) from envelope_contents) + (select count(*) from reveals)
        + (select count(*) from force_fields) + (select count(*) from xray_log);
      select 'chk reset event', phase, coalesce(step, '-'), prelim_published_at is null and prelim_frozen_at is null
        and round1_locked_at is null and round2_published_at is null from event_state;
      select 'chk reset catalogue', (select count(*) from questions where order_no is not null or status <> 'pending'),
        (select count(*) from breaking_news where draw_order is not null or revealed_at is not null),
        (select count(*) from team_ups where revealed_at is not null), (select count(*) from gear_cards where lot_order is not null),
        (select count(*) from missions where winner_agency_id is not null or choice is not null);

      -- ---------------- 3. The real event: 16 more teams register; IDs continue with no gap.
      select register_agency('Real Agency ' || n, ${foundersOf('n')}, 'scrypt$hash') from generate_series(3, 18) n;
      select 'chk real ids', count(*), min(id), max(id) from agencies;
      update agencies set status = 'checked_in', checked_in_at = now();
      ${sessions(range(1, 18))}
      ${prelim}
      select 'chk real after prelim', count(*) filter (where status = 'active'), count(*) filter (where eliminated_in = 'prelim') from agencies;
      ${round1}
      select 'chk real after round 1', count(*) filter (where status = 'active'), count(*) filter (where eliminated_in = 'round1'),
        (select count(*) from sales where card_id like 'JK%' and voided_at is null) from agencies;
      ${round2}
      select 'chk real after round 2', count(*) filter (where status = 'active'), count(*) filter (where eliminated_in = 'round2') from agencies;
      ${round3}
      ${finalChecks('real')}
    `).filter((l) => l.startsWith('chk '));

    expect(lines).toEqual([
      'chk dry ids|A03,A04,A05,A06,A07,A08,A09,A10,A11,A12',
      'chk dry after prelim|10|0',
      'chk dry jugaad|1',
      'chk dry statuses|active:8,eliminated/round2:2',
      'chk dry finalists hold 4 categories|t',
      'chk dry envelopes|8|8',
      'chk dry reveals|8',
      'chk dry hero scores match the formula|8|t',
      'chk dry only the fined agency is ever below zero|0',
      'chk dry ledger|10|t|2',
      'chk dry real teams untouched|A01:registered,A02:registered',
      'chk reset agencies|A01:registered,A02:registered|0',
      'chk reset game data|0',
      'chk reset event|registration|-|t',
      'chk reset catalogue|0|0|0|0|0',
      'chk real ids|18|A01|A18',
      'chk real after prelim|16|2',
      'chk real after round 1|15|1|1',
      'chk real after round 2|8|7',
      'chk real statuses|active:8,eliminated/prelim:2,eliminated/round1:1,eliminated/round2:7',
      'chk real finalists hold 4 categories|t',
      'chk real envelopes|8|8',
      'chk real reveals|8',
      'chk real hero scores match the formula|8|t',
      'chk real only the fined agency is ever below zero|0',
      'chk real ledger|16|t|2',
    ]);
  });
});
