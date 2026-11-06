import { describe, expect, it } from 'vitest';
import { agency, hasDb, sql, sqlError } from './helpers';

// These tests need the secret seed (questions + keys), which scripts/db/local-db.sh loads when present.
const setup = `
  ${agency('A01')} ${agency('A02')} ${agency('A03')}
  update agencies set status = 'checked_in';
  insert into agency_sessions (token_hash, agency_id, expires_at) values
    ('t1', 'A01', now() + interval '1 day'), ('t2', 'A02', now() + interval '1 day'), ('t3', 'A03', now() + interval '1 day');
  update event_state set phase = 'prelim', settings = jsonb_set(settings, '{prelim,lead_in_seconds}', '0');
  select quiz_shuffle();`;
// Pretend question q opened s seconds ago (s may be fractional), without waiting.
const openedAgo = (q: string, s: number) =>
  `do $$ begin perform quiz_open_question('${q}'); end $$;
   update questions set opened_at = clock_timestamp() - interval '${s} seconds' where id = '${q}';`;

describe.skipIf(!hasDb)('prelim quiz engine', () => {
  it('shuffles the 15 live questions into slots 1–15, once', () => {
    expect(sql(`${setup}
      select count(*), min(order_no), max(order_no), count(distinct order_no) from questions where order_no is not null;
      select bool_and(is_live) from questions where order_no is not null;`)).toEqual(['15|1|15|15', 't']);
    expect(sqlError(`${setup} ${openedAgo('M1', 1)} select quiz_shuffle();`)).toMatch(/quiz_started/);
  });

  it('opens only in the prelim phase, one question at a time, with a read-in before the clock starts', () => {
    expect(sqlError(`${setup} update event_state set phase = 'registration'; select quiz_open_question('M1');`)).toMatch(/not_prelim/);
    expect(sqlError(`${setup} select quiz_open_question('M1'); select quiz_open_question('M2');`)).toMatch(/question_running/);
    expect(sqlError(`${setup} select quiz_open_question('M5');`)).toMatch(/not_in_live_set/);
    expect(sql(`${setup} update event_state set settings = jsonb_set(settings, '{prelim,lead_in_seconds}', '3');
      select quiz_open_question('M1') > clock_timestamp() + interval '2.5 seconds';
      select current_question_id from event_state;`)).toEqual(['t', 'M1']);
  });

  it('scores on database time: the spec examples 900 and 1,400, wrong = 0', () => {
    expect(sql(`${setup}
      ${openedAgo('M1', 1.98)}
      select quiz_submit_answer('t1', 'M1', 1);  -- Hawkman is DC (B): correct at ~2.0 s
      select quiz_submit_answer('t2', 'M1', 0);  -- wrong
      select agency_id || '|' || response_time_s || '|' || is_correct || '|' || points from answers order by agency_id;`))
      .toEqual(['locked', 'locked', 'A01|2.0|true|900', 'A02|2.0|false|0']);
    expect(sql(`${setup}
      ${openedAgo('B1', 11.98)}
      select quiz_submit_answer('t1', 'B1', 3);  -- correct at ~12.0 s on a 20 s, ×2 question
      select points from answers;`)).toEqual(['locked', '1400']);
  });

  it('an answer after T is recorded as late with 0 points; answers lock on the first tap', () => {
    expect(sql(`${setup} ${openedAgo('M1', 10.2)}
      select quiz_submit_answer('t1', 'M1', 1);
      select points from answers;`)).toEqual(['late', '0']);
    expect(sqlError(`${setup} ${openedAgo('M1', 1)}
      select quiz_submit_answer('t1', 'M1', 1); select quiz_submit_answer('t1', 'M1', 0);`)).toMatch(/already_answered/);
  });

  it('refuses answers before the clock starts, to closed questions, from bad sessions and unchecked agencies', () => {
    expect(sqlError(`${setup} update event_state set settings = jsonb_set(settings, '{prelim,lead_in_seconds}', '3');
      do $$ begin perform quiz_open_question('M1'); end $$; select quiz_submit_answer('t1', 'M1', 1);`)).toMatch(/not_yet/);
    expect(sqlError(`${setup} select quiz_submit_answer('t1', 'M2', 1);`)).toMatch(/not_open/);
    expect(sqlError(`${setup} ${openedAgo('M1', 1)} select quiz_submit_answer('nope', 'M1', 1);`)).toMatch(/not_signed_in/);
    expect(sqlError(`${setup} ${openedAgo('M1', 1)} update agencies set status = 'registered' where id = 'A01';
      select quiz_submit_answer('t1', 'M1', 1);`)).toMatch(/not_checked_in/);
    expect(sqlError(`${setup} ${openedAgo('M1', 1)} select quiz_submit_answer('t1', 'M1', 2);`)).toMatch(/bad_option/);
  });

  it('reveal waits for the timer; voids drop out of totals and a same-segment spare takes the slot', () => {
    expect(sqlError(`${setup} ${openedAgo('M1', 5)} select quiz_reveal_question('M1');`)).toMatch(/still_running/);
    expect(sql(`${setup} ${openedAgo('M1', 1.98)}
      select quiz_submit_answer('t1', 'M1', 1);
      update questions set opened_at = clock_timestamp() - interval '11 seconds' where id = 'M1';
      select quiz_reveal_question('M1');
      select total_points from v_prelim_scores where agency_id = 'A01';
      select quiz_void_question('M1');
      select total_points from v_prelim_scores where agency_id = 'A01';
      select quiz_use_spare('M1', 'M5');
      select order_no = (select order_no from questions where id = 'M1') and replaces_id = 'M1' from questions where id = 'M5';`))
      .toEqual(['locked', '900', '0', 't']);
    expect(sqlError(`${setup} select quiz_void_question('M1'); select quiz_use_spare('M1', 'T5');`)).toMatch(/wrong_segment/);
  });

  it('the phone never sees the key or its result before the reveal, and totals count revealed questions only', () => {
    const state = (t: string) => `select quiz_phone_state('${t}')`;
    const before = sql(`${setup} ${openedAgo('M1', 1.98)} select quiz_submit_answer('t1', 'M1', 1); ${state('t1')};`);
    const s1 = JSON.parse(before.at(-1)!);
    expect(s1.question.correct_index).toBeNull();
    expect(s1.question.my_answer).toEqual({ option_index: 1, late: false, is_correct: null, points: null });
    expect(s1.totals.points).toBe(0);
    expect(JSON.stringify(s1)).not.toMatch(/correct_index":\s*1/);

    const after = sql(`${setup} ${openedAgo('M1', 1.98)} select quiz_submit_answer('t1', 'M1', 1);
      update questions set opened_at = clock_timestamp() - interval '11 seconds' where id = 'M1';
      select quiz_reveal_question('M1'); ${state('t1')};`);
    const s2 = JSON.parse(after.at(-1)!);
    expect(s2.question.correct_index).toBe(1);
    expect(s2.question.my_answer.points).toBe(900);
    expect(s2.totals).toEqual({ points: 900, correct: 1, answered: 1 });
    expect(JSON.parse(sql(`${state('nobody')};`)[0])).toEqual({ signed_in: false });
  });

  it('publishes only when every question is revealed, then freezes the top 16 once', () => {
    expect(sqlError(`${setup} ${openedAgo('M1', 1)} select quiz_publish_board();`)).toMatch(/questions_unrevealed/);
    expect(sql(`${setup}
      update questions set status = 'closed', opened_at = now() - interval '1 minute', revealed_at = now() where order_no is not null;
      select quiz_publish_board();
      select quiz_freeze_top16(array['A01', 'A03']);
      select id || ':' || status || ':' || coalesce(eliminated_in, '-') from agencies order by id;`))
      .toEqual(['A01:active:-', 'A02:eliminated:prelim', 'A03:active:-']);
    expect(sqlError(`${setup}
      update questions set status = 'closed', opened_at = now() - interval '1 minute', revealed_at = now() where order_no is not null;
      select quiz_publish_board(); select quiz_freeze_top16(array['A01']); select quiz_freeze_top16(array['A01']);`))
      .toMatch(/already_frozen/);
  });
});
