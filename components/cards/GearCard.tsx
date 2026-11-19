import { categoryColor } from '@/lib/round1/colours';
import Image from 'next/image';
import { cardArt, cardBackArt, seriesLabel } from '@/lib/card-art';
import { GearIcon } from '@/components/art/gear-icons';

/**
 * A gear card, as printed: the picture (or the category's icon until a picture is added), and
 * underneath it the card's name, series and Power. Text never sits on the picture.
 *
 * Every size inside is in em, so the card scales with the font size its parent gives it: a
 * projector lot sets it in container units, a phone in pixels. The parent sets the width.
 */
export type GearCardData = {
  id: string;
  name: string;
  /** The series' display name (gear_cards.series_name), shown under the card's name. */
  series?: string;
  category: string;
  power?: number;
};

type Kind = 'HQ' | 'Suit' | 'Gadget' | 'Sidekick';
const isKind = (c: string): c is Kind => c === 'HQ' || c === 'Suit' || c === 'Gadget' || c === 'Sidekick';

export function GearCard({
  card,
  className = '',
  sizes,
  showSeries = true,
}: {
  card: GearCardData;
  className?: string;
  /** The rendered width, for picking the picture size (e.g. "200px" or "25vw"). */
  sizes: string;
  showSeries?: boolean;
}) {
  const art = cardArt(card.id);
  const series = showSeries && card.series ? seriesLabel(card.series) : null;
  const color = categoryColor(card.category);
  return (
    <figure className={`gear-card ${className}`} style={{ borderColor: `${color}b3`, boxShadow: `0 0 1.2em -0.3em ${color}66` }}>
      <div className="relative aspect-[3/4] overflow-hidden rounded-[0.45em] bg-[#07100c]">
        {art ? (
          <Image src={art} alt={card.name} fill sizes={sizes} className="object-cover" />
        ) : (
          <Placeholder category={card.category} />
        )}
        {/* The category in its colour (Power Bazaar colour code). */}
        <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[0.35em]" style={{ background: color }} />
        <span
          className="absolute top-[0.6em] left-[0.5em] rounded-[0.2em] px-[0.45em] py-[0.15em] text-[0.58em] font-bold tracking-[0.14em] uppercase"
          style={{ background: color, color: '#0b0f0c' }}
        >
          {card.category === 'Any' ? 'Jugaad' : card.category}
        </span>
      </div>
      <figcaption className="px-[0.2em] pt-[0.6em] pb-[0.15em]">
        <span className="font-display line-clamp-2 block text-[1em] leading-[1.15] font-semibold text-bone">{card.name}</span>
        <span className="mt-[0.4em] flex items-center justify-between gap-[0.5em] text-[0.62em] font-semibold tracking-[0.16em] text-steel uppercase">
          <span className="truncate" style={series ? undefined : { color }}>{series ?? card.category}</span>
          {card.power !== undefined && <span className="num flex-none text-glow">P{card.power}</span>}
        </span>
      </figcaption>
    </figure>
  );
}

/** The card back: sealed, with the eclipse and the poster's four-point star. */
export function GearCardBack({ className = '', sizes }: { className?: string; sizes: string }) {
  return (
    <div className={`gear-card ${className}`} aria-label="Sealed card">
      <div className="relative aspect-[3/4] overflow-hidden rounded-[0.45em] bg-[radial-gradient(circle_at_50%_45%,#1a2b22,#07100c_70%)]">
        {cardBackArt ? (
          <Image src={cardBackArt} alt="" fill sizes={sizes} className="object-cover" />
        ) : (
          <svg viewBox="0 0 120 160" className="absolute inset-0 size-full" aria-hidden="true">
            <rect x="8" y="8" width="104" height="144" rx="6" fill="none" stroke="#d6c48e" strokeOpacity="0.35" />
            <rect x="13" y="13" width="94" height="134" rx="4" fill="none" stroke="#d6c48e" strokeOpacity="0.15" />
            <circle cx="60" cy="78" r="30" fill="#d6c48e" opacity="0.12" />
            <circle cx="60" cy="78" r="21" fill="#08110d" stroke="#efe6c8" strokeWidth="1.6" />
            <path d="M60 46 L63 75 L92 78 L63 81 L60 110 L57 81 L28 78 L57 75 Z" fill="#f3ecd2" />
          </svg>
        )}
      </div>
      <div className="px-[0.2em] pt-[0.6em] pb-[0.15em]">
        <span className="font-display block text-[1em] leading-[1.15] font-semibold text-steel">Sealed</span>
        <span className="mt-[0.4em] block text-[0.62em] font-semibold tracking-[0.16em] text-steel/70 uppercase">Secret identity</span>
      </div>
    </div>
  );
}

/** No picture yet: the category's icon, glowing on the card's dark face. */
function Placeholder({ category }: { category: string }) {
  return (
    <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_50%_42%,#1f3228,#07100c_72%)]" aria-hidden="true">
      <div className="absolute inset-[6%] rounded-[0.3em] border border-glow/20" />
      <svg viewBox="0 0 48 48" className="w-[46%] drop-shadow-[0_0_0.4em_rgb(214_196_142/0.6)]" fill="none" stroke="#d6c48e" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round">
        {isKind(category) ? <GearIcon kind={category} /> : <path d="M8 40 L24 8 L40 40 Z M24 20 V30 M24 35 V36" />}
      </svg>
    </div>
  );
}
