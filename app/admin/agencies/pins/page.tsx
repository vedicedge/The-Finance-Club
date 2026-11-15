import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { hasRole, requireOrganiser } from '@/lib/auth/organiser';
import { serviceDb } from '@/lib/db/server';
import { audit } from '@/lib/audit';
import { AdminShell } from '@/components/admin/AdminShell';
import { PrintButton } from '@/components/print/PrintButton';

export const metadata: Metadata = { title: 'Agency IDs & PINs' };

type Row = {
  id: string;
  name: string;
  is_test: boolean;
  founders: { name: string; phone: string; is_captain: boolean }[];
  agency_auth: { pin_copy: string | null } | null;
};

/** Every agency's ID and PIN, for the desk when a team forgets its PIN. Admins only. */
export default async function PinsPage() {
  const organiser = await requireOrganiser('agencies');
  if (!hasRole(organiser)) redirect('/admin/agencies');
  const { data, error } = await serviceDb()
    .from('agencies')
    .select('id, name, is_test, founders(name, phone, is_captain), agency_auth(pin_copy)')
    .order('id');
  if (error) throw error;
  const rows = (data ?? []) as unknown as Row[];
  await audit(organiser, 'agency.view_pins', { count: rows.length });
  const missing = rows.filter((r) => !r.agency_auth?.pin_copy).length;

  return (
    <AdminShell organiser={organiser}>
      <div className="print:hidden">
        <Link href="/admin/agencies" className="text-sm text-steel hover:text-bone">← Agencies &amp; check-in</Link>
        <p className="eyebrow mt-4">Admins only · keep this private</p>
        <h1 className="display mt-3 text-5xl">Agency IDs &amp; PINs</h1>
        <p className="mt-4 max-w-2xl text-bone/90">
          Tell a team its PIN only after checking it is one of its founders (name and phone below). Do not show this screen or a printout to
          participants. Each view is recorded in the audit log.
        </p>
        {missing > 0 && (
          <p className="mt-3 text-sm text-ember">
            {missing} {missing === 1 ? 'agency has' : 'agencies have'} no stored PIN (registered before this update). Use Reset PIN for them.
          </p>
        )}
        <div className="mt-5">
          <PrintButton />
        </div>
      </div>
      <table className="mt-6 w-full text-left text-sm">
        <thead className="text-xs tracking-[0.16em] text-steel uppercase">
          <tr className="border-b border-line">
            <th className="py-2 pr-3">ID</th>
            <th className="py-2 pr-3">Agency</th>
            <th className="py-2 pr-3">Captain</th>
            <th className="py-2 pr-3">Phone</th>
            <th className="py-2 text-right">PIN</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const captain = r.founders.find((f) => f.is_captain) ?? r.founders[0];
            return (
              <tr key={r.id} className="border-b border-line/60">
                <td className="num py-2 pr-3 font-semibold text-glow">{r.id}</td>
                <td className="py-2 pr-3 text-bone">
                  {r.name}
                  {r.is_test && <span className="ml-2 text-xs text-steel">test</span>}
                </td>
                <td className="py-2 pr-3">{captain?.name ?? '—'}</td>
                <td className="num py-2 pr-3">{captain?.phone ?? '—'}</td>
                <td className="num py-2 text-right text-lg font-semibold tracking-[0.15em] text-bone">{r.agency_auth?.pin_copy ?? '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {rows.length === 0 && <p className="mt-6 text-steel">No agencies yet.</p>}
    </AdminShell>
  );
}
