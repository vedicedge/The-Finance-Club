import { spawnSync } from 'node:child_process';

/**
 * Database tests run psql against the throwaway local Postgres started by
 * scripts/db/test-db.sh (DOOMSDAY_TEST_DB_URL). Every test wraps its SQL in a transaction
 * that is rolled back, so tests never affect each other.
 */
export const DB_URL = process.env.DOOMSDAY_TEST_DB_URL ?? '';
export const hasDb = DB_URL !== '';

function psql(query: string) {
  return spawnSync('psql', ['-X', '-q', '-At', '-F', '|', '-v', 'ON_ERROR_STOP=1', DB_URL], {
    input: query,
    encoding: 'utf8',
  });
}

/** Runs SQL inside BEGIN … ROLLBACK and returns the output lines. Throws on any SQL error. */
export function sql(body: string): string[] {
  const r = psql(`begin;\n${body}\nrollback;\n`);
  if (r.status !== 0) throw new Error(r.stderr.trim() || `psql exited ${r.status}`);
  return r.stdout.split('\n').filter((l) => l !== '');
}

/** Runs SQL inside BEGIN … ROLLBACK, expects it to fail, and returns the error text. */
export function sqlError(body: string): string {
  const r = psql(`begin;\n${body}\nrollback;\n`);
  if (r.status === 0) throw new Error(`Expected SQL to fail but it succeeded:\n${body}`);
  return r.stderr;
}

let phone = 9_000_000_000;
/** SQL that creates a valid agency with 3 founders (one captain). */
export function agency(id: string, name = `Agency ${id}`): string {
  const f = () => {
    phone += 1;
    return `('${id}', 'Founder ${phone}', 'E', '${phone}', 'f${phone}@imi.edu'`;
  };
  return `insert into agencies (id, name) values ('${id}', '${name}');
insert into founders (agency_id, name, section, phone, email, is_captain) values
  ${f()}, true), ${f()}, false), ${f()}, false);`;
}
