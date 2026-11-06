import { NextResponse } from 'next/server';
import { getOrganiser } from '@/lib/auth/organiser';
import { canAccess } from '@/lib/auth/roles';
import { loadReveal } from '@/lib/zero-hour-server';

export async function GET() {
  const headers = { 'Cache-Control': 'no-store' };
  const organiser = await getOrganiser();
  if (!organiser || !canAccess(organiser.roles, 'screens')) return NextResponse.json({ error: 'not_signed_in' }, { status: 401, headers });
  return NextResponse.json(await loadReveal(), { headers });
}
