import { describe, expect, it } from 'vitest';
import { agency, hasDb, sql, sqlError } from './helpers';

const K = '00000000-0000-0000-0000-0000000000a1';
const on = `update event_state set settings = jsonb_set(settings, '{dry_run,enabled}', 'true');`;
const closed = `update event_state set settings = jsonb_set(settings, '{registration,open}', 'false');`;
const test = (name: string) => `select register_test_agency('${name}', 'scrypt$hash');`;

describe.skipIf(!hasDb)('dry run mode', () => {
  it('is off by default: quick test registration is refused', () => {
    expect(sqlError(test('Anagh'))).toMatch(/dry_run_off/);
  });

  it('a name is enough: one member, no IMI email, checked in straight away — even after registration closes', () => {
    expect(sql(`${on} ${closed} ${test('Anagh')}
      select id || '|' || name || '|' || status || '|' || is_test from agencies;
      select count(*) || '|' || bool_and(is_captain) from founders;`)).toEqual(['A01', 'A01|Anagh|checked_in|true', '1|true']);
  });

  it('refuses once the dry run has started, and duplicate names', () => {
    expect(sqlError(`${on} update event_state set phase = 'prelim'; ${test('Anagh')}`)).toMatch(/dry_run_started/);
    expect(sqlError(`${on} ${test('Anagh')} ${test('anagh')}`)).toMatch(/agencies_name_key/);
  });

  it('real agencies still need founders and IMI emails while the dry run is on', () => {
    expect(sqlError(`${on} insert into agencies (id, name) values ('A01', 'Real one');
      set constraints all immediate;`)).toMatch(/1 to 3 founders/);
    expect(sqlError(`${on} insert into agencies (id, name) values ('A01', 'Real one');
      insert into founders (agency_id, name, section, phone, email, is_captain) values ('A01', 'Solo', 'E', '9100000001', 'solo@gmail.com', true);`))
      .toMatch(/must be @imi.edu/);
  });

  it('freezing the dry-run top 16 never eliminates real registrations', () => {
    expect(sql(`${agency('A01', 'Real agency')} ${on} ${test('Tester One')} ${test('Tester Two')}
      update event_state set phase = 'prelim', prelim_published_at = now();
      select quiz_freeze_top16(array['A02']);
      select id || ':' || status from agencies order by id;`)).toEqual(['A02', 'A03', 'A01:registered', 'A02:active', 'A03:eliminated']);
  });

  it('the reset that keeps registrations deletes the test agencies and keeps the real ones', () => {
    expect(sql(`${agency('A01', 'Real agency')} ${on} ${test('Tester One')}
      update agencies set status = 'active' where id = 'A01';
      select admin_reset_event(true, '${K}');
      select string_agg(id || ':' || status, ',') from agencies; select count(*) from founders;`)).toEqual(['A02', 'A01:registered', '3']);
  });
});
