"""
The site's colour grade, shared by the art scripts: the November poster's calm look. Deep
emerald-black shadows, quiet grey-green mid-tones and a warm ivory-gold light, with a little of
each picture's own colour kept (at half saturation) so pictures stay easy to tell apart.

    from palette import calm   # each script adds its own folder to sys.path first
"""
import numpy as np
from PIL import Image

# Shadow to highlight.
STOPS = [
    (0.00, (6, 11, 9)),
    (0.15, (12, 25, 19)),
    (0.35, (25, 47, 37)),
    (0.55, (54, 80, 64)),
    (0.75, (114, 130, 102)),
    (0.90, (200, 198, 160)),
    (1.00, (246, 242, 218)),
]


def gradient_map(lum: np.ndarray) -> np.ndarray:
    out = np.zeros(lum.shape + (3,), np.float32)
    for (a, ca), (b, cb) in zip(STOPS, STOPS[1:]):
        m = (lum >= a) & (lum <= b)
        t = ((lum - a) / (b - a))[m][:, None]
        out[m] = np.array(ca, np.float32) * (1 - t) + np.array(cb, np.float32) * t
    return out


def calm(im: Image.Image, keep: float = 0.22) -> Image.Image:
    """Grade a picture to the palette, keeping `keep` of its own (half-saturated) colour."""
    a = np.asarray(im.convert('RGB')).astype(np.float32) / 255
    lum = np.clip(a @ np.array([0.299, 0.587, 0.114], np.float32), 0, 1) ** 0.9
    grey = (lum * 255)[..., None]
    own = grey + (a * 255 - grey) * 0.5
    return Image.fromarray(np.clip(gradient_map(lum) * (1 - keep) + own * keep, 0, 255).astype(np.uint8))
