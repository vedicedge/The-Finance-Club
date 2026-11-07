/**
 * Lists the gear card pictures in public/cards/ into lib/card-art.json, so the site knows which
 * cards have a picture. Runs before every build and dev server (npm prebuild / predev).
 *
 *   public/cards/H01.webp   card H01        public/cards/JK.webp    the Jugaad Kit
 *   public/cards/back.webp  the card back   (.webp, .jpg, .jpeg, .png or .avif)
 */
import { existsSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'public', 'cards');
const NAME = /^([HSGK](?:0[1-9]|1[0-5])|JK|back)\.(webp|jpe?g|png|avif)$/i;

const art = {};
for (const file of existsSync(dir) ? readdirSync(dir).sort() : []) {
  const m = NAME.exec(file);
  if (m) art[m[1].toUpperCase()] = `/cards/${file}`;
  else if (!file.startsWith('.')) console.warn(`card-art: ignoring public/cards/${file} (name it like H01.webp, JK.webp or back.webp)`);
}
writeFileSync(path.join(root, 'lib', 'card-art.json'), JSON.stringify(art, null, 2) + '\n');
console.log(`card-art: ${Object.keys(art).length} picture(s) in public/cards`);
