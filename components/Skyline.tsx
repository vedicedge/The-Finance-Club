/**
 * Mahanagar skyline — original art, Delhi-flavoured: Qutub Minar, India Gate, the Lotus Temple,
 * Cyber City glass towers, and the Metro on its elevated line. Decorative only.
 */
export function Skyline({ className = '', lit = true }: { className?: string; lit?: boolean }) {
  const towers = [
    { x: 820, w: 46, h: 150 },
    { x: 872, w: 34, h: 112 },
    { x: 912, w: 58, h: 188 },
    { x: 976, w: 40, h: 132 },
    { x: 1022, w: 52, h: 168 },
    { x: 1080, w: 30, h: 96 },
    { x: 1116, w: 48, h: 142 },
    { x: 60, w: 40, h: 92 },
    { x: 106, w: 54, h: 124 },
    { x: 166, w: 36, h: 80 },
  ];
  const windows: { x: number; y: number }[] = [];
  towers.forEach((t, i) => {
    for (let row = 0; row < Math.floor((t.h - 24) / 18); row++) {
      for (let col = 0; col < Math.floor((t.w - 8) / 12); col++) {
        // Deterministic scatter so only some windows are lit.
        if ((i * 7 + row * 3 + col * 5) % 4 === 0) windows.push({ x: t.x + 6 + col * 12, y: 220 - t.h + 12 + row * 18 });
      }
    }
  });

  return (
    <svg
      viewBox="0 0 1200 220"
      preserveAspectRatio="xMidYMax slice"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="sky-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#13261f" />
          <stop offset="1" stopColor="#050807" />
        </linearGradient>
        <linearGradient id="sky-haze" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#62d6a8" stopOpacity="0" />
          <stop offset="1" stopColor="#62d6a8" stopOpacity="0.18" />
        </linearGradient>
      </defs>

      <rect x="0" y="120" width="1200" height="100" fill="url(#sky-haze)" />

      <g fill="url(#sky-fill)" stroke="#2f7d66" strokeOpacity="0.35" strokeWidth="1">
        {towers.map((t) => (
          <rect key={t.x} x={t.x} y={220 - t.h} width={t.w} height={t.h} />
        ))}

        {/* Qutub Minar: a tapering fluted tower with balcony bands */}
        <path d="M262 220 L270 60 L274 34 L280 22 L286 34 L290 60 L298 220 Z" />
        <rect x="266" y="150" width="28" height="4" />
        <rect x="268" y="108" width="24" height="4" />
        <rect x="270" y="72" width="20" height="4" />

        {/* India Gate: a monumental arch */}
        <path d="M470 220 L470 112 L462 112 L462 100 L598 100 L598 112 L590 112 L590 220 L556 220 L556 168 Q530 132 504 168 L504 220 Z" />
        <rect x="490" y="88" width="80" height="12" />

        {/* Lotus Temple: layered petals */}
        <path d="M640 220 Q660 168 690 158 Q700 120 716 104 Q732 120 742 158 Q772 168 792 220 Z" />
        <path d="M680 220 Q700 176 716 140 Q732 176 752 220 Z" fill="#0b1513" />

        {/* Low city between landmarks */}
        <path d="M0 220 L0 196 L40 196 L40 184 L210 184 L210 200 L250 200 L250 220 Z" />
        <path d="M300 220 L300 190 L340 190 L340 176 L420 176 L420 194 L460 194 L460 220 Z" />
        <path d="M600 220 L600 196 L636 196 L636 220 Z" />
        <path d="M796 220 L796 198 L816 198 L816 220 Z" />
      </g>

      {/* Metro on its elevated line, with pillars and a train */}
      <g fill="#0b1513" stroke="#62d6a8" strokeOpacity="0.4" strokeWidth="1">
        <rect x="0" y="198" width="1200" height="5" />
        {Array.from({ length: 13 }, (_, i) => (
          <rect key={i} x={30 + i * 95} y="203" width="7" height="17" />
        ))}
        <rect x="340" y="186" width="210" height="12" rx="5" />
      </g>
      {lit && (
        <g fill="#e9b04e" opacity="0.7">
          {Array.from({ length: 12 }, (_, i) => (
            <rect key={i} x={350 + i * 16} y="189" width="8" height="4" rx="1" />
          ))}
        </g>
      )}

      {lit && (
        <g fill="#e9b04e">
          {windows.map((w, i) => (
            <rect key={i} x={w.x} y={w.y} width="5" height="7" opacity={0.35 + ((i * 37) % 50) / 100} />
          ))}
        </g>
      )}
    </svg>
  );
}
