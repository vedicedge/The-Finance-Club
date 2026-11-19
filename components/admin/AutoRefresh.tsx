'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { pollFetch } from '@/lib/poll';

/**
 * Re-renders a server page every `ms` while the tab is visible (My Agency, consoles, live counts).
 * It first checks the line with a tiny request: a refresh that fails makes Next.js reload the whole
 * page, and with no signal the browser would then sit on its own "No internet" page even after
 * the Wi-Fi comes back. Skipping the refresh instead keeps the page (and anything typed) on screen.
 * It also catches up at once when the tab comes back to the front or the network returns.
 */
export function AutoRefresh({ ms }: { ms: number }) {
  const router = useRouter();
  useEffect(() => {
    let busy = false;
    const refresh = async () => {
      if (busy || document.visibilityState !== 'visible') return;
      busy = true;
      try {
        const res = await pollFetch('/api/ping', 3000);
        if (res.ok) router.refresh();
      } catch {
        /* no signal: keep the page as it is and try again next time */
      }
      busy = false;
    };
    const id = window.setInterval(refresh, ms);
    const now = () => void refresh();
    document.addEventListener('visibilitychange', now);
    window.addEventListener('online', now);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', now);
      window.removeEventListener('online', now);
    };
  }, [ms, router]);
  return null;
}
