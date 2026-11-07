import { Scene, type SceneName } from '@/components/art/Scene';

/**
 * A form page beside a film frame of art: a banner above the form on phones, a tall frame that
 * stays in view beside it on wide screens, with its caption underneath.
 */
export function WithArt({
  art,
  label,
  caption,
  children,
}: {
  art: SceneName;
  label: string;
  caption: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-[var(--gutter)] pt-6 pb-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,34rem)] lg:gap-14 lg:pt-12">
      <aside className="lg:sticky lg:top-8 lg:self-start">
        <div className="frame corners aspect-[16/9] [--corner-inset:12px] lg:aspect-[4/3]" aria-hidden="true">
          <Scene name={art} className="absolute inset-0" sizes="(min-width: 1024px) 560px, 100vw" preload />
        </div>
        {/* the caption sits under the picture, not on it */}
        <p className="mt-4 hidden lg:block">
          <span className="eyebrow block text-glow">{label}</span>
          <span className="display metal mt-2 block text-[clamp(1.4rem,2.4vw,2rem)]">{caption}</span>
        </p>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
