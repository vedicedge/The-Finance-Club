import type { Metadata } from 'next';
import { requireOrganiser } from '@/lib/auth/organiser';
import { AdminShell } from '@/components/admin/AdminShell';
import { CARD_HEADINGS, QUESTION_HEADINGS } from '@/lib/content-sheet';
import { importContent } from './actions';

export const metadata: Metadata = { title: 'Questions & cards' };

/** Admin only: download the questions and cards as Excel, edit, upload. */
export default async function ContentPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const organiser = await requireOrganiser('settings');
  const sp = await searchParams;
  return (
    <AdminShell organiser={organiser}>
      <p className="eyebrow">Settings · admin only</p>
      <h1 className="display mt-3 text-5xl">Questions &amp; cards</h1>
      {sp.error && <p role="alert" className="mt-6 rounded-sm border border-ember/40 bg-ember/10 px-4 py-3 text-sm text-ember">Rejected: {sp.error}</p>}
      {sp.ok && <p role="status" className="mt-6 rounded-sm border border-toxic/40 bg-toxic/10 px-4 py-3 text-sm text-toxic">{sp.ok}</p>}

      <section className="mt-8 grid gap-4 lg:grid-cols-2">
        <div className="panel space-y-3 px-5 py-5">
          <h2 className="eyebrow">1 · Download</h2>
          <p className="text-sm text-steel">
            The Excel file with today’s prelim questions (with the secret answers) and the Power Bazaar cards. It is also the
            template: edit it and upload it back. Keep it private.
          </p>
          <a href="/admin/content/export" className="btn btn-primary w-full">Download questions &amp; cards (.xlsx)</a>
        </div>
        <form action={importContent} className="panel space-y-3 px-5 py-5">
          <h2 className="eyebrow">2 · Upload</h2>
          <p className="text-sm text-steel">
            A row with an existing ID replaces it; a new ID adds one. Every row is checked first: if one is wrong, nothing changes.
            Questions only before the first prelim question opens; cards only before Round 1.
          </p>
          <input name="file" type="file" required accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="block w-full text-sm text-bone file:mr-3 file:rounded-sm file:border file:border-line-strong file:bg-vault-2 file:px-3 file:py-2 file:text-bone" />
          <button className="btn btn-primary w-full">Upload and update the site</button>
        </form>
      </section>

      <section className="panel mt-6 space-y-3 px-5 py-5 text-sm text-steel">
        <h2 className="eyebrow">The format</h2>
        <p><span className="text-bone">Sheet “Questions”:</span> {QUESTION_HEADINGS.join(' · ')}. The ID’s first letter sets the segment: M Marvel Ya DC? (options A–B only), T Teen Clue, B Box Office (20 s, double points), H Hero Ka Business, S sudden death. Exactly 15 must be Live = Yes.</p>
        <p><span className="text-bone">Sheet “Cards”:</span> {CARD_HEADINGS.join(' · ')}. IDs H01–H15, S01–S15, G01–G15, K01–K15 and JK1–JK4. Phase is marquee, secret or jugaad.</p>
        <p>The downloaded file has a “How to fill this in” sheet with every rule.</p>
      </section>
    </AdminShell>
  );
}
