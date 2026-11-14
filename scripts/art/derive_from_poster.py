"""
Cut the site's art out of the November event poster (the portrait version, 1054 x 1492).

    python3 scripts/art/derive_from_poster.py path/to/poster-portrait.webp assets/art /tmp

The poster itself is kept out of the repository (it carries the date, contact numbers and a QR
code) and is never shown on the site. From it this writes:

  kalyug.jpg       the hooded figure before the eclipse and the skyline, without any lettering
  kalyug-hood.jpg  a close-up of the hood, for the synopsis "dossier photo"
  ambient.jpg      the sky blurred into a soft haze, to sit behind sections
  wordmark.webp    the DOOMSDAY lettering, its swoosh and "The Multiverse of Money", keyed onto
                   transparency (with a preview in the work folder)

The poster is already in the site's palette, so these are not graded again.
"""
import os
import sys

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter

poster_path, outdir, workdir = sys.argv[1:4]
os.makedirs(outdir, exist_ok=True)
P = Image.open(poster_path).convert('RGB')
W, H = P.size
assert (W, H) == (1054, 1492), f'expected the 1054 x 1492 portrait poster, got {W} x {H}'


def grain(im: Image.Image, amount: float) -> Image.Image:
    noise = Image.effect_noise(im.size, 28).convert('RGB')
    return ImageChops.blend(im, ImageChops.overlay(im, noise), amount)


# Professor Kalyug: below the club line, above the swoosh of the title.
k = P.crop((0, 160, 1054, 740)).resize((1580, 870), Image.LANCZOS).filter(ImageFilter.UnsharpMask(radius=2, percent=50, threshold=3))
grain(k, 0.1).save(os.path.join(outdir, 'kalyug.jpg'), quality=84, optimize=True, progressive=True)

# The hood, close up.
hood = P.crop((380, 260, 840, 720)).resize((920, 920), Image.LANCZOS).filter(ImageFilter.UnsharpMask(radius=2, percent=60, threshold=3))
grain(hood, 0.14).save(os.path.join(outdir, 'kalyug-hood.jpg'), quality=84, optimize=True, progressive=True)

# Ambient haze: the sky and eclipse, blurred.
amb = P.crop((0, 160, 1054, 753)).resize((1600, 900), Image.BICUBIC).filter(ImageFilter.GaussianBlur(28))
ImageEnhance.Brightness(amb).enhance(0.85).save(os.path.join(outdir, 'ambient.jpg'), quality=80, optimize=True, progressive=True)

# Wordmark: bright, warm (gold and silver) pixels; the cloak and skyline behind are dark and green.
t = P.crop((110, 735, 975, 995))
a = np.asarray(t).astype(np.float32)
lum = a @ np.array([0.299, 0.587, 0.114], np.float32)
bright = np.clip((lum - 62) / (140 - 62), 0, 1)
warm = np.clip((a[..., 0] - a[..., 1] + 14) / 18, 0, 1)  # gold/silver: red >= green; the cloak: green > red
alpha = Image.fromarray((bright * warm * 255).astype(np.uint8))
ImageDraw.Draw(alpha).rectangle((150, 0, 270, 30), fill=0)  # a lit fold of the cloak, above the D
rgba = t.convert('RGBA')
rgba.putalpha(alpha)
rgba = rgba.crop(alpha.point(lambda v: 255 if v > 40 else 0).getbbox())
rgba.save(os.path.join(outdir, 'wordmark.webp'), quality=90, method=6)
base = Image.new('RGBA', rgba.size, (30, 48, 38, 255))
Image.alpha_composite(base, rgba).convert('RGB').save(os.path.join(workdir, 'wordmark-preview.png'))
print('kalyug', k.size, '· hood', hood.size, '· wordmark', rgba.size)
