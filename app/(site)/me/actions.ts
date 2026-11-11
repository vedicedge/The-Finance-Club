'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { serviceDb } from '@/lib/db/server';
import { AGENCY_SESSION_COOKIE, hashSessionToken } from '@/lib/auth/session-token';

export type BuyTipState = { error?: string; done?: boolean };

const MESSAGES: Record<string, string> = {
  tips_closed: 'The Insider Tips window has closed.',
  tip_already_bought: 'Your agency already has a tip (a teammate may have just bought it).',
  insufficient_fund: 'You need ₹2 Cr in your fund to buy a tip.',
  not_signed_in: 'Your sign-in has expired. Sign in again with your agency ID and PIN.',
};

/** An agency buys its one Insider Tip during the window. The database checks the clock and picks the card. */
export async function buyInsiderTip(_prev: BuyTipState, _form: FormData): Promise<BuyTipState> {
  const token = (await cookies()).get(AGENCY_SESSION_COOKIE)?.value;
  if (!token) return { error: MESSAGES.not_signed_in };
  const { error } = await serviceDb().rpc('r1_agency_buy_tip', { p_token_hash: hashSessionToken(token) });
  if (error) {
    const code = Object.keys(MESSAGES).find((k) => error.message?.includes(k));
    return { error: code ? MESSAGES[code] : 'Only agencies still in the game can buy a tip.' };
  }
  revalidatePath('/me');
  return { done: true };
}

const FF_MESSAGES: Record<string, string> = {
  ff_closed: 'The Force Field window has closed.',
  ff_already_bought: 'Your agency already has its Force Field (a teammate may have just bought it).',
  insufficient_fund: 'You need ₹5 Cr in your fund to buy a Force Field.',
  not_signed_in: MESSAGES.not_signed_in,
};

/** A finalist buys its one Round 3 Force Field during the window. Only the organisers see who bought one. */
export async function buyForceField(_prev: BuyTipState, _form: FormData): Promise<BuyTipState> {
  const token = (await cookies()).get(AGENCY_SESSION_COOKIE)?.value;
  if (!token) return { error: FF_MESSAGES.not_signed_in };
  const { error } = await serviceDb().rpc('r3_agency_buy_ff', { p_token_hash: hashSessionToken(token) });
  if (error) {
    const code = Object.keys(FF_MESSAGES).find((k) => error.message?.includes(k));
    return { error: code ? FF_MESSAGES[code] : 'Only finalists can buy a Force Field.' };
  }
  revalidatePath('/me');
  return { done: true };
}
