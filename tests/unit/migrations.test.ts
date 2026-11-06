import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Supabase runs API requests under the `safeupdate` guard: an UPDATE or DELETE without a WHERE
 * clause fails ("UPDATE requires a WHERE clause"). Our functions run inside those requests, so
 * every UPDATE/DELETE in the latest definition of each function must have a WHERE. This check
 * needs no database; tests/db runs the real guard too when it can be built.
 */
const DIR = path.resolve(import.meta.dirname, '../../supabase/migrations');
const FN = /create or replace function public\.(\w+)\(([\s\S]*?)\)\s*\nreturns[\s\S]*?\$\$([\s\S]*?)\$\$;/gi;
const STMT = /\b(?:update\s+(?:only\s+)?(?:public\.)?\w+(?:\s+(?:as\s+)?(?!set\b)\w+)?\s+set\b|delete\s+from\s+(?:only\s+)?(?:public\.)?\w+)/gi;

/** The statement starting at `from`, with anything inside parentheses or quotes blanked out. */
function topLevelStatement(body: string, from: number): string {
  let depth = 0;
  let quoted = false;
  let out = '';
  for (let i = from; i < body.length; i++) {
    const c = body[i];
    if (quoted) {
      if (c === "'") quoted = false;
      out += ' ';
      continue;
    }
    if (c === "'") quoted = true;
    else if (c === '(') depth++;
    else if (c === ')') depth--;
    else if (c === ';' && depth === 0) break;
    out += depth === 0 ? c : ' ';
  }
  return out;
}

function latestFunctions(): Map<string, string> {
  const latest = new Map<string, string>();
  for (const file of readdirSync(DIR).filter((f) => f.endsWith('.sql')).sort()) {
    for (const m of readFileSync(path.join(DIR, file), 'utf8').matchAll(FN)) latest.set(`${m[1]}(${m[2]})`, m[3]);
  }
  return latest;
}

describe('migrations', () => {
  it('every UPDATE and DELETE inside a function has a WHERE clause (Supabase safeupdate)', () => {
    const offenders: string[] = [];
    const fns = latestFunctions();
    for (const [name, body] of fns) {
      for (const m of body.matchAll(STMT)) {
        const stmt = topLevelStatement(body, m.index ?? 0);
        if (!/\bwhere\b/i.test(stmt)) offenders.push(`${name}: ${stmt.replace(/\s+/g, ' ').trim().slice(0, 80)}`);
      }
    }
    expect(fns.size).toBeGreaterThan(50);
    expect(offenders).toEqual([]);
  });
});
