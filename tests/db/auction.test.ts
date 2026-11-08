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

describe.skipIf(!hasDb || !hasSecrets)('self-service Insider Tips (1-minute window)', () => {
  const drawn = `select r1_set_news_draw(array['N1','N2','N3','N4','N5','N6']);`;
  const sessions = `insert into agency_sessions (token_hash, agency_id, expires_at) values
    ('t1', 'A01', now() + interval '1 day'), ('t2', 'A02', now() + interval '1 day');`;
  const open = `select r1_open_tips_window(60, '${KEEPER}') > clock_timestamp() + interval '55 seconds';`;

  it('opens a timed window in the Tips step, only once funds are credited and news is drawn', () => {
    expect(sql(`${setup('rules')} ${drawn} ${open} select step from event_state;`).slice(-2)).toEqual(['t', 'tips']);
    expect(sqlError(`${setup('rules')} select r1_open_tips_window(60, '${KEEPER}');`)).toMatch(/news_not_drawn/);
    expect(sqlError(`${setup('rules')} ${drawn} select r1_open_tips_window(5, '${KEEPER}');`)).toMatch(/bad_window/);
  });

  it('an agency buys its own tip in the window: ₹2 Cr, a random drawn card, once', () => {
    const out = sql(`${setup('rules')} ${drawn} ${sessions} ${open}
      select r1_agency_buy_tip('t1') in ('N1','N2','N3','N4','N5','N6');
      ${fund('A01')} select count(*) from insider_tips where agency_id = 'A01' and created_by is null;`);
    expect(out.slice(-3)).toEqual(['t', '48.0', '1']);
    expect(sqlError(`${setup('rules')} ${drawn} ${sessions} ${open}
      select r1_agency_buy_tip('t1'); select r1_agency_buy_tip('t1');`)).toMatch(/tip_already_bought/);
  });

  it('is refused before the window opens, after it closes, and without a valid session', () => {
    expect(sqlError(`${setup('tips')} ${drawn} ${sessions} select r1_agency_buy_tip('t1');`)).toMatch(/tips_closed/);
    expect(sqlError(`${setup('rules')} ${drawn} ${sessions} ${open}
      update event_state set tips_closes_at = clock_timestamp() - interval '1 second';
      select r1_agency_buy_tip('t1');`)).toMatch(/tips_closed/);
    expect(sqlError(`${setup('rules')} ${drawn} ${sessions} ${open} update event_state set step = 'marquee';
      select r1_agency_buy_tip('t1');`)).toMatch(/tips_closed/);
    expect(sqlError(`${setup('rules')} ${drawn} ${open} select r1_agency_buy_tip('nope');`)).toMatch(/not_signed_in/);
  });

  it('an agency out of the game cannot buy', () => {
    expect(sqlError(`${setup('rules')} ${drawn} ${sessions} ${open}
      update agencies set status = 'eliminated', eliminated_in = 'prelim' where id = 'A02';
      select r1_agency_buy_tip('t2');`)).toMatch(/not_active|not in the game|agency/i);
  });
});

describe.skipIf(!hasDb || !hasSecrets)('Breaking News recap on the projector', () => {
  const drawn = `select r1_set_news_draw(array['N1','N2','N3','N4','N5','N6']);`;

  it('only once every drawn headline and every Team-Up is revealed', () => {
    expect(sqlError(`${setup('news')} select r1_show_news_recap(true);`)).toMatch(/news_not_drawn/);
    expect(sqlError(`${setup('news')} ${drawn} select r1_reveal_next_news(); select r1_show_news_recap(true);`)).toMatch(/news_not_all_revealed/);
    expect(sqlError(`${setup('news')} ${drawn} select r1_reveal_next_news() from generate_series(1, 6);
      select r1_show_news_recap(true);`)).toMatch(/news_not_all_revealed/);
    expect(sql(`${setup('news')} ${drawn} select r1_reveal_next_news() from generate_series(1, 6); select r1_reveal_team_ups();
      select r1_show_news_recap(true); select r1_screen from event_state;
      select r1_show_news_recap(false); select coalesce(r1_screen, 'normal') from event_state;`).slice(-2)).toEqual(['news_recap', 'normal']);
  });

  it('works after the lock, and the reset turns it off', () => {
    expect(sql(`${setup('news')} ${drawn} update event_state set round1_locked_at = now();
      update breaking_news set revealed_at = now() where draw_order is not null; update team_ups set revealed_at = now();
      select r1_show_news_recap(true);
      select admin_reset_event(true, '${KEEPER}');
      select coalesce(r1_screen, 'off') || '|' || coalesce(tips_closes_at::text, 'none') from event_state;`).slice(-1)).toEqual(['off|none']);
  });
});

describe.skipIf(!hasDb)('closing Round 1', () => {
  // A01 holds all four, A02 misses one with money, A03 misses one without ₹8 Cr, A04 misses two
  // with ₹42 Cr left.
  const auction = `
    ${sale('H05', 'A01', 5)} ${sale('S05', 'A01', 5)} ${sale('G05', 'A01', 5)} ${sale('K05', 'A01', 5)}
    ${sale('H06', 'A02', 5)} ${sale('S06', 'A02', 5)} ${sale('G06', 'A02', 5)}
    ${sale('H07', 'A03', 10)} ${sale('S07', 'A03', 10)} ${sale('G07', 'A03', 25)}
    ${sale('H08', 'A04', 4)} ${sale('S08', 'A04', 4)}
    ${step('last_call')}`;

  it('gives a Jugaad Kit for every missing category to agencies that can pay, and eliminates the rest', () => {
    const out = sql(`${setup()} ${auction}
      select jsonb_path_query_array(r1_apply_jugaad('${KEEPER}'), '$[*].action');
      select id || ':' || status || ':' || coalesce(eliminated_in, '-') from agencies order by id;
      ${fund('A02')} ${fund('A04')}
      select agency_id || ':' || card_id || ':' || category from sales where phase = 'jugaad' order by card_id;
      select agency_id || ':' || power_level from v_power_level where agency_id in ('A02', 'A04') order by agency_id;`);
    expect(out.slice(-12)).toEqual([
      '["jugaad_kit", "eliminated", "jugaad_kit", "jugaad_kit"]',
      'A01:active:-', 'A02:active:-', 'A03:eliminated:round1', 'A04:active:-',
      '27.0', '26.0', // A02 paid ₹8 Cr for one kit, A04 ₹16 Cr for two
      'A02:JK1:Sidekick', 'A04:JK2:Gadget', 'A04:JK3:Sidekick',
      'A02:20', 'A04:14',
    ]);
  });

  it('eliminates an agency that cannot pay ₹8 Cr for every kit it needs', () => {
    // A01–A03 hold all four; A04 misses two (₹16 Cr needed) but has only ₹12 Cr left.
    const full = (a: string, n: string) => ['H', 'S', 'G', 'K'].map((c) => sale(`${c}${n}`, a, 5)).join(' ');
    const short = `${full('A01', '05')} ${full('A02', '06')} ${full('A03', '07')}
      ${sale('H09', 'A04', 4)} ${sale('S09', 'A04', 34)} ${step('last_call')}`;
    expect(sql(`${setup()} ${short}
      ${fund('A04')}
      select jsonb_path_query_array(r1_apply_jugaad('${KEEPER}'), '$[*] ? (@.agency == "A04").action');
      select status from agencies where id = 'A04';
      select count(*) from sales where agency_id = 'A04' and phase = 'jugaad';`).slice(-4)).toEqual([
      '12.0', '["eliminated"]', 'eliminated', '0',
    ]);
  });

  it('stops without applying anything when the four Jugaad Kits run out', () => {
    // Each of the four agencies misses two categories and can pay: eight kits needed, four exist.
    const thin = `${sale('H05', 'A01', 5)} ${sale('S05', 'A01', 5)} ${sale('H06', 'A02', 5)} ${sale('S06', 'A02', 5)}
      ${sale('H07', 'A03', 5)} ${sale('S07', 'A03', 5)} ${sale('H08', 'A04', 4)} ${sale('S08', 'A04', 4)} ${step('last_call')}`;
    expect(sqlError(`${setup()} ${thin} select r1_apply_jugaad('${KEEPER}');`)).toMatch(/no_jugaad_kit_left/);
    expect(sql(`${setup()} ${thin} select count(*) from gear_cards where phase = 'jugaad';`).slice(-1)).toEqual(['4']);
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
