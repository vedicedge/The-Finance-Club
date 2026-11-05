import { describe, expect, it } from 'vitest';
import { hasDb, sql, sqlError } from './helpers';

describe.skipIf(!hasDb)('database security', () => {
  it('Row Level Security is on for every table', () => {
    expect(sql(`select relname from pg_class
                 where relnamespace = 'public'::regnamespace and relkind = 'r' and not relrowsecurity;`)).toEqual([]);
  });

  it('browser roles (anon, authenticated) have no access to any table or view', () => {
    const leaks = sql(`
      select r.rolname || ' → ' || c.relname
        from pg_class c
        cross join (values ('anon'), ('authenticated')) as r(rolname)
       where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'v', 'S')
         and (has_table_privilege(r.rolname, c.oid, 'SELECT')
              or (c.relkind <> 'S' and has_table_privilege(r.rolname, c.oid, 'INSERT, UPDATE, DELETE')));`);
    expect(leaks).toEqual([]);
  });

  it('browser roles cannot execute any database function', () => {
    const leaks = sql(`
      select r.rolname || ' → ' || p.proname
        from pg_proc p
        cross join (values ('anon'), ('authenticated')) as r(rolname)
       where p.pronamespace = 'public'::regnamespace
         and has_function_privilege(r.rolname, p.oid, 'EXECUTE');`);
    expect(leaks).toEqual([]);
  });

  it('objects created by later migrations are locked down too', () => {
    expect(sql(`create table public.zz_future (x int);
                select has_table_privilege('anon', 'public.zz_future', 'SELECT'),
                       has_table_privilege('service_role', 'public.zz_future', 'SELECT');`)).toEqual(['f|t']);
  });

  for (const secret of ['question_keys', 'envelope_contents', 'xray_log', 'breaking_news', 'insider_tips',
                        'agency_auth', 'agency_sessions']) {
    it(`anon cannot read the secret table ${secret}`, () => {
      expect(sqlError(`set local role anon; select * from public.${secret};`)).toMatch(/permission denied/);
    });
  }

  it('server code (service role) can read the answer keys', () => {
    expect(sql(`set local role service_role; select count(*) >= 0 from public.question_keys;`)).toEqual(['t']);
  });
});
