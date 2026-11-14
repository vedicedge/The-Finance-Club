/**
 * The low-budget warning on My Agency during Power Bazaar. A team is warned when its fund left is
 * close to what it still needs: ₹8 Cr (a Jugaad Kit) for each category still missing, plus a
 * ₹5 Cr margin. A team that holds all four categories is never warned.
 */
export const JUGAAD_KIT_PRICE = 8;
export const BUDGET_MARGIN = 5;

export function budgetWarning(fund: number, missing: number): null | { reserve: number } {
  if (missing <= 0) return null;
  const reserve = JUGAAD_KIT_PRICE * missing + BUDGET_MARGIN;
  return fund < reserve ? { reserve } : null;
}
