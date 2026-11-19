/**
 * Power Bazaar category colours, the same four as the prelim quiz categories (organisers' choice):
 * HQ violet, Suit blue, Gadget green, Sidekick white. Used on the projector, My Agency, the
 * printed cards' frames and the consoles, so a category is recognised at a glance.
 */
export const CATEGORY_COLOURS = {
  HQ: { color: '#b794f6', name: 'violet', blurb: 'Your base of operations' },
  Suit: { color: '#63b3ed', name: 'blue', blurb: 'What your hero wears into battle' },
  Gadget: { color: '#a9cf6e', name: 'green', blurb: 'The tech in your hero’s hands' },
  Sidekick: { color: '#f4f2e8', name: 'white', blurb: 'Who has your hero’s back' },
} as const;

export type BazaarCategory = keyof typeof CATEGORY_COLOURS;
export const BAZAAR_CATEGORIES = Object.keys(CATEGORY_COLOURS) as BazaarCategory[];

/** The category's colour; Jugaad Kits ("Any") and anything unknown get the site's gold. */
export function categoryColor(category: string): string {
  return (CATEGORY_COLOURS as Record<string, { color: string }>)[category]?.color ?? '#d6c48e';
}
