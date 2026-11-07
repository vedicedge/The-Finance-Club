/**
 * Photographs the scene drawings at /dev/art into assets/art/scene-*.jpg.
 *
 *   npm run dev            (in one terminal)
 *   node scripts/art/render-scenes.cjs [http://localhost:3000]
 *
 * Needs Playwright with Chromium (npx playwright install chromium, or a global install with
 * NODE_PATH="$(npm root -g)").
 */
const path = require('node:path');
const { chromium } = require('playwright');

const NAMES = ['prelim', 'bazaar', 'skyline', 'vault', 'zerohour', 'heroes', 'chess'];
const base = process.argv[2] || 'http://localhost:3000';
const out = path.join(__dirname, '..', '..', 'assets', 'art');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1.5 });
  await page.goto(`${base}/dev/art`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  for (const name of NAMES) {
    const el = await page.$(`#scene-${name}`);
    if (!el) throw new Error(`scene ${name} not found on /dev/art`);
    await el.screenshot({ path: path.join(out, `scene-${name}.jpg`), type: 'jpeg', quality: 80 });
    console.log(`scene-${name}.jpg`);
  }
  await browser.close();
})();
