import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAgency } from '@/lib/auth/agency';
import { AGENCY_SESSION_COOKIE, hashSessionToken } from '@/lib/auth/session-token';
import { serviceDb } from '@/lib/db/server';
import { settleBidding } from '@/lib/round1/bidding';
import { CATEGORIES } from '@/lib/round1/steps';

const headers = { 'Cache-Control': 'no-store' };

/**
 * My Agency during Secret Identity Bids: the card open for bidding, this agency's own bid, and
 * once the window has closed, who won. Never anyone else's bid while bidding is open.
 * Every phone polls this each second: one read of the event state, and the database is asked to
 * settle a window only once it has actually run out.
 */
export async function GET() {
  const db = serviceDb();
  const [agency, st] = await Promise.all([
    getAgency(),
    db.from('event_state').select('phase, step, round1_locked_at, bid_card_id, bid_closes_at, bid_settled_at').single(),
  ]);
  if (!agency) return NextResponse.json({ error: 'not_signed_in' }, { status: 401, headers });
  const now = new Date().toISOString();
  const live = st.data?.phase === 'round1' && st.data?.step === 'secret' && !st.data?.round1_locked_at && agency.status === 'active';
  if (!live) return NextResponse.json({ live: false, now }, { headers });

  const cardId = (st.data?.bid_card_id as string | null) ?? null;
  const closesAt = (st.data?.bid_closes_at as string | null) ?? null;
  let settled = Boolean(st.data?.bid_settled_at);
  if (cardId && closesAt && !settled && Date.parse(closesAt) <= Date.now()) {
    await settleBidding();
    const after = await db.from('event_state').select('bid_settled_at').single();
    settled = Boolean(after.data?.bid_settled_at);
  }
  const bid = cardId && closesAt ? { cardId, closesAt, settled } : null;

  const [fund, held, card, mine, sale] = await Promise.all([
    db.from('v_fund_left').select('fund_left').eq('agency_id', agency.id).maybeSingle(),
    db.from('v_held_gear').select('category').eq('agency_id', agency.id),
    bid ? db.from('gear_cards').select('id, category, gear_name, card_name, series_name, power, min_bid').eq('id', bid.cardId).single() : null,
    bid ? db.from('blind_bids').select('amount').eq('card_id', bid.cardId).eq('agency_id', agency.id).maybeSingle() : null,
    bid?.settled ? db.from('sales').select('agency_id, price, agencies(name)').eq('card_id', bid.cardId).is('voided_at', null).maybeSingle() : null,
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
            name: (c.card_name as string | null) ?? c.gear_name, series: (c.series_name as string | null) ?? c.gear_name,
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
