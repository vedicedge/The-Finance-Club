/** Virtual ₹ crore helpers. All money moves in ₹0.5 Cr steps (spec: Money rules). */

export function isHalfStep(amount: number): boolean {
  return Number.isFinite(amount) && Number.isInteger(amount * 2);
}

const formatter = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 1, minimumFractionDigits: 0 });

/** 12.5 → "₹12.5 Cr", -2 → "−₹2 Cr". Uses a true minus sign for debits. */
export function formatCrore(amount: number | string, { signed = false } = {}): string {
  const n = typeof amount === 'string' ? Number(amount) : amount;
  const abs = formatter.format(Math.abs(n));
  if (n < 0) return `−₹${abs} Cr`;
  return `${signed && n > 0 ? '+' : ''}₹${abs} Cr`;
}
