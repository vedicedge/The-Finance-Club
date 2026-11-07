"""
Cut the site's art out of the event poster.

    python3 scripts/art/derive_from_poster.py assets/art/poster.jpg assets/art /tmp

Writes poster.jpg (re-saved), kalyug.jpg (the hooded figure and eclipse), ambient.jpg (a
blurred haze) and wordmark.webp (the DOOMSDAY lettering keyed onto transparency).
"""
import sys, os
from PIL import Image, ImageFilter, ImageEnhance, ImageChops
poster_path, outdir, workdir = sys.argv[1:4]
os.makedirs(outdir, exist_ok=True)
P = Image.open(poster_path).convert('RGB')
W, H = P.size
P.save(os.path.join(outdir, 'poster.jpg'), quality=88, optimize=True, progressive=True)

# Professor Kalyug: the hooded figure and the eclipse, without the title
k = P.crop((140, 170, 940, 842))
k.save(os.path.join(outdir, 'kalyug.jpg'), quality=88, optimize=True, progressive=True)

# Ambient backdrop: the poster blurred into a wide haze (used behind the hero on wide screens)
amb = P.resize((960, int(960 * H / W)))
amb = amb.crop((0, 120, 960, 120 + 540)).resize((1600, 900), Image.BICUBIC).filter(ImageFilter.GaussianBlur(28))
amb = ImageEnhance.Brightness(amb).enhance(0.85)
amb.save(os.path.join(outdir, 'ambient.jpg'), quality=80, optimize=True, progressive=True)

# Wordmark: the DOOMSDAY lettering keyed out of the poster by brightness
t = P.crop((40, 840, 1020, 1130))
g = t.convert('L')
lo, hi = 70, 150
a = g.point(lambda v: 0 if v <= lo else 255 if v >= hi else int((v - lo) * 255 / (hi - lo)))
# kill the bright skyline patches at the far right/left edges that sit outside the letters
from PIL import ImageDraw
ImageDraw.Draw(a).rectangle((700, 0, 980, 62), fill=0)  # skyline tops behind the Y
rgba = t.convert('RGBA'); rgba.putalpha(a)
bbox = a.point(lambda v: 255 if v > 40 else 0).getbbox()
rgba = rgba.crop(bbox)
rgba.save(os.path.join(outdir, 'wordmark.webp'), quality=90, method=6)
# preview on a mid background, to check the key
base = Image.new('RGBA', rgba.size, (40, 55, 35, 255))
Image.alpha_composite(base, rgba).convert('RGB').save(os.path.join(workdir, 'wordmark-preview.png'))
print('wordmark', rgba.size)
