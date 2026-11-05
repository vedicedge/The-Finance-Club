# Design references

The three reference images were shared in chat and are **not committed**. They are Marvel
promotional and fan art (a cloaked figure before a tapestry, a metal mask half-buried in green
sand with the Avengers: Doomsday logo, and a chessboard with toppled pieces). The website must
never use them or any Marvel/DC imagery or logos (spec, tone rules). We take only the mood.

## What we take from them

| Ref | Mood we borrow | Where it shows up |
|---|---|---|
| Cloaked figure climbing stairs to a lit tapestry | A single warm light source from above; deep brown-black shadow; torchlight amber; a long climb toward something | Landing hero (light beam over the Mahanagar skyline), Zero Hour reveal spotlight |
| Mask in green sand under a stormy sky | Verdigris and teal-green palette, a toxic green glow on the horizon, film grain, centred poster typography: small tracked caps ("SYNOPSIS", "RELEASE: …") under a large title | Colour tokens, landing layout, section labels, grain overlay |
| Chessboard with toppled pieces and one standing piece | Strategy, elimination, one survivor; hard diagonal light and shadow | Leaderboard (eliminated agencies "toppled"), round dividers, the board screen |

## Palette (derived from the refs)

| Token | Hex | Use |
|---|---|---|
| `abyss` | `#050807` | Page background (near-black, green-tinted) |
| `vault` | `#0b1513` | Panels |
| `vault-2` | `#11201c` | Raised panels, inputs |
| `verdigris` | `#2f7d66` | Primary fills (buttons, bars) |
| `toxic` | `#62d6a8` | Green text and accents on dark; "correct" / "city saved" |
| `torch` | `#e9b04e` | Torchlight amber: calls to action, money, highlights |
| `steel` | `#a3b1ad` | Secondary text (the mask's metal) |
| `bone` | `#ece6d8` | Primary text (the tapestry's lit cream) |
| `ember` | `#e5574a` | Danger only: eliminations, errors, last seconds |

## Type (same families as the Section E site)

- **Cormorant Garamond** — display and poster titles (heavier weights for the projector).
- **Pinyon Script** — rare flourishes (tagline, Professor Kalyug's signature).
- **Inter** — all UI copy and every number (tabular figures, includes ₹).
