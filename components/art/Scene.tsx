import Image, { type StaticImageData } from 'next/image';
import prelim from '@/assets/art/scene-prelim.jpg';
import bazaar from '@/assets/art/scene-bazaar.jpg';
import skyline from '@/assets/art/scene-skyline.jpg';
import vault from '@/assets/art/scene-vault.jpg';
import zerohour from '@/assets/art/scene-zerohour.jpg';
import heroes from '@/assets/art/scene-heroes.jpg';
import chess from '@/assets/art/scene-chess.jpg';

/**
 * Doomsday scenes: the club's 16:9 pictures for each round, the three founders and the
 * leaderboard (see scripts/art/README.md). Pages put them in frames of their own shape; the
 * picture is centred and cropped to fit.
 */
export type SceneName = 'prelim' | 'bazaar' | 'skyline' | 'vault' | 'zerohour' | 'heroes' | 'chess';
const ART: Record<SceneName, StaticImageData> = { prelim, bazaar, skyline, vault, zerohour, heroes, chess };

export function Scene({
  name,
  className = '',
  imgClassName = '',
  sizes = '100vw',
  preload = false,
}: {
  name: SceneName;
  className?: string;
  /** Extra classes on the picture itself: object-position, or a hover zoom inside a `group`. */
  imgClassName?: string;
  sizes?: string;
  preload?: boolean;
}) {
  return (
    <div className={`${/\b(absolute|fixed)\b/.test(className) ? '' : 'relative '}overflow-hidden bg-abyss ${className}`} aria-hidden="true">
      <Image src={ART[name]} alt="" fill sizes={sizes} placeholder="blur" preload={preload} className={`object-cover ${imgClassName}`} />
    </div>
  );
}
