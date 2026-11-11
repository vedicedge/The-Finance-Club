'use client';

import { pollFetch } from '@/lib/poll';
import { useCallback, useEffect, useRef, useState } from 'react';
import { QuizProjector } from '@/app/screen/quiz/QuizProjector';
import { AuctionProjector } from '@/app/screen/auction/AuctionProjector';
import { BoardProjector } from '@/app/screen/board/BoardProjector';
import { CoverScreen, EventCover, HoldingScreen, PodiumScreen, WelcomeScreen } from '@/components/screen/Slides';
import type { ProjectorScreen } from '@/lib/projector';

type State = { now: string; phase: string; mode: string; screen: ProjectorScreen; startsAt: string; venue: string; agencies: number; places?: { place: number; id: string; name: string; coinToss: boolean }[]; finale?: 'podium' | 'cover' | null; ffClosesAt?: string | null };

const POLL_MS = 2000;
const IDLE_MS = 2500;

/**
 * The projector: polls what to show and swaps screens with a cross-fade. Each screen polls its
 * own data, as on its own page. On the projector laptop it also offers full screen, hides the
 * cursor when the mouse is still, and asks the browser to keep the screen awake.
 */
export function ProjectorShell({ preview = false }: { preview?: boolean }) {
  const [state, setState] = useState<State | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stop = false;
    let t: number;
    const loop = async () => {
      try {
        const res = await pollFetch('/api/screen/projector');
        if (res.status === 401) setError('Sign in at /admin/login with the projector account.');
        else {
          setState((await res.json()) as State);
          setError(null);
        }
      } catch {
        setError('Signal lost. Reconnecting…'); // keep showing the last screen
      }
      if (!stop) t = window.setTimeout(loop, POLL_MS);
    };
    loop();
    return () => {
      stop = true;
      window.clearTimeout(t);
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black">
      {state ? (
        <div key={state.screen + (state.finale ?? "")} className="projector-fade absolute inset-0">
          <Screen state={state} />
        </div>
      ) : (
        <div className="grid h-full place-items-center">
          <p className="eyebrow text-glow">{error ?? 'Establishing secure line…'}</p>
        </div>
      )}
      {error && state && (
        <p className="pointer-events-none fixed right-4 bottom-3 z-50 text-xs font-semibold tracking-[0.2em] text-ember uppercase">{error}</p>
      )}
      {!preview && <LaptopHelpers />}
    </div>
  );
}

function Screen({ state }: { state: State }) {
  switch (state.screen) {
    case 'quiz':
      return <QuizProjector />;
    case 'auction':
      return <AuctionProjector />;
    case 'board':
      return <BoardProjector />;
    case 'cover':
      return <CoverScreen ffClosesAt={state.ffClosesAt ?? null} serverNow={state.now} />;
    case 'reveal':
      return state.finale === 'cover' ? <EventCover /> : <PodiumScreen places={state.places ?? []} final={state.finale === 'podium'} />;
    case 'welcome':
      return <WelcomeScreen startsAt={state.startsAt} serverNow={state.now} agencies={state.agencies} />;
    case 'holding':
      return <HoldingScreen phase={state.phase} />;
    case 'blank':
      return <div className="absolute inset-0 bg-black" />;
  }
}

/** Full screen, a hidden cursor and a screen that stays awake, for the projector laptop. */
function LaptopHelpers() {
  const [fullscreen, setFullscreen] = useState(true);
  const [idle, setIdle] = useState(false);
  const timer = useRef<number | null>(null);

  const toggle = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.().catch(() => {});
  }, []);

  useEffect(() => {
    const sync = () => setFullscreen(Boolean(document.fullscreenElement));
    sync();
    document.addEventListener('fullscreenchange', sync);
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'f' && !e.metaKey && !e.ctrlKey && !e.altKey) toggle();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('fullscreenchange', sync);
      window.removeEventListener('keydown', onKey);
    };
  }, [toggle]);

  // Hide the cursor when the mouse is still.
  useEffect(() => {
    const wake = () => {
      setIdle(false);
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setIdle(true), IDLE_MS);
    };
    wake();
    window.addEventListener('mousemove', wake);
    window.addEventListener('mousedown', wake);
    return () => {
      window.removeEventListener('mousemove', wake);
      window.removeEventListener('mousedown', wake);
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle('projector-idle', idle);
    return () => document.documentElement.classList.remove('projector-idle');
  }, [idle]);

  // Keep the laptop from sleeping or dimming the projector (where the browser allows it).
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null;
    const request = async () => {
      try {
        const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } };
        lock = (await nav.wakeLock?.request('screen')) ?? null;
      } catch {
        lock = null;
      }
    };
    void request();
    const onVisible = () => {
      if (document.visibilityState === 'visible') void request();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      void lock?.release().catch(() => {});
    };
  }, []);

  if (fullscreen || idle) return null;
  return (
    <button
      type="button"
      onClick={toggle}
      className="btn btn-primary fixed bottom-6 left-1/2 z-50 -translate-x-1/2 !min-h-0 !px-5 !py-2.5 shadow-2xl shadow-black/70"
    >
      Full screen <span className="font-sans text-xs font-medium tracking-normal normal-case opacity-70">(or press F)</span>
    </button>
  );
}
