import { describe, expect, it } from 'vitest';
import { agency, hasDb, sql } from './helpers';

const sale = (agencyId: string, card: string, category: string, price: number) => `
  with e as (insert into ledger_entries (agency_id, amount, reason, ref)
             values ('${agencyId}', ${-price}, 'gear', 'card:${card}') returning id)
  insert into sales (card_id, agency_id, category, price, phase, ledger_entry_id)
  select '${card}', '${agencyId}', '${category}', ${price}, 'secret', id from e;`;

describe.skipIf(!hasDb)('Power Level', () => {
  // Made-up Team-Up and news rows (deliberately NOT the real secret ones), so these tests
  // neither depend on nor reveal the secret seed.
  const setup = `${agency('A01')}
    insert into ledger_entries (agency_id, amount, reason) values ('A01', 50, 'start_fund');
    ${sale('A01', 'H03', 'HQ', 7)} ${sale('A01', 'G12', 'Gadget', 2)}
    ${sale('A01', 'S12', 'Suit', 2)} ${sale('A01', 'K08', 'Sidekick', 4)}
    insert into team_ups (id, name, gear_a, gear_b) values (99, 'Test pair', 'Cyber City Glass Tower', 'Mosquito-Bat Taser');
    insert into breaking_news (id, headline, affects_gear, delta, draw_order) values
      ('N98', 'Test recall', 'Mosquito-Bat Taser', -2, 5), ('N99', 'Test boost', 'Gully Cricket Pads', 3, null);`;
  const level = `select cards || '|' || gear_power || '|' || team_up_bonus || '|' || news_delta || '|' || power_level
                   from v_power_level where agency_id = 'A01';`;

  it('counts only gear until Team-Ups and news are revealed', () => {
    expect(sql(`${setup} ${level}`)).toEqual(['4|19|0|0|19']);
  });

  it('adds +3 per revealed Team-Up and revealed news deltas on held gear', () => {
    expect(sql(`${setup}
      update team_ups set revealed_at = now() where id = 99;
      update breaking_news set revealed_at = now() where id = 'N98';
      ${level}`)).toEqual(['4|19|3|-2|20']);
  });

  it('a Jugaad Kit sale counts as Power 2 in the missing category', () => {
    expect(sql(`${agency('A02')}
      insert into ledger_entries (agency_id, amount, reason) values ('A02', 50, 'start_fund');
      ${sale('A02', 'H05', 'HQ', 5)} ${sale('A02', 'S05', 'Suit', 5)} ${sale('A02', 'G05', 'Gadget', 5)}
      with e as (insert into ledger_entries (agency_id, amount, reason, ref)
                 values ('A02', -8, 'jugaad_kit', 'card:JK1') returning id)
      insert into sales (card_id, agency_id, category, price, phase, ledger_entry_id)
      select 'JK1', 'A02', 'Sidekick', 8, 'jugaad', id from e;
      select power_level from v_power_level where agency_id = 'A02';
      select fund_left from v_fund_left where agency_id = 'A02';`)).toEqual(['20', '27.0']);
  });
});

describe.skipIf(!hasDb)('prelim totals', () => {
  it('exclude void questions and sudden death, and sum correct-answer time for tie-break 1', () => {
    expect(sql(`${agency('A01')}
      insert into questions (id, segment, prompt, options, timer_s, weight, status) values
        ('M90', 'marvel_ya_dc', 'Test?', array['Marvel','DC'], 10, 1, 'closed'),
        ('B90', 'box_office', 'Test?', array['a','b','c','d'], 20, 2, 'closed'),
        ('H90', 'hero_business', 'Void?', array['a','b','c','d'], 10, 1, 'void'),
        ('S90', 'sudden_death', 'SD?', array['a','b','c','d'], 20, 1, 'closed');
      insert into answers (agency_id, question_id, option_index, response_time_s, is_correct, points) values
        ('A01', 'M90', 1, 2.0, true, quiz_points(2.0, 10, 1, true)),
        ('A01', 'B90', 3, 12.0, true, quiz_points(12.0, 20, 2, true)),
        ('A01', 'H90', 0, 1.0, true, 950),
        ('A01', 'S90', 1, 3.0, true, 0);
      select total_points || '|' || correct_count || '|' || correct_time_s from v_prelim_scores where agency_id = 'A01';`))
      .toEqual(['2300|2|14.0']);
  });

  it('answers are written once and never edited', () => {
    expect(() => sql(`${agency('A01')}
      insert into questions (id, segment, prompt, options, timer_s, weight) values
        ('M90', 'marvel_ya_dc', 'Test?', array['Marvel','DC'], 10, 1);
      insert into answers (agency_id, question_id, option_index, response_time_s, is_correct, points)
        values ('A01', 'M90', 0, 1.0, false, 0);
      update answers set option_index = 1;`)).toThrow(/append-only/);
  });

  it('response time is database time rounded to 0.1 s, halves up', () => {
    expect(sql(`select response_time_s('2026-11-25 12:10:00+00', '2026-11-25 12:10:10.04+00'),
                       response_time_s('2026-11-25 12:10:00+00', '2026-11-25 12:10:10.05+00'),
                       response_time_s('2026-11-25 12:10:00+00', '2026-11-25 12:10:02.000001+00');`))
      .toEqual(['10.0|10.1|2.0']);
  });
});

describe.skipIf(!hasDb)('Round 2', () => {
  it('Tower Score view matches the spec example (68.33)', () => {
    expect(sql(`${agency('A01')}
      insert into tower_results (agency_id, correct_blocks, reference_blocks, build_time_s, frozen_blocks, blocks_fallen)
      values ('A01', 18, 20, 360, 20, 15);
      select round(accuracy, 2) || '|' || round(speed, 2) || '|' || round(destruction, 2) || '|' || round(tower_score, 2)
        from v_tower_scores;`)).toEqual(['90.00|40.00|75.00|68.33']);
  });

  it('poster duel winner: more likes wins, a tie goes to the rock-paper-scissors winner, a bye wins', () => {
    expect(sql(`${agency('A01')} ${agency('A02')} ${agency('A03')} ${agency('A04')} ${agency('A05')}
      insert into poster_duels (agency_a, agency_b, likes_a, likes_b) values ('A01', 'A02', 40, 52);
      insert into poster_duels (agency_a, agency_b, likes_a, likes_b, tiebreak_winner) values ('A03', 'A04', 30, 30, 'A03');
      insert into poster_duels (agency_a, agency_b) values ('A05', null);
      select winner from poster_duels order by id;`)).toEqual(['A02', 'A03', 'A05']);
  });
});

describe.skipIf(!hasDb)('Round 3 and Zero Hour', () => {
  const setup = `${agency('A01')} ${agency('A02')}
    insert into envelope_moves (envelope_id, to_agency, kind) values ('E1', 'A01', 'deal'), ('E2', 'A02', 'deal');`;

  it('envelope holders follow deals and swaps, and a voided swap is undone', () => {
    const swap = `insert into envelope_moves (envelope_id, mission, from_agency, to_agency, kind, move_group) values
      ('E1', 1, 'A01', 'A02', 'swap', '00000000-0000-0000-0000-0000000000aa'),
      ('E2', 1, 'A02', 'A01', 'swap', '00000000-0000-0000-0000-0000000000aa');`;
    const holders = `select envelope_id || '=' || coalesce(holder_agency_id, '-') from v_envelope_holders
                      where envelope_id in ('E1', 'E2') order by envelope_id;`;
    expect(sql(`${setup} ${holders}`)).toEqual(['E1=A01', 'E2=A02']);
    expect(sql(`${setup} ${swap} ${holders}`)).toEqual(['E1=A02', 'E2=A01']);
    expect(sql(`${setup} ${swap}
      update envelope_moves set voided_at = now() where move_group = '00000000-0000-0000-0000-0000000000aa';
      ${holders}`)).toEqual(['E1=A01', 'E2=A02']);
  });

  it('Hero Score appears only for revealed envelopes and matches the spec example (51)', () => {
    // Power 28 (8 + 8 + 6 + 6) and fund ₹18 Cr (50 − 25 in gear − 5 fine − 2 tip).
    const body = `${setup}
      insert into ledger_entries (agency_id, amount, reason) values ('A01', 50, 'start_fund');
      ${sale('A01', 'H03', 'HQ', 7)} ${sale('A01', 'S03', 'Suit', 7)}
      ${sale('A01', 'G05', 'Gadget', 5.5)} ${sale('A01', 'K05', 'Sidekick', 5.5)}
      insert into ledger_entries (agency_id, amount, reason) values ('A01', -5, 'fine'), ('A01', -2, 'tip');
      insert into envelope_contents (envelope_id, outcome_label) values ('E1', 'Clean win, zero damage');`;
    expect(sql(`${body} select count(*) from v_hero_scores;`)).toEqual(['0']);
    expect(sql(`${body}
      insert into reveals (envelope_id, reveal_order) values ('E1', 1);
      select agency_id || '|' || power_level || '|' || multiplier || '|' || fund_left || '|' || hero_score::numeric(8,2)
        from v_hero_scores;`)).toEqual(['A01|28|1.50|18.0|51.00']);
  });
});
