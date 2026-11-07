/**
 * Silhouette building blocks for the Doomsday scenes: original art, drawn in a 1600 × 900 space.
 * Everything is a flat near-black shape lit from behind by the eclipse, like the figure and
 * skyline on the poster. Decorative only.
 */

export const INK = '#040504';
export const GLOW = '#a9cf6e';

/** Deterministic pseudo-random numbers, so the same scene renders the same everywhere. */
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** A soft blur used to fake rim light: the same shapes, lit green, blurred behind the ink. */
export function RimFilter({ id, blur = 3 }: { id: string; blur?: number }) {
  return (
    <filter id={id} x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation={blur} />
    </filter>
  );
}

/** Draws children twice: a blurred green copy nudged toward the light, then the ink on top. */
export function Lit({
  rim,
  children,
  dx = 0,
  dy = -3,
  strength = 0.55,
  fill = INK,
}: {
  rim: string;
  children: React.ReactNode;
  dx?: number;
  dy?: number;
  strength?: number;
  fill?: string;
}) {
  return (
    <>
      <g filter={`url(#${rim})`} transform={`translate(${dx} ${dy})`} fill={GLOW} stroke={GLOW} opacity={strength}>
        {children}
      </g>
      <g fill={fill}>{children}</g>
    </>
  );
}

/**
 * A ruined skyline between x0 and x1 standing on `base`: towers with broken, jagged tops and the
 * odd antenna. Returns one path.
 */
export function ruinsPath(seed: number, x0: number, x1: number, base: number, hMin: number, hMax: number, wMin = 24, wMax = 70) {
  const r = rng(seed);
  let d = `M${x0} ${base + 400}`;
  let x = x0;
  while (x < x1) {
    const w = wMin + r() * (wMax - wMin);
    const h = hMin + r() * (hMax - hMin);
    const top = base - h;
    d += ` L${x.toFixed(1)} ${top.toFixed(1)}`;
    if (r() < 0.45) {
      // broken top: a few jagged notches
      const n = 2 + Math.floor(r() * 3);
      for (let i = 1; i <= n; i++) {
        const nx = x + (w * i) / (n + 1);
        const ny = top + (r() * 0.22 + 0.02) * h * (i % 2 ? 1 : 0.35);
        d += ` L${nx.toFixed(1)} ${ny.toFixed(1)}`;
      }
    } else if (r() < 0.3) {
      // antenna
      const ax = x + w * (0.3 + r() * 0.4);
      d += ` L${(ax - 2).toFixed(1)} ${top.toFixed(1)} L${ax.toFixed(1)} ${(top - 20 - r() * 40).toFixed(1)} L${(ax + 2).toFixed(1)} ${top.toFixed(1)}`;
    }
    d += ` L${(x + w).toFixed(1)} ${top.toFixed(1)}`;
    x += w + (r() < 0.25 ? r() * 10 : 0);
    d += ` L${x.toFixed(1)} ${(base - (r() < 0.2 ? 0 : hMin * 0.4)).toFixed(1)}`;
  }
  d += ` L${x1} ${base + 400} Z`;
  return d;
}

/** Lit windows scattered over a skyline band (a few survive the blackout). */
export function windows(seed: number, x0: number, x1: number, yTop: number, yBottom: number, count: number) {
  const r = rng(seed);
  return Array.from({ length: count }, (_, i) => (
    <rect
      key={i}
      x={(x0 + r() * (x1 - x0)).toFixed(1)}
      y={(yTop + r() * (yBottom - yTop)).toFixed(1)}
      width="4"
      height="6"
      fill={GLOW}
      opacity={(0.25 + r() * 0.55).toFixed(2)}
    />
  ));
}

/** Qutub Minar: a tapering fluted tower with balcony bands. Base centre at (x, y), height h. */
export function QutubMinar({ x, y, h }: { x: number; y: number; h: number }) {
  const s = h / 200;
  const p = (dx: number, dy: number) => `${(x + dx * s).toFixed(1)} ${(y - dy * s).toFixed(1)}`;
  return (
    <>
      <path d={`M${p(-18, 0)} L${p(-10, 160)} L${p(-6, 186)} L${p(0, 200)} L${p(6, 186)} L${p(10, 160)} L${p(18, 0)} Z`} />
      <rect x={x - 21 * s} y={y - 70 * s} width={42 * s} height={5 * s} />
      <rect x={x - 17 * s} y={y - 112 * s} width={34 * s} height={5 * s} />
      <rect x={x - 13 * s} y={y - 150 * s} width={26 * s} height={4 * s} />
    </>
  );
}

/** India Gate: a monumental arch, broken at one corner. Base centre at (x, y), width w. */
export function IndiaGate({ x, y, w }: { x: number; y: number; w: number }) {
  const s = w / 140;
  const p = (dx: number, dy: number) => `${(x + dx * s).toFixed(1)} ${(y - dy * s).toFixed(1)}`;
  return (
    <path
      d={`M${p(-60, 0)} L${p(-60, 108)} L${p(-70, 108)} L${p(-70, 122)} L${p(-40, 122)} L${p(-40, 134)} L${p(30, 134)} L${p(36, 128)} L${p(44, 132)} L${p(70, 122)} L${p(70, 108)} L${p(60, 108)} L${p(60, 0)} L${p(22, 0)} L${p(22, 52)} Q${p(0, 92)} ${p(-22, 52)} L${p(-22, 0)} Z`}
    />
  );
}

/** A person seen from behind: head and shoulders, for crowds. Shoulder line centred at (x, y). */
export function Bust({ x, y, r }: { x: number; y: number; r: number }) {
  return (
    <>
      <path
        d={`M${x - r * 2.5} ${y + r * 3} L${x - r * 2.4} ${y + r * 0.6} C${x - r * 2.3} ${y - r * 0.5} ${x - r * 1.3} ${y - r * 0.9} ${x} ${y - r * 0.95} C${x + r * 1.3} ${y - r * 0.9} ${x + r * 2.3} ${y - r * 0.5} ${x + r * 2.4} ${y + r * 0.6} L${x + r * 2.5} ${y + r * 3} Z`}
      />
      <ellipse cx={x} cy={y - r * 1.85} rx={r * 0.92} ry={r * 1.08} />
    </>
  );
}

/** A row of busts with a little variety in size and spacing. */
export function Crowd({ seed, x0, x1, y, r, gap = 2.6 }: { seed: number; x0: number; x1: number; y: number; r: number; gap?: number }) {
  const rand = rng(seed);
  const out: React.ReactNode[] = [];
  let x = x0;
  let i = 0;
  while (x < x1) {
    const rr = r * (0.85 + rand() * 0.3);
    out.push(<Bust key={i++} x={x} y={y + rand() * r * 0.5} r={rr} />);
    x += rr * gap * (0.9 + rand() * 0.35);
  }
  return <>{out}</>;
}

/** Shield-shaped bidding paddle on a stick, held up. Paddle centre at (x, y). */
export function Paddle({ x, y, s = 1, tilt = 0 }: { x: number; y: number; s?: number; tilt?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${tilt}) scale(${s})`}>
      <path d="M-26 -34 L26 -34 L26 0 C26 22 4 34 0 40 C-4 34 -26 22 -26 0 Z" />
      <rect x="-4" y="36" width="8" height="170" />
    </g>
  );
}

/** Gear-card line icons (48 × 48), drawn as strokes. */
export function GearIcon({ kind }: { kind: 'HQ' | 'Suit' | 'Gadget' | 'Sidekick' }) {
  switch (kind) {
    case 'HQ':
      return (
        <>
          <path d="M5 44 V20 L12 15 V7 H18 V13 L24 9 L30 13 V7 H36 V15 L43 20 V44 Z" />
          <path d="M19 44 V32 A5 5 0 0 1 29 32 V44" />
          <path d="M11 26 H15 M33 26 H37 M24 18 V22" />
        </>
      );
    case 'Suit':
      return (
        <>
          <path d="M14 8 C18 12 30 12 34 8 L44 14 L40 26 L34 24 L34 44 H14 L14 24 L8 26 L4 14 Z" />
          <circle cx="24" cy="24" r="4.5" />
          <path d="M14 34 H34 M24 30 V44" />
        </>
      );
    case 'Gadget':
      return (
        <>
          <circle cx="24" cy="24" r="8" />
          <path d="M24 6 V12 M24 36 V42 M6 24 H12 M36 24 H42 M11.3 11.3 L15.5 15.5 M32.5 32.5 L36.7 36.7 M11.3 36.7 L15.5 32.5 M32.5 15.5 L36.7 11.3" />
          <path d="M22 20 L27 24 L21 25 L26 29" />
        </>
      );
    case 'Sidekick':
      return (
        <>
          <path d="M10 10 L16 16 C20 13 28 13 32 16 L38 10 L38 30 C38 40 31 45 24 45 C17 45 10 40 10 30 Z" />
          <circle cx="18" cy="24" r="4.5" />
          <circle cx="30" cy="24" r="4.5" />
          <path d="M22 31 L24 34 L26 31" />
        </>
      );
  }
}

/** A floating gear card: dark glass with a glowing border and an icon. Centre (x, y). */
export function GearCard({ x, y, tilt, kind, s = 1 }: { x: number; y: number; tilt: number; kind: 'HQ' | 'Suit' | 'Gadget' | 'Sidekick'; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${tilt}) scale(${s})`}>
      <rect x="-62" y="-86" width="124" height="172" rx="9" fill="#070a06" fillOpacity="0.88" stroke={GLOW} strokeOpacity="0.85" strokeWidth="2" />
      <rect x="-52" y="-76" width="104" height="152" rx="5" fill="none" stroke={GLOW} strokeOpacity="0.3" strokeWidth="1" />
      <g transform="translate(-36 -48) scale(1.5)" fill="none" stroke={GLOW} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round">
        <GearIcon kind={kind} />
      </g>
      <path d="M-34 44 H34 M-24 56 H24" stroke={GLOW} strokeOpacity="0.45" strokeWidth="3" strokeLinecap="round" />
    </g>
  );
}

/** A pawn. Base centre at (0, 0), about 110 tall; place it with a transform. */
export const PAWN =
  'M-30 0 L-30 -10 C-30 -18 -18 -20 -16 -26 L-10 -60 C-22 -64 -22 -80 -10 -84 C-20 -92 -20 -112 0 -114 C20 -112 20 -92 10 -84 C22 -80 22 -64 10 -60 L16 -26 C18 -20 30 -18 30 -10 L30 0 Z';

/** A king. Base centre at (0, 0), about 250 tall. */
export const KING =
  'M-52 0 L-52 -18 C-52 -30 -34 -34 -30 -44 L-22 -140 C-40 -144 -40 -164 -22 -168 L-26 -186 C-32 -200 -20 -210 -12 -206 L-8 -214 H-6 V-224 H-16 V-232 H-6 V-246 H6 V-232 H16 V-224 H6 V-214 H8 L12 -206 C20 -210 32 -200 26 -186 L22 -168 C40 -164 40 -144 22 -140 L30 -44 C34 -34 52 -30 52 -18 L52 0 Z';
