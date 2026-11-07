import Image, { getImageProps } from 'next/image';
import hero from '@/assets/art/hero.jpg';
import heroDesktop from '@/assets/art/hero-desktop.jpg';
import kalyug from '@/assets/art/kalyug.jpg';
import kalyugHood from '@/assets/art/kalyug-hood.jpg';
import wordmark from '@/assets/art/wordmark.webp';
import ambient from '@/assets/art/ambient.jpg';
import { EVENT } from '@/lib/config';

/**
 * The event's key art. The poster itself (assets/art/poster.jpg) is not shown on the site; its
 * DOOMSDAY lettering, a close-up of the hood and a blurred haze are cut from it, and the hero uses
 * the club's character art of Professor Kalyug. None of these carry the poster's date, venue or
 * club line.
 */

/**
 * The landing hero: Professor Kalyug before the eclipse, from the club's character art (see
 * scripts/art/hero_art.py). Phones and tablets get the portrait (hood to waist); screens 1024 px
 * and wider get the wide scene, with the ruined city across the left for the title. The browser
 * downloads only the one it shows.
 */
export function HeroArt({ className = '' }: { className?: string }) {
  const common = { alt: '', fill: true, sizes: '100vw', fetchPriority: 'high', loading: 'eager' } as const;
  const { props: { srcSet: desktop } } = getImageProps({ ...common, src: heroDesktop });
  const { props: mobile } = getImageProps({ ...common, src: hero, placeholder: 'blur' });
  return (
    <picture>
      <source media="(min-width: 1024px)" srcSet={desktop} sizes="100vw" />
      <img {...mobile} className={className} aria-hidden="true" />
    </picture>
  );
}

/** A close-up of Professor Kalyug's hood, for the synopsis dossier photo. */
export function KalyugCloseUp({ className = '', sizes }: { className?: string; sizes: string }) {
  return (
    <Image
      src={kalyugHood}
      alt={`${EVENT.villain}: a faceless hood in a dark cloak, fastened with a round clasp.`}
      sizes={sizes}
      placeholder="blur"
      className={className}
    />
  );
}

/** Professor Kalyug: the hooded figure and the eclipse, cropped from the poster. */
export function KalyugImage({ className = '', sizes }: { className?: string; sizes: string }) {
  return (
    <Image
      src={kalyug}
      alt={`${EVENT.villain}: a hooded, faceless figure in a dark cloak before a black eclipse.`}
      sizes={sizes}
      placeholder="blur"
      className={className}
    />
  );
}

/** The DOOMSDAY lettering from the poster, on a transparent background. */
export function Wordmark({ className = '', sizes, preload = false, alt = EVENT.name }: { className?: string; sizes: string; preload?: boolean; alt?: string }) {
  return <Image src={wordmark} alt={alt} sizes={sizes} preload={preload} className={className} />;
}

/** The poster blurred into a green haze, to sit behind a section. */
export function Ambient({ className = '' }: { className?: string }) {
  return <Image src={ambient} alt="" fill sizes="100vw" placeholder="blur" className={`object-cover ${className}`} aria-hidden="true" />;
}

/** The poster's thin rule with a four-point star at its centre. */
export function StarRule({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`} aria-hidden="true">
      <span className="h-px flex-1 bg-gradient-to-r from-transparent via-glow/45 to-glow/70" />
      <svg viewBox="0 0 24 24" className="size-5 flex-none text-glow drop-shadow-[0_0_6px_rgb(169_207_110/0.8)]">
        <path d="M12 0 L13.4 10.6 L24 12 L13.4 13.4 L12 24 L10.6 13.4 L0 12 L10.6 10.6 Z" fill="currentColor" />
      </svg>
      <span className="h-px flex-1 bg-gradient-to-l from-transparent via-glow/45 to-glow/70" />
    </div>
  );
}

/** A small four-point star, used as a bullet and separator. */
export function Star({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`inline-block size-[0.7em] text-glow ${className}`} aria-hidden="true">
      <path d="M12 0 L13.4 10.6 L24 12 L13.4 13.4 L12 24 L10.6 13.4 L0 12 L10.6 10.6 Z" fill="currentColor" />
    </svg>
  );
}
