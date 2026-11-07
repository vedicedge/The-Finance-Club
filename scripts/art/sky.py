"""
Procedural storm skies with a green eclipse, graded to the Doomsday poster: the painted
background of each scene drawing (components/art/SceneDrawing.tsx).

    python3 scripts/art/sky.py assets/art      # writes sky-*.jpg (needs numpy and pillow)
"""
import sys, os
import numpy as np
from PIL import Image, ImageFilter

def noise(h, w, cells, rng):
    g = rng.random((cells[0] + 3, cells[1] + 3)).astype(np.float32)
    im = Image.fromarray(g, mode='F').resize((w + w // cells[1] * 3, h + h // cells[0] * 3), Image.BICUBIC)
    a = np.asarray(im)
    return a[:h, :w]

def fbm(h, w, rng, base=(3, 5), octaves=6, gain=0.55):
    out = np.zeros((h, w), np.float32); amp = 1.0; tot = 0
    for o in range(octaves):
        c = (base[0] * 2 ** o, base[1] * 2 ** o)
        out += amp * noise(h, w, c, rng); tot += amp; amp *= gain
    return out / tot

def warp(field, dx, dy, strength):
    h, w = field.shape
    yy, xx = np.mgrid[0:h, 0:w]
    x2 = np.clip(xx + dx * strength, 0, w - 1).astype(np.int32)
    y2 = np.clip(yy + dy * strength, 0, h - 1).astype(np.int32)
    return field[y2, x2]

STOPS = [(0.0, (7, 9, 6)), (0.22, (14, 19, 12)), (0.42, (30, 41, 26)), (0.62, (68, 88, 54)), (0.8, (128, 158, 98)), (0.92, (179, 210, 140)), (1.0, (226, 238, 205))]
def grade(v):
    v = np.clip(v, 0, 1)
    out = np.zeros(v.shape + (3,), np.float32)
    for (a, ca), (b, cb) in zip(STOPS, STOPS[1:]):
        m = (v >= a) & (v <= b)
        t = ((v - a) / (b - a))[m][:, None]
        out[m] = np.array(ca) * (1 - t) + np.array(cb) * t
    return out

def sky(w, h, seed, eclipse=None, beam=False, ground=0.62):
    rng = np.random.default_rng(seed)
    base = fbm(h, w, rng, (2, 4), 8, 0.6)
    dx = fbm(h, w, rng, (2, 3), 4) - 0.5
    dy = fbm(h, w, rng, (2, 3), 4) - 0.5
    clouds = warp(base, dx, dy, w * 0.12)
    streak = fbm(h, w, rng, (6, 2), 4)  # horizontal streaky layer
    detail = fbm(h, w, rng, (12, 20), 4, 0.6)
    ridged = 1 - np.abs(2 * detail - 1)
    clouds = 0.62 * clouds + 0.2 * streak + 0.18 * ridged
    clouds = np.clip((clouds - 0.3) * 2.1, 0, 1) ** 1.15
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    light = np.full((h, w), 0.34, np.float32)
    disc = np.zeros((h, w), np.float32); rim = np.zeros((h, w), np.float32)
    if eclipse:
        ex, ey, r = eclipse
        d = np.sqrt((xx - ex) ** 2 + (yy - ey) ** 2)
        out = np.clip(d - r, 0, None)
        light += 0.95 * np.exp(-out / (r * 0.7)) + 0.45 * np.exp(-out / (r * 2.2))
        disc = np.clip((r - d) / 2.0, 0, 1)
        rim = np.exp(-((d - r) ** 2) / (2 * (r * 0.008 + 1.0) ** 2)) * (0.55 + 0.45 * base)
    if beam:
        cx = w / 2
        light += 0.9 * np.exp(-((xx - cx) / (w * 0.16)) ** 2) * np.exp(-yy / (h * 0.7))
    v = clouds * light * 0.95 + 0.05 * light
    # the city's haze glows on the horizon
    horizon = np.exp(-((yy - h * ground) / (h * 0.09)) ** 2) * 0.22
    v = v + horizon * (0.5 + clouds)
    # eclipse disc: near-black with faint texture; bright rim
    v = v * (1 - disc) + disc * (0.06 + 0.05 * base)
    v = np.maximum(v, rim * 0.78)
    # vignette and bottom fade into the page
    vig = 1 - 0.55 * (((xx - w / 2) / (w * 0.75)) ** 2 + ((yy - h * 0.45) / (h * 0.9)) ** 2)
    v *= np.clip(vig, 0.25, 1)
    fade = np.clip((yy - h * 0.72) / (h * 0.28), 0, 1)
    v *= 1 - 0.85 * fade
    rgb = grade(v)
    rgb += rng.normal(0, 4.0, rgb.shape)  # grain
    return Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.6))

if __name__ == '__main__':
    outdir = sys.argv[1]
    os.makedirs(outdir, exist_ok=True)
    W, H = 1600, 900
    jobs = {
        'sky-zerohour': dict(seed=11, eclipse=(800, 330, 230)),
        'sky-prelim': dict(seed=23, eclipse=(1160, 300, 170)),
        'sky-bazaar': dict(seed=37, eclipse=(420, 280, 160)),
        'sky-skyline': dict(seed=41, eclipse=(800, 230, 130)),
        'sky-vault': dict(seed=53, beam=True),
        'sky-heroes': dict(seed=67, eclipse=(1040, 360, 260), ground=0.7),
        'sky-chess': dict(seed=79, eclipse=(800, 250, 150)),
    }
    for name, kw in jobs.items():
        sky(W, H, **kw).save(os.path.join(outdir, name + '.jpg'), quality=82, optimize=True, progressive=True)
        print(name)
