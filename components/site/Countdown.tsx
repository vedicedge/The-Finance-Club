'use client';

import { useEffect, useState } from 'react';

type Parts = { days: number; hours: number; minutes: number; seconds: number };

function partsUntil(target: number, now: number): Parts | null {
  const ms = target - now;
  if (ms <= 0) return null;
  const s = Math.floor(ms / 1000);
  return { days: Math.floor(s / 86400), hours: Math.floor((s % 86400) / 3600), minutes: Math.floor((s % 3600) / 60), seconds: s % 60 };
}

/**
 * Countdown to the start of Doomsday. Renders nothing time-dependent on the server (avoids a
 * mismatch between server and phone clocks); the digits appear once the page is running.
 */
export function Countdown({ target, after }: { target: string; after: React.ReactNode }) {
  const t = Date.parse(target);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const parts = now === null ? null : partsUntil(t, now);
  if (now !== null && !parts) return <>{after}</>;

  const cells: [string, number | null][] = [
    ['Days', parts?.days ?? null],
    ['Hours', parts?.hours ?? null],
    ['Min', parts?.minutes ?? null],
    ['Sec', parts?.seconds ?? null],
  ];
  return (
    <div role="timer" aria-label="Time until Doomsday" className="grid w-full max-w-md grid-cols-4 gap-px overflow-hidden rounded-sm border border-line bg-line">
      {cells.map(([label, value]) => (
        <div key={label} className="bg-vault/90 px-2 py-3 text-center">
          <span className="num block text-[clamp(1.9rem,8vw,2.9rem)] leading-none font-semibold text-bone" aria-hidden={label === 'Sec'}>
            {value === null ? '––' : String(value).padStart(2, '0')}
          </span>
          <span className="mt-1.5 block text-[0.62rem] font-semibold tracking-[0.24em] text-steel uppercase">{label}</span>
        </div>
      ))}
    </div>
  );
}
