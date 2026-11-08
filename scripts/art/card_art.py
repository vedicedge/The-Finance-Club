"""
Prepares the club's gear-card pictures for the site: public/cards/<ID>.webp.

    python3 scripts/art/card_art.py path/to/card_images public/cards

The source set (62 files named H01.webp … K15.webp, JK.webp, back.webp) came with three kinds of
fault, fixed here:

1. Mislabelled files. S11–S14 hold the pictures for S12–S15, and S15 holds a jetpack, which is
   used for G01 (whose own file is broken, see 2). No picture came for S11, the Monsoon Gumboot
   Suit: it keeps the site's icon placeholder until one is added (as do K14 and K15, see 2).
2. Bad cuts. The pictures were cut from one long sheet and the cuts drifted, so K09 and K12–K15,
   JK and back each show part of the next picture after a thin white line, and G01 has part of a
   kite pasted below the jetpack. Each is cut out again from the right piece of the right file
   (PIECES below); G01 uses the clean jetpack from the S15 file.
3. Made-up lettering on a few pictures (jerseys, a stall's signboard, a badge, a toolbox label):
   painted out (SMUDGE below), since the cards carry no text.

Every picture is then cropped to 3:4 around its subject and graded to the site's look: the poster's
green (near-black shadows, moss mid-tones, a pale lichen-green glow), with a little of its own
colour kept so cards stay easy to tell apart, a vignette, light from above like the eclipse, and
film grain. Output: 768 × 1024 WebP.
"""
import os
import sys

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter

W, H = 768, 1024

# Output card → source file, where they differ (point 1).
RELABEL = {'S12': 'S11', 'S13': 'S12', 'S14': 'S13', 'S15': 'S14', 'G01': 'S15'}
# No usable picture: S11 never came; the goat (K14) and the cat (K15) were split across two files
# that were rendered separately, so their halves don't meet (the head shows a step). These keep the
# site's icon placeholder until new pictures are added.
NO_PICTURE = {'S11', 'K14', 'K15'}

# Point 2: pictures cut from the wrong place. Each is rebuilt from pieces of the source files,
# (file, x from, x to inclusive, vertical shift), white lines excluded. Neighbouring files meet
# edge to edge, so a picture spanning two files is joined directly, softening only the join line.
PIECES = {
    'K09': [('K09', 0, 559, 0)],                           # Shortcut-Expert Auto Bhaiya
    'K10': [('K10', 0, 715, 0)],                           # Mohalla Cricket Team
    'K11': [('K11', 0, 767, 0)],                           # Momo-Stall Informant
    'K12': [('K12', 0, 680, 0)],                           # Cousin Bunty
    'K13': [('K13', 0, 517, 0)],                           # Turbo the Tortoise
    'K14': [('K13', 528, 767, 0), ('K14', 0, 393, 0)],     # Stray Goat with Attitude
    'K15': [('K14', 402, 767, 0), ('K15', 0, 180, 0)],     # Billu the Sleepy Cat
    'JK': [('K15', 202, 767, 0)],                          # Jugaad Kit (toolbox)
    'back': [('back', 0, 759, 0)],                         # card back (eclipse; mirrored, see symmetric_back)
}
SEAM = 6  # px either side of a join that are softened

# Where to centre the 3:4 crop, as fractions of the picture (x, y). Default: the middle.
FOCUS = {
    'K09': (0.45, 0.32), 'K10': (0.55, 0.45), 'K11': (0.5, 0.45), 'K12': (0.45, 0.35),
    'K13': (0.42, 0.55), 'K14': (0.5, 0.45), 'K15': (0.6, 0.55), 'JK': (0.42, 0.5), 'back': (0.5, 0.5),
}

# Point 3: regions with made-up lettering, in the cropped 768 × 1024 card, painted out.
SMUDGE = {
    'K10': [(70, 665, 270, 745), (425, 655, 545, 735)],
    'K11': [(0, 880, 768, 1024)],
    'S10': [(330, 300, 520, 380)],
    'JK': [(180, 560, 470, 760)],
}

# The site's green, from shadow to highlight (the poster and the round art).
STOPS = [
    (0.00, (5, 7, 5)),
    (0.18, (14, 21, 12)),
    (0.40, (38, 54, 31)),
    (0.62, (88, 116, 66)),
    (0.82, (160, 196, 118)),
    (0.94, (210, 232, 176)),
    (1.00, (240, 247, 226)),
]
KEEP_COLOUR = 0.2  # how much of the picture's own colour survives the grade


def gradient_map(lum: np.ndarray) -> np.ndarray:
    out = np.zeros(lum.shape + (3,), np.float32)
    for (a, ca), (b, cb) in zip(STOPS, STOPS[1:]):
        m = (lum >= a) & (lum <= b)
        t = ((lum - a) / (b - a))[m][:, None]
        out[m] = np.array(ca, np.float32) * (1 - t) + np.array(cb, np.float32) * t
    return out


def crop_3x4(im: Image.Image, focus=(0.5, 0.5)) -> Image.Image:
    w, h = im.size
    if w / h > W / H:  # too wide: full height, crop the sides
        cw, ch = round(h * W / H), h
    else:  # too tall: full width, crop top and bottom
        cw, ch = w, round(w * H / W)
    x = min(max(0, round(focus[0] * w - cw / 2)), w - cw)
    y = min(max(0, round(focus[1] * h - ch / 2)), h - ch)
    return im.crop((x, y, x + cw, y + ch)).resize((W, H), Image.LANCZOS)


def smudge(im: Image.Image, boxes) -> Image.Image:
    """Paint out lettering: a heavy blur of the area, feathered in, so only texture and colour remain."""
    out = im.copy()
    for box in boxes:
        x0, y0, x1, y1 = box
        pad = 24
        region = im.crop((max(0, x0 - pad), max(0, y0 - pad), min(W, x1 + pad), min(H, y1 + pad)))
        blurred = region.filter(ImageFilter.GaussianBlur(14))
        mask = Image.new('L', region.size, 0)
        ImageDraw.Draw(mask).rounded_rectangle((pad, pad, region.width - pad, region.height - pad), radius=12, fill=255)
        mask = mask.filter(ImageFilter.GaussianBlur(9))
        out.paste(blurred, (max(0, x0 - pad), max(0, y0 - pad)), mask)
    return out


# The eclipse's centre in back.webp (measured: its disc spans y 135–680 and ends at x 435).
BACK_ECLIPSE_X = 165


def symmetric_back(im: Image.Image) -> Image.Image:
    """The card back: its eclipse was cut off at the left edge, so mirror the picture about the
    eclipse's centre. A symmetric back, as card backs usually are."""
    cx = BACK_ECLIPSE_X
    right = im.crop((cx, 0, min(im.width, cx + W // 2), H))
    out = Image.new('RGB', (right.width * 2, H))
    out.paste(right.transpose(Image.FLIP_LEFT_RIGHT), (0, 0))
    out.paste(right, (right.width, 0))
    return out


def grade(im: Image.Image, seed: int) -> Image.Image:
    a = np.asarray(im).astype(np.float32) / 255
    lum = a @ np.array([0.299, 0.587, 0.114], np.float32)
    # gentle S-curve and a lift of the subject's mid-tones
    lum = np.clip(lum, 0, 1)
    lum = lum * lum * (3 - 2 * lum) * 0.6 + lum * 0.4
    mapped = gradient_map(lum)
    # keep a little of the original colour, pulled toward green
    own = a * 255
    own = own * np.array([0.82, 1.0, 0.78], np.float32)
    out = mapped * (1 - KEEP_COLOUR) + own * KEEP_COLOUR

    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    # light from above (the eclipse), a soft green bloom at the top
    glow = np.exp(-(((xx - W / 2) / (W * 0.55)) ** 2 + ((yy + H * 0.1) / (H * 0.45)) ** 2))
    out = out + glow[..., None] * np.array([22, 32, 14], np.float32)
    # vignette
    v = 1 - 0.5 * np.clip(((xx - W / 2) / (W * 0.62)) ** 2 + ((yy - H * 0.48) / (H * 0.62)) ** 2, 0, 1) ** 1.4
    out = out * v[..., None]
    # film grain
    rng = np.random.default_rng(seed)
    out = out + rng.normal(0, 5.0, out.shape).astype(np.float32)
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))


def main():
    src, dst = sys.argv[1:3]
    os.makedirs(dst, exist_ok=True)
    open_src = lambda n: Image.open(os.path.join(src, f'{n}.webp')).convert('RGB')

    def rebuild(pieces):
        parts = []
        for name, x0, x1, dy in pieces:
            part = open_src(name).crop((x0, 0, x1 + 1, H))
            if dy:  # shift vertically, filling the gap from the nearest row
                shifted = Image.new('RGB', part.size)
                shifted.paste(part, (0, -dy))
                fill = part.crop((0, 0, part.width, 1) if dy < 0 else (0, H - 1, part.width, H))
                for y in range(abs(dy)):
                    shifted.paste(fill, (0, y if dy < 0 else H - 1 - y))
                part = shifted
            parts.append(part)
        out = parts[0]
        for part in parts[1:]:
            joined = Image.new('RGB', (out.width + part.width, H))
            joined.paste(out, (0, 0))
            joined.paste(part, (out.width, 0))
            # soften the join line only: a narrow horizontal blur across it
            x = out.width
            band = joined.crop((x - SEAM * 2, 0, x + SEAM * 2, H)).filter(ImageFilter.BoxBlur(SEAM // 2))
            mask = Image.new('L', band.size, 0)
            ImageDraw.Draw(mask).rectangle((SEAM, 0, SEAM * 3, H), fill=255)
            joined.paste(band, (x - SEAM * 2, 0), mask.filter(ImageFilter.GaussianBlur(SEAM / 2)))
            out = joined
        return out

    ids = [f'{c}{i:02d}' for c in 'HSGK' for i in range(1, 16)] + ['JK', 'back']
    for seed, card in enumerate(ids):
        if card in NO_PICTURE:
            # remove any stale picture so the site shows the placeholder
            for ext in ('webp', 'jpg', 'jpeg', 'png', 'avif'):
                p = os.path.join(dst, f'{card}.{ext}')
                if os.path.exists(p):
                    os.remove(p)
            print(f'{card}: no picture (placeholder)')
            continue
        if card in PIECES:
            im = rebuild(PIECES[card])
            if card == 'back':
                im = symmetric_back(im)
        else:
            im = open_src(RELABEL.get(card, card))
        im = crop_3x4(im, FOCUS.get(card, (0.5, 0.5)))
        if card in SMUDGE:
            im = smudge(im, SMUDGE[card])
        im = grade(im, seed)
        im.save(os.path.join(dst, f'{card}.webp'), quality=82, method=6)
        print(f'{card}: {RELABEL.get(card, "rebuilt" if card in PIECES else card)}')


if __name__ == '__main__':
    main()
