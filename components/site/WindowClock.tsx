'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * m:ss left until `closesAt`, corrected for this device's clock using the server time the page
 * was rendered with. Display only: the database decides whether the window is open. When it
 * reaches 0:00 the page refreshes once (if `refreshOnClose`), so buttons disappear on time.
 */
export function WindowClock({
  closesAt,
  serverNow,
  refreshOnClose = false,
  className = '',
}: {
  closesAt: string;
  serverNow: string;
  refreshOnClose?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const offset = useRef<number | null>(null);
  const [left, setLeft] = useState<number | null>(null);
  const refreshed = useRef(false);

  useEffect(() => {
    if (offset.current === null) offset.current = Date.parse(serverNow) - Date.now();
    const tick = () => {
      const ms = Date.parse(closesAt) - (Date.now() + (offset.current ?? 0));
      setLeft(Math.max(0, Math.ceil(ms / 1000)));
      if (ms <= 0 && refreshOnClose && !refreshed.current) {
        refreshed.current = true;
        router.refresh();
      }
    };
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [closesAt, serverNow, refreshOnClose, router]);

  if (left === null) return <span className={className}>–:––</span>;
  return (
    <span className={`num ${className}`} aria-live="off">
      {Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}
    </span>
  );
}
