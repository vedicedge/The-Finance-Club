import { describe, expect, it } from 'vitest';
import { agency, hasDb, sql, sqlError } from './helpers';

const sale = (agencyId: string, card: string, price: number) => `
  with e as (insert into ledger_entries (agency_id, amount, reason, ref)
             values ('${agencyId}', ${-price}, 'gear', 'card:${card}') returning id)
  insert into sales (card_id, agency_id, category, price, phase, ledger_entry_id)
  select '${card}', '${agencyId}', 'HQ', ${price}, 'secret', id from e;`;

/** A crew member: organisers rows need a matching sign-in user. */
const crew = (email: string, roles: string) => `
  with u as (insert into auth.users (email) values ('${email}') returning id)
  insert into organisers (user_id, email, roles) select id, '${email}', '${roles}' from u;`;

describe.skipIf(!hasDb)('card names and series', () => {
  it('every one of the 60 gear cards has its own name; the Jugaad Kits share theirs', () => {
    expect(sql(`select count(*), count(distinct card_name) from gear_cards where phase <> 'jugaad';`)).toEqual(['60|60']);
    expect(sql(`select distinct card_name from gear_cards where phase = 'jugaad';`)).toEqual(['Jugaad Kit']);
    expect(sql(`select count(*) from gear_cards where card_name is null or card_name = '';`)).toEqual(['0']);
  });

  it('each category has 15 different names in the same six series as before', () => {
    expect(sql(`select category, count(distinct card_name), count(distinct gear_name)
                  from gear_cards where phase <> 'jugaad' group by category order by category;`)).toEqual([
      'Gadget|15|6',
      'HQ|15|6',
      'Sidekick|15|6',
      'Suit|15|6',
    ]);
  });

  it('a series keeps one Power and one minimum bid, so the game is unchanged', () => {
    expect(sql(`select count(*) from (select gear_name from gear_cards
                  group by gear_name having count(distinct power) > 1 or count(distinct min_bid) > 1) x;`)).toEqual(['0']);
    expect(sql(`select card_name, gear_name from gear_cards where id in ('H08', 'H13', 'K12') order by id;`)).toEqual([
      'Old Metro Depot|Old Metro Depot',
      "Laxmi Nagar PG Room|Mama ji's Basement",
      'Cousin Bunty|Cousin Bunty',
    ]);
  });

  it('held cards carry their own name, and Breaking News still hits the whole series', () => {
    expect(
      sql(`${agency('A01')}
           ${agency('A02')}
           insert into ledger_entries (agency_id, amount, reason) values ('A01', 50, 'start_fund'), ('A02', 50, 'start_fund');
           ${sale('A01', 'H08', 4)} ${sale('A02', 'H09', 4)}
           select agency_id, card_name, gear_name from v_held_gear order by agency_id;`),
    ).toEqual(['A01|Old Metro Depot|Old Metro Depot', 'A02|Abandoned Ticket-Hall Bunker|Old Metro Depot']);
  });

  it('two cards cannot be given the same name', () => {
    expect(sqlError(`update gear_cards set card_name = 'Old Metro Depot' where id = 'H09';`)).toMatch(/gear_cards_card_name_key/);
  });
});

describe.skipIf(!hasDb)('projector', () => {
  it('follows the event phase by default', () => {
    expect(sql(`select projector from event_state;`)).toEqual(['auto']);
  });

  it('can be pinned to a known screen, and nothing else', () => {
    expect(sql(`update event_state set projector = 'holding' where id; select projector from event_state;`)).toEqual(['holding']);
    expect(sqlError(`update event_state set projector = 'party' where id;`)).toMatch(/event_state_projector_check/);
  });

  it('a crew member can be given the view-only projector role', () => {
    expect(
      sql(`${crew('projector@imi.edu', '{projector}')}
           select roles from organisers where email = 'projector@imi.edu';`),
    ).toEqual(['{projector}']);
    expect(sqlError(crew('x@imi.edu', '{viewer}'))).toMatch(
      /organisers_roles_check/,
    );
  });
});
