import type { Metadata } from 'next';
import Link from 'next/link';
import { getEventState, registrationStatus } from '@/lib/event-state';
import { longDate } from '@/lib/schedule';
import { RegisterForm } from './RegisterForm';
import { QuickJoinForm } from './QuickJoinForm';

export const metadata: Metadata = { title: 'Register your agency' };

const CLOSED_COPY = {
  full: ['Every slot is taken.', 'All agency slots for Doomsday have been claimed. Mahanagar has its defenders.'],
  deadline: ['Registration has closed.', 'The deadline has passed. Registered agencies: see you on Doomsday.'],
  closed: ['Registration is paused.', 'The organisers have paused registration. Check back soon.'],
  phase: ['Registration has closed.', 'Doomsday is under way. Registered agencies can log in below.'],
} as const;

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ full?: string }> }) {
  const { full } = await searchParams;
  const state = await getEventState();
  const r = state.settings.registration;
  const dryRun = state.settings.dryRun.enabled && (state.phase === 'registration' || state.phase === 'checkin');
  // The real form follows the real rules, even while the dry run is on.
  const status = registrationStatus({ ...state, settings: { ...state.settings, dryRun: { enabled: false } } });

  if (dryRun && full !== '1') {
    return (
      <div className="mx-auto max-w-xl px-[var(--gutter)] pt-12 pb-20">
        <p className="eyebrow text-torch">Dry run · rehearsal</p>
        <h1 className="display mt-4 text-[clamp(2.8rem,10vw,4.2rem)]">Join the dry run</h1>
        <p className="mt-4 text-steel">Type your name. That&apos;s it: no team, no IMI email.</p>
        <div className="mt-8">
          <QuickJoinForm />
        </div>
        {status.open && (
          <p className="mt-10 text-sm text-steel">
            Registering a real agency for Doomsday?{' '}
            <a href="/register?full=1" className="text-torch underline underline-offset-4">Use the full registration form</a>.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-[var(--gutter)] pt-12 pb-20">
      <p className="eyebrow">Enlist · Hero agency registration</p>
      <h1 className="display mt-4 text-[clamp(2.8rem,10vw,4.2rem)]">Found your agency</h1>

      {status.open ? (
        <>
          <p className="mt-4 text-steel">
            Three founders, one name. You&apos;ll get an agency ID and a 4-digit PIN.{' '}
            <span className="num text-bone">{Math.max(0, r.maxAgencies - state.agencyCount)}</span> slots left · closes{' '}
            {longDate(r.closesAt)}.
          </p>
          <div className="mt-8">
            <RegisterForm emailDomain={r.emailDomain} emailHint={r.emailHint} />
          </div>
        </>
      ) : (
        <div className="mt-8 panel px-5 py-6">
          <p className="stamp text-ember">Closed</p>
          <p className="font-display mt-5 text-2xl text-bone">{CLOSED_COPY[status.reason ?? 'closed'][0]}</p>
          <p className="mt-2 text-steel">{CLOSED_COPY[status.reason ?? 'closed'][1]}</p>
          <Link href="/login" className="btn btn-ghost mt-6">
            Agency login
          </Link>
        </div>
      )}
    </div>
  );
}
