import type { Metadata } from 'next';
import { requireOrganiser } from '@/lib/auth/organiser';
import { serviceDb } from '@/lib/db/server';
import { getEventState } from '@/lib/event-state';
import { AdminShell } from '@/components/admin/AdminShell';
import { FounderEditor, ResetPinButton, TeamEditor } from './AgencyTools';
import { removeAgency, setCheckedIn } from './actions';

export const metadata: Metadata = { title: 'Agencies & check-in' };

type Row = {
  id: string;
  name: string;
  status: 'registered' | 'checked_in' | 'active' | 'eliminated';
  eliminated_in: string | null;
  is_test: boolean;
  created_at: string;
  founders: { id: number; name: string; section: string; phone: string; email: string; is_captain: boolean }[];
  agency_auth: { locked_until: string | null; last_login_at: string | null } | null;
};

const STATUS_STYLE: Record<Row['status'], string> = {
  registered: 'text-steel border-line-strong',
  checked_in: 'text-toxic border-toxic/50',
  active: 'text-glow border-glow/50',
  eliminated: 'text-ember border-ember/50',
};

export default async function AgenciesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const organiser = await requireOrganiser('agencies');
  const { q = '' } = await searchParams;
  const [{ data, error }, state] = await Promise.all([
    serviceDb()
      .from('agencies')
      .select('id, name, status, eliminated_in, is_test, created_at, founders(id, name, section, phone, email, is_captain), agency_auth(locked_until, last_login_at)')
      .order('id'),
    getEventState(),
  ]);
  if (error) throw error;

  const all = (data ?? []) as unknown as Row[];
  const needle = q.trim().toLowerCase();
  const rows = needle
    ? all.filter((a) =>
        [a.id, a.name, ...a.founders.flatMap((f) => [f.name, f.phone, f.email])].some((v) => v.toLowerCase().includes(needle)),
      )
    : all;
  const counts = {
    total: all.filter((a) => !a.is_test).length,
    test: all.filter((a) => a.is_test).length,
    checkedIn: all.filter((a) => a.status === 'checked_in').length,
  };
  // Same rule as the database's founders lock: editable only while registration is open.
  const foundersLocked = !(
    state.phase === 'registration' &&
    state.settings.registration.open &&
    Date.now() < Date.parse(state.settings.registration.closesAt)
  );
  const canRemove = !foundersLocked;
  // Last-minute team changes at the desk: allowed until the first prelim question opens.
  const opened = await serviceDb().from('questions').select('id', { count: 'exact', head: true }).not('opened_at', 'is', null).neq('segment', 'sudden_death');
  const teamChangesOpen = (opened.count ?? 0) === 0;

  return (
    <AdminShell organiser={organiser}>
      <p className="eyebrow">Registration desk</p>
      <h1 className="display mt-3 text-5xl">Agencies &amp; check-in</h1>
      <p className="num mt-4 text-steel">
        {counts.total} registered{counts.test ? ` (+${counts.test} test)` : ''} · {counts.checkedIn} checked in · founders {foundersLocked ? 'locked' : 'editable until registration closes'}
      </p>

      <form className="mt-8 flex gap-3" role="search">
        <input name="q" defaultValue={q} placeholder="Search ID, agency, founder, phone or email" className="field !mt-0 max-w-md" />
        <button className="btn btn-ghost">Search</button>
      </form>

      <ul className="mt-6 space-y-3">
        {rows.map((a) => {
          const captain = a.founders.find((f) => f.is_captain);
          const locked = a.agency_auth?.locked_until && Date.parse(a.agency_auth.locked_until) > Date.now();
          return (
            <li key={a.id} className="panel">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-3 px-4 py-3">
                <span className="num w-14 text-2xl font-semibold text-glow">{a.id}</span>
                <span className="min-w-40 flex-1">
                  <span className="block text-bone">
                    {a.name}
                    {a.is_test && <span className="ml-2 rounded-sm bg-glow px-1.5 py-0.5 text-[0.6rem] font-bold tracking-[0.18em] text-abyss uppercase">Test</span>}
                  </span>
                  <span className="block text-xs text-steel">
                    Captain {captain?.name} · <span className="num">{captain?.phone}</span>
                    {locked && <span className="ml-2 text-ember">PIN locked</span>}
                  </span>
                </span>
                <span className={`rounded-sm border px-2 py-0.5 text-xs font-semibold tracking-[0.14em] uppercase ${STATUS_STYLE[a.status]}`}>
                  {a.status === 'checked_in' ? 'Checked in' : a.status === 'eliminated' ? `Eliminated · ${a.eliminated_in}` : a.status}
                </span>
                {(a.status === 'registered' || a.status === 'checked_in') && (
                  <form action={setCheckedIn.bind(null, a.id, a.status === 'registered')}>
                    <button className={`btn !min-h-0 !px-3 !py-2 !text-xs ${a.status === 'registered' ? 'btn-primary' : 'btn-ghost'}`}>
                      {a.status === 'registered' ? 'Check in' : 'Undo check-in'}
                    </button>
                  </form>
                )}
                <ResetPinButton agencyId={a.id} />
              </div>
              <details className="border-t border-line px-4">
                <summary className="py-2 text-sm text-steel hover:text-bone">Founders &amp; more</summary>
                <div className="divide-y divide-line/60 pb-3">
                  {a.founders
                    .sort((x, y) => Number(y.is_captain) - Number(x.is_captain) || x.id - y.id)
                    .map((f) => (
                      <FounderEditor key={f.id} founder={f} locked={foundersLocked} />
                    ))}
                </div>
                {!a.is_test && teamChangesOpen && (
                  <details className="border-t border-line">
                    <summary className="py-2 text-sm text-glow hover:text-bone">Change team members (until the prelim starts)</summary>
                    <TeamEditor
                      agencyId={a.id}
                      members={[...a.founders].sort((x, y) => Number(y.is_captain) - Number(x.is_captain) || x.id - y.id)}
                    />
                  </details>
                )}
                {canRemove && (
                  <form action={removeAgency.bind(null, a.id)} className="flex flex-wrap items-center gap-2 border-t border-line py-3 text-sm">
                    <span className="text-steel">Remove this registration (duplicates and tests only). Type {a.id}:</span>
                    <input name="confirm" className="w-20 rounded-sm border border-line-strong bg-vault-2 px-2 py-1 text-sm" />
                    <button className="btn btn-ghost !min-h-0 !px-3 !py-1.5 !text-xs hover:!border-ember hover:!text-ember">Remove</button>
                  </form>
                )}
              </details>
            </li>
          );
        })}
        {rows.length === 0 && <li className="panel px-4 py-6 text-center text-steel">No agencies {needle ? 'match that search' : 'yet'}.</li>}
      </ul>
    </AdminShell>
  );
}
