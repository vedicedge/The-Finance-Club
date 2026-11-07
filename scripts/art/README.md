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
| `sky-*.jpg` | Painted storm skies with the green eclipse | `sky.py` |
| `scene-*.jpg` | The seven scenes shown on the site (rounds, founders, leaderboard) | `render-scenes.cjs`, or `generate-ai-art.py` |
| `app/opengraph-image.jpg` | The link preview (WhatsApp, Instagram DMs): the desktop hero art, wordmark and tagline (no date or venue) | `og_image.py` |

## Scenes

`<Scene name="vault" />` shows `assets/art/scene-vault.jpg`. The scenes are drawn in SVG
(`components/art/SceneDrawing.tsx`, silhouettes in `components/art/silhouettes.tsx`) over the
painted skies, then photographed into JPEGs so pages stay light on phones:

```bash
npm run dev
```
```bash
NODE_PATH="$(npm root -g)" node scripts/art/render-scenes.cjs http://localhost:3000
```

`/dev/art` shows the drawings while you edit them (development only; it 404s in production).

### Painting them with AI instead

`generate-ai-art.py` asks Gemini to paint each scene with the poster as the style reference and
saves over the same `scene-*.jpg` files, so no code changes. It needs a Gemini API key **with
billing enabled** (the free tier allows no image generation). Review every image before
committing.

```bash
GEMINI_API_KEY=... python3 scripts/art/generate-ai-art.py
```
