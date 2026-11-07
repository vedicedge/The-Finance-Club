# Site art

Everything here is original art graded to the event poster. No Marvel/DC characters, logos or
real people (spec, tone rules).

| File (`assets/art/`) | What it is | Made by |
|---|---|---|
| `poster.jpg` | The event poster: the key art for the whole site | Supplied by the club; `fix_poster.py` corrects "PRESENCES" → "PRESENTS" |
| `kalyug.jpg` | Professor Kalyug: the hooded figure and eclipse, cropped from the poster | `derive_from_poster.py` |
| `wordmark.webp` | The DOOMSDAY lettering, keyed onto transparency | `derive_from_poster.py` |
| `ambient.jpg` | The poster blurred into a green haze (hero and projector backdrops) | `derive_from_poster.py` |
| `sky-*.jpg` | Painted storm skies with the green eclipse | `sky.py` |
| `scene-*.jpg` | The seven scenes shown on the site (rounds, founders, leaderboard) | `render-scenes.cjs`, or `generate-ai-art.py` |
| `app/opengraph-image.jpg` | The link preview (WhatsApp, Instagram DMs): the poster on its own haze | one-off from the poster |

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
