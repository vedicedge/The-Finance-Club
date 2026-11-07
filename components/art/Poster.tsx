import Image from 'next/image';
import poster from '@/assets/art/poster.jpg';
import kalyug from '@/assets/art/kalyug.jpg';
import wordmark from '@/assets/art/wordmark.webp';
import ambient from '@/assets/art/ambient.jpg';
import { EVENT } from '@/lib/config';

/**
 * The event poster and the pieces cut from it. The poster is the key art for the whole site:
 * the hooded figure is Professor Kalyug, the eclipse is the doomsday sky, and the DOOMSDAY
 * lettering is the wordmark.
 */

export function PosterImage({ className = '', sizes, preload = false }: { className?: string; sizes: string; preload?: boolean }) {
  return (
    <Image
      src={poster}
      alt={`${EVENT.club} presents ${EVENT.name}: a hooded figure before a black eclipse over a ruined city. 25 November 2026, Auditorium.`}
      sizes={sizes}
      placeholder="blur"
      preload={preload}
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

/** The poster's calendar and location pins. */
export function CalendarIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
      <path d="M3.5 10 H20.5 M8 3 V7 M16 3 V7" />
      <path d="M7.5 13.5 H8.5 M11.5 13.5 H12.5 M15.5 13.5 H16.5 M7.5 17 H8.5 M11.5 17 H12.5" strokeWidth="2.2" />
    </svg>
  );
}
export function PinIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="currentColor">
      <path d="M12 2 C7.6 2 4.5 5.3 4.5 9.4 C4.5 14.6 12 22 12 22 S19.5 14.6 19.5 9.4 C19.5 5.3 16.4 2 12 2 Z M12 12.4 A3 3 0 1 1 12 6.4 A3 3 0 0 1 12 12.4 Z" />
    </svg>
  );
}
