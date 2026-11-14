import 'server-only';
import { serviceDb } from '@/lib/db/server';

/** Length of each phone bidding window in Secret Identity Bids (organisers' choice: 20 s). */
export const BID_WINDOW_SECONDS = 20;

export type BidState = {
  cardId: string;
  closesAt: string;
  /** The window has closed and the result is recorded (a sale, or no valid bid). */
  settled: boolean;
};

/**
 * Settles a phone bidding window that has run out: the highest valid bid becomes the sale.
 * Cheap and safe to call on every refresh (the database settles each window once). Errors are
 * ignored so pages still load before the 14 November database update.
 */
export async function settleBidding(): Promise<void> {
  await serviceDb().rpc('r1_settle_bidding', { p_actor: null }).then(() => undefined, () => undefined);
}

/** The current (or last) bidding window, or null. Tolerates a database without the columns. */
export async function loadBidState(): Promise<BidState | null> {
  const { data, error } = await serviceDb().from('event_state').select('bid_card_id, bid_closes_at, bid_settled_at').maybeSingle();
  if (error || !data?.bid_card_id || !data.bid_closes_at) return null;
  return { cardId: data.bid_card_id as string, closesAt: data.bid_closes_at as string, settled: Boolean(data.bid_settled_at) };
}

/** Every bid on a card, highest first (ties: earliest first). SECRET until its window has closed. */
export async function loadBids(cardId: string) {
  const { data } = await serviceDb().from('blind_bids').select('agency_id, amount, placed_at').eq('card_id', cardId);
  return (data ?? [])
    .map((b) => ({ agency: b.agency_id as string, amount: Number(b.amount), at: b.placed_at as string }))
    .sort((a, b) => b.amount - a.amount || a.at.localeCompare(b.at));
}
