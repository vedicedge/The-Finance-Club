/** Fund Ledger presentation helpers (pure). */

export type LedgerRow = {
  id: number;
  agency_id: string;
  amount: number;
  reason: string;
  ref: string | null;
  note: string | null;
  created_at: string;
  voided: boolean;
  void_reason: string | null;
};

export const REASON_LABEL: Record<string, string> = {
  start_fund: 'Starting fund',
  gear: 'Gear card',
  tip: 'Insider Tip',
  jugaad_kit: 'Jugaad Kit',
  poster_bonus: 'Poster bonus',
  force_field: 'Force Field',
  mission_cash: 'Mission cash',
  transfer: 'Chai Pe Charcha',
  fine: 'Fine',
  adjustment: 'Adjustment',
};

/** Oldest first, with the running balance after each entry (voided entries don't move it). */
export function withRunningBalance<T extends LedgerRow>(rows: T[]): (T & { balance: number })[] {
  let balance = 0;
  return [...rows]
    .sort((a, b) => a.id - b.id)
    .map((r) => {
      if (!r.voided) balance = Math.round((balance + Number(r.amount)) * 10) / 10;
      return { ...r, balance };
    });
}

const timeFmt = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
export const ledgerTime = (iso: string) => timeFmt.format(new Date(iso));
