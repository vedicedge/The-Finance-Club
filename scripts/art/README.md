# Site art

Everything here is original art graded to the event poster. No Marvel/DC characters, logos or
real people (spec, tone rules).

| File (`assets/art/`) | What it is | Made by |
|---|---|---|
| `poster.jpg` | The event poster: the source of the wordmark, hood close-up and haze below. It is not shown on the site (its details are still being finalised) | Supplied by the club; `fix_poster.py` corrects "PRESENCES" → "PRESENTS" |
| `kalyug-character.webp` | The club's character art, portrait: Professor Kalyug from hood to waist before the eclipse (no lettering) | Supplied by the club |
| `kalyug-wide.webp` | The same scene, 21 : 9: the figure on the right, the ruined city across the left for the title | Supplied by the club |
| `hero.jpg` | The landing hero on phones and tablets: the portrait, with grain | `hero_art.py` |
| `hero-desktop.jpg` | The landing hero on laptops and desktops: the wide scene, upscaled to 2880 px, with grain | `hero_art.py` |
| `kalyug.jpg` | Professor Kalyug: the hooded figure and eclipse, cropped from the poster | `derive_from_poster.py` |
| `kalyug-hood.jpg` | A close-up of the hood (the synopsis "dossier photo") | `derive_from_poster.py` |
| `wordmark.webp` | The DOOMSDAY lettering, keyed onto transparency | `derive_from_poster.py` |
| `ambient.jpg` | The poster blurred into a green haze (page banners, projector and crew sign-in backdrops) | `derive_from_poster.py` |
| `scene-*.jpg` | The seven scenes: the five rounds, the three founders and the leaderboard chessboard (club's own pictures, 16 : 9) | `round_art.py` |
| `app/opengraph-image.jpg` | The link preview (WhatsApp, Instagram DMs): the desktop hero art, wordmark and tagline (no date or venue) | `og_image.py` |

## Scenes

`<Scene name="vault" />` shows `assets/art/scene-vault.jpg`. The seven scenes are the club's own
16:9 pictures, prepared by `round_art.py` (resized to 2400 x 1350 with light film grain):

```bash
python3 scripts/art/round_art.py "path/to/Round Images/Cover" assets/art
```

| Scene | Picture | Shown on |
|---|---|---|
| `prelim` | Prelims.png | Round card 1, Rounds page, quiz projector |
| `bazaar` | Auction.png | Round card 2, Rounds page, auction projector |
| `skyline` | Round 2.png | Round card 3, Rounds page, 404 page |
| `vault` | round 3.png | Round card 4, Rounds page, agency login |
| `zerohour` | Zero hour.png | Round card 5, Rounds page, schedule banner, reveal projector |
| `heroes` | Three Characters.png | Enlist section, registration, My Agency |
| `chess` | LeaderBoard.png | Leaderboard banner, board projector |

In Auction.png two of the four gear cards came out looking like well-known Marvel designs (an
armoured suit with a chest light and a gem-set gauntlet). The site must not show copyrighted
characters, so `round_art.py` repaints those two card faces as sealed cards with an
eclipse-and-star sigil. Keep that step if the picture is ever replaced, or regenerate it without
those two designs.

Wherever a scene appears, text sits beside or below it, never on it: round cards put the words
beside the picture, page banners put the picture in the right half (above the title on phones),
and the projectors show the round's picture only as a dim backdrop.

## Gear cards

`public/cards/<card ID>.webp` (plus `JK.webp` and `back.webp`), shown by `<GearCard>` on the
auction projector, My Agency and the auction console. The club's 62 source pictures (keep them on
the club drive) are prepared by `card_art.py`:

```bash
python3 scripts/art/card_art.py path/to/card_images public/cards
```

It fixes the source set's faults (mislabelled S11–S15, pictures cut across two files, made-up
lettering), crops each to 3:4 and grades it to the site's green. Three cards have no usable
picture yet and show the category icon: **S11** Monsoon Gumboot Suit (never came), **K14** Stray
Goat with Attitude and **K15** Billu the Sleepy Cat (their source pictures were split between two
renders). To add one, put a portrait 3:4 picture in the source folder under its ID, remove the ID
from `NO_PICTURE` in `card_art.py` (and from `PIECES` for K14/K15), and run it again.

