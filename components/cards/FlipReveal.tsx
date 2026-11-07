'use client';

import { useEffect, useState } from 'react';

/**
 * Turns a card over: it starts face down and flips to its face a moment after it appears (a new
 * lot in Secret Identity Bids). `revealKey` restarts the flip when the card changes.
 */
export function FlipReveal({
  revealKey,
  back,
  front,
  delayMs = 900,
  className = '',
}: {
  revealKey: string;
  back: React.ReactNode;
  front: React.ReactNode;
  delayMs?: number;
  className?: string;
}) {
  const [shown, setShown] = useState<{ key: string; up: boolean }>({ key: revealKey, up: false });
  const up = shown.key === revealKey && shown.up;
  useEffect(() => {
    const t = window.setTimeout(() => setShown({ key: revealKey, up: true }), delayMs);
    return () => window.clearTimeout(t);
  }, [revealKey, delayMs]);
  return (
    <div className={`flip-card ${className}`} data-up={up ? 'true' : 'false'}>
      <div className="flip-card-inner">
        <div className="flip-card-face">{front}</div>
        <div className="flip-card-face flip-card-back">{back}</div>
      </div>
    </div>
  );
}
