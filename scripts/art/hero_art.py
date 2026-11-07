"""
The landing hero art, from the club's character art of Professor Kalyug
(assets/art/kalyug-character.webp: hood to waist, the eclipse behind, ruined towers either side).

    python3 scripts/art/hero_art.py assets/art/kalyug-character.webp assets/art

Writes:
  hero.jpg          phones and tablets: the portrait as it is (2 : 3), with the site's grain.
                    The page frames it on the hood and eclipse (object-position).
  hero-desktop.jpg  laptops and desktops, 2.2 : 1: the portrait from the eclipse down to the
                    waist, set right of centre so the title has the left side. Its left edge
                    dissolves into a dark fog coloured from the picture itself, and the towers on
                    its right carry on to the edge, so there is no second figure or seam.
"""
import os
import sys

import numpy as np
from PIL import Image, ImageChops, ImageFilter

ECLIPSE_X = 510          # the eclipse's centre in the source
BAND = (150, 1350)       # source rows for the desktop art: eclipse top to the waist
FIGURE_AT = 0.72         # where the eclipse sits across the desktop canvas


def grain(im: Image.Image, amount: float = 0.16) -> Image.Image:
    noise = Image.effect_noise(im.size, 28).convert('RGB')
    return ImageChops.blend(im, ImageChops.overlay(im, noise), amount)


def feather(width: int, height: int, left: int, right: int) -> Image.Image:
    """An alpha mask: 0 → 255 over `left` px at the left edge, 255 → 0 over `right` px at the right."""
    x = np.arange(width, dtype=np.float32)
    a = np.ones(width, np.float32)
    if left:
        a = np.minimum(a, np.clip(x / left, 0, 1))
    if right:
        a = np.minimum(a, np.clip((width - 1 - x) / right, 0, 1))
    a = a * a * (3 - 2 * a)  # smoothstep, so the fade has no visible edge
    return Image.fromarray(np.tile((a * 255).astype(np.uint8), (height, 1)))


def desktop(src: Image.Image) -> Image.Image:
    band = src.crop((0, BAND[0], src.width, BAND[1]))
    H = band.height
    W = round(H * 2.2)
    x0 = round(FIGURE_AT * W - ECLIPSE_X)
    rng = np.random.default_rng(11)

    # The fog: each row takes the colour of the picture's own left edge at that height (glow up
    # high, fog and dark ground below), softly mottled, and sinks into darkness toward the left
    # where the title sits.
    edge = np.asarray(band.crop((0, 0, 200, H))).astype(np.float32).mean(axis=1)  # (H, 3)
    edge = np.asarray(Image.fromarray(np.clip(edge[:, None, :], 0, 255).astype(np.uint8)).resize((1, H)).filter(ImageFilter.GaussianBlur(30))).astype(np.float32)[:, 0, :]
    mottle = rng.random((6, 22)).astype(np.float32)
    mottle = np.asarray(Image.fromarray((mottle * 255).astype(np.uint8)).resize((W, H), Image.BICUBIC).filter(ImageFilter.GaussianBlur(60))).astype(np.float32) / 255
    ramp = np.linspace(0.18, 0.62, W, dtype=np.float32) ** 1.3  # dark at the far left
    fog = edge[:, None, :] * (ramp[None, :, None] * (0.8 + 0.4 * mottle[..., None]))
    canvas = Image.fromarray(np.clip(fog, 0, 255).astype(np.uint8))

    # Right of the figure: the towers carry on (the picture's right edge, mirrored), into fog.
    right_w = W - (x0 + band.width)
    if right_w > 0:
        strip = band.crop((band.width - 144, 0, band.width, H)).transpose(Image.FLIP_LEFT_RIGHT)
        ext = Image.new('RGB', (right_w, H))
        x, flip = 0, False
        while x < right_w:
            ext.paste(strip.transpose(Image.FLIP_LEFT_RIGHT) if flip else strip, (x, 0))
            x += strip.width
            flip = not flip
        fade = feather(right_w, H, 0, right_w)  # 255 at the figure's side, fading out to the edge
        canvas.paste(ext, (x0 + band.width, 0), fade)

    # The figure: its left edge (fog, tattered cloak) dissolves slowly into the fog.
    canvas.paste(band, (x0, 0), feather(band.width, H, left=420, right=0))
    canvas = canvas.filter(ImageFilter.UnsharpMask(radius=1.5, percent=40, threshold=3))
    return grain(canvas)


def main():
    src_path, outdir = sys.argv[1:3]
    src = Image.open(src_path).convert('RGB')
    grain(src, 0.1).save(os.path.join(outdir, 'hero.jpg'), quality=82, optimize=True, progressive=True)
    desktop(src).save(os.path.join(outdir, 'hero-desktop.jpg'), quality=82, optimize=True, progressive=True)
    print('hero.jpg, hero-desktop.jpg')


if __name__ == '__main__':
    main()
