import { describe, expect, it } from 'vitest';
import { hasDb, sql, sqlError } from './helpers';

const founders = (tag: string, domain = 'imi.edu') => `'[
  {"name": "Captain ${tag}", "section": "E", "phone": "98${tag.padStart(8, '0')}", "email": "cap${tag}@${domain}", "is_captain": true},
  {"name": "Second ${tag}",  "section": "E", "phone": "97${tag.padStart(8, '0')}", "email": "two${tag}@${domain}"},
  {"name": "Third ${tag}",   "section": "F", "phone": "96${tag.padStart(8, '0')}", "email": "three${tag}@${domain}"}
]'::jsonb`;
const register = (name: string, tag: string, domain?: string) =>
  `select register_agency('${name}', ${founders(tag, domain)}, 'scrypt$hash');`;

describe.skipIf(!hasDb)('register_agency', () => {
  it('creates agencies A01, A02 … with founders and a hashed PIN', () => {
    expect(sql(`${register('Rakshak Labs', '1')} ${register('  Chai   Squad ', '2')}
      select id || '|' || name || '|' || status from agencies order by id;
      select count(*) from founders;
      select agency_id || '|' || pin_hash from agency_auth order by agency_id;`))
      .toEqual(['A01', 'A02', 'A01|Rakshak Labs|registered', 'A02|Chai Squad|registered', '6', 'A01|scrypt$hash', 'A02|scrypt$hash']);
  });

  it('refuses when registration is closed, or past the deadline', () => {
    expect(sqlError(`update event_state set settings = jsonb_set(settings, '{registration,open}', 'false');
      ${register('Late', '1')}`)).toMatch(/registration_closed/);
    expect(sqlError(`update event_state set settings = jsonb_set(settings, '{registration,closes_at}', '"2020-01-01T00:00:00Z"');
      ${register('Late', '1')}`)).toMatch(/registration_closed/);
    expect(sqlError(`update event_state set phase = 'checkin'; ${register('Late', '1')}`)).toMatch(/registration_closed/);
  });

  it('takes a team of 1 or 2 only while small teams are allowed', () => {
    const solo = `'[{"name": "Solo One", "section": "E", "phone": "9800000001", "email": "solo@imi.edu", "is_captain": true}]'::jsonb`;
    expect(sqlError(`select register_agency('Solo', ${solo}, 'scrypt$hash');`)).toMatch(/founders_count/);
    expect(sql(`update event_state set settings = jsonb_set(settings, '{registration,small_teams}', 'true') where id;
      select register_agency('Solo', ${solo}, 'scrypt$hash');`)).toEqual(['A01']);
  });

  it('refuses once the cap is reached', () => {
    expect(sqlError(`update event_state set settings = jsonb_set(settings, '{registration,max_agencies}', '2');
      ${register('One', '1')} ${register('Two', '2')} ${register('Three', '3')}`)).toMatch(/registration_full/);
  });

  it('rolls the whole registration back on a bad founder, leaving no gap in IDs', () => {
    expect(sqlError(`${register('Outsiders', '1', 'gmail.com')}`)).toMatch(/must be @imi.edu/);
    expect(sql(`${register('First', '1')}
      savepoint s; select 1; rollback to savepoint s;
      ${register('Second', '2')} select string_agg(id, ',' order by id) from agencies;`))
      .toEqual(['A01', '1', 'A02', 'A01,A02']);
  });

  it('refuses a second captain, or a founder already in another agency', () => {
    expect(sqlError(`select register_agency('Two Bosses', '[
      {"name": "A Boss", "section": "E", "phone": "9800000001", "email": "a@imi.edu", "is_captain": true},
      {"name": "B Boss", "section": "E", "phone": "9800000002", "email": "b@imi.edu", "is_captain": true},
      {"name": "C Crew", "section": "E", "phone": "9800000003", "email": "c@imi.edu"}]'::jsonb, 'h');`)).toMatch(/founders_one_captain/);
    expect(sqlError(`${register('First', '1')} ${register('Copy', '1')}`)).toMatch(/founders_(email|phone)_key/);
  });
});

describe.skipIf(!hasDb)('agency login helpers', () => {
  const setup = `${register('Rakshak Labs', '1')}
    update event_state set settings = jsonb_set(jsonb_set(settings, '{security,pin_max_attempts}', '3'),
                                                '{security,pin_lock_seconds}', '60');`;

  it('locks an agency ID after too many wrong PINs, and a success clears the count', () => {
    expect(sql(`${setup}
      select record_pin_attempt('A01', false) is null;
      select record_pin_attempt('A01', false) is null;
      select record_pin_attempt('A01', false) > now();
      select failed_attempts from agency_auth;`)).toEqual(['A01', 't', 't', 't', '0']);
    expect(sql(`${setup}
      select record_pin_attempt('A01', false);
      select record_pin_attempt('A01', true);
      select failed_attempts || '|' || (first_login_at is not null) || '|' || (locked_until is null) from agency_auth;`))
      .toEqual(['A01', '0|true|true']);
  });

  it("during the prelim, a new session signs out the agency's other phones", () => {
    expect(sql(`${setup}
      select create_agency_session('A01', 'h1', 3600, false, 'phone 1');
      select create_agency_session('A01', 'h2', 3600, false, 'phone 2');
      select count(*) from agency_sessions where revoked_at is null;
      select create_agency_session('A01', 'h3', 3600, true, 'quiz phone');
      select string_agg(token_hash, ',') from agency_sessions where revoked_at is null;`))
      .toEqual(['A01', '2', 'h3']);
  });

  it('knows when the prelim has started (sudden death does not count)', () => {
    expect(sql(`select quiz_has_started();
      insert into questions (id, segment, prompt, options, timer_s, weight, opened_at)
        values ('S90', 'sudden_death', 'SD', array['a','b','c','d'], 20, 1, now());
      select quiz_has_started();
      insert into questions (id, segment, prompt, options, timer_s, weight, opened_at)
        values ('M90', 'marvel_ya_dc', 'Q', array['Marvel','DC'], 10, 1, now());
      select quiz_has_started();`)).toEqual(['f', 'f', 't']);
  });
});
