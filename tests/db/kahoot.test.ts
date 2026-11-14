import { describe, expect, it } from 'vitest';
import { agency, hasDb, sql, sqlError } from './helpers';

const K = '00000000-0000-0000-0000-0000000000a1';
const rows = (r: [string, number, number][]) =>
  `'${JSON.stringify(r.map(([agency_id, kahoot_rank, score]) => ({ agency_id, kahoot_rank, score, correct: null, player: `${agency_id} x` })))}'::jsonb`;

describe.skipIf(!hasDb)('red alert: the prelim on Kahoot', () => {
  const setup = `${agency('A01')} ${agency('A02')} ${agency('A03')} update agencies set status = 'checked_in';
    update event_state set phase = 'prelim' where id;`;
  const on = `select prelim_set_kahoot(true, '123 4567', '${K}');`;

  it('turning it on records the PIN; off again clears a published board', () => {
    expect(sql(`${setup} ${on} select prelim_kahoot::text || ':' || prelim_kahoot_pin from event_state;`).at(-1)).toEqual('true:123 4567');
    expect(sql(`${setup} ${on} select prelim_save_kahoot(${rows([['A01', 1, 900]])}, '${K}'); select prelim_kahoot_publish();
      select prelim_set_kahoot(false, null, '${K}'); select prelim_kahoot::text || ':' || (prelim_published_at is null)::text from event_state;`).at(-1)).toEqual('false:true');
  });

  it('upload replaces the results, keeps only real agencies, and unpublishes', () => {
    const out = sql(`${setup} ${on}
      select prelim_save_kahoot(${rows([['A01', 1, 900], ['A02', 2, 800]])}, '${K}');
      select prelim_kahoot_publish();
      select prelim_save_kahoot(${rows([['A03', 1, 950], ['A01', 2, 900], ['A99', 3, 10]])}, '${K}');
      select string_agg(agency_id || '#' || kahoot_rank, ',' order by kahoot_rank) from prelim_kahoot_results;
      select (prelim_published_at is null)::text from event_state;`);
    expect(out.slice(-3)).toEqual(['2', 'A03#1,A01#2', 'true']);
  });

  it('needs the red alert on, results to publish, and stops once the top 16 are frozen', () => {
    expect(sqlError(`${setup} select prelim_save_kahoot(${rows([['A01', 1, 1]])}, '${K}');`)).toMatch(/kahoot/i);
    expect(sqlError(`${setup} ${on} select prelim_kahoot_publish();`)).toMatch(/kahoot|results/i);
    expect(sqlError(`${setup} ${on} select prelim_save_kahoot(${rows([['A01', 1, 1]])}, '${K}'); select prelim_kahoot_publish();
      select quiz_freeze_top16(array['A01']); select prelim_set_kahoot(false, null, '${K}');`)).toMatch(/frozen|phase/i);
  });

  it('Kahoot’s board freezes like the website’s, and a reset clears it all', () => {
    expect(sql(`${setup} ${on} select prelim_save_kahoot(${rows([['A02', 1, 900], ['A03', 2, 800], ['A01', 3, 10]])}, '${K}');
      select prelim_kahoot_publish(); select quiz_freeze_top16(array['A02', 'A03']);
      select string_agg(id || ':' || status, ',' order by id) from agencies;`).at(-1)).toEqual('A01:eliminated,A02:active,A03:active');
    expect(sql(`${setup} ${on} select prelim_save_kahoot(${rows([['A01', 1, 1]])}, '${K}');
      select admin_reset_event(true, '${K}');
      select (select count(*) from prelim_kahoot_results)::text || ':' || prelim_kahoot::text || ':' || coalesce(prelim_kahoot_pin, '-') from event_state;`).at(-1)).toEqual('0:false:-');
  });
});
