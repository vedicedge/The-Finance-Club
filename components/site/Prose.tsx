/** Small building blocks for the long-form info pages (rounds, rules). */

export function PageHero({ eyebrow, title, children }: { eyebrow: string; title: string; children?: React.ReactNode }) {
  return (
    <header className="relative isolate overflow-hidden border-b border-line/60">
      <div className="light-beam -z-10 opacity-60" aria-hidden="true" />
      <div className="mx-auto max-w-4xl px-[var(--gutter)] pt-16 pb-14 text-center">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="display mt-5 text-[clamp(3rem,10vw,6rem)]">{title}</h1>
        {children && <div className="font-display mx-auto mt-6 max-w-2xl text-xl leading-relaxed text-bone/85">{children}</div>}
      </div>
    </header>
  );
}

export function Section({
  id,
  eyebrow,
  title,
  meta,
  children,
}: {
  id?: string;
  eyebrow: string;
  title: string;
  meta?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-6 border-b border-line/60">
      <div className="mx-auto max-w-4xl px-[var(--gutter)] py-16">
        <p className="eyebrow">{eyebrow}</p>
        <h2 className="display mt-3 text-[clamp(2.2rem,6vw,3.6rem)]">{title}</h2>
        {meta && <p className="mt-3 text-sm font-semibold tracking-[0.12em] text-torch uppercase">{meta}</p>}
        <div className="mt-8 space-y-6 leading-relaxed text-bone/90 [&_li]:pl-1 [&_strong]:text-bone [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5 [&_ul]:marker:text-torch">
          {children}
        </div>
      </div>
    </section>
  );
}

export function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="font-display pt-4 text-2xl text-bone">{children}</h3>;
}

/**
 * A readable table. Narrow tables wrap on phones; a `wide` one (many columns) scrolls inside
 * itself instead of widening the page.
 */
export function Table({
  head,
  rows,
  numeric = [],
  wide = false,
}: {
  head: string[];
  rows: React.ReactNode[][];
  numeric?: number[];
  wide?: boolean;
}) {
  return (
    <div className="-mx-[var(--gutter)] overflow-x-auto px-[var(--gutter)] sm:mx-0 sm:px-0">
      <table className={`w-full border-collapse text-left text-sm ${wide ? 'min-w-[32rem] sm:min-w-0' : ''}`}>
        <thead>
          <tr className="border-b border-line-strong text-steel">
            {head.map((h, i) => (
              <th key={h} scope="col" className={`py-2.5 pr-4 font-medium ${numeric.includes(i) ? 'num text-right' : ''}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri} className="border-b border-line/70 align-top">
              {r.map((c, ci) => (
                <td key={ci} className={`py-2.5 pr-4 ${numeric.includes(ci) ? 'num text-right whitespace-nowrap' : ''}`}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Note({ children }: { children: React.ReactNode }) {
  return <p className="panel border-l-2 border-l-torch px-5 py-4 text-sm text-bone/90">{children}</p>;
}
