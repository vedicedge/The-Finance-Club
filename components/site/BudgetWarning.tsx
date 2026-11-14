import { formatCrore } from '@/lib/money';

/** "You are close to the end of your budget" (Power Bazaar). */
export function BudgetWarning({ fund, missing, reserve, className = '' }: { fund: number; missing: number; reserve: number; className?: string }) {
  return (
    <div role="status" className={`rounded-sm border border-ember/50 bg-ember/10 px-4 py-3 text-sm ${className}`}>
      <p className="font-semibold tracking-[0.12em] text-ember uppercase">Budget alert</p>
      <p className="mt-1 text-bone">
        You are approaching the end of your budget: <span className="num font-semibold">{formatCrore(fund)}</span> left, and you still
        need {missing} categor{missing === 1 ? 'y' : 'ies'}. Strategise carefully and control your bidding: every category you miss
        costs a ₹8 Cr Jugaad Kit, so keep about <span className="num font-semibold">{formatCrore(reserve)}</span> in hand.
      </p>
    </div>
  );
}
