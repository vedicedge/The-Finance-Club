import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAgency } from '@/lib/auth/agency';
import { AGENCY_SESSION_COOKIE, hashSessionToken } from '@/lib/auth/session-token';
import { serviceDb } from '@/lib/db/server';
import { loadCardNames, seriesOf } from '@/lib/cards';
import { loadBidState, settleBidding } from '@/lib/round1/bidding';
import { CATEGORIES } from '@/lib/round1/steps';

const headers = { 'Cache-Control': 'no-store' };

/**
 * My Agency during Secret Identity Bids: the card open for bidding, this agency's own bid, and
 * once the window has closed, who won. Never anyone else's bid while bidding is open.
 */
export async function GET() {
  const agency = await getAgency();
  if (!agency) return NextResponse.json({ error: 'not_signed_in' }, { status: 401, headers });
  await settleBidding();
  const db = serviceDb();
  const [st, bid] = await Promise.all([db.from('event_state').select('phase, step, round1_locked_at').single(), loadBidState()]);
  const live = st.data?.phase === 'round1' && st.data?.step === 'secret' && !st.data?.round1_locked_at && agency.status === 'active';
  const now = new Date().toISOString();
  if (!live) return NextResponse.json({ live: false, now }, { headers });

  const [fund, held, card, mine, sale, names] = await Promise.all([
    db.from('v_fund_left').select('fund_left').eq('agency_id', agency.id).maybeSingle(),
    db.from('v_held_gear').select('category').eq('agency_id', agency.id),
    bid ? db.from('gear_cards').select('id, category, gear_name, power, min_bid').eq('id', bid.cardId).single() : null,
    bid ? db.from('blind_bids').select('amount').eq('card_id', bid.cardId).eq('agency_id', agency.id).maybeSingle() : null,
    bid?.settled ? db.from('sales').select('agency_id, price, agencies(name)').eq('card_id', bid.cardId).is('voided_at', null).maybeSingle() : null,
    loadCardNames(),
  ]);
  const heldCats = new Set((held.data ?? []).map((h) => h.category as string));
  const c = card?.data;
  const s = sale?.data as { agency_id: string; price: number; agencies: { name: string } | { name: string }[] | null } | null | undefined;
  const winnerName = s ? (Array.isArray(s.agencies) ? s.agencies[0]?.name : s.agencies?.name) ?? s.agency_id : null;
  return NextResponse.json(
    {
      live: true,
      now,
      fund: Number(fund.data?.fund_left ?? 0),
      missing: CATEGORIES.filter((k) => !heldCats.has(k)),
      card: c
        ? {
            id: c.id, category: c.category, power: c.power, minBid: Number(c.min_bid),
            name: names.card.get(c.id) ?? c.gear_name, series: seriesOf(names, c.gear_name),
          }
        : null,
      open: Boolean(bid && !bid.settled && Date.parse(bid.closesAt) > Date.now()),
      closesAt: bid?.closesAt ?? null,
      myBid: mine?.data ? Number(mine.data.amount) : null,
      eligible: c ? !heldCats.has(c.category) : false,
      result: bid?.settled ? (s ? { winner: s.agency_id, winnerName, price: Number(s.price), mine: s.agency_id === agency.id } : { winner: null }) : null,
    },
    { headers },
  );
}

/** Places, changes or (amount null) withdraws this agency's bid. The database checks every rule. */
export async function POST(req: Request) {
  const token = (await cookies()).get(AGENCY_SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: 'Your sign-in has expired. Sign in again.' }, { status: 401, headers });
  const body = (await req.json().catch(() => null)) as { amount?: number | null } | null;
  const amount = body?.amount === null || body?.amount === undefined ? null : Number(body.amount);
  if (amount !== null && !Number.isFinite(amount)) return NextResponse.json({ error: 'Type an amount in ₹ Cr.' }, { status: 400, headers });
  const { error } = await serviceDb().rpc('r1_agency_bid', { p_token_hash: hashSessionToken(token), p_amount: amount });
  if (error) {
    const msg = error.message?.includes('not_signed_in') ? 'Your sign-in has expired. Sign in again.' : error.hint || 'Your bid was not accepted.';
    return NextResponse.json({ error: msg }, { status: 400, headers });
  }
  return NextResponse.json({ ok: true }, { headers });
}
