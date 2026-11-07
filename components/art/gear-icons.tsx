/** Line icons for the four gear categories (HQ, Suit, Gadget, Sidekick). */

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
