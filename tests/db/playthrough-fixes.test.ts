import { describe, expect, it } from 'vitest';
import { agency, hasDb, sql } from './helpers';

const K = '00000000-0000-0000-0000-0000000000a1';

describe.skipIf(!hasDb)('fixes from the 30-agency playthrough', () => {
  it('the phone an agency registers on counts as its first login (so it can change phones mid-prelim)', () => {
    expect(sql(`${agency('A01')}
      insert into agency_auth (agency_id, pin_hash) values ('A01', 'scrypt$x');
      select first_login_at is null from agency_auth where agency_id = 'A01';
      select create_agency_session('A01', 'tok', 3600, false, 'test');
      select first_login_at is not null from agency_auth where agency_id = 'A01';`).filter((l) => l === 't' || l === 'f')).toEqual(['t', 't']);
  });

  it('the reset that keeps registrations keeps the first-login mark', () => {
    expect(sql(`${agency('A01')}
      insert into agency_auth (agency_id, pin_hash, first_login_at) values ('A01', 'scrypt$x', now());
      select admin_reset_event(true, '${K}');
      select first_login_at is not null from agency_auth where agency_id = 'A01';`).slice(-1)).toEqual(['t']);
  });

  it('crediting the starting funds shuffles the lot order if nobody has', () => {
    expect(sql(`${agency('A01')} update agencies set status = 'active';
      update event_state set phase = 'round1', prelim_frozen_at = now();
      select r1_start_funds('${K}');
      select count(*) from gear_cards where lot_order is not null;`).slice(-1)).toEqual(['60']);
  });
});
