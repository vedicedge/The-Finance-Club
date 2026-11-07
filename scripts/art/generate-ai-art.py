"""
Optional: paint the Doomsday scenes with Gemini instead of the silhouette drawings.

Each scene is generated with the event poster as the style reference and saved over
assets/art/scene-<name>.jpg, so the site picks it up with no code change. Review every image
before committing: the tone rules forbid copyrighted characters, logos or real people.

    GEMINI_API_KEY=... python3 scripts/art/generate-ai-art.py            # all scenes
    GEMINI_API_KEY=... python3 scripts/art/generate-ai-art.py vault,heroes

Image models need a Gemini API key with billing enabled (the free tier allows no image
generations). To undo, `git checkout assets/art/` or re-run scripts/art/render-scenes.cjs.
"""
import base64, io, json, os, sys, time, urllib.request, concurrent.futures as cf

HERE = os.path.dirname(os.path.abspath(__file__))
ART = os.path.join(HERE, '..', '..', 'assets', 'art')
MODEL = os.environ.get('IMG_MODEL', 'gemini-3-pro-image')
KEY = os.environ.get('GEMINI_API_KEY')

STYLE = (
    "Match the reference poster exactly in style and colour: dark cinematic matte painting, monochrome green grade, "
    "near-black shadows (#0a0d09), deep moss and olive greens, a pale sage-green glow (#b3d587) as the only light, "
    "stormy painterly clouds, volumetric fog, heavy film grain, high contrast, epic and ominous. Wide 16:9 composition "
    "with the subject in the centre third so it survives a tall crop. Absolutely no text, letters, numbers, logos, "
    "watermarks or UI. All characters are original: do not depict any existing superhero, comic-book, film or game "
    "character, costume or emblem, and no real people."
)

SCENES = {
    'prelim': "Close-up of a young woman's hand gripping a smartphone in a dark auditorium; the screen glows pale green with "
              "four blank answer buttons. Behind, out of focus, a huge projector screen glows over rows of silhouetted heads.",
    'bazaar': "A secret auction in an abandoned grand hall: a heavy gavel strikes its block, dust exploding; silhouetted bidders "
              "raise shield-shaped paddles; four large tarot-style cards fan out on the table showing a fortress, an armoured "
              "suit, a gadget gauntlet and a small robotic owl. Hanging lamps cast green light.",
    'skyline': "A tall tower of stacked wooden building blocks shaped like a skyscraper, blasted apart by a slingshot stone; "
               "blocks fly in slow motion. Behind it, through a broken wall, a ruined city under a black eclipse with a green "
               "corona. A wooden slingshot in the lower left foreground.",
    'vault': "Inside a massive circular steel bank vault, the round door half open with green light spilling through. On a "
             "steel table, eight sealed manila envelopes in a row, each with a green wax seal; one slightly lifted.",
    'zerohour': "A colossal old stone clock tower in a ruined Indian city as both hands reach midnight, its face glowing pale "
                "green, a black eclipse with green corona behind it; tiny silhouettes of a crowd in the square below.",
    'heroes': "Three young founders of a new hero agency, Indian college students (two men, one woman), seen from behind on a "
              "broken rooftop in home-made hero gear: a long coat, a hood with a gadget backpack and a glowing gauntlet, a "
              "short tattered cape. They face a ruined Indian megacity (Qutub Minar, India Gate arch, cracked glass towers) "
              "under a black eclipse with green corona.",
    'chess': "A chessboard in deep shadow: almost every piece toppled and scattered, one king still standing in a narrow "
             "green beam of light; a black eclipse with green corona through a tall window behind.",
}


def generate(name, poster_b64):
    body = {
        'contents': [{'parts': [{'inline_data': {'mime_type': 'image/jpeg', 'data': poster_b64}}, {'text': SCENES[name] + ' ' + STYLE}]}],
        'generationConfig': {'responseModalities': ['IMAGE'], 'imageConfig': {'aspectRatio': '16:9', 'imageSize': '2K'}},
    }
    url = f'https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent'
    last = ''
    for attempt in range(4):
        try:
            req = urllib.request.Request(url, data=json.dumps(body).encode(), headers={'Content-Type': 'application/json', 'x-goog-api-key': KEY})
            with urllib.request.urlopen(req, timeout=300) as r:
                data = json.load(r)
            for cand in data.get('candidates', []):
                for part in cand.get('content', {}).get('parts', []):
                    blob = part.get('inline_data') or part.get('inlineData')
                    if blob:
                        return base64.b64decode(blob['data'])
            last = json.dumps(data)[:300]
        except Exception as e:  # network errors, 429s
            last = e.read().decode()[:300] if hasattr(e, 'read') else str(e)
        time.sleep(5 * (attempt + 1))
    raise RuntimeError(f'{name}: {last}')


def save(name, raw):
    from PIL import Image  # pip install pillow
    im = Image.open(io.BytesIO(raw)).convert('RGB')
    w = 2400
    im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
    path = os.path.join(ART, f'scene-{name}.jpg')
    im.save(path, quality=80, optimize=True, progressive=True)
    return path


def main():
    if not KEY:
        sys.exit('Set GEMINI_API_KEY.')
    names = sys.argv[1].split(',') if len(sys.argv) > 1 else list(SCENES)
    with open(os.path.join(ART, 'poster.jpg'), 'rb') as f:
        poster_b64 = base64.b64encode(f.read()).decode()
    with cf.ThreadPoolExecutor(max_workers=3) as ex:
        futures = {ex.submit(generate, n, poster_b64): n for n in names}
        for fut in cf.as_completed(futures):
            n = futures[fut]
            try:
                print('saved', save(n, fut.result()))
            except Exception as e:
                print('FAILED', e)


if __name__ == '__main__':
    main()
