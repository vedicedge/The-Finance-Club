# Design references

**The event poster is the design's source** (`assets/art/poster.jpg`): a hooded figure,
Professor Kalyug, before a black eclipse with a green corona, over a ruined city, with the
DOOMSDAY title in cracked silver-green capitals. The site's colours, type and art all come from
it, but the poster itself is not shown: its details (date, venue, club line) are still being
finalised. The hero uses the club's character art of Professor Kalyug instead (hood to waist
before the eclipse: `kalyug-wide.webp` on laptops, with the ruined city across the left behind
the title, and `kalyug-character.webp` on phones) with the poster's DOOMSDAY lettering as the
title.

The other references (Pinterest boards shared in chat, not committed) set the layout language.
Several are fan art or film/game key art; the website must never use their images or any
Marvel/DC imagery or logos (spec, tone rules). We take only the composition ideas.

| Reference | What we borrow | Where it shows up |
|---|---|---|
| The event poster | Palette, Cinzel-style capitals, the eclipse, the hooded figure, the thin rule with a star | Hero art and title, Kalyug, icon, colour tokens |
| Stacked cinematic frames ("street stories" photo series, film-still strips) | Wide image panels stacked with black gutters, huge type laid over the picture | The five rounds as a film strip on the landing page; scene frames on /rounds |
| Horror studio redesign (green UI, framed photo) | Viewfinder corner brackets, dark green UI, big tracked headings with one word highlighted | `.corners`, section titles ("Five stages. **One survivor.**") |
| Sci-fi game site (thin vertical light lines, floating thumbnails) | Thin vertical streaks over art, small caps labels | `.streaks` over heroes and frames |
| Survival game site (torn paper edges) | Ragged edges between sections | `.torn-top` / `.torn-bottom` utilities |
| Editorial poster (scattered corner text) | Small notes in the corners of a frame | Landing hero corner notes on wide screens |

## Palette (sampled from the poster)

| Token | Hex | Use |
|---|---|---|
| `abyss` | `#080a07` | Page background |
| `vault` / `vault-2` / `moss` | `#0e130d` / `#151c13` / `#1f2a1b` | Panels, inputs, raised surfaces |
| `glow` | `#a9cf6e` | The eclipse corona: primary buttons, links, money, agency IDs |
| `glow-deep` | `#6e8f45` | Pressed/secondary glow |
| `toxic` | `#6fdca6` | "Correct", "qualified", "city saved" |
| `silver` | `#c6ceb2` | Metallic headings (the poster title) |
| `bone` | `#ebe8da` | Primary text (the poster's date line) |
| `steel` | `#9fa993` | Secondary text |
| `ember` | `#e5574a` | Danger only: eliminations, errors, last seconds |

## Type

- **Cinzel** — titles, buttons and navigation (the poster's Trajan-like capitals).
- **Cinzel Decorative** — the wordmark in the header.
- **Cormorant Garamond** — long-form serif, italic flourishes, quiz questions.
- **Inter** — UI copy and every number (tabular figures, includes ₹).

## Art

See `scripts/art/README.md`: the club's Professor Kalyug art for the hero, pieces cut from the
poster (wordmark, hood close-up, haze), and the club's seven scene pictures (the five rounds,
the three founders, the leaderboard chessboard).

**Rule: text never sits on a picture.** Round cards put the words beside the picture, page
banners give the picture the right half (above the title on phones), captions go under their
pictures, and the projectors use a round's picture only as a dim backdrop.
