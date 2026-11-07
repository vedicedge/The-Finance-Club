import Image, { type StaticImageData } from 'next/image';
import prelim from '@/assets/art/scene-prelim.jpg';
import bazaar from '@/assets/art/scene-bazaar.jpg';
import skyline from '@/assets/art/scene-skyline.jpg';
import vault from '@/assets/art/scene-vault.jpg';
import zerohour from '@/assets/art/scene-zerohour.jpg';
import heroes from '@/assets/art/scene-heroes.jpg';
import chess from '@/assets/art/scene-chess.jpg';
import type { SceneName } from './scene-names';

export type { SceneName } from './scene-names';

/**
 * Doomsday scenes: original art in the poster's palette (see scripts/art/README.md). Each is a
 * 16:9 picture that crops from the centre, so it also works in tall phone frames and wide banners.
 */
const ART: Record<SceneName, StaticImageData> = { prelim, bazaar, skyline, vault, zerohour, heroes, chess };

export function Scene({
  name,
  className = '',
  sizes = '100vw',
  preload = false,
}: {
  name: SceneName;
  className?: string;
  sizes?: string;
  preload?: boolean;
}) {
  return (
    <div className={`${/\b(absolute|fixed)\b/.test(className) ? '' : 'relative '}overflow-hidden bg-abyss ${className}`} aria-hidden="true">
      <Image src={ART[name]} alt="" fill sizes={sizes} placeholder="blur" preload={preload} className="object-cover" />
    </div>
  );
}
