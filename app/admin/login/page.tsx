import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { EVENT } from '@/lib/config';
import { getOrganiser } from '@/lib/auth/organiser';
import { publicEnv } from '@/lib/env';
import { LoginForm } from './LoginForm';

export const metadata: Metadata = { title: 'Crew sign-in' };

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ link?: string }> }) {
  const { link } = await searchParams;
  const configured = publicEnv() !== null && Boolean(process.env.SUPABASE_SECRET_KEY);
  if (configured && (await getOrganiser())) redirect('/admin');

  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-[var(--gutter)] py-16">
      <p className="eyebrow">{EVENT.name} · Crew only</p>
      <h1 className="display mt-4 text-5xl">Command centre</h1>
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
    </main>
  );
}
