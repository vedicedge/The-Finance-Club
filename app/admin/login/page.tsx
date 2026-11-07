import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { EVENT } from '@/lib/config';
import { getOrganiser } from '@/lib/auth/organiser';
import { publicEnv } from '@/lib/env';
import { LoginForm } from './LoginForm';
import { Ambient } from '@/components/art/Poster';

export const metadata: Metadata = { title: 'Crew sign-in' };

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ link?: string }> }) {
  const { link } = await searchParams;
  const configured = publicEnv() !== null && Boolean(process.env.SUPABASE_SECRET_KEY);
  if (configured && (await getOrganiser())) redirect('/admin');

  return (
    <main id="main" className="relative isolate flex min-h-dvh flex-col justify-center overflow-hidden px-[var(--gutter)] py-16">
      <Ambient className="-z-20 opacity-40" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(55%_60%_at_50%_50%,rgb(8_10_7/0.6),rgb(8_10_7/0.95))]" aria-hidden="true" />
      <div className="panel corners mx-auto w-full max-w-md px-6 py-8 [--corner-inset:8px] [--corner-size:14px] sm:px-8">
      <p className="eyebrow text-glow">{EVENT.name} · Crew only</p>
      <h1 className="display metal mt-4 text-5xl">Command centre</h1>
      <p className="mt-4 text-steel">
        Organisers sign in with the email the admin added to the crew list.
      </p>
      {link === 'expired' && (
        <p role="alert" className="mt-6 rounded-sm border border-ember/40 bg-ember/10 px-4 py-3 text-sm text-ember">
          That sign-in link has expired or was already used. Ask for a new one.
        </p>
      )}
      {configured ? (
        <LoginForm />
      ) : (
        <p className="mt-8 rounded-sm border border-ember/40 bg-ember/10 px-4 py-3 text-sm text-ember">
          The server is not connected to Supabase yet. Set the environment variables listed in the README.
        </p>
      )}
      </div>
    </main>
  );
}
