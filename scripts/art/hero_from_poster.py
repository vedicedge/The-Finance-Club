"""
Widescreen hero art built from the poster's text-free middle band: the hooded figure (Professor
Kalyug), the eclipse and the ruined skyline. None of the poster's lettering, date or venue is used.

    python3 scripts/art/hero_from_poster.py assets/art/poster.jpg assets/art/hero.jpg

The band is scaled to the hero's height and set to the right; the sky and skyline left of the
eclipse are carried out to the left (mirrored, softened, darkened) so the title has a quiet side.
"""
import sys
from PIL import Image, ImageChops, ImageEnhance, ImageFilter

src, out = sys.argv[1:3]
P = Image.open(src).convert('RGB')

# The poster's lettering sits above y≈150 (club name) and below y≈845 (title, date, venue).
band = P.crop((0, 150, P.width, 838))

H = 1100
W = int(H * 2.2)
scale = H / band.height
plate = band.resize((round(band.width * scale), H), Image.LANCZOS)
plate = plate.filter(ImageFilter.UnsharpMask(radius=2, percent=60, threshold=3))
ext = W - plate.width

canvas = Image.new('RGB', (W, H))
canvas.paste(plate, (ext, 0))

# Carry the sky out to the left with only the band's left strip (clouds and skyline, left of the
# eclipse): mirrored next to the band so the seam matches, then repeated as-is further out.
strip_w = round(400 * scale / 1.594)  # ~400 px of the scaled band, all of it left of the eclipse
strip = plate.crop((0, 0, strip_w, H))
ext_canvas = Image.new('RGB', (ext, H))
x = ext
flip = True
while x > 0:
    tile = strip.transpose(Image.FLIP_LEFT_RIGHT) if flip else strip
    x -= strip_w
    ext_canvas.paste(tile, (x, 0))
    flip = not flip
# soften and darken toward the far left, where the title sits
fade = Image.linear_gradient('L').rotate(-90, expand=True).resize((ext, H))  # 255 at the left, 0 at the seam
ext_canvas = Image.composite(ext_canvas.filter(ImageFilter.GaussianBlur(5)), ext_canvas, fade)
ext_canvas = Image.composite(ImageEnhance.Brightness(ext_canvas).enhance(0.5), ext_canvas, fade)
canvas.paste(ext_canvas, (0, 0))

# Fresh film grain over everything, to hide the upscale and match the poster.
noise = Image.effect_noise((W, H), 28).convert('RGB')
canvas = ImageChops.blend(canvas, ImageChops.overlay(canvas, noise), 0.18)

canvas.save(out, quality=82, optimize=True, progressive=True)
print(out, canvas.size)
