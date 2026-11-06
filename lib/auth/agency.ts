import 'server-only';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { serviceDb } from '@/lib/db/server';
import {
  AGENCY_SESSION_COOKIE,
  AGENCY_SESSION_TTL_S,
  hashSessionToken,
  newSessionToken,
} from '@/lib/auth/session-token';

export type AgencySession = {
  id: string;
  name: string;
  status: 'registered' | 'checked_in' | 'active' | 'eliminated';
  eliminatedIn: string | null;
};

/** Starts a session for an agency and sets the httpOnly cookie. Call only from a Server Action. */
export async function startAgencySession(agencyId: string, { single }: { single: boolean }) {
  const token = newSessionToken();
  const ua = (await headers()).get('user-agent') ?? '';
  const { error } = await serviceDb().rpc('create_agency_session', {
    p_agency: agencyId,
    p_token_hash: hashSessionToken(token),
    p_ttl_s: AGENCY_SESSION_TTL_S,
    p_single: single,
    p_user_agent: ua,
  });
  if (error) throw error;
  (await cookies()).set(AGENCY_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: AGENCY_SESSION_TTL_S,
  });
}

/** The signed-in agency, or null. */
export async function getAgency(): Promise<AgencySession | null> {
  const token = (await cookies()).get(AGENCY_SESSION_COOKIE)?.value;
  if (!token) return null;
  const { data, error } = await serviceDb()
    .from('agency_sessions')
    .select('expires_at, revoked_at, agencies ( id, name, status, eliminated_in )')
    .eq('token_hash', hashSessionToken(token))
    .maybeSingle();
  if (error || !data || data.revoked_at || Date.parse(data.expires_at) <= Date.now()) return null;
  const a = (Array.isArray(data.agencies) ? data.agencies[0] : data.agencies) as
    | { id: string; name: string; status: AgencySession['status']; eliminated_in: string | null }
    | null;
  if (!a) return null;
  return { id: a.id, name: a.name, status: a.status, eliminatedIn: a.eliminated_in };
}

export async function requireAgency(): Promise<AgencySession> {
  const agency = await getAgency();
  if (!agency) redirect('/login');
  return agency;
}

/** Ends this phone's session. Call only from a Server Action. */
export async function endAgencySession() {
  const store = await cookies();
  const token = store.get(AGENCY_SESSION_COOKIE)?.value;
  if (token) {
    await serviceDb()
      .from('agency_sessions')
      .update({ revoked_at: new Date().toISOString() })
      .eq('token_hash', hashSessionToken(token));
  }
  store.delete(AGENCY_SESSION_COOKIE);
}
