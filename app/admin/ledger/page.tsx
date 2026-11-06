import type { Metadata } from 'next';
import Link from 'next/link';
import { requireOrganiser } from '@/lib/auth/organiser';
import { serviceDb } from '@/lib/db/server';
import { formatCrore } from '@/lib/money';
import { REASON_LABEL, ledgerTime, withRunningBalance, type LedgerRow } from '@/lib/ledger';
import { AdminShell } from '@/components/admin/AdminShell';
import { AutoRefresh } from '@/components/admin/AutoRefresh';
import { adjust, undoLast, voidEntry } from './actions';

export const metadata: Metadata = { title: 'Fund Ledger' };

type Row = LedgerRow & { created_by: string | null };

export default async function LedgerPage({ searchParams }: { searchParams: Promise<{ agency?: string; ok?: string; error?: string }> }) {
  const organiser = await requireOrganiser('ledger');
  const sp = await searchParams;
  const filter = sp.agency ?? '';
  const db = serviceDb();
  let q = db.from('v_ledger').select('id, agency_id, amount, reason, ref, note, created_by, created_at, voided, void_reason').order('id', { ascending: false }).limit(400);
  if (filter) q = q.eq('agency_id', filter);
  const [entries, agencies, funds, crew] = await Promise.all([
    q,
    db.from('agencies').select('id, name, status').order('id'),
    db.from('v_fund_left').select('agency_id, fund_left'),
    db.from('organisers').select('user_id, email, display_name'),
  ]);
  if (entries.error) throw entries.error;
  const rows = (entries.data ?? []).map((r) => ({ ...r, amount: Number(r.amount) })) as Row[];
  const who = new Map((crew.data ?? []).map((c) => [c.user_id as string, (c.display_name as string | null) ?? (c.email as string).split('@')[0]]));
  const fundOf = new Map((funds.data ?? []).map((f) => [f.agency_id as string, Number(f.fund_left)]));
  const withMoney = (agencies.data ?? []).filter((a) => rows.some((r) => r.agency_id === a.id) || fundOf.get(a.id));
  const display = filter ? withRunningBalance(rows).reverse() : rows.map((r) => ({ ...r, balance: null as number | null }));

  return (
    <AdminShell organiser={organiser}>
      <AutoRefresh ms={5000} />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Append-only · voids, never edits</p>
          <h1 className="display mt-3 text-5xl">Fund Ledger</h1>
        </div>
        <Link href="/admin/auction" className="btn btn-ghost">Power Bazaar console</Link>
      </div>

      {sp.error && <p role="alert" className="mt-6 rounded-sm border border-ember/40 bg-ember/10 px-4 py-3 text-sm text-ember">Rejected: {sp.error}</p>}
      {sp.ok && <p role="status" className="mt-6 rounded-sm border border-toxic/40 bg-toxic/10 px-4 py-3 text-sm text-toxic">{sp.ok}</p>}

      <section className="mt-8 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <form action={adjust} className="panel grid gap-3 px-5 py-5 sm:grid-cols-[1fr_8rem]">
          <h2 className="eyebrow sm:col-span-2">Manual adjustment</h2>
          <input type="hidden" name="filter" value={filter} />
          <select name="agency" defaultValue={filter} required className="field !mt-0">
            <option value="">Agency…</option>
            {(agencies.data ?? []).map((a) => <option key={a.id} value={a.id}>{a.id} · {a.name}</option>)}
          </select>
          <input name="amount" type="number" step="0.5" required placeholder="± ₹ Cr" className="field num !mt-0" />
          <input name="note" required minLength={3} placeholder="Reason (required), e.g. re-entered from the paper ledger" className="field !mt-0 sm:col-span-2" />
          <button className="btn btn-primary sm:col-span-2">Record adjustment</button>
        </form>
        <form action={undoLast} className="panel space-y-3 px-5 py-5">
          <h2 className="eyebrow">Undo my last entry</h2>
          <input type="hidden" name="filter" value={filter} />
          <p className="text-sm text-steel">Voids the most recent entry you made (a sale also returns its card). Nothing is deleted.</p>
          <input name="reason" placeholder="Why? (optional)" className="field !mt-0" />
          <button className="btn btn-ghost w-full hover:!border-ember hover:!text-ember">Undo</button>
        </form>
      </section>

      <nav aria-label="Filter by agency" className="mt-8 flex flex-wrap gap-2 text-sm">
        <Link href="/admin/ledger" className={`rounded-sm border px-2.5 py-1 ${!filter ? 'border-torch text-torch' : 'border-line text-steel hover:text-bone'}`}>All</Link>
        {withMoney.map((a) => (
          <Link
            key={a.id}
            href={`/admin/ledger?agency=${a.id}`}
            className={`num rounded-sm border px-2.5 py-1 ${filter === a.id ? 'border-torch text-torch' : 'border-line text-steel hover:text-bone'}`}
          >
            {a.id} <span className="text-bone">{formatCrore(fundOf.get(a.id) ?? 0)}</span>
          </Link>
        ))}
      </nav>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[56rem] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-line-strong text-steel">
              <th className="num py-2 pr-3 font-medium">#</th>
              <th className="py-2 pr-3 font-medium">Time</th>
              <th className="py-2 pr-3 font-medium">Agency</th>
              <th className="py-2 pr-3 font-medium">Reason</th>
              <th className="num py-2 pr-3 text-right font-medium">Amount</th>
              {filter && <th className="num py-2 pr-3 text-right font-medium">Balance</th>}
              <th className="py-2 pr-3 font-medium">By</th>
              <th className="py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {display.map((r) => (
              <tr key={r.id} className={`border-b border-line/60 align-top ${r.voided ? 'text-steel/60 line-through decoration-ember/60' : ''}`}>
                <td className="num py-2 pr-3 text-steel">{r.id}</td>
                <td className="num py-2 pr-3">{ledgerTime(r.created_at)}</td>
                <td className="num py-2 pr-3 font-semibold text-torch">{r.agency_id}</td>
                <td className="py-2 pr-3">
                  {REASON_LABEL[r.reason] ?? r.reason}
                  {(r.note || r.ref) && <span className="block text-xs text-steel">{[r.ref, r.note].filter(Boolean).join(' · ')}</span>}
                  {r.voided && <span className="block text-xs text-ember no-underline">Void: {r.void_reason}</span>}
                </td>
                <td className={`num py-2 pr-3 text-right ${r.amount < 0 ? 'text-ember' : 'text-toxic'}`}>{formatCrore(r.amount, { signed: true })}</td>
                {filter && <td className="num py-2 pr-3 text-right">{r.balance !== null ? formatCrore(r.balance) : ''}</td>}
                <td className="py-2 pr-3 text-xs text-steel">{r.created_by ? who.get(r.created_by) ?? 'crew' : 'system'}</td>
                <td className="py-2 text-right">
                  {!r.voided && (
                    <form action={voidEntry.bind(null, r.id)} className="flex justify-end gap-2">
                      <input type="hidden" name="filter" value={filter} />
                      <input name="reason" required minLength={3} placeholder="Why void?" className="w-32 rounded-sm border border-line-strong bg-vault-2 px-2 py-1 text-xs" />
                      <button className="btn !min-h-0 !px-2.5 !py-1 !text-xs btn-ghost hover:!border-ember hover:!text-ember">Void</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
            {display.length === 0 && <tr><td colSpan={8} className="py-6 text-center text-steel">No entries yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
