"""
The scene art for the rounds and pages, from the club's 16:9 pictures.

    python3 scripts/art/round_art.py "path/to/Round Images/Cover" assets/art

Reads the club's pictures by name and writes assets/art/scene-<name>.jpg (2400 x 1350, light
film grain), which <Scene name="..."> shows:

    Prelims.png           -> scene-prelim.jpg     Prelim (Hero Ya Zero?)
    Auction.png           -> scene-bazaar.jpg     Round 1 (Power Bazaar)
    Round 2.png           -> scene-skyline.jpg    Round 2 (Operation: Skyline)
    round 3.png           -> scene-vault.jpg      Round 3 (The Doomsday Vault)
    Zero hour.png         -> scene-zerohour.jpg   Zero Hour
    Three Characters.png  -> scene-heroes.jpg     the three founders (Enlist, register, My Agency)
    LeaderBoard.png       -> scene-chess.jpg      the leaderboard

Auction.png: two of its four gear cards came out looking like well-known Marvel designs (an
armoured suit with a chest light, and a gem-set gauntlet). The site must not show copyrighted
characters (spec, tone rules), so those two card faces are repainted as face-down cards with an
eclipse-and-star sigil: cards still sealed in the Secret Identity Bids. The other two cards
(the fortress HQ and the owl) are kept.
"""
import os
import sys

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter

OUT_W, OUT_H = 2400, 1350

SOURCES = {
    'Prelims.png': 'prelim',
    'Auction.png': 'bazaar',
    'Round 2.png': 'skyline',
    'round 3.png': 'vault',
    'Zero hour.png': 'zerohour',
    'Three Characters.png': 'heroes',
    'LeaderBoard.png': 'chess',
}

# Inner faces of the two cards to repaint, in Auction.png's own 1672 x 941 pixels (clockwise from
# top left). Slightly inside the cards' ornamental frames, so the frames stay.
SEALED_CARDS = [
    [(710, 566), (822, 559), (830, 718), (729, 722)],   # the armoured suit
    [(872, 567), (979, 578), (966, 725), (857, 710)],   # the gauntlet
]


def grain(im: Image.Image, amount: float) -> Image.Image:
    noise = Image.effect_noise(im.size, 26).convert('RGB')
    return ImageChops.blend(im, ImageChops.overlay(im, noise), amount)


def star(cx: float, cy: float, r: float, k: float = 0.16):
    """The poster's four-point star."""
    i = r * k
    return [(cx, cy - r), (cx + i, cy - i), (cx + r, cy), (cx + i, cy + i), (cx, cy + r), (cx - i, cy + i), (cx - r, cy), (cx - i, cy - i)]


def seal_cards(im: Image.Image, scale: float) -> Image.Image:
    """Repaint SEALED_CARDS as face-down cards with a glowing eclipse-and-star sigil."""
    out = im.copy()
    for quad in SEALED_CARDS:
        q = [(x * scale, y * scale) for x, y in quad]
        xs, ys = [p[0] for p in q], [p[1] for p in q]
        box = (int(min(xs)) - 2, int(min(ys)) - 2, int(max(xs)) + 3, int(max(ys)) + 3)
        cx, cy = sum(xs) / 4, sum(ys) / 4
        w = box[2] - box[0]

        # the face: the card's own colours, softened to a smoky glow and darkened toward the middle
        face = out.crop(box).filter(ImageFilter.GaussianBlur(w * 0.07))
        arr = np.asarray(face).astype(np.float32)
        yy, xx = np.mgrid[0:arr.shape[0], 0:arr.shape[1]].astype(np.float32)
        d = np.sqrt(((xx - (cx - box[0])) / (w * 0.5)) ** 2 + ((yy - (cy - box[1])) / (arr.shape[0] * 0.5)) ** 2)
        arr *= (0.42 + 0.4 * np.clip(d, 0, 1))[..., None]
        face = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))

        # the sigil: a small dark eclipse with a glowing rim, the four-point star rising through it,
        # painted soft so it sits in the picture rather than on it
        r = w * 0.17
        ox, oy = cx - box[0], cy - box[1]
        glow = Image.new('RGBA', face.size, (0, 0, 0, 0))
        g = ImageDraw.Draw(glow)
        g.ellipse((ox - r * 1.5, oy - r * 1.5, ox + r * 1.5, oy + r * 1.5), fill=(169, 207, 110, 110))
        g.polygon(star(ox, oy, r * 2.4), fill=(169, 207, 110, 120))
        glow = glow.filter(ImageFilter.GaussianBlur(r * 0.45))
        face = Image.alpha_composite(face.convert('RGBA'), glow)
        mark = Image.new('RGBA', face.size, (0, 0, 0, 0))
        m = ImageDraw.Draw(mark)
        m.ellipse((ox - r, oy - r, ox + r, oy + r), fill=(12, 16, 10, 235), outline=(176, 210, 128, 230), width=max(2, round(r * 0.1)))
        m.polygon(star(ox, oy, r * 2.0, 0.12), fill=(196, 226, 150, 215))
        mark = mark.filter(ImageFilter.GaussianBlur(max(0.8, r * 0.04)))
        face = Image.alpha_composite(face, mark).convert('RGB')
        face = grain(face, 0.12)

        # paste inside the card's face, feathered so the edge never shows
        mask = Image.new('L', out.size, 0)
        ImageDraw.Draw(mask).polygon(q, fill=255)
        mask = mask.filter(ImageFilter.GaussianBlur(max(1.5, 3 * scale))).crop(box)
        out.paste(face, box[:2], mask)
    return out


def main():
    src_dir, out_dir = sys.argv[1:3]
    for filename, name in SOURCES.items():
        im = Image.open(os.path.join(src_dir, filename)).convert('RGB')
        scale = OUT_W / im.width
        im = im.resize((OUT_W, round(im.height * scale)), Image.LANCZOS)
        if filename == 'Auction.png':
            im = seal_cards(im, scale)
        # crop to exactly 16:9 (the sources are a pixel or two off)
        top = (im.height - OUT_H) // 2
        im = im.crop((0, top, OUT_W, top + OUT_H))
        im = im.filter(ImageFilter.UnsharpMask(radius=1.6, percent=35, threshold=3))
        grain(im, 0.08).save(os.path.join(out_dir, f'scene-{name}.jpg'), quality=80, optimize=True, progressive=True)
        print(f'scene-{name}.jpg')


if __name__ == '__main__':
    main()
