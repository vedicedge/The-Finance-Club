export default function Loading() {
  return (
    <div className="flex min-h-[50dvh] items-center justify-center px-[var(--gutter)]" role="status">
      <p className="eyebrow animate-pulse">Establishing secure line…</p>
    </div>
  );
}
