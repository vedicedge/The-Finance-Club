import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requireOrganiser } from '@/lib/auth/organiser';
import { Paper } from '@/components/print/Paper';
import {
  AuctionSheets,
  CheckinSheet,
  ChecklistSheet,
  LedgerSheets,
  Round2Sheets,
  Round3Sheets,
  ZeroHourSheet,
} from '@/components/print/sheets';
import { loadAuctionPrint, loadPrintBase, loadRound2Print, loadRound3Print } from '@/lib/print/data';
import { isSheet, SHEETS } from '@/lib/print/sheets';

type Props = { params: Promise<{ sheet: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { sheet } = await params;
  return { title: isSheet(sheet) ? SHEETS[sheet].title : 'Print' };
}

export default async function PrintSheet({ params }: Props) {
  await requireOrganiser('print');
  const { sheet } = await params;
  if (!isSheet(sheet)) notFound();

  const want = (s: string) => sheet === s || (sheet === 'all' && s !== 'checklist');
  const [base, auction, r2, r3] = await Promise.all([
    loadPrintBase(),
    want('auction') ? loadAuctionPrint() : null,
    want('round2') ? loadRound2Print() : null,
    want('round3') || want('zero-hour') ? loadRound3Print() : null,
  ]);

  return (
    <Paper>
      {want('checklist') && <ChecklistSheet base={base} />}
      {want('checkin') && <CheckinSheet base={base} />}
      {auction && <AuctionSheets base={base} auction={auction} />}
      {want('ledger') && <LedgerSheets base={base} />}
      {r2 && <Round2Sheets base={base} r2={r2} />}
      {r3 && want('round3') && <Round3Sheets base={base} r3={r3} />}
      {r3 && want('zero-hour') && <ZeroHourSheet base={base} r3={r3} />}
    </Paper>
  );
}
