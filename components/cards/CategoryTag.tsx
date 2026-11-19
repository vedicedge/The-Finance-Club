import { categoryColor } from '@/lib/round1/colours';

/** A Power Bazaar category name in its colour, with a colour square in front. */
export function CategoryTag({ category, className = '' }: { category: string; className?: string }) {
  const color = categoryColor(category);
  return (
    <span className={`inline-flex items-center gap-[0.45em] font-semibold ${className}`} style={{ color }}>
      <span aria-hidden="true" className="inline-block size-[0.7em] flex-none rounded-[0.15em]" style={{ background: color }} />
      {category}
    </span>
  );
}
