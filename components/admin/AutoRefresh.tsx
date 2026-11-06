'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/** Re-renders a server page every `ms` while the tab is visible (host console, live counts). */
export function AutoRefresh({ ms }: { ms: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') router.refresh();
    }, ms);
    return () => window.clearInterval(id);
  }, [ms, router]);
  return null;
}
