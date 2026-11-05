import { describe, expect, it } from 'vitest';
import { agency, hasDb, sql, sqlError } from './helpers';

describe.skipIf(!hasDb)('agencies and founders', () => {
  it('accepts an agency of exactly 3 founders with 1 captain', () => {
    expect(sql(`${agency('A01')} set constraints all immediate; select count(*) from founders;`)).toEqual(['3']);
  });

  it('rejects an agency with 2 founders', () => {
    expect(sqlError(`insert into agencies (id, name) values ('A01', 'Short');
      insert into founders (agency_id, name, section, phone, email, is_captain) values
        ('A01', 'One', 'E', '9100000001', 'one@imi.edu', true), ('A01', 'Two', 'E', '9100000002', 'two@imi.edu', false);
      set constraints all immediate;`)).toMatch(/exactly 3 founders/);
  });

  it('rejects an agency with no captain', () => {
    expect(sqlError(`insert into agencies (id, name) values ('A01', 'Leaderless');
      insert into founders (agency_id, name, section, phone, email, is_captain) values
        ('A01', 'One', 'E', '9100000001', 'one@imi.edu', false), ('A01', 'Two', 'E', '9100000002', 'two@imi.edu', false),
        ('A01', 'Three', 'E', '9100000003', 'three@imi.edu', false);
      set constraints all immediate;`)).toMatch(/exactly 1 captain/);
  });

  it('rejects a person founding two agencies', () => {
    expect(sqlError(`${agency('A01')}
      insert into agencies (id, name) values ('A02', 'Copycat');
      insert into founders (agency_id, name, section, phone, email, is_captain)
        select 'A02', name, section, '9199999999', email, true from founders where agency_id = 'A01' limit 1;`))
      .toMatch(/founders_email_key/);
  });

  it('accepts only @imi.edu founder emails (any capitalisation)', () => {
    expect(sqlError(`insert into agencies (id, name) values ('A01', 'Outsiders');
      insert into founders (agency_id, name, section, phone, email, is_captain) values
        ('A01', 'One', 'E', '9100000001', 'one@gmail.com', true);`)).toMatch(/must be @imi.edu addresses/);
    expect(sqlError(`insert into agencies (id, name) values ('A01', 'Sneaky');
      insert into founders (agency_id, name, section, phone, email, is_captain) values
        ('A01', 'One', 'E', '9100000001', 'one@imi.edu.fake.com', true);`)).toMatch(/must be @imi.edu addresses/);
    expect(sql(`insert into agencies (id, name) values ('A01', 'Shouty');
      insert into founders (agency_id, name, section, phone, email, is_captain) values
        ('A01', 'One', 'E', '9100000001', 'One@IMI.EDU', true),
        ('A01', 'Two', 'E', '9100000002', 'two@imi.edu', false),
        ('A01', 'Three', 'E', '9100000003', 'three@imi.edu', false);
      set constraints all immediate; select count(*) from founders;`)).toEqual(['3']);
  });

  it('the email-domain check turns off when the setting is cleared', () => {
    expect(sql(`update event_state set settings = jsonb_set(settings, '{registration,email_domain}', 'null');
      insert into agencies (id, name) values ('A01', 'Guests');
      insert into founders (agency_id, name, section, phone, email, is_captain) values
        ('A01', 'One', 'E', '9100000001', 'one@gmail.com', true),
        ('A01', 'Two', 'E', '9100000002', 'two@gmail.com', false),
        ('A01', 'Three', 'E', '9100000003', 'three@gmail.com', false);
      set constraints all immediate; select count(*) from founders;`)).toEqual(['3']);
  });

  it('there is no Fan Club status any more: eliminated agencies are simply eliminated', () => {
    expect(sqlError(`${agency('A01')} update agencies set status = 'fan_club';`)).toMatch(/agencies_status_check/);
    expect(sql(`${agency('A01')} update agencies set status = 'eliminated', eliminated_in = 'prelim';
      select status || ':' || eliminated_in from agencies;`)).toEqual(['eliminated:prelim']);
  });

  it('rejects malformed agency IDs and duplicate agency names', () => {
    expect(sqlError(`insert into agencies (id, name) values ('B01', 'Nope');`)).toMatch(/check constraint/);
    expect(sqlError(`${agency('A01', 'Rakshak')} ${agency('A02', 'rakshak ')}`)).toMatch(/agencies_name_key/);
  });

  it('locks founders once registration closes', () => {
    expect(sqlError(`${agency('A01')} set constraints all immediate;
      update event_state set phase = 'checkin';
      update founders set name = 'Changed' where agency_id = 'A01' and is_captain;`)).toMatch(/Founders are locked/);
    expect(sqlError(`${agency('A01')} set constraints all immediate;
      update event_state set settings = jsonb_set(settings, '{registration,closes_at}', '"2020-01-01T00:00:00Z"');
      update founders set name = 'Changed' where agency_id = 'A01' and is_captain;`)).toMatch(/Founders are locked/);
  });
});

describe.skipIf(!hasDb)('the Fund Ledger is append-only', () => {
  const setup = `${agency('A01')} ${agency('A02')}
    insert into ledger_entries (agency_id, amount, reason) values ('A01', 50, 'start_fund'), ('A02', 50, 'start_fund');`;

  it('derives fund left from the entries', () => {
    expect(sql(`${setup}
      insert into ledger_entries (agency_id, amount, reason) values ('A01', -2, 'tip'), ('A01', -12.5, 'gear');
      select fund_left from v_fund_left where agency_id = 'A01';`)).toEqual(['35.5']);
  });

  it('refuses to edit or delete an entry', () => {
    expect(sqlError(`${setup} update ledger_entries set amount = 60;`)).toMatch(/append-only/);
    expect(sqlError(`${setup} delete from ledger_entries;`)).toMatch(/append-only/);
  });

  it('refuses amounts off the ₹0.5 Cr step, and zero', () => {
    expect(sqlError(`${setup} insert into ledger_entries (agency_id, amount, reason) values ('A01', -0.3, 'fine');`))
      .toMatch(/check constraint/);
    expect(sqlError(`${setup} insert into ledger_entries (agency_id, amount, reason) values ('A01', 0, 'fine');`))
      .toMatch(/check constraint/);
  });

  it('a void is a new row; the voided entry stops counting, and cannot be voided twice', () => {
    expect(sql(`${setup}
      insert into ledger_entries (agency_id, amount, reason) values ('A01', -5, 'fine');
      insert into ledger_voids (entry_id, reason) select max(id), 'wrong agency' from ledger_entries;
      select fund_left from v_fund_left where agency_id = 'A01';
      select count(*) from v_ledger where voided;`)).toEqual(['50.0', '1']);
    expect(sqlError(`${setup}
      insert into ledger_voids (entry_id, reason) select max(id), 'oops' from ledger_entries;
      insert into ledger_voids (entry_id, reason) select max(id), 'again' from ledger_entries;`)).toMatch(/duplicate key/);
    expect(sqlError(`${setup}
      insert into ledger_voids (entry_id, reason) select max(id), 'oops' from ledger_entries;
      delete from ledger_voids;`)).toMatch(/append-only/);
  });

  it('voiding one leg of a transfer voids both legs', () => {
    expect(sql(`${setup}
      insert into ledger_entries (agency_id, amount, reason, txn_id) values
        ('A01', -3, 'transfer', '00000000-0000-0000-0000-000000000001'),
        ('A02',  3, 'transfer', '00000000-0000-0000-0000-000000000001');
      insert into ledger_voids (entry_id, reason)
        select id, 'deal called off' from ledger_entries where agency_id = 'A01' and reason = 'transfer';
      select agency_id || '=' || fund_left from v_fund_left order by agency_id;`)).toEqual(['A01=50.0', 'A02=50.0']);
  });

  it('refuses TRUNCATE unless the reset switch is on', () => {
    expect(sqlError(`truncate ledger_entries cascade;`)).toMatch(/TRUNCATE on .* is blocked/);
    expect(sql(`set local doomsday.allow_reset = 'on';
      truncate agencies, founders, ledger_entries, ledger_voids, sales, insider_tips, force_fields,
               envelope_moves, answers, agency_auth, agency_sessions, prelim_tiebreaks, poster_duels,
               tower_results, xray_log, reveals, event_state, missions cascade;
      select count(*) from ledger_entries;`)).toEqual(['0']);
  });
});

describe.skipIf(!hasDb)('sales', () => {
  const sale = (agencyId: string, card: string, category: string, price: number) => `
    with e as (insert into ledger_entries (agency_id, amount, reason, ref)
               values ('${agencyId}', ${-price}, 'gear', 'card:${card}') returning id)
    insert into sales (card_id, agency_id, category, price, phase, ledger_entry_id)
    select '${card}', '${agencyId}', '${category}', ${price}, 'secret', id from e;`;
  const setup = `${agency('A01')} ${agency('A02')}
    insert into ledger_entries (agency_id, amount, reason) values ('A01', 50, 'start_fund'), ('A02', 50, 'start_fund');`;

  it('a card can be sold once', () => {
    expect(sqlError(`${setup} ${sale('A01', 'H05', 'HQ', 5)} ${sale('A02', 'H05', 'HQ', 6)}`)).toMatch(/sales_card_key/);
  });

  it('an agency holds one card per category', () => {
    expect(sqlError(`${setup} ${sale('A01', 'H05', 'HQ', 5)} ${sale('A01', 'H06', 'HQ', 5)}`))
      .toMatch(/sales_agency_category_key/);
  });

  it('a sale cannot be edited or deleted', () => {
    expect(sqlError(`${setup} ${sale('A01', 'H05', 'HQ', 5)} update sales set price = 1;`)).toMatch(/only be voided/);
    expect(sqlError(`${setup} ${sale('A01', 'H05', 'HQ', 5)} delete from sales;`)).toMatch(/never deleted/);
  });

  it('voiding the ledger entry voids the sale, and the card can be sold again', () => {
    expect(sql(`${setup} ${sale('A01', 'H05', 'HQ', 5)}
      insert into ledger_voids (entry_id, reason) select ledger_entry_id, 'wrong paddle' from sales;
      ${sale('A02', 'H05', 'HQ', 5.5)}
      select agency_id || ':' || coalesce(voided_at is not null, false) from sales order by id;
      select agency_id || '=' || fund_left from v_fund_left order by agency_id;`))
      .toEqual(['A01:true', 'A02:false', 'A01=50.0', 'A02=44.5']);
  });
});
