"""
The link preview (WhatsApp, Instagram DMs): the hero art with the DOOMSDAY wordmark and the
tagline. No date or venue, so it never goes stale.

    python3 scripts/art/og_image.py assets/art app/opengraph-image.jpg CormorantGaramond-Italic[wght].ttf
"""
import os, sys
from PIL import Image, ImageDraw, ImageFont

art, out, font_path = sys.argv[1:4]
W, H = 1200, 630
hero = Image.open(os.path.join(art, 'hero.jpg')).convert('RGB')
scale = H / hero.height
hero = hero.resize((round(hero.width * scale), H), Image.LANCZOS)
x0 = hero.width - W  # keep the figure on the right
canvas = hero.crop((x0, 0, x0 + W, H))

# darken the left for the lettering
shade = Image.new('L', (W, H))
for x in range(W):
    v = int(235 * max(0.0, 1 - x / (W * 0.62)))
    shade.paste(v, (x, 0, x + 1, H))
canvas = Image.composite(Image.new('RGB', (W, H), (8, 10, 7)), canvas, shade)

wm = Image.open(os.path.join(art, 'wordmark.webp')).convert('RGBA')
ww = 600
wm = wm.resize((ww, round(wm.height * ww / wm.width)), Image.LANCZOS)
top = (H - wm.height) // 2 - 40
canvas.paste(wm, (56, top), wm)

d = ImageDraw.Draw(canvas)
font = ImageFont.truetype(font_path, 42)
try:
    font.set_variation_by_axes([500])
except Exception:
    pass
# The tagline, with the poster's four-point star drawn between the phrases (the font has no ★).
x, y = 80, top + wm.height + 18
ink, star_ink = (198, 206, 178), (169, 207, 110)
for i, part in enumerate(['Fund it', 'Build it', 'Save the city.']):
    d.text((x, y), part, font=font, fill=ink)
    x += d.textlength(part, font=font)
    if i < 2:
        cx, cy, r, k = x + 22, y + 27, 11, 2.2
        d.polygon([(cx, cy - r), (cx + k, cy - k), (cx + r, cy), (cx + k, cy + k), (cx, cy + r), (cx - k, cy + k), (cx - r, cy), (cx - k, cy - k)], fill=star_ink)
        x += 44
canvas.save(out, quality=85, optimize=True, progressive=True)
print(out, canvas.size)
