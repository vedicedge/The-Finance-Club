import type { Metadata } from 'next';
import { requireOrganiser } from '@/lib/auth/organiser';
import { AREAS, type Area } from '@/lib/auth/roles';
import { serviceDb } from '@/lib/db/server';
import { AdminShell } from '@/components/admin/AdminShell';

export const metadata: Metadata = { title: 'Command centre' };

// What a correctly seeded database contains (spec Appendix A and B).
const EXPECTED: { table: string; label: string; expected: number; secret?: boolean }[] = [
  { table: 'gear_cards', label: 'Gear cards (60 + 4 Jugaad Kits)', expected: 64 },
  { table: 'battle_outcomes', label: 'Battle Outcomes', expected: 6 },
  { table: 'envelopes', label: 'Mission File envelopes', expected: 8 },
  { table: 'missions', label: 'Round 3 missions', expected: 4 },
  { table: 'questions', label: 'Prelim questions (38 + 3 sudden death)', expected: 41, secret: true },
  { table: 'question_keys', label: 'Answer keys', expected: 41, secret: true },
  { table: 'team_ups', label: 'Team-Ups', expected: 3, secret: true },
  { table: 'breaking_news', label: 'Breaking News cards', expected: 8, secret: true },
];

async function count(table: string): Promise<number | null> {
  const { count: n, error } = await serviceDb().from(table).select('*', { count: 'exact', head: true });
  return error ? null : (n ?? 0);
}

export default async function CommandCentre({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const organiser = await requireOrganiser('dashboard');
  const { denied } = await searchParams;

  const db = serviceDb();
  const [state, counts, agencies, crew] = await Promise.all([
    db.from('event_state').select('phase, step').maybeSingle(),
    Promise.all(EXPECTED.map((e) => count(e.table))),
    count('agencies'),
    count('organisers'),
  ]);
  const connected = !state.error;
  const allSeeded = EXPECTED.every((e, i) => counts[i] === e.expected);
  const secretsMissing = EXPECTED.some((e, i) => e.secret && counts[i] === 0);

  return (
    <AdminShell organiser={organiser}>
      {denied && denied in AREAS && (
        <p role="alert" className="mb-8 rounded-sm border border-ember/40 bg-ember/10 px-4 py-3 text-sm text-ember">
          Access denied: {AREAS[denied as Area].label} needs a role you don&apos;t have. Ask an admin.
        </p>
      )}

      <p className="eyebrow">Systems check</p>
      <h1 className="display mt-3 text-5xl">
        {connected && allSeeded ? 'All systems armed.' : 'Systems coming online.'}
      </h1>

      <dl className="mt-10 grid gap-px overflow-hidden rounded-sm border border-line bg-line sm:grid-cols-3">
        <div className="bg-vault px-5 py-4">
          <dt className="eyebrow">Database</dt>
          <dd className={`mt-2 text-lg ${connected ? 'text-toxic' : 'text-ember'}`}>
            {connected ? 'Connected' : `Not reachable: ${state.error?.message ?? 'unknown error'}`}
          </dd>
        </div>
        <div className="bg-vault px-5 py-4">
          <dt className="eyebrow">Event phase</dt>
          <dd className="mt-2 text-lg text-bone">{state.data?.phase ?? '—'}</dd>
        </div>
        <div className="bg-vault px-5 py-4">
          <dt className="eyebrow">Agencies · Crew</dt>
          <dd className="num mt-2 text-lg text-bone">
            {agencies ?? '—'} · {crew ?? '—'}
          </dd>
        </div>
      </dl>

      <h2 className="eyebrow mt-12">Seed data</h2>
      <table className="mt-4 w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-line text-steel">
            <th className="py-2 pr-4 font-medium">Table</th>
            <th className="num py-2 pr-4 font-medium">Expected</th>
            <th className="num py-2 pr-4 font-medium">Found</th>
            <th className="py-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {EXPECTED.map((e, i) => {
            const found = counts[i];
            const ok = found === e.expected;
            return (
              <tr key={e.table} className="border-b border-line/60">
                <td className="py-2 pr-4">
                  {e.label}
                  {e.secret && <span className="ml-2 text-xs text-torch">secret seed</span>}
                </td>
                <td className="num py-2 pr-4 text-steel">{e.expected}</td>
                <td className="num py-2 pr-4">{found ?? '—'}</td>
                <td className={`py-2 ${ok ? 'text-toxic' : 'text-ember'}`}>{ok ? 'OK' : 'Check'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {secretsMissing && (
        <p className="mt-6 rounded-sm border border-torch/40 bg-torch/10 px-4 py-3 text-sm text-torch">
          The secret seed (questions, answer keys, Team-Ups, Breaking News) is not loaded. Run
          <code className="mx-1">supabase/private/seed_secrets.sql</code> in the Supabase SQL editor.
        </p>
      )}
    </AdminShell>
  );
}
