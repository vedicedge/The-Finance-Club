export default function Loading() {
  return (
    <div className="flex min-h-[50dvh] flex-col items-center justify-center gap-5 px-[var(--gutter)]" role="status">
      <span className="relative block size-14" aria-hidden="true">
        <span className="absolute inset-0 animate-ping rounded-full bg-glow/20" />
        <span className="absolute inset-1 rounded-full border border-glow/70 bg-abyss shadow-[0_0_30px_rgb(169_207_110/0.45)]" />
      </span>
      <p className="eyebrow animate-pulse">Establishing secure line…</p>
    </div>
  );
}
