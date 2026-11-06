/**
 * Rows of a projector board. Up to `perColumn` rows sit in one centred column; more are split
 * into two balanced columns (9 → 5 + 4, 16 → 8 + 8), so a short list never hugs one side.
 * Each column repeats the header row, so every label sits directly over its numbers.
 */
export function BoardColumns<T>({
  rows,
  header,
  renderRow,
  perColumn = 8,
  className = '',
}: {
  rows: T[];
  header: React.ReactNode;
  renderRow: (row: T) => React.ReactNode;
  perColumn?: number;
  className?: string;
}) {
  const two = rows.length > perColumn;
  const half = Math.ceil(rows.length / 2);
  const cols = two ? [rows.slice(0, half), rows.slice(half)] : [rows];
  return (
    <div className={`grid w-full gap-x-[4cqw] ${two ? 'grid-cols-2' : 'mx-auto max-w-[62cqw]'} ${className}`}>
      {cols.map((col, i) => (
        <div key={i}>
          {header}
          <ol>{col.map(renderRow)}</ol>
        </div>
      ))}
    </div>
  );
}

/** The label row over a board column. Give its cells the same widths as the row's cells. */
export function BoardHeader({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`flex items-center gap-[1.4cqw] border-b border-line-strong pb-[0.8cqh] text-[1.05cqw] font-semibold tracking-[0.2em] whitespace-nowrap text-steel uppercase ${className}`}
    >
      {children}
    </div>
  );
}
