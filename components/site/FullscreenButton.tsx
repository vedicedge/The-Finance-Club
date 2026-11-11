'use client';

import { useEffect, useState } from 'react';

type Doc = Document & { webkitFullscreenElement?: Element | null; webkitExitFullscreen?: () => void; webkitFullscreenEnabled?: boolean };
type El = HTMLElement & { webkitRequestFullscreen?: () => void };

/**
 * Full screen on a participant's phone. Shown only where the browser supports it (Android and
 * most desktop browsers; iPhones do not allow it for web pages: there, Add to Home Screen opens
 * the site full screen instead).
 */
export function FullscreenButton({ className = '' }: { className?: string }) {
  const [supported, setSupported] = useState(false);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const d = document as Doc;
    setSupported(Boolean(d.fullscreenEnabled || d.webkitFullscreenEnabled));
    const sync = () => setOn(Boolean(d.fullscreenElement || d.webkitFullscreenElement));
    sync();
    document.addEventListener('fullscreenchange', sync);
    document.addEventListener('webkitfullscreenchange', sync);
    return () => {
      document.removeEventListener('fullscreenchange', sync);
      document.removeEventListener('webkitfullscreenchange', sync);
    };
  }, []);
  if (!supported) return null;
  const toggle = () => {
    const d = document as Doc;
    const el = document.documentElement as El;
    if (d.fullscreenElement || d.webkitFullscreenElement) (d.exitFullscreen ? d.exitFullscreen() : d.webkitExitFullscreen?.());
    else if (el.requestFullscreen) void el.requestFullscreen().catch(() => {});
    else el.webkitRequestFullscreen?.();
  };
  return (
    <button type="button" onClick={toggle} aria-label={on ? 'Exit full screen' : 'Full screen'} className={`btn btn-ghost !min-h-0 !px-3 !py-2 ${className}`}>
      <svg viewBox="0 0 16 16" className="size-4" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5">
        {on ? <path d="M6 1v5H1M10 1v5h5M6 15v-5H1M10 15v-5h5" /> : <path d="M1 6V1h5M15 6V1h-5M1 10v5h5M15 10v5h-5" />}
      </svg>
    </button>
  );
}
