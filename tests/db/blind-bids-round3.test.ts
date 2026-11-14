import { describe, expect, it } from 'vitest';
import { agency, hasDb, sql, sqlError } from './helpers';

const K = '00000000-0000-0000-0000-0000000000a1';

// ---------------------------------------------------------------- blind bids on phones

describe.skipIf(!hasDb)('Secret Identity Bids typed on My Agency', () => {
  const setup = `
    ${agency('A01')} ${agency('A02')} ${agency('A03')}
    update agencies set status = 'active';
    update event_state set phase = 'round1', step = 'secret', prelim_frozen_at = now();
    select r1_start_funds('${K}');
    insert into agency_sessions (token_hash, agency_id, expires_at) values
      ('t1', 'A01', now() + interval '1 day'), ('t2', 'A02', now() + interval '1 day'), ('t3', 'A03', now() + interval '1 day');`;
  const open = (card = 'H05') => `select 1 from (select r1_open_bidding('${card}', 20, '${K}')) o;`;
  const bid = (t: string, amount: number | 'null') => `select 1 from (select r1_agency_bid('${t}', ${amount})) b;`;
  const close = `update event_state set bid_closes_at = clock_timestamp() - interval '1 second';`;
  const settle = `select coalesce(r1_settle_bidding('${K}'), 'none');`;
  const sold = `select coalesce(string_agg(card_id || ':' || agency_id || ':' || price, ','), 'unsold') from sales;`;

  it('the highest bid wins when the window closes, and the sale is recorded at once', () => {
    const out = sql(`${setup} ${open()} ${bid('t1', 6)} ${bid('t2', 9.5)} ${bid('t3', 7)} ${close} ${settle} ${sold} select fund_left('A02');`);
    expect(out.slice(-3)).toEqual(['A02', 'H05:A02:9.5', '40.5']);
  });

  it('a bid can be changed or withdrawn until the window closes', () => {
    expect(sql(`${setup} ${open()} ${bid('t1', 12)} ${bid('t2', 9)} ${bid('t1', 'null')} ${close} ${settle}`).at(-1)).toEqual('A02');
    expect(sql(`${setup} ${open()} ${bid('t1', 5)} ${bid('t1', 8)} ${close} ${settle} ${sold}`).slice(-2)).toEqual(['A01', 'H05:A01:8.0']);
  });

  it('a tie goes to the bid that reached the site first', () => {
    expect(sql(`${setup} ${open()} ${bid('t2', 7)} select pg_sleep(0.01); ${bid('t1', 7)} ${close} ${settle}`).at(-1)).toEqual('A02');
  });

  it('nothing is decided before the window closes, and it settles only once', () => {
    expect(sql(`${setup} ${open()} ${bid('t1', 6)} ${settle} ${sold}`).slice(-2)).toEqual(['none', 'unsold']);
    expect(sql(`${setup} ${open()} ${bid('t1', 6)} ${close} ${settle} ${settle} select count(*) from sales;`).slice(-3)).toEqual(['A01', 'none', '1']);
  });

  it('no valid bid leaves the card unsold for Last Call', () => {
    expect(sql(`${setup} ${open()} ${close} ${settle} ${sold}`).slice(-2)).toEqual(['none', 'unsold']);
  });

  it('refuses bids below the minimum, off the step, over the fund, in a held category, or after the window', () => {
    expect(sqlError(`${setup} ${open()} ${bid('t1', 4.5)}`)).toMatch(/below_minimum/);
    expect(sqlError(`${setup} ${open()} ${bid('t1', 6.3)}`)).toMatch(/bad_step/);
    expect(sqlError(`${setup} ${open()} ${bid('t1', 51)}`)).toMatch(/over_fund/);
    expect(sqlError(`${setup} select r1_record_sale('H06', 'A01', 5, '${K}'); ${open()} ${bid('t1', 6)}`)).toMatch(/category_held/);
    expect(sqlError(`${setup} ${open()} ${close} ${bid('t1', 6)}`)).toMatch(/bidding_closed/);
    expect(sqlError(`${setup} ${bid('t1', 6)}`)).toMatch(/bidding_closed/);
    expect(sqlError(`${setup} ${bid('nope', 6)}`)).toMatch(/not_signed_in/);
  });

  it('opens only for unsold Secret Identity cards, in the Secret step, one window at a time', () => {
    expect(sqlError(`${setup} ${open('H01')}`)).toMatch(/wrong_lot/);
    expect(sqlError(`${setup} update event_state set step = 'marquee'; ${open()}`)).toMatch(/not_secret/);
    expect(sqlError(`${setup} ${open()} ${open('H06')}`)).toMatch(/bidding_open/);
    // Opening the next card settles a window that closed but was never settled.
    expect(sql(`${setup} ${open()} ${bid('t1', 6)} ${close} ${open('H06')} ${sold}`).at(-1)).toEqual('H05:A01:6.0');
  });
});

// ---------------------------------------------------------------- Round 3 mini games

const agencies = (n: number) =>
  Array.from({ length: n }, (_, i) => agency(`A${String(i + 1).padStart(2, '0')}`)).join('\n') +
  `\nupdate agencies set status = 'active';
   insert into ledger_entries (agency_id, amount, reason) select id, 20, 'start_fund' from agencies;`;

describe.skipIf(!hasDb)('Round 3 mini games', () => {
  const map = `'{"E1":"City saved, statue unveiled","E2":"Trending #1 across India","E3":"Clean win, zero damage","E4":"Clean win, zero damage","E5":"Saved the day, just about","E6":"₹100 crore property damage bill","E7":"₹100 crore property damage bill","E8":"Villain escaped"}'::jsonb`;
  const deal = `'{"A01":"E1","A02":"E2","A03":"E3","A04":"E4","A05":"E5","A06":"E6","A07":"E7","A08":"E8"}'::jsonb`;
  const r3 = `${agencies(8)} update event_state set phase = 'round3';
    select r3_set_envelope_contents(${map}, '${K}'); select r3_deal(${deal}, '${K}');`;
  const mg = (no: number, winner: string | null, choice: string, target: string | null = null, ff = false) =>
    `select 1 from (select r3_record_minigame(${no}, ${winner ? `'${winner}'` : 'null'}, '${choice}', ${target ? `'${target}'` : 'null'}, ${ff}, '${K}')) m${no};`;
  const holder = (e: string) => `select holder_agency_id from v_envelope_holders where envelope_id = '${e}';`;
  const shield = `insert into agency_sessions (token_hash, agency_id, expires_at) values ('f5', 'A05', now() + interval '1 day');
    select 1 from (select r3_open_ff_window(60, '${K}')) w; select 1 from (select r3_agency_buy_ff('f5')) b;`;

  it('a swap moves the two envelopes', () => {
    expect(sql(`${r3} ${mg(1, 'A01', 'swap', 'A05')} ${holder('E1')} ${holder('E5')}`).slice(-2)).toEqual(['A05', 'A01']);
  });

  it('cash is ₹5 Cr; an X-Ray is logged; no winner is recorded too', () => {
    expect(sql(`${r3} ${mg(1, 'A02', 'cash')} select fund_left('A02');`).at(-1)).toEqual('25.0');
    expect(sql(`${r3} ${mg(1, 'A03', 'xray', 'A04')} select agency_id || '>' || target_agency_id from xray_log;`).at(-1)).toEqual('A03>A04');
    expect(sql(`${r3} ${mg(1, null, 'none')} select choice from missions where no = 1;`).at(-1)).toEqual('none');
  });

  it('a Force Field played against a swap blocks it, uses the shield and the choice', () => {
    const out = sql(`${r3} ${shield} ${mg(1, 'A01', 'swap', 'A05', true)} ${holder('E1')} ${holder('E5')}
      select (used_at is not null)::text from force_fields where agency_id = 'A05';
      select choice || ':' || ff_blocked from missions where no = 1;`);
    expect(out.slice(-4)).toEqual(['A01', 'A05', 'true', 'swap:true']);
    expect(sqlError(`${r3} ${mg(1, 'A01', 'swap', 'A06', true)}`)).toMatch(/no_force_field/);
    expect(sqlError(`${r3} ${shield} ${mg(1, 'A01', 'swap', 'A05', true)} ${mg(2, 'A02', 'swap', 'A05', true)}`)).toMatch(/no_force_field/);
  });

  it('mini games are recorded in order and undone from the last one', () => {
    expect(sqlError(`${r3} ${mg(2, 'A01', 'cash')}`)).toMatch(/previous_mission/);
    expect(sqlError(`${r3} ${mg(1, 'A01', 'cash')} ${mg(1, 'A02', 'cash')}`)).toMatch(/choice_made/);
    expect(sqlError(`${r3} ${mg(1, 'A01', 'cash')} ${mg(2, 'A02', 'cash')} select r3_undo_minigame(1, '${K}');`)).toMatch(/later_mission/);
    const undone = sql(`${r3} ${mg(1, 'A01', 'swap', 'A05')} ${mg(2, 'A02', 'cash')}
      select 1 from (select r3_undo_minigame(2, '${K}')) u2; select 1 from (select r3_undo_minigame(1, '${K}')) u1;
      ${holder('E1')} select fund_left('A02'); select count(*) from missions where choice is not null;`);
    expect(undone.slice(-3)).toEqual(['A01', '20.0', '0']);
    expect(sql(`${r3} ${shield} ${mg(1, 'A01', 'swap', 'A05', true)} select 1 from (select r3_undo_minigame(1, '${K}')) u;
      select (used_at is null)::text from force_fields where agency_id = 'A05';`).at(-1)).toEqual('true');
  });

  it('needs the envelopes first, and the envelopes are fixed once a mini game is in', () => {
    expect(sqlError(`${agencies(8)} update event_state set phase = 'round3'; ${mg(1, 'A01', 'cash')}`)).toMatch(/no_deal/);
    expect(sqlError(`${r3} ${mg(1, 'A01', 'cash')} select r3_deal(${deal}, '${K}');`)).toMatch(/missions_started/);
  });

  it('Zero Hour opens ten envelopes', () => {
    const map10 = `'{"E1":"City saved, statue unveiled","E2":"Trending #1 across India","E3":"Clean win, zero damage","E4":"Clean win, zero damage","E5":"Clean win, zero damage","E6":"Saved the day, just about","E7":"Saved the day, just about","E8":"Saved the day, just about","E9":"₹100 crore property damage bill","E10":"Villain escaped"}'::jsonb`;
    const deal10 = `'{${Array.from({ length: 10 }, (_, i) => `"A${String(i + 1).padStart(2, '0')}":"E${i + 1}"`).join(',')}}'::jsonb`;
    const out = sql(`${agencies(10)} update event_state set phase = 'round3';
      select r3_set_envelope_contents(${map10}, '${K}'); select r3_deal(${deal10}, '${K}');
      update event_state set phase = 'zero_hour';
      ${Array.from({ length: 10 }, () => `select 1 from (select zh_next_reveal('${K}')) r;`).join(' ')}
      select count(*) from reveals;`);
    expect(out.at(-1)).toEqual('10');
  });
});
