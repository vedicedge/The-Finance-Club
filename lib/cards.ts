import 'server-only';
import { serviceDb } from '@/lib/db/server';

/**
 * Each gear card's own name (gear_cards.card_name), by card ID. Read on its own so that, before
 * the 8 November database update adds the column, screens fall back to the series name instead
 * of failing.
 */
export async function loadCardNames(): Promise<Map<string, string>> {
  const { data, error } = await serviceDb().from('gear_cards').select('id, card_name');
  if (error || !data) return new Map();
  return new Map(data.map((r) => [r.id as string, r.card_name as string]));
}
