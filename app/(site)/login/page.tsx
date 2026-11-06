import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAgency } from '@/lib/auth/agency';
import { publicEnv } from '@/lib/env';
import { getEventState } from '@/lib/event-state';
import { AgencyLoginForm } from './LoginForm';

export const metadata: Metadata = { title: 'Agency login' };

export default async function AgencyLoginPage() {
  const configured = Boolean(publicEnv() && process.env.SUPABASE_SECRET_KEY);
  if (configured && (await getAgency())) redirect('/me');
  const prelim = configured ? (await getEventState()).phase === 'prelim' : false;
  return (
    <div className="mx-auto max-w-md px-[var(--gutter)] pt-14 pb-24">
      <p className="eyebrow">Secure line · Agencies only</p>
      <h1 className="display mt-4 text-[clamp(2.8rem,10vw,4rem)]">Agency login</h1>
      <p className="mt-4 text-steel">Use the agency ID and PIN you got when you registered.</p>
      {prelim && (
        <p className="panel mt-4 border-l-2 border-l-torch px-4 py-3 text-sm text-bone">
          <strong className="text-torch">Prelim in progress:</strong> one phone per agency. Signing in here signs your agency’s
          other phones out, so only the captain should sign in.
        </p>
      )}
      <div className="mt-8">
        <AgencyLoginForm />
      </div>
      <p className="mt-8 text-sm text-steel">
        Lost your PIN? An organiser can reset it at the check-in desk. Not registered yet?{' '}
        <Link href="/register" className="text-torch underline underline-offset-4">
          Found your agency
        </Link>
        .
      </p>
    </div>
  );
}
