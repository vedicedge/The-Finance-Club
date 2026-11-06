import { describe, expect, it } from 'vitest';
import { agency, hasDb, hasSecrets, sql, sqlError } from './helpers';

const KEEPER = '00000000-0000-0000-0000-0000000000a1';
const OTHER = '00000000-0000-0000-0000-0000000000b2';

// Four agencies in the game, Round 1 running with starting funds credited.
const setup = (step = 'secret') => `
  ${agency('A01')} ${agency('A02')} ${agency('A03')} ${agency('A04')}
  update agencies set status = 'active';
  update event_state set phase = 'round1', step = '${step}', prelim_frozen_at = now();
  select r1_start_funds('${KEEPER}');`;
const sale = (card: string, a: string, price: number | string, who = KEEPER) =>
  `select 'sold' from (select r1_record_sale('${card}', '${a}', ${price}, '${who}')) x;`;
const fund = (a: string) => `select fund_left('${a}');`;
const step = (s: string) => `update event_state set step = '${s}';`;

describe.skipIf(!hasDb)('Round 1 start', () => {
  it('credits ₹50 Cr once to every agency in the game', () => {
    expect(sql(`${setup()} ${fund('A01')} select count(*) from ledger_entries where reason = 'start_fund';`)).toEqual([
      '4', '50.0', '4',
    ]);
    expect(sqlError(`${setup()} select r1_start_funds('${KEEPER}');`)).toMatch(/already_started/);
  });

  it('needs the Round 1 phase and a frozen top 16', () => {
    expect(sqlError(`${agency('A01')} update event_state set phase = 'prelim'; select r1_start_funds('${KEEPER}');`)).toMatch(/not_round1/);
    expect(sqlError(`${agency('A01')} update event_state set phase = 'round1'; select r1_start_funds('${KEEPER}');`)).toMatch(/prelim_not_frozen/);
  });
});

describe.skipIf(!hasDb)('recording a sale (ledger rules)', () => {
  it('writes the sale and −price in one go, and fund left follows', () => {
    expect(sql(`${setup()} ${sale('H05', 'A01', 6.5)} ${fund('A01')}
      select card_id || '|' || category || '|' || phase || '|' || price from sales;`).slice(1)).toEqual(['sold', '43.5', 'H05|HQ|secret|6.5']);
  });

  it('rejects a price below the minimum, off the ₹0.5 step, or above fund left', () => {
    expect(sqlError(`${setup()} ${sale('H05', 'A01', 4.5)}`)).toMatch(/below_minimum/);
    expect(sqlError(`${setup()} ${sale('H05', 'A01', 5.3)}`)).toMatch(/bad_step/);
    expect(sqlError(`${setup()} ${sale('H05', 'A01', 50.5)}`)).toMatch(/over_fund/);
  });

  it('rejects a second card in a category the agency holds, and a card already sold', () => {
    expect(sqlError(`${setup()} ${sale('H05', 'A01', 5)} ${sale('H06', 'A01', 5)}`)).toMatch(/category_held/);
    expect(sqlError(`${setup()} ${sale('H05', 'A01', 5)} ${sale('H05', 'A02', 9)}`)).toMatch(/card_sold/);
  });

  it('only sells Marquee lots in the Marquee step, secret cards in the secret step, and not outside bidding', () => {
    expect(sqlError(`${setup('marquee')} ${sale('H05', 'A01', 5)}`)).toMatch(/wrong_lot/);
    expect(sqlError(`${setup('secret')} ${sale('H01', 'A01', 10)}`)).toMatch(/wrong_lot/);
    expect(sql(`${setup('last_call')} ${sale('H01', 'A01', 10)} select phase from sales;`).slice(1)).toEqual(['sold', 'last_call']);
    expect(sqlError(`${setup('tips')} ${sale('H05', 'A01', 5)}`)).toMatch(/not_bidding/);
    expect(sqlError(`${setup()} ${sale('JK1', 'A01', 8)}`)).toMatch(/jugaad_is_automatic/);
  });

  it('refuses agencies that are out of the game', () => {
    expect(sqlError(`${setup()} update agencies set status = 'eliminated' where id = 'A01'; ${sale('H05', 'A01', 5)}`)).toMatch(/agency_not_active/);
  });
});

describe.skipIf(!hasDb || !hasSecrets)('Insider Tips', () => {
  const drawn = `select r1_set_news_draw(array['N1','N2','N3','N4','N5','N6']);`;

  it('costs ₹2 Cr, only in the tips step, one per agency, and links a drawn news card', () => {
    const out = sql(`${setup('tips')} ${drawn} select r1_buy_tip('A01', '${KEEPER}');
      ${fund('A01')} select news_id in ('N1','N2','N3','N4','N5','N6') from insider_tips;`);
    expect(out.slice(-2)).toEqual(['48.0', 't']);
    expect(sqlError(`${setup('tips')} ${drawn} select r1_buy_tip('A01', '${KEEPER}'); select r1_buy_tip('A01', '${KEEPER}');`)).toMatch(/tip_already_bought/);
    expect(sqlError(`${setup('secret')} ${drawn} select r1_buy_tip('A01', '${KEEPER}');`)).toMatch(/not_tips_window/);
    expect(sqlError(`${setup('tips')} select r1_buy_tip('A01', '${KEEPER}');`)).toMatch(/news_not_drawn/);
  });

  it('needs ₹2 Cr in the fund', () => {
    expect(sqlError(`${setup('tips')} ${drawn}
      select ledger_adjust('A01', -49, 'test: nearly broke', '${KEEPER}');
      select r1_buy_tip('A01', '${KEEPER}');`)).toMatch(/insufficient_fund/);
  });

  it('the draw is 6 different cards and cannot change once tips are sold', () => {
    expect(sqlError(`${setup('tips')} select r1_set_news_draw(array['N1','N1','N2','N3','N4','N5']);`)).toMatch(/bad_draw/);
    expect(sqlError(`${setup('tips')} ${drawn} select r1_buy_tip('A01', '${KEEPER}'); ${drawn}`)).toMatch(/tips_sold/);
  });
});

describe.skipIf(!hasDb)('closing Round 1', () => {
  // A01 holds all four, A02 misses one with money, A03 misses one without ₹8 Cr, A04 misses two.
  const auction = `
    ${sale('H05', 'A01', 5)} ${sale('S05', 'A01', 5)} ${sale('G05', 'A01', 5)} ${sale('K05', 'A01', 5)}
    ${sale('H06', 'A02', 5)} ${sale('S06', 'A02', 5)} ${sale('G06', 'A02', 5)}
    ${sale('H07', 'A03', 10)} ${sale('S07', 'A03', 10)} ${sale('G07', 'A03', 25)}
    ${sale('H08', 'A04', 4)} ${sale('S08', 'A04', 4)}
    ${step('last_call')}`;

  it('gives the Jugaad Kit to an agency missing one category, and eliminates the rest', () => {
    const out = sql(`${setup()} ${auction}
      select jsonb_path_query_array(r1_apply_jugaad('${KEEPER}'), '$[*].action');
      select id || ':' || status || ':' || coalesce(eliminated_in, '-') from agencies order by id;
      ${fund('A02')}
      select card_id || ':' || category from sales where phase = 'jugaad';
      select power_level from v_power_level where agency_id = 'A02';`);
    expect(out.slice(-8)).toEqual([
      '["jugaad_kit", "eliminated", "eliminated"]',
      'A01:active:-', 'A02:active:-', 'A03:eliminated:round1', 'A04:eliminated:round1',
      '27.0', 'JK1:Sidekick', '20',
    ]);
  });

  it.skipIf(!hasSecrets)('locks only when everyone left holds four cards, and the lock reveals news and Team-Ups', () => {
    expect(sqlError(`${setup()} ${auction} select r1_lock();`)).toMatch(/jugaad_pending/);
    const out = sql(`${setup()} ${auction}
      select r1_set_news_draw(array['N1','N2','N3','N4','N5','N6']);
      select 1 from (select r1_apply_jugaad('${KEEPER}')) x;
      select r1_lock();
      select count(*) from breaking_news where revealed_at is not null;
      select count(*) from team_ups where revealed_at is not null;
      select round1_locked_at is not null from event_state;`);
    expect(out.slice(-3)).toEqual(['6', '3', 't']);
    expect(sqlError(`${setup()} ${auction} select 1 from (select r1_apply_jugaad('${KEEPER}')) x; select r1_lock(); ${sale('H09', 'A01', 4)}`)).toMatch(/round1_locked/);
  });
});

describe.skipIf(!hasDb)('ledger fixes', () => {
  it('voiding a sale refunds it and puts the card back on sale', () => {
    expect(sql(`${setup()} ${sale('H05', 'A01', 6)}
      select ledger_void((select ledger_entry_id from sales where card_id = 'H05'), 'wrong paddle', '${KEEPER}');
      ${fund('A01')} ${sale('H05', 'A02', 5)} ${fund('A02')}`).slice(-3)).toEqual(['50.0', 'sold', '45.0']);
  });

  it('undo voids the last entry made by this ledger keeper only', () => {
    expect(sql(`${setup()} ${sale('H05', 'A01', 6, KEEPER)} ${sale('H06', 'A02', 6, OTHER)}
      select ledger_undo_last('${KEEPER}', '');
      ${fund('A01')} ${fund('A02')}`).slice(-2)).toEqual(['50.0', '44.0']);
  });

  it('adjustments need a reason and ₹0.5 steps; voids need a reason and happen once', () => {
    expect(sqlError(`${setup()} select ledger_adjust('A01', 2, '', '${KEEPER}');`)).toMatch(/reason_required/);
    expect(sqlError(`${setup()} select ledger_adjust('A01', 0.2, 'typo fix', '${KEEPER}');`)).toMatch(/bad_step/);
    expect(sql(`${setup()} select 1 from (select ledger_adjust('A01', -1.5, 'counted twice', '${KEEPER}')) x; ${fund('A01')}`).slice(-1)).toEqual(['48.5']);
    expect(sqlError(`${setup()} ${sale('H05', 'A01', 6)}
      select ledger_void((select ledger_entry_id from sales), 'x', '${KEEPER}');`)).toMatch(/reason_required/);
    expect(sqlError(`${setup()} ${sale('H05', 'A01', 6)}
      select ledger_void((select ledger_entry_id from sales), 'oops', '${KEEPER}');
      select ledger_void((select ledger_entry_id from sales), 'oops', '${KEEPER}');`)).toMatch(/already_void/);
  });

  it('after the lock, Round 1 purchases can no longer be voided (Power Levels are final)', () => {
    expect(sqlError(`${setup()}
      ${sale('H05', 'A01', 5)} ${sale('S05', 'A01', 5)} ${sale('G05', 'A01', 5)} ${sale('K05', 'A01', 5)}
      update agencies set status = 'eliminated' where id <> 'A01';
      select r1_lock();
      select ledger_void((select ledger_entry_id from sales where card_id = 'H05'), 'too late', '${KEEPER}');`)).toMatch(/round1_locked/);
  });
});
