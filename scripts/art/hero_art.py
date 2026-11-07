"""
The landing hero art, from the club's character art of Professor Kalyug.

    python3 scripts/art/hero_art.py assets/art

Reads (in assets/art):
  kalyug-character.webp  portrait (2 : 3): hood to waist before the eclipse
  kalyug-wide.webp       wide (21 : 9): the same scene, the figure on the right and the ruined
                         city carrying on across the left, as quiet space for the title

Writes:
  hero.jpg          phones and tablets: the portrait, with the site's grain. The page frames it
                    on the hood and eclipse (object-position).
  hero-desktop.jpg  laptops and desktops: the wide art, upscaled to 2880 px (sharp on a 1440 px
                    retina screen), lightly sharpened, with the site's grain.
"""
import os
import sys

from PIL import Image, ImageChops, ImageFilter

DESKTOP_WIDTH = 2880


def grain(im: Image.Image, amount: float) -> Image.Image:
    noise = Image.effect_noise(im.size, 28).convert('RGB')
    return ImageChops.blend(im, ImageChops.overlay(im, noise), amount)


def main():
    art = sys.argv[1]
    portrait = Image.open(os.path.join(art, 'kalyug-character.webp')).convert('RGB')
    grain(portrait, 0.1).save(os.path.join(art, 'hero.jpg'), quality=82, optimize=True, progressive=True)

    wide = Image.open(os.path.join(art, 'kalyug-wide.webp')).convert('RGB')
    if wide.width < DESKTOP_WIDTH:
        wide = wide.resize((DESKTOP_WIDTH, round(wide.height * DESKTOP_WIDTH / wide.width)), Image.LANCZOS)
        wide = wide.filter(ImageFilter.UnsharpMask(radius=2, percent=55, threshold=2))
    grain(wide, 0.14).save(os.path.join(art, 'hero-desktop.jpg'), quality=80, optimize=True, progressive=True)
    print('hero.jpg', portrait.size, '· hero-desktop.jpg', wide.size)


if __name__ == '__main__':
    main()
