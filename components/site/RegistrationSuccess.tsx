import Link from 'next/link';
import { Transmission } from '@/components/site/Transmission';

/** Shown once after a successful registration: the agency ID and PIN. */
export function RegistrationSuccess({
  agencyId,
  agencyName,
  pin,
  captain,
  dryRun = false,
}: {
  agencyId: string;
  agencyName: string;
  pin: string;
  captain: string;
  /** A one-person test agency for the dry run. */
  dryRun?: boolean;
}) {
  return (
    <Transmission title={dryRun ? 'Transmission received · test agency ready' : 'Transmission received · agency registered'}>
          <p className="eyebrow">Agency</p>
          <p className="display mt-2 text-4xl">{agencyName}</p>
          <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-sm border border-line bg-line">
            <div className="bg-vault-2 px-4 py-4">
              <dt className="eyebrow">Agency ID</dt>
              <dd className="num mt-2 text-4xl font-semibold text-torch sm:text-5xl">{agencyId}</dd>
            </div>
            <div className="bg-vault-2 px-4 py-4">
              <dt className="eyebrow">PIN</dt>
              <dd className="num mt-2 text-4xl font-semibold tracking-[0.08em] text-torch sm:text-5xl">{pin}</dd>
            </div>
          </dl>
          {dryRun ? (
            <p className="mt-5 text-sm text-bone/85">
              This phone is signed in and checked in. Keep the PIN in case you switch phones. When the host opens the prelim,
              tap <strong>My Agency</strong> → <strong>Enter the prelim</strong>.
            </p>
          ) : (
            <>
              <p className="mt-5 font-semibold text-bone">Screenshot this now. The PIN is shown only once.</p>
              <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-bone/85 marker:text-torch">
                <li>{captain} (captain) logs in with this ID and PIN on the quiz phone on Doomsday.</li>
                <li>Share the ID and PIN with your co-founders. Lost it? An organiser can reset it at the check-in desk.</li>
              </ul>
            </>
          )}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link href="/me" className="btn btn-primary flex-1">
              Open My Agency
            </Link>
            <Link href="/rules" className="btn btn-ghost flex-1">
              Read the rules
            </Link>
          </div>
        </Transmission>
  );
}
