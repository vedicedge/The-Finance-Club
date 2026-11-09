import { describe, expect, it } from 'vitest';
import { agency, hasDb, hasSecrets, sql, sqlError } from './helpers';

const K = '00000000-0000-0000-0000-0000000000a1';

// n agencies in the game with ₹20 Cr each.
const agencies = (n: number) =>
  Array.from({ length: n }, (_, i) => agency(`A${String(i + 1).padStart(2, '0')}`)).join('\n') +
  `\nupdate agencies set status = 'active';
   insert into ledger_entries (agency_id, amount, reason) select id, 20, 'start_fund' from agencies;`;
const ids = (n: number) => Array.from({ length: n }, (_, i) => `'A${String(i + 1).padStart(2, '0')}'`).join(',');

describe.skipIf(!hasDb)('Round 2', () => {
  const r2 = (n: number) => `${agencies(n)} update event_state set phase = 'round2';`;
  const tower = (a: string, correct: number, time = 360) => `select r2_save_tower('${a}', ${correct}, 20, ${time}, 20, 10, '${K}');`;

  it('draws random pairings with one bye for an odd number', () => {
    expect(sql(`${r2(5)} select r2_draw_pairings();
      select count(*) filter (where agency_b is null), count(*) from poster_duels;`)).toEqual(['3', '1|3']);
  });

  it('a tie in story votes needs the rock-paper-scissors winner', () => {
    expect(sqlError(`${r2(2)} select r2_draw_pairings();
      select r2_set_votes((select id from poster_duels), 10, 10, null);`)).toMatch(/tie_needs_rps/);
    expect(sql(`${r2(2)} select r2_draw_pairings();
      select r2_set_votes((select id from poster_duels), 10, 10, (select agency_b from poster_duels));
      select winner = agency_b from poster_duels;`)).toEqual(['1', 't']);
  });

  it('publishing needs every tower result and every duel decided', () => {
    expect(sqlError(`${r2(2)} select r2_draw_pairings(); ${tower('A01', 18)}
      select r2_publish(array['A01','A02'], '${K}');`)).toMatch(/tower_missing/);
    expect(sqlError(`${r2(2)} select r2_draw_pairings(); ${tower('A01', 18)} ${tower('A02', 10)}
      select r2_publish(array['A01','A02'], '${K}');`)).toMatch(/duel_undecided/);
  });

  it('publishing keeps the top 8, eliminates the rest, and pays +₹5 Cr only to qualified duel winners', () => {
    // 10 agencies; A01–A08 qualify. Duel winners are forced by votes: the "a" side wins.
    const out = sql(`${r2(10)} select r2_draw_pairings();
      update poster_duels set votes_a = 10, votes_b = case when agency_b is null then null else 5 end;
      ${Array.from({ length: 10 }, (_, i) => tower(`A${String(i + 1).padStart(2, '0')}`, 20 - i)).join(' ')}
      select r2_publish(array[${ids(8)}], '${K}');
      select count(*) from agencies where status = 'active';
      select count(*) from agencies where status = 'eliminated' and eliminated_in = 'round2';
      select bool_and(d.winner = any (array[${ids(8)}])) = bool_and(exists (select 1 from ledger_entries e where e.reason = 'poster_bonus' and e.agency_id = d.winner))
        from poster_duels d;
      select count(*) = (select count(*) from poster_duels where winner = any (array[${ids(8)}])) from ledger_entries where reason = 'poster_bonus';`);
    expect(out.slice(-4)).toEqual(['8', '2', 't', 't']);
  });
});

describe.skipIf(!hasDb)('Round 3', () => {
  const map = `'{"E1":"City saved, statue unveiled","E2":"Trending #1 across India","E3":"Clean win, zero damage","E4":"Clean win, zero damage","E5":"Saved the day, just about","E6":"₹100 crore property damage bill","E7":"₹100 crore property damage bill","E8":"Villain escaped"}'::jsonb`;
  const deal = `'{"A01":"E1","A02":"E2","A03":"E3","A04":"E4","A05":"E5","A06":"E6","A07":"E7","A08":"E8"}'::jsonb`;
  const r3 = `${agencies(8)} update event_state set phase = 'round3';
    select r3_set_envelope_contents(${map}, '${K}'); select r3_deal(${deal}, '${K}');`;
  const holder = (e: string) => `select holder_agency_id from v_envelope_holders where envelope_id = '${e}';`;
  const fund = (a: string) => `select fund_left('${a}');`;

  it('the multiplier map must match the spec distribution', () => {
    expect(sqlError(`select r3_set_envelope_contents(replace(${map}::text, 'Villain escaped', 'Clean win, zero damage')::jsonb, '${K}');`))
      .toMatch(/bad_distribution/);
  });

  it('the deal gives every finalist a different envelope', () => {
    expect(sql(`${r3} ${holder('E3')}`)).toEqual(['A03']);
    expect(sqlError(`${agencies(8)} update event_state set phase = 'round3';
      select r3_deal('{"A01":"E1","A02":"E1","A03":"E3","A04":"E4","A05":"E5","A06":"E6","A07":"E7","A08":"E8"}'::jsonb, '${K}');`)).toMatch(/bad_deal/);
  });

  it('Force Fields: only in the window, ₹5 Cr, once per mission — and they block swaps', () => {
    expect(sqlError(`${r3} select r3_set_mission(1, 'play'); select r3_force_field('A02', '${K}');`)).toMatch(/window_closed/);
    expect(sqlError(`${r3} select r3_set_mission(1, 'force_field'); select r3_force_field('A02', '${K}'); select r3_force_field('A02', '${K}');`))
      .toMatch(/already_protected/);
    expect(sqlError(`${r3} select r3_set_mission(1, 'force_field'); select r3_force_field('A02', '${K}');
      select r3_set_winner(1, 'A01', '${K}'); select r3_set_mission(1, 'choice'); select r3_choose(1, 'swap', 'A02', '${K}');`))
      .toMatch(/target_protected/);
  });

  it('a swap exchanges envelopes; undo puts them back', () => {
    const base = `${r3} select r3_set_winner(1, 'A01', '${K}'); select r3_set_mission(1, 'choice');
      select r3_choose(1, 'swap', 'A08', '${K}');`;
    expect(sql(`${base} ${holder('E1')} ${holder('E8')} select choice || ':' || swap_target from missions where no = 1;`))
      .toEqual(['A08', 'A01', 'swap:A08']);
    expect(sql(`${base} select r3_undo_choice(1, '${K}'); ${holder('E1')} ${holder('E8')}`)).toEqual(['A01', 'A08']);
  });

  it('X-Ray goes to the secret log and nowhere public; cash pays +₹6 Cr', () => {
    expect(sql(`${r3} select r3_set_winner(1, 'A01', '${K}'); select r3_set_mission(1, 'choice');
      select r3_choose(1, 'xray', 'A05', '${K}');
      select target_agency_id from xray_log; select swap_target is null from v_public_missions where no = 1;`)).toEqual(['A05', 't']);
    expect(sql(`${r3} select r3_set_winner(2, 'A03', '${K}'); select r3_set_mission(2, 'choice');
      select r3_choose(2, 'cash', null, '${K}'); ${fund('A03')}`)).toEqual(['26.0']);
  });

  it('choices only in their window; mission 4 chooses at Zero Hour', () => {
    expect(sqlError(`${r3} select r3_set_winner(1, 'A01', '${K}'); select r3_choose(1, 'cash', null, '${K}');`)).toMatch(/not_choice_window/);
    expect(sqlError(`${r3} select r3_set_mission(4, 'choice');`)).toMatch(/mission4_at_zero_hour/);
    expect(sql(`${r3} select r3_set_winner(4, 'A06', '${K}'); update event_state set phase = 'zero_hour';
      select r3_choose(4, 'cash', null, '${K}'); ${fund('A06')}`)).toEqual(['26.0']);
  });

  it('Chai Pe Charcha transfers: any time in Round 3, ₹0.5 steps, payer fund — two entries, one transaction', () => {
    const chai = `${r3} select r3_set_mission(2, 'chai');`;
    expect(sql(`${chai} select 1 from (select r3_transfer('A01', 'A02', 7.5, 'info deal', '${K}')) x; ${fund('A01')} ${fund('A02')}
      select count(distinct txn_id) from ledger_entries where reason = 'transfer';`)).toEqual(['1', '12.5', '27.5', '1']);
    expect(sqlError(`${chai} select r3_transfer('A01', 'A02', 20.5, '', '${K}');`)).toMatch(/insufficient_fund/);
    expect(sqlError(`${chai} select r3_transfer('A01', 'A02', 0.3, '', '${K}');`)).toMatch(/bad_step/);
    expect(sql(`${r3} select 1 from (select r3_transfer('A01', 'A02', 1, '', '${K}')) x; ${fund('A01')}`)).toEqual(['1', '19.0']);
    expect(sqlError(`${r3} update event_state set phase = 'zero_hour' where id; select r3_transfer('A01', 'A02', 1, '', '${K}');`)).toMatch(/window_closed/);
  });

  it('a fine always applies, even below zero', () => {
    expect(sql(`${r3} select r3_fine('A04', '', '${K}'); select r3_fine('A04', '', '${K}'); select r3_fine('A04', '', '${K}');
      select r3_fine('A04', '', '${K}'); select r3_fine('A04', '', '${K}'); ${fund('A04')}`)).toEqual(['-5.0']);
  });
});

describe.skipIf(!hasDb)('Zero Hour reveal', () => {
  const map = `'{"E1":"City saved, statue unveiled","E2":"Trending #1 across India","E3":"Clean win, zero damage","E4":"Clean win, zero damage","E5":"Saved the day, just about","E6":"₹100 crore property damage bill","E7":"₹100 crore property damage bill","E8":"Villain escaped"}'::jsonb`;
  const deal = `'{"A01":"E1","A02":"E2","A03":"E3","A04":"E4","A05":"E5","A06":"E6","A07":"E7","A08":"E8"}'::jsonb`;
  // Power Level: give each agency one card so A08 is weakest and A01 strongest.
  const powers = Array.from({ length: 8 }, (_, i) => {
    const a = `A${String(i + 1).padStart(2, '0')}`;
    const card = ['H01', 'H02', 'H03', 'H05', 'H08', 'H12', 'S12', 'K12'][i];
    return `with e as (insert into ledger_entries (agency_id, amount, reason) values ('${a}', -1, 'gear') returning id)
            insert into sales (card_id, agency_id, category, price, phase, ledger_entry_id) select '${card}', '${a}', 'HQ', 1, 'secret', id from e;`;
  }).join('\n');
  const zh = `${Array.from({ length: 8 }, (_, i) => agency(`A${String(i + 1).padStart(2, '0')}`)).join('\n')}
    update agencies set status = 'active';
    insert into ledger_entries (agency_id, amount, reason) select id, 20, 'start_fund' from agencies;
    ${powers}
    update event_state set phase = 'round3';
    select r3_set_envelope_contents(${map}, '${K}'); select r3_deal(${deal}, '${K}');
    update event_state set phase = 'zero_hour';`;

  it('opens envelopes in ascending Power Level and computes the Hero Score', () => {
    const out = sql(`${zh}
      select zh_next_reveal('${K}'); select zh_next_reveal('${K}');
      select agency_id || '|' || power_level || '|' || multiplier || '|' || fund_left || '|' || hero_score::numeric(8,2) from v_hero_scores order by reveal_order;`);
    // A08 holds Cousin Bunty (Power 2) → E8 ×0.25. A06 and A07 both have Power 3; the tie goes
    // by agency ID, so A06 (E6, ×0.5) opens next. Fund 19 each.
    expect(out).toEqual(['E8', 'E6', 'A08|2|0.25|19.0|10.00', 'A06|3|0.50|19.0|11.00']);
  });

  it('waits for Mission 4\'s choice, then stops after the eighth envelope', () => {
    expect(sqlError(`${zh} select r3_set_winner(4, 'A01', '${K}'); select zh_next_reveal('${K}');`)).toMatch(/mission4_choice_pending/);
    expect(sqlError(`${zh} ${Array(9).fill(`select zh_next_reveal('${K}');`).join(' ')}`)).toMatch(/all_revealed/);
  });
});

describe.skipIf(!hasDb)('reset for the real event', () => {
  it.skipIf(!hasSecrets)('clears the event but keeps registrations when asked', () => {
    expect(sql(`${agencies(3)} update event_state set phase = 'round1', prelim_published_at = now();
      update questions set status = 'closed', opened_at = now(), revealed_at = now(), order_no = 1 where id = 'M1';
      select admin_reset_event(true, '${K}');
      select count(*) from agencies; select count(*) from ledger_entries; select string_agg(distinct status, ',') from agencies;
      select phase || '|' || (prelim_published_at is null) from event_state; select status || '|' || (order_no is null) from questions where id = 'M1';`))
      .toEqual(['3', '0', 'registered', 'registration|true', 'pending|true']);
  });

  it('or clears registrations too', () => {
    expect(sql(`${agencies(3)} update event_state set phase = 'round3';
      select admin_reset_event(false, '${K}'); select count(*) from agencies; select count(*) from founders; select count(*) from missions;`))
      .toEqual(['0', '0', '4']);
  });
});
