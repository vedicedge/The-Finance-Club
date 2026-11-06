import type { Metadata } from 'next';
import Link from 'next/link';
import { requireOrganiser } from '@/lib/auth/organiser';
import { AdminShell } from '@/components/admin/AdminShell';
import { SHEETS, type SheetId } from '@/lib/print/sheets';

export const metadata: Metadata = { title: 'Print & backups' };

export default async function PrintIndex() {
  const organiser = await requireOrganiser('print');
  const ids = Object.keys(SHEETS) as SheetId[];
  return (
    <AdminShell organiser={organiser}>
      <p className="eyebrow">Paper backups</p>
      <h1 className="display mt-3 text-5xl">Print &amp; backups</h1>
      <p className="mt-4 max-w-2xl text-steel">
        Black-on-white A4 sheets for when the site or the Wi-Fi goes down. Print a set before the event; reprint a sheet at the
        start of its round and it comes back with that round’s agencies, cards and results filled in. Nothing secret is ever
        printed: no answer keys, multipliers, X-Ray targets, tip cards or unrevealed news.
      </p>

      <ul className="mt-10 grid gap-px overflow-hidden rounded-sm border border-line bg-line sm:grid-cols-2">
        {ids.map((id) => (
          <li key={id} className="bg-vault">
            <Link href={`/admin/print/${id}`} className="block h-full px-5 py-4 hover:bg-vault-2">
              <span className="text-lg text-bone">{SHEETS[id].title}</span>
              <span className="mt-1 block text-sm text-steel">{SHEETS[id].when}</span>
            </Link>
          </li>
        ))}
      </ul>

      <section className="panel mt-10 max-w-2xl px-5 py-5 text-sm text-bone/85">
        <h2 className="eyebrow">How to print</h2>
        <ol className="mt-3 list-decimal space-y-1 pl-5">
          <li>Open a sheet and press Print (or Ctrl/Cmd + P).</li>
          <li>Paper A4, portrait, margins Default; turn off headers and footers.</li>
          <li>To keep a PDF on a phone or laptop as well, choose “Save as PDF”.</li>
        </ol>
        <p className="mt-3 text-steel">
          After using a paper sheet, enter every line on the site and tick “On site”, so the Fund Ledger stays the one record.
        </p>
      </section>
    </AdminShell>
  );
}
