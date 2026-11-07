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
    <div role="timer" aria-label="Time until Doomsday" className="grid w-full max-w-md grid-cols-4 gap-2 sm:gap-3">
      {cells.map(([label, value]) => (
        <div
          key={label}
          className="corners border border-line bg-abyss/60 px-1 pt-2 pb-1.5 text-center backdrop-blur-sm [--corner-color:rgb(169_207_110/0.7)] [--corner-inset:-1px] [--corner-size:9px] sm:pt-3 sm:pb-2.5 lg:short:pt-2 lg:short:pb-2"
        >
          <span className="num block text-[clamp(1.7rem,7.5vw,2.2rem)] leading-none font-extralight text-bone sm:text-[2.6rem] lg:text-[3.1rem] lg:short:text-[2.5rem]" aria-hidden={label === 'Sec'}>
            {value === null ? '––' : String(value).padStart(2, '0')}
          </span>
          <span className="font-display mt-1 block text-[0.6rem] font-semibold tracking-[0.28em] text-glow/90 uppercase sm:mt-2">{label}</span>
        </div>
      ))}
    </div>
  );
}
