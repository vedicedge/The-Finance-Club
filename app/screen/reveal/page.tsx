import { redirect } from 'next/navigation';

/** The old card-by-card screen. Results now go up only through /projector, one place at a time. */
export default function RevealPage() {
  redirect('/projector');
}
