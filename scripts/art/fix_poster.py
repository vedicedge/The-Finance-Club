"""
The poster as supplied reads "THE FINANCE CLUB PRESENCES". This paints out "PRESENCES" and sets
"PRESENTS" in the same italic, tracking and colour.

    python3 scripts/art/fix_poster.py Poster.png assets/art/poster.jpg CormorantGaramond-Italic[wght].ttf
"""
import sys, random
from PIL import Image, ImageDraw, ImageFont, ImageFilter
src, out, fontpath = sys.argv[1:4]
im = Image.open(src).convert('RGB')
W, H = im.size
x0, y0, x1, y1 = 366, 126, 694, 155
px = im.load()
# measure the letter colour (brightest pixels in the word box)
cols = sorted((px[x, y] for x in range(x0, x1) for y in range(y0, y1)), key=sum)
top = cols[-60:]
ink = (206, 204, 193)
print('ink', ink)
# paint the word out: interpolate between the rows just above and below, keep grain
random.seed(7)
for x in range(x0, x1):
    a = [px[x, y0 - 3 - k] for k in range(3)]
    b = [px[x, y1 + 2 + k] for k in range(3)]
    a = tuple(sum(c[i] for c in a) // 3 for i in range(3))
    b = tuple(sum(c[i] for c in b) // 3 for i in range(3))
    for y in range(y0, y1):
        t = (y - y0) / (y1 - y0)
        n = random.randint(-3, 3)
        px[x, y] = tuple(max(0, min(255, int(a[i] * (1 - t) + b[i] * t) + n)) for i in range(3))
# soften the patch edges a touch
patch = im.crop((x0 - 2, y0 - 2, x1 + 2, y1 + 2)).filter(ImageFilter.GaussianBlur(0.6))
im.paste(patch, (x0 - 2, y0 - 2))
# draw PRESENTS in an italic serif with the same tracking (~37.6 px per letter)
layer = Image.new('L', (W * 4, H * 4), 0)  # 4x supersampling
d = ImageDraw.Draw(layer)
font = ImageFont.truetype(fontpath, 4 * 24)
try:
    font.set_variation_by_axes([420])
except Exception as e:
    print('no var', e)
word = 'PRESENTS'
step = 37.6
cx = 527.5
baseline = 149.5
for i, ch in enumerate(word):
    x = cx + (i - (len(word) - 1) / 2) * step
    l, t, r, b = d.textbbox((0, 0), ch, font=font, anchor='ls')
    d.text((4 * x - (r - l) / 2, 4 * baseline), ch, font=font, fill=255, anchor='ls')
mask = layer.resize((W, H), Image.LANCZOS)
ink_img = Image.new('RGB', (W, H), ink)
im = Image.composite(ink_img, im, mask)
im.save(out, quality=92)
im.crop((250, 60, 810, 170)).resize((1120, 220)).save(out.replace('.jpg', '-check.png'))
