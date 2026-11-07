import Link from 'next/link';
import { EVENT } from '@/lib/config';
import { PrintButton } from './PrintButton';

/**
 * A printable backup sheet set: a dark toolbar on screen (hidden in print), then white A4 sheets.
 * Prefills only what organisers may already know; anything secret stays a blank to write in.
 */
export function Paper({ children, note }: { children: React.ReactNode; note?: string }) {
  return (
    <div className="paper">
      <div className="no-print sticky top-0 z-10 border-b border-line bg-vault text-bone">
        <div className="mx-auto flex max-w-[210mm] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 text-sm">
          <Link href="/admin/print" className="text-steel hover:text-glow">
            ← All sheets
          </Link>
          <PrintButton />
          <span className="text-xs text-steel">
            {note ?? 'A4 · portrait · margins Default · turn off headers and footers.'}
          </span>
        </div>
      </div>
      <main id="main">{children}</main>
    </div>
  );
}

/** One sheet: title block, then content. Each sheet starts on a new page. */
export function Sheet({
  title,
  subtitle,
  printedAt,
  dryRun = false,
  children,
}: {
  title: string;
  subtitle?: string;
  printedAt: string;
  dryRun?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="sheet">
      <header className="flex items-end justify-between gap-4 border-b-2 border-black pb-2">
        <div>
          <p className="text-[9.5px] font-bold uppercase tracking-[0.2em]">
            {EVENT.name} · {EVENT.club} · backup sheet
            {dryRun && <span className="ml-2 border border-black px-1">Dry run · test agencies</span>}
          </p>
          <h1 className="mt-1">{title}</h1>
          {subtitle && <p className="muted !mt-1">{subtitle}</p>}
        </div>
        <p className="muted shrink-0 text-right text-[9.5px]">
          Printed {printedAt}
          <br />
          Filled in by ____________
        </p>
      </header>
      {children}
    </section>
  );
}

/** `n` empty rows of `cols` cells. */
export function BlankRows({ n, cols, from = 1, numbered = false }: { n: number; cols: number; from?: number; numbered?: boolean }) {
  return (
    <>
      {Array.from({ length: n }, (_, i) => (
        <tr key={i} className="blank">
          {Array.from({ length: cols }, (_, c) => (
            <td key={c} className={c === 0 && numbered ? 'num muted' : undefined}>
              {c === 0 && numbered ? from + i : ''}
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
