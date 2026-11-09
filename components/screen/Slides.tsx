'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import heroDesktop from '@/assets/art/hero-desktop.jpg';
import wordmark from '@/assets/art/wordmark.webp';
import { EVENT } from '@/lib/config';
import { PHASE_INFO, isPhase } from '@/lib/phases';
import { Stage } from '@/components/screen/Stage';

/**
 * Projector slides that are not a round of their own: the welcome slide before the prelim and
 * the "back shortly" slide for breaks. Sized in container units, like every projector screen.
 */

/** Before the prelim: Professor Kalyug, the countdown and where captains sign in. */
export function WelcomeScreen({ startsAt, serverNow, agencies }: { startsAt: string; serverNow: string; agencies: number }) {
  // The site's address, read in the browser (after hydration, so server and browser agree).
  const [host, setHost] = useState('');
  useEffect(() => setHost(window.location.host), []);
  return (
    <Stage
      backdrop={
        <>
          <Image src={heroDesktop} alt="" fill sizes="100vw" className="pointer-events-none object-cover object-[60%_30%]" aria-hidden="true" />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,var(--color-abyss)_0%,rgb(8_10_7/0.85)_32%,rgb(8_10_7/0.2)_55%,transparent_68%)]"
          />
        </>
      }
    >
      <div className="flex h-full w-[52cqw] flex-col justify-center pl-[6cqw]">
        <p className="text-[1.3cqw] font-semibold tracking-[0.35em] text-glow uppercase">Incoming transmission · {EVENT.city}</p>
        <Image src={wordmark} alt={EVENT.name} sizes="40vw" className="mt-[2.5cqh] h-auto w-[38cqw]" />
        <p className="mt-[1.5cqh] font-serif text-[2.4cqw] text-silver italic">{EVENT.tagline}</p>
        <p className="mt-[5cqh] text-[1.2cqw] font-semibold tracking-[0.3em] text-steel uppercase">{EVENT.villain} strikes in</p>
        <BigCountdown target={startsAt} serverNow={serverNow} />
        <p className="mt-[5cqh] text-[1.8cqw] text-bone">
          Captains: sign in at <span className="num font-semibold text-glow">{host}/login</span>
        </p>
        {agencies > 0 && (
          <p className="mt-[1cqh] text-[1.4cqw] text-steel">
            <span className="num font-semibold text-bone">{agencies}</span> hero agencies registered
          </p>
        )}
      </div>
    </Stage>
  );
}

/** A break: the event name, where we are, and "back shortly". */
export function HoldingScreen({ phase }: { phase: string }) {
  const label = isPhase(phase) ? PHASE_INFO[phase].label : EVENT.name;
  return (
    <Stage art="zerohour">
      <div className="flex h-full flex-col items-center justify-center text-center">
        <Image src={wordmark} alt={EVENT.name} sizes="30vw" className="h-auto w-[26cqw] opacity-90" />
        <p className="mt-[4cqh] text-[1.4cqw] font-semibold tracking-[0.35em] text-glow uppercase">{label}</p>
        <h1 className="display metal mt-[2cqh] text-[8cqw] leading-none">Back shortly</h1>
        <p className="mt-[3cqh] font-serif text-[2.2cqw] text-silver italic">Stay close. {EVENT.city} still needs you.</p>
      </div>
    </Stage>
  );
}

/** Days, hours, minutes and seconds to the start, on the server's clock. */
function BigCountdown({ target, serverNow }: { target: string; serverNow: string }) {
  const [offset] = useState(() => Date.parse(serverNow) - Date.now());
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now() + offset);
    const id = window.setInterval(() => setNow(Date.now() + offset), 1000);
    return () => window.clearInterval(id);
  }, [offset]);
  const ms = now === null ? null : Math.max(0, Date.parse(target) - now);
  if (ms === 0) return <p className="display mt-[2cqh] text-[5cqw] text-ember">Doomsday is here.</p>;
  const s = ms === null ? null : Math.floor(ms / 1000);
  const cells: [string, number | null][] = [
    ['Days', s === null ? null : Math.floor(s / 86400)],
    ['Hours', s === null ? null : Math.floor((s % 86400) / 3600)],
    ['Min', s === null ? null : Math.floor((s % 3600) / 60)],
    ['Sec', s === null ? null : s % 60],
  ];
  return (
    <div className="mt-[2cqh] grid w-[40cqw] grid-cols-4 gap-[1.2cqw]">
      {cells.map(([label, v]) => (
        <div key={label} className="border border-line bg-abyss/60 py-[1.6cqh] text-center">
          <span className="num block text-[4.6cqw] leading-none font-extralight text-bone">{v === null ? '––' : String(v).padStart(2, '0')}</span>
          <span className="font-display mt-[1cqh] block text-[0.95cqw] font-semibold tracking-[0.28em] text-glow uppercase">{label}</span>
        </div>
      ))}
    </div>
  );
}

/** Round 3 runs offline: the projector shows only this cover. */
export function CoverScreen() {
  return (
    <Stage art="zerohour">
      <div className="flex h-full flex-col items-center justify-center text-center">
        <p className="text-[1.4cqw] font-semibold tracking-[0.35em] text-glow uppercase">Round 3</p>
        <h1 className="display metal mt-[2cqh] text-[7.5cqw] leading-none">The Doomsday Vault</h1>
        <p className="mt-[3cqh] font-serif text-[2.2cqw] text-silver italic">Eight sealed Mission Files. Only one agency saves {EVENT.city}.</p>
      </div>
    </Stage>
  );
}

type Place = { place: number; id: string; name: string; coinToss: boolean };
const PLACE = ['1st', '2nd', '3rd'];

/** Zero Hour: a cover until the anchor announces 3rd place, then 2nd, then 1st. */
export function PodiumScreen({ places }: { places: Place[] }) {
  const first = places.find((p) => p.place === 1) ?? null;
  return (
    <Stage art="zerohour">
      <div className="flex h-full flex-col items-center justify-center text-center">
        <p className="text-[1.4cqw] font-semibold tracking-[0.35em] text-glow uppercase">Zero Hour · The results</p>
        {places.length === 0 ? (
          <>
            <h1 className="display metal mt-[2cqh] text-[7.5cqw] leading-none">Who saved {EVENT.city}?</h1>
            <p className="mt-[3cqh] font-serif text-[2.2cqw] text-silver italic">The envelopes are open. The results are coming.</p>
          </>
        ) : (
          <ol className="mt-[4cqh] flex w-[70cqw] flex-col gap-[2.5cqh]">
            {places.map((p) => {
              const top = p === places[0]; // the place just announced
              return (
                <li key={p.id} className={`projector-fade flex items-baseline justify-between border px-[3cqw] py-[2.5cqh] ${top ? 'border-glow bg-glow/10' : 'border-line bg-abyss/60'}`}>
                  <span className={`display ${top ? 'text-[4cqw] text-glow' : 'text-[3cqw] text-steel'}`}>{PLACE[p.place - 1]}</span>
                  <span className={`text-right ${top ? 'text-[4.4cqw] text-bone' : 'text-[3.2cqw] text-bone'}`}>
                    <span className="num mr-[1.5cqw] font-semibold text-glow">{p.id}</span>
                    {p.name}
                    {p.coinToss && <span className="block text-[1.4cqw] text-ember">Tied: coin toss on stage</span>}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
        {first && <p className="mt-[4cqh] font-serif text-[2.4cqw] text-silver italic">{first.name} saved {EVENT.city}.</p>}
      </div>
    </Stage>
  );
}
