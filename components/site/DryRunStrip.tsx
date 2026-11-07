/** Shown on every page while dry run mode is on. */
export function DryRunStrip() {
  return (
    <p
      role="status"
      className="bg-[repeating-linear-gradient(-45deg,var(--color-glow)_0_10px,#93bb5b_10px_20px)] px-[var(--gutter)] py-1.5 text-center text-xs font-bold tracking-[0.24em] text-abyss uppercase"
    >
      Dry run · test mode · results here are rehearsal only
    </p>
  );
}
