import Image, { type StaticImageData } from 'next/image';
import skyPrelim from '@/assets/art/sky-prelim.jpg';
import skyBazaar from '@/assets/art/sky-bazaar.jpg';
import skySkyline from '@/assets/art/sky-skyline.jpg';
import skyVault from '@/assets/art/sky-vault.jpg';
import skyZeroHour from '@/assets/art/sky-zerohour.jpg';
import skyHeroes from '@/assets/art/sky-heroes.jpg';
import skyChess from '@/assets/art/sky-chess.jpg';
import type { SceneName } from './scene-names';
import {
  Crowd,
  GearCard,
  GLOW,
  INK,
  IndiaGate,
  KING,
  Lit,
  PAWN,
  Paddle,
  QutubMinar,
  RimFilter,
  ruinsPath,
  windows,
} from './silhouettes';

/**
 * The source of the Doomsday scenes: a painted storm sky (scripts/art/sky.py) with original
 * silhouette art drawn over it in SVG. Pages never render this directly: scripts/art/render-scenes.cjs
 * photographs each scene from /dev/art into assets/art/scene-*.jpg, and <Scene> shows that image.
 */

const SKY: Record<SceneName, StaticImageData> = {
  prelim: skyPrelim,
  bazaar: skyBazaar,
  skyline: skySkyline,
  vault: skyVault,
  zerohour: skyZeroHour,
  heroes: skyHeroes,
  chess: skyChess,
};

export function SceneDrawing({ name, className = '' }: { name: SceneName; className?: string }) {
  const Draw = DRAW[name];
  return (
    <div id={`scene-${name}`} className={`relative overflow-hidden bg-abyss ${className}`}>
      <Image src={SKY[name]} alt="" fill sizes="1600px" quality={100} unoptimized className="object-cover" />
      <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full" focusable="false">
        <Draw />
      </svg>
    </div>
  );
}

/* ------------------------------------------------------------------ prelim: Hero Ya Zero? */
function Prelim() {
  return (
    <>
      <defs>
        <RimFilter id="rim-prelim" />
        <linearGradient id="beam-prelim" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor={GLOW} stopOpacity="0.32" />
          <stop offset="1" stopColor={GLOW} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={ruinsPath(3, 0, 1600, 760, 60, 210)} fill="#070906" opacity="0.92" />
      {windows(5, 40, 1560, 590, 740, 40)}
      {/* the projector beam and the quiz screen hanging over the city */}
      <path d="M760 900 L470 520 L1130 520 L840 900 Z" fill="url(#beam-prelim)" />
      <g transform="translate(470 150)">
        <rect width="660" height="370" rx="10" fill="#060806" fillOpacity="0.82" stroke={GLOW} strokeOpacity="0.85" strokeWidth="2.5" />
        <rect x="34" y="34" width="250" height="14" rx="3" fill={GLOW} opacity="0.5" />
        <rect x="34" y="70" width="430" height="22" rx="3" fill="#ebe8da" opacity="0.85" />
        <rect x="34" y="104" width="330" height="22" rx="3" fill="#ebe8da" opacity="0.85" />
        <circle cx="590" cy="80" r="40" fill="none" stroke={GLOW} strokeOpacity="0.25" strokeWidth="8" />
        <path d="M590 40 A40 40 0 1 1 552 92" fill="none" stroke={GLOW} strokeWidth="8" strokeLinecap="round" />
        {[0, 1, 2, 3].map((i) => (
          <g key={i} transform={`translate(${34 + (i % 2) * 304} ${168 + Math.floor(i / 2) * 92})`}>
            <rect width="288" height="72" rx="6" fill={i === 2 ? GLOW : '#0d120c'} fillOpacity={i === 2 ? 0.9 : 1} stroke={GLOW} strokeOpacity="0.55" />
            <rect x="22" y="26" width="22" height="22" rx="3" fill={i === 2 ? INK : GLOW} opacity="0.85" />
            <rect x="62" y="31" width={120 + i * 22} height="12" rx="3" fill={i === 2 ? INK : '#ebe8da'} opacity="0.7" />
          </g>
        ))}
      </g>
      {/* the audience */}
      <Lit rim="rim-prelim" strength={0.45}>
        <Crowd seed={11} x0={-40} x1={1660} y={780} r={17} />
        <Crowd seed={12} x0={-70} x1={1680} y={835} r={22} />
        <Crowd seed={13} x0={-20} x1={1700} y={905} r={29} />
      </Lit>
      {/* a captain's hand holding the quiz phone */}
      <g transform="translate(1035 640) rotate(-8)">
        <Lit rim="rim-prelim" strength={0.6}>
          <path d="M-40 260 L-36 120 C-50 108 -54 70 -40 58 L-46 40 C-46 26 -30 24 -26 34 L-20 52 L-20 -10 C-20 -28 4 -28 4 -10 L4 40 L60 40 L60 -6 C60 -22 82 -22 84 -6 L88 120 C90 170 70 200 60 260 Z" />
        </Lit>
        <rect x="-14" y="-118" width="88" height="170" rx="12" fill="#050705" stroke={GLOW} strokeOpacity="0.5" />
        <rect x="-6" y="-106" width="72" height="146" rx="6" fill={GLOW} opacity="0.85" />
        {[0, 1, 2, 3].map((i) => (
          <rect key={i} x="2" y={-62 + i * 24} width="56" height="16" rx="3" fill={INK} opacity={i === 1 ? 0.95 : 0.55} />
        ))}
        <rect x="2" y="-96" width="40" height="8" rx="2" fill={INK} opacity="0.7" />
      </g>
    </>
  );
}

/* ------------------------------------------------------------------ Round 1: Power Bazaar */
function Bazaar() {
  return (
    <>
      <defs>
        <RimFilter id="rim-bazaar" />
        <radialGradient id="halo-bazaar">
          <stop offset="0" stopColor={GLOW} stopOpacity="0.2" />
          <stop offset="1" stopColor={GLOW} stopOpacity="0" />
        </radialGradient>
      </defs>
      <path d={ruinsPath(17, 0, 1600, 740, 70, 260)} fill="#070906" opacity="0.92" />
      {windows(19, 40, 1560, 520, 720, 34)}
      {/* the four gear categories, up for auction */}
      <ellipse cx="800" cy="300" rx="380" ry="190" fill="url(#halo-bazaar)" />
      <GearCard x={560} y={330} tilt={-14} kind="HQ" />
      <GearCard x={720} y={270} tilt={-4} kind="Suit" />
      <GearCard x={880} y={270} tilt={5} kind="Gadget" />
      <GearCard x={1040} y={330} tilt={14} kind="Sidekick" />
      {/* bidders with shield paddles */}
      <Lit rim="rim-bazaar" strength={0.5}>
        <Crowd seed={21} x0={-40} x1={1660} y={800} r={19} />
        <Paddle x={420} y={570} s={1.05} tilt={-8} />
        <Paddle x={655} y={540} s={1.15} tilt={4} />
        <Paddle x={980} y={555} s={1.1} tilt={-3} />
        <Paddle x={1240} y={585} s={1} tilt={9} />
        <Crowd seed={22} x0={-90} x1={1700} y={880} r={27} />
      </Lit>
      {/* the gavel coming down */}
      <g transform="translate(1340 690) rotate(-28)">
        <Lit rim="rim-bazaar" strength={0.7} dx={-3}>
          <rect x="-12" y="-10" width="24" height="230" rx="10" />
          <rect x="-80" y="-58" width="160" height="66" rx="16" />
          <rect x="-92" y="-62" width="18" height="74" rx="6" />
          <rect x="74" y="-62" width="18" height="74" rx="6" />
        </Lit>
      </g>
      <Lit rim="rim-bazaar" strength={0.6}>
        <ellipse cx="1290" cy="842" rx="140" ry="26" />
        <rect x="1150" y="842" width="280" height="80" />
      </Lit>
      <path d="M1180 812 L1150 790 M1290 800 L1290 770 M1400 812 L1430 790" stroke={GLOW} strokeWidth="3" strokeLinecap="round" opacity="0.7" />
    </>
  );
}

/* ------------------------------------------------------------------ Round 2: Operation Skyline */
function SkylineScene() {
  // A tower of blocks, layer by layer: alternating two long blocks and three short ones.
  const rows: { x: number; w: number }[][] = [];
  for (let i = 0; i < 11; i++) rows.push(i % 2 ? [{ x: 0, w: 70 }, { x: 74, w: 70 }, { x: 148, w: 70 }] : [{ x: 0, w: 107 }, { x: 111, w: 107 }]);
  const flying = [
    { x: 880, y: 300, r: 24, w: 100 },
    { x: 960, y: 250, r: -38, w: 70 },
    { x: 1030, y: 330, r: 62, w: 70 },
    { x: 1110, y: 230, r: 12, w: 107 },
    { x: 1180, y: 300, r: -70, w: 70 },
    { x: 1250, y: 210, r: 44, w: 70 },
  ];
  return (
    <>
      <defs>
        <RimFilter id="rim-skyline" />
      </defs>
      <path d={ruinsPath(31, 0, 1600, 760, 80, 300)} fill="#070906" opacity="0.92" />
      {windows(33, 40, 1560, 470, 740, 46)}
      <Lit rim="rim-skyline" strength={0.65}>
        {/* the table */}
        <rect x="-20" y="800" width="1640" height="120" />
        {/* the tower */}
        <g transform="translate(691 800)">
          {rows.map((row, i) => (
            <g key={i}>
              {row.map((b) => (
                <rect key={b.x} x={b.x} y={-(i + 1) * 38} width={b.w} height="34" rx="2" />
              ))}
            </g>
          ))}
        </g>
        {/* blocks blasted off the top */}
        {flying.map((b, i) => (
          <rect key={i} x={b.x - b.w / 2} y={b.y - 17} width={b.w} height="34" rx="2" transform={`rotate(${b.r} ${b.x} ${b.y})`} />
        ))}
        {/* the slingshot */}
        <g transform="translate(330 800)">
          <path d="M-12 0 L-10 -150 L-70 -260 L-50 -270 L0 -190 L50 -270 L70 -260 L10 -150 L12 0 Z" />
        </g>
      </Lit>
      {/* the stone and its trail */}
      <path d="M400 560 Q620 380 860 330" fill="none" stroke={GLOW} strokeWidth="2" strokeDasharray="2 10" opacity="0.7" />
      <circle cx="862" cy="328" r="11" fill="#ebe8da" />
      <path d="M260 540 L330 600 L400 540" fill="none" stroke={GLOW} strokeOpacity="0.5" strokeWidth="2" />
      {/* dust */}
      {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <circle key={i} cx={900 + i * 42} cy={260 + ((i * 53) % 120)} r={2 + (i % 3)} fill={GLOW} opacity="0.6" />
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ Round 3: the Doomsday Vault */
function Vault() {
  const cx = 800;
  const cy = 420;
  const R = 290;
  const bolts = Array.from({ length: 24 }, (_, i) => (i / 24) * Math.PI * 2);
  return (
    <>
      <defs>
        <RimFilter id="rim-vault" blur={4} />
        <radialGradient id="spill-vault" cx="0.62" cy="0.1" r="0.9">
          <stop offset="0" stopColor={GLOW} stopOpacity="0.45" />
          <stop offset="1" stopColor={GLOW} stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* the vault wall with its round doorway; the light behind shows through */}
      <path d={`M-20 -20 H1620 V920 H-20 Z M${cx + R} ${cy} A${R} ${R} 0 1 0 ${cx - R} ${cy} A${R} ${R} 0 1 0 ${cx + R} ${cy} Z`} fill="#070907" fillRule="evenodd" />
      {[R + 18, R + 46, R + 80].map((r, i) => (
        <circle key={r} cx={cx} cy={cy} r={r} fill="none" stroke={GLOW} strokeOpacity={0.22 - i * 0.06} strokeWidth="2" />
      ))}
      {/* the door, swung a little to the left */}
      <g transform={`translate(${cx - 120} ${cy}) scale(0.82 1)`}>
        <Lit rim="rim-vault" strength={0.8} dx={8} dy={0}>
          <circle r={R - 6} />
        </Lit>
        <circle r={R - 40} fill="none" stroke={GLOW} strokeOpacity="0.25" strokeWidth="3" />
        <circle r={R - 90} fill="none" stroke={GLOW} strokeOpacity="0.15" strokeWidth="2" />
        {bolts.map((a, i) => (
          <circle key={i} cx={Math.cos(a) * (R - 22)} cy={Math.sin(a) * (R - 22)} r="7" fill="#0d120c" stroke={GLOW} strokeOpacity="0.35" />
        ))}
        <g stroke={GLOW} strokeOpacity="0.55" strokeWidth="10" strokeLinecap="round">
          <path d="M0 -110 V110 M-95 -55 L95 55 M-95 55 L95 -55" />
        </g>
        <circle r="34" fill="#0d120c" stroke={GLOW} strokeOpacity="0.6" strokeWidth="3" />
      </g>
      {/* light spilling across the floor */}
      <path d="M900 700 L1600 900 L520 900 Z" fill="url(#spill-vault)" />
      {/* the table and eight sealed Mission Files */}
      <Lit rim="rim-vault" strength={0.5}>
        <rect x="-20" y="790" width="1640" height="140" />
      </Lit>
      {Array.from({ length: 8 }, (_, i) => {
        const x = 330 + i * 120;
        const lift = i === 5 ? -26 : 0;
        return (
          <g key={i} transform={`translate(${x} ${760 + lift}) rotate(${i === 5 ? -7 : (i % 3) - 1})`}>
            <rect x="-50" y="-34" width="100" height="68" rx="3" fill="#1c2418" stroke={GLOW} strokeOpacity="0.45" />
            <path d="M-50 -34 L0 6 L50 -34" fill="none" stroke={GLOW} strokeOpacity="0.45" />
            <circle cx="0" cy="6" r="9" fill={GLOW} />
            <circle cx="0" cy="6" r="4" fill={INK} opacity="0.5" />
          </g>
        );
      })}
    </>
  );
}

/* ------------------------------------------------------------------ Zero Hour */
function ZeroHour() {
  const cx = 800;
  const cy = 330;
  const R = 230;
  return (
    <>
      <defs>
        <RimFilter id="rim-zero" />
      </defs>
      {/* the eclipse becomes the clock: twelve marks and both hands at midnight */}
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
        const r1 = R + 16;
        const r2 = R + (i === 0 ? 58 : 36);
        return (
          <line
            key={i}
            x1={cx + Math.cos(a) * r1}
            y1={cy + Math.sin(a) * r1}
            x2={cx + Math.cos(a) * r2}
            y2={cy + Math.sin(a) * r2}
            stroke="#ebe8da"
            strokeWidth={i === 0 ? 7 : 4}
            strokeLinecap="round"
            opacity={i === 0 ? 0.95 : 0.6}
          />
        );
      })}
      <path d={`M${cx - 9} ${cy} L${cx} ${cy - R * 0.82} L${cx + 9} ${cy} Z`} fill={GLOW} opacity="0.9" />
      <path d={`M${cx - 14} ${cy} L${cx} ${cy - R * 0.56} L${cx + 14} ${cy} Z`} fill="#ebe8da" opacity="0.85" />
      <circle cx={cx} cy={cy} r="12" fill={GLOW} />
      <path d={ruinsPath(41, 0, 1600, 800, 90, 300)} fill="#070906" opacity="0.94" />
      {windows(43, 40, 1560, 520, 780, 46)}
      <Lit rim="rim-zero" strength={0.6}>
        <QutubMinar x={260} y={820} h={330} />
        <IndiaGate x={1330} y={830} w={260} />
        {/* the old clock tower (a Ghanta Ghar) in the square */}
        <path d="M740 900 L740 700 L752 690 L752 610 L764 600 L764 560 L800 520 L836 560 L836 600 L848 610 L848 690 L860 700 L860 900 Z" />
        <rect x="-20" y="860" width="1640" height="60" />
        <Crowd seed={45} x0={-20} x1={1640} y={872} r={10} gap={2.4} />
      </Lit>
      <circle cx="800" cy="640" r="22" fill="none" stroke={GLOW} strokeWidth="3" opacity="0.9" />
      <path d="M800 640 V622 M800 640 V628" stroke={GLOW} strokeWidth="3" strokeLinecap="round" />
    </>
  );
}

/* ------------------------------------------------------------------ the three founders */
function Heroes() {
  return (
    <>
      <defs>
        <RimFilter id="rim-heroes" blur={3.5} />
        <radialGradient id="gauntlet" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#e6f5c8" />
          <stop offset="0.35" stopColor={GLOW} stopOpacity="0.8" />
          <stop offset="1" stopColor={GLOW} stopOpacity="0" />
        </radialGradient>
      </defs>
      <path d={ruinsPath(51, 0, 1600, 770, 50, 220, 20, 56)} fill="#080a07" opacity="0.9" />
      {windows(53, 40, 1560, 560, 760, 60)}
      <g fill="#080a07" opacity="0.92">
        <QutubMinar x={300} y={770} h={260} />
        <IndiaGate x={1340} y={770} w={190} />
      </g>
      {/* the rooftop ledge */}
      <Lit rim="rim-heroes" strength={0.45}>
        <path d="M-20 900 L-20 800 L240 792 L262 806 L300 796 L1360 796 L1384 808 L1420 798 L1620 800 L1620 900 Z" />
      </Lit>
      <Lit rim="rim-heroes" strength={0.75} dx={2} dy={-3}>
        {/* founder 1: long coat, flapping in the wind */}
        <g transform="translate(610 800) scale(1.12)">
          <ellipse cx="0" cy="-268" rx="19" ry="23" />
          <path d="M-14 -248 C-20 -240 -40 -238 -48 -228 L-56 -150 L-62 -70 L-26 -62 L-22 0 L-6 0 L-4 -60 L4 -60 L6 0 L22 0 L26 -62 L60 -70 L56 -150 L48 -228 C40 -238 20 -240 14 -248 Z" />
          <path d="M-52 -150 L-100 -96 L-70 -82 L-58 -112 Z" />
        </g>
        {/* founder 2 (centre): short tattered cape, ponytail */}
        <g transform="translate(800 800) scale(1.04)">
          <ellipse cx="0" cy="-262" rx="17" ry="21" />
          <path d="M8 -272 C34 -262 40 -232 26 -208 C22 -228 14 -246 4 -254 Z" />
          <path d="M-11 -244 C-16 -236 -32 -234 -38 -224 L-40 -150 L-34 -100 L-16 -96 L-18 0 L-4 0 L0 -88 L4 0 L18 0 L16 -96 L34 -100 L40 -150 L38 -224 C32 -234 16 -236 11 -244 Z" />
          <path d="M36 -226 L92 -112 L76 -118 L84 -94 L64 -106 L66 -84 L46 -100 L40 -86 L30 -110 L30 -220 Z" />
        </g>
        {/* founder 3: hood, gadget backpack, gauntlet raised */}
        <g transform="translate(990 800) scale(1.12)">
          <path d="M-24 -238 C-28 -278 -8 -300 6 -298 C22 -294 32 -270 26 -238 Z" />
          <path d="M-26 -240 C-40 -236 -52 -228 -56 -214 L-60 -140 L-66 -104 L-52 -102 L-46 -138 L-44 -96 L-26 -94 L-22 0 L-6 0 L-2 -86 L4 -86 L8 0 L24 0 L28 -94 L44 -96 L46 -170 L76 -150 L86 -164 L56 -200 C52 -220 40 -234 26 -240 Z" />
          <rect x="-40" y="-232" width="72" height="92" rx="16" />
          <rect x="-46" y="-196" width="10" height="40" rx="3" />
        </g>
      </Lit>
      <circle cx="1084" cy="618" r="34" fill="url(#gauntlet)" />
      <circle cx="1084" cy="618" r="5" fill="#f4fbe6" />
    </>
  );
}

/* ------------------------------------------------------------------ the leaderboard chessboard */
function Chess() {
  // An 8 × 8 board in perspective: x at the near edge spans 260–1340, the far edge 560–1040.
  const near = { y: 900, x0: 240, x1: 1360 };
  const far = { y: 640, x0: 560, x1: 1040 };
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const rowY = (t: number) => lerp(far.y, near.y, Math.pow(t, 1.35));
  const point = (u: number, t: number) => {
    const y = rowY(t);
    const k = (y - far.y) / (near.y - far.y);
    return [lerp(lerp(far.x0, near.x0, k), lerp(far.x1, near.x1, k), u), y] as const;
  };
  const squares: React.ReactNode[] = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const a = point(c / 8, r / 8);
      const b = point((c + 1) / 8, r / 8);
      const d = point((c + 1) / 8, (r + 1) / 8);
      const e = point(c / 8, (r + 1) / 8);
      squares.push(
        <path
          key={`${r}-${c}`}
          d={`M${a[0]} ${a[1]} L${b[0]} ${b[1]} L${d[0]} ${d[1]} L${e[0]} ${e[1]} Z`}
          fill={(r + c) % 2 ? '#0b0f0a' : '#1a2317'}
        />,
      );
    }
  }
  const toppled = [
    { x: 520, y: 760, r: 84, s: 0.8 },
    { x: 700, y: 820, r: -96, s: 1 },
    { x: 1010, y: 780, r: 76, s: 0.9 },
    { x: 1180, y: 860, r: -84, s: 1.1 },
    { x: 620, y: 690, r: 92, s: 0.6 },
    { x: 960, y: 690, r: -70, s: 0.6 },
    { x: 400, y: 870, r: 100, s: 1.15 },
  ];
  return (
    <>
      <defs>
        <RimFilter id="rim-chess" />
        <linearGradient id="beam-chess" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={GLOW} stopOpacity="0" />
          <stop offset="1" stopColor={GLOW} stopOpacity="0.3" />
        </linearGradient>
      </defs>
      <path d={ruinsPath(61, 0, 1600, 650, 40, 170)} fill="#070906" opacity="0.9" />
      <rect x="-20" y="640" width="1640" height="280" fill="#050605" />
      {squares}
      <path d="M770 0 L660 860 L940 860 L830 0 Z" fill="url(#beam-chess)" />
      <Lit rim="rim-chess" strength={0.55}>
        {toppled.map((p, i) => (
          <path key={i} d={PAWN} transform={`translate(${p.x} ${p.y}) rotate(${p.r}) scale(${p.s})`} />
        ))}
      </Lit>
      <Lit rim="rim-chess" strength={0.95} dy={-4}>
        <path d={KING} transform="translate(800 812) scale(1.05)" />
      </Lit>
      <ellipse cx="800" cy="816" rx="80" ry="12" fill={GLOW} opacity="0.25" />
    </>
  );
}

const DRAW: Record<SceneName, () => React.ReactNode> = {
  prelim: Prelim,
  bazaar: Bazaar,
  skyline: SkylineScene,
  vault: Vault,
  zerohour: ZeroHour,
  heroes: Heroes,
  chess: Chess,
};
