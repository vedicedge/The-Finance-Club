/**
 * Gear card pictures. Drop a picture into public/cards/ named by card ID (H01.webp, S13.jpg,
 * K07.png…), JK.webp for the Jugaad Kit and back.webp for the card back, then build or deploy:
 * scripts/card-art-manifest.mjs lists what is there in lib/card-art.json. A card without a
 * picture shows its category icon instead. Browser-safe (no server imports).
 */
import manifest from './card-art.json';

const ART = manifest as Record<string, string>;

/** The picture for a card ID, or null for the icon placeholder. */
export function cardArt(id: string): string | null {
  return (/^JK\d*$/.test(id) ? ART.JK : ART[id]) ?? null;
}

/** The card-back picture, or null for the built-in eclipse-and-star back. */
export const cardBackArt: string | null = ART.BACK ?? null;

/** "Budget Bunkers series": a series' display name, as shown under a card. */
export function seriesLabel(series: string): string {
  return `${series} series`;
}
