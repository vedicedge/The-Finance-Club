import { Scene, type SceneName } from '@/components/art/Scene';

/**
 * A form page beside a film frame of art: a banner above the form on phones, a tall frame that
 * stays in view beside it on wide screens.
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
      <aside className="lg:sticky lg:top-8 lg:self-start" aria-hidden="true">
        <div className="frame corners aspect-[16/9] [--corner-inset:12px] lg:aspect-[4/5]">
          <Scene name={art} className="absolute inset-0" sizes="(min-width: 1024px) 560px, 100vw" preload />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
          <div className="streaks absolute inset-0 opacity-70" />
          <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7">
            <p className="eyebrow text-glow">{label}</p>
            <p className="display metal mt-2 hidden text-[clamp(1.4rem,3.4vw,2.3rem)] sm:block">{caption}</p>
          </div>
        </div>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
