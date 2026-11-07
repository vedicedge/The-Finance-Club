import 'server-only';
import { serviceDb } from '@/lib/db/server';

export type CardNames = {
  /** Card ID → the card's own name. */
  card: Map<string, string>;
  /** Series key (gear_cards.gear_name) → the series' display name. */
  series: Map<string, string>;
};

/**
 * Card and series display names. gear_name is only the series' internal key (Breaking News and
 * Team-Ups match on it); screens show card_name and series_name. Read on its own so that, before
 * the 8 November database update adds the columns, screens fall back to the keys instead of failing.
 */
export async function loadCardNames(): Promise<CardNames> {
  const { data, error } = await serviceDb().from('gear_cards').select('id, gear_name, card_name, series_name');
  if (error || !data) return { card: new Map(), series: new Map() };
  return {
    card: new Map(data.map((r) => [r.id as string, r.card_name as string])),
    series: new Map(data.map((r) => [r.gear_name as string, r.series_name as string])),
  };
}

/** The display name of a series key, or the key itself before the database update. */
export function seriesOf(names: CardNames, key: string): string {
  return names.series.get(key) ?? key;
}
