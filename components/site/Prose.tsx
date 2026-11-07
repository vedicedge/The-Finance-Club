/** Small building blocks for the long-form info pages (rounds, rules, schedule). */
import { Ambient, KalyugImage } from '@/components/art/Poster';
import { Scene, type SceneName } from '@/components/art/Scene';

export type HeroArt = SceneName | 'poster' | 'kalyug';

/** A page banner's picture: a scene or Professor Kalyug, filling its box. */
function BannerArt({ art }: { art: Exclude<HeroArt, 'poster'> }) {
  if (art === 'kalyug')
    return (
      <div className="absolute inset-0 overflow-hidden">
        <KalyugImage sizes="(min-width: 1024px) 55vw, 100vw" className="size-full object-cover object-[50%_42%]" />
      </div>
    );
  return <Scene name={art} className="absolute inset-0" sizes="(min-width: 1024px) 55vw, 100vw" preload />;
}

/**
 * A page's title banner. With a picture, the picture and the title never overlap: the picture
 * fills the right half on laptops (fading in from its left edge) with the title on the left,
 * and sits above the title on phones and tablets. With the poster haze (no subject to cover),
 * the title sits low over it like a film card.
 */
export function PageHero({
  eyebrow,
  title,
  art = 'poster',
  children,
}: {
  eyebrow: string;
  title: string;
  art?: HeroArt;
  children?: React.ReactNode;
}) {
  if (art === 'poster') {
    return (
      <header className="corners relative isolate overflow-hidden border-b border-line/60 [--corner-inset:16px] [--corner-size:22px]">
        <Ambient className="-z-20 opacity-80" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-abyss via-abyss/55 to-abyss/10" aria-hidden="true" />
        <div className="streaks absolute inset-0 -z-10" aria-hidden="true" />
        <div className="mx-auto flex min-h-[22rem] max-w-4xl flex-col justify-end px-[var(--gutter)] pt-24 pb-12 sm:min-h-[27rem] sm:pb-14">
          <p className="eyebrow text-glow">{eyebrow}</p>
          <h1 className="display metal mt-4 text-[clamp(2.9rem,10vw,6rem)]">{title}</h1>
          {children && <div className="mt-5 max-w-2xl font-serif text-[1.3rem] leading-relaxed text-bone/90">{children}</div>}
        </div>
      </header>
    );
  }
  return (
    <header className="relative isolate overflow-hidden border-b border-line/60">
      <div
        className="absolute inset-x-0 top-0 -z-20 h-60 sm:h-80 lg:inset-y-0 lg:right-0 lg:left-auto lg:h-auto lg:w-[55%] lg:[mask-image:linear-gradient(90deg,transparent,#000_20%)] xl:w-1/2"
        aria-hidden="true"
      >
        <BannerArt art={art} />
      </div>
      <div
        className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,transparent_0,transparent_10rem,var(--color-abyss)_15rem)] sm:bg-[linear-gradient(180deg,transparent_0,transparent_14rem,var(--color-abyss)_20rem)] lg:bg-[linear-gradient(180deg,var(--color-abyss),transparent_16%,transparent_84%,var(--color-abyss))]"
        aria-hidden="true"
      />
      <div className="mx-auto flex max-w-6xl flex-col px-[var(--gutter)] pt-[13rem] pb-12 sm:pt-[17.5rem] lg:min-h-[27rem] lg:justify-center lg:py-16">
        <div className="max-w-xl lg:max-w-[min(36rem,calc(48vw-8rem))]">
          <p className="eyebrow text-glow">{eyebrow}</p>
          {/* sized so the longest one-word title ("Leaderboard") fits the column: metallic text
              that overflows its box would be invisible */}
          <h1 className="display metal mt-4 text-[clamp(2.4rem,8.5vw,4.6rem)] lg:text-[clamp(2.4rem,4.6vw,4.4rem)]">{title}</h1>
          {children && <div className="mt-5 font-serif text-[1.25rem] leading-relaxed text-bone/90">{children}</div>}
        </div>
      </div>
    </header>
  );
}

export function Section({
  id,
  eyebrow,
  title,
  meta,
  scene,
  index,
  children,
}: {
  id?: string;
  eyebrow: string;
  title: string;
  meta?: string;
  /** A scene shown as a film frame above the section title. */
  scene?: SceneName;
  /** "01", "02"… shown on the frame. */
  index?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20 border-b border-line/60">
      <div className="mx-auto max-w-4xl px-[var(--gutter)] py-16">
        {scene ? (
          <>
            {/* the picture on its own, with the title below it: text never sits on the art */}
            <div className="frame corners aspect-video [--corner-inset:12px] sm:aspect-[2/1]">
              <Scene name={scene} className="absolute inset-0" sizes="(min-width: 896px) 832px, 100vw" />
            </div>
            <p className="eyebrow mt-8 text-glow">
              {index && <span className="num mr-2 text-bone">{index}</span>}
              {eyebrow}
            </p>
            <h2 className="display metal mt-3 text-[clamp(2.2rem,6vw,3.8rem)]">{title}</h2>
          </>
        ) : (
          <>
            <p className="eyebrow flex items-center gap-3">
              <span className="h-px w-8 bg-glow/70" aria-hidden="true" />
              {eyebrow}
            </p>
            <h2 className="display mt-3 text-[clamp(2.2rem,6vw,3.6rem)]">{title}</h2>
          </>
        )}
        {meta && (
          <p className="font-display mt-5 inline-flex items-center gap-2 border border-glow/30 bg-glow/5 px-3 py-1.5 text-[0.78rem] font-semibold tracking-[0.16em] text-glow uppercase">
            {meta}
          </p>
        )}
        <div className="mt-8 space-y-6 leading-relaxed text-bone/90 [&_li]:pl-1 [&_strong]:text-bone [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5 [&_ul]:marker:text-glow">
          {children}
        </div>
      </div>
    </section>
  );
}

export function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="font-display pt-4 text-xl font-semibold tracking-[0.04em] text-silver">{children}</h3>;
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
          <tr className="border-b border-glow/40">
            {head.map((h, i) => (
              <th
                key={h}
                scope="col"
                className={`font-display py-2.5 pr-4 text-[0.7rem] font-semibold tracking-[0.16em] text-glow uppercase ${numeric.includes(i) ? 'num text-right' : ''}`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri} className="border-b border-line/70 align-top transition-colors hover:bg-glow/[0.03]">
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
  return <p className="panel border-l-2 !border-l-glow px-5 py-4 text-sm text-bone/90">{children}</p>;
}
