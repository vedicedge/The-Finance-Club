import { describe, expect, it } from 'vitest';
import { agency, hasDb, hasSecrets, sql, sqlError } from './helpers';

const K = '00000000-0000-0000-0000-0000000000a1';

describe.skipIf(!hasDb || !hasSecrets)('prelim played category by category', () => {
  const setup = `${agency('A01')} update agencies set status = 'checked_in';
    update event_state set phase = 'prelim', settings = jsonb_set(settings, '{prelim,lead_in_seconds}', '3');
    select quiz_shuffle();`;

  it('the shuffled order keeps each category together, in category order', () => {
    expect(sql(`${setup} select string_agg(left(id, 1), '' order by order_no) from questions where order_no is not null;`).at(-1)).toEqual('MMMMTTTTBBBBHHH');
  });

  it('the first question of a category gets a 5-second intro before the read-in; the next one does not', () => {
    const q = (n: number) => `(select id from questions where order_no = ${n})`;
    expect(sql(`${setup} select 1 from (select quiz_open_question(${q(1)})) o;
      select (intro_until is not null and opened_at - intro_until between interval '2.9 seconds' and interval '3.1 seconds')::text from questions where order_no = 1;`).at(-1)).toEqual('true');
    expect(sql(`${setup} select 1 from (select quiz_open_question(${q(1)})) o;
      update questions set opened_at = clock_timestamp() - interval '30 seconds' where order_no = 1;
      select 1 from (select quiz_open_question(${q(2)})) p;
      select (intro_until is null)::text from questions where order_no = 2;`).at(-1)).toEqual('true');
  });
});

describe.skipIf(!hasDb)('team changes at the desk', () => {
  const close = `update event_state set phase = 'checkin', settings = jsonb_set(settings, '{registration,open}', 'false');`;
  const m = (name: string, phone: string, email: string, captain = false) => ({ name, section: 'E', phone, email, is_captain: captain });
  const edit = (founders: object[], reason = 'Member unwell') =>
    `select jsonb_array_length(admin_edit_team('A01', '${JSON.stringify(founders)}'::jsonb, '${reason}', '${K}'));`;
  const team = `select string_agg(name || case when is_captain then '*' else '' end, ',' order by name) from founders where agency_id = 'A01';`;

  it('replaces a member, changes the captain, and can shrink or grow the team, after registration closes', () => {
    const out = sql(`${agency('A01')} ${close}
      ${edit([m('Riya Sen', '9000000001', 'riya@imi.edu', true), m('Kabir Das', '9000000002', 'kabir@imi.edu')])} ${team}`);
    expect(out.slice(-2)).toEqual(['3', 'Kabir Das,Riya Sen*']);
    expect(sql(`${agency('A01')} ${close} ${edit([m('Solo Act', '9000000003', 'solo@imi.edu', true)])} ${team}`).at(-1)).toEqual('Solo Act*');
  });

  it('keeps the rules: one captain, IMI emails, nobody from another team, a reason, before the prelim', () => {
    expect(sqlError(`${agency('A01')} ${close} ${edit([m('No Captain', '9000000001', 'nc@imi.edu')])}`)).toMatch(/one_captain/);
    expect(sqlError(`${agency('A01')} ${close} ${edit([m('Outside Person', '9000000001', 'x@gmail.com', true)])}`)).toMatch(/@imi\.edu|imi\.edu/);
    expect(sqlError(`${agency('A01')} ${agency('A02')} ${close}
      select admin_edit_team('A01', jsonb_build_array(jsonb_build_object('name', 'Copy Cat', 'section', 'E', 'phone', (select phone from founders where agency_id = 'A02' limit 1), 'email', 'cc@imi.edu', 'is_captain', true)), 'swap', '${K}');`)).toMatch(/member_taken/);
    expect(sqlError(`${agency('A01')} ${close} ${edit([m('Riya Sen', '9000000001', 'riya@imi.edu', true)], '')}`)).toMatch(/reason_required/);
    expect(sqlError(`${agency('A01')} ${close} ${edit([])}`)).toMatch(/founders_count/);
    expect(sqlError(`${agency('A01')} update event_state set phase = 'prelim';
      update questions set opened_at = now() where id = (select id from questions where segment <> 'sudden_death' limit 1);
      ${edit([m('Late Change', '9000000001', 'late@imi.edu', true)])}`)).toMatch(/team_locked|founders_count/);
  });

  it('founders are still locked against any other change after registration', () => {
    expect(sqlError(`${agency('A01')} ${close} update founders set name = 'Sneaky Edit' where agency_id = 'A01';`)).toMatch(/locked/);
  });
});
