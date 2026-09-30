// Render bento promo ke PNG: node promo/render.mjs
// Butuh Playwright (global/lokal). Output: promo/output/*.png
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  const globalRoot = execSync('npm root -g').toString().trim();
  ({ chromium } = require(path.join(globalRoot, 'playwright')));
}

const dir = path.dirname(fileURLToPath(import.meta.url));
const page = pathToFileURL(path.join(dir, 'bento.html')).href;

const jobs = [
  { f: 'ig-portrait', w: 1080, h: 1350, scale: 1 },
  { f: 'ig-square', w: 1080, h: 1080, scale: 1 },
  { f: 'desktop', w: 1920, h: 1080, scale: 1 },
  { f: 'desktop', w: 1920, h: 1080, scale: 2, suffix: '@2x' },
];

const browser = await chromium.launch();
for (const theme of ['light', 'dark']) {
  for (const j of jobs) {
    const ctx = await browser.newContext({ viewport: { width: j.w, height: j.h }, deviceScaleFactor: j.scale });
    const p = await ctx.newPage();
    await p.goto(`${page}?f=${j.f}&theme=${theme}`);
    await p.evaluate(() => document.fonts.ready);
    const out = path.join(dir, 'output', `apexrecord-${j.f}-${theme}${j.suffix ?? ''}.png`);
    await p.screenshot({ path: out, clip: { x: 0, y: 0, width: j.w, height: j.h } });
    console.log('✓', path.relative(dir, out));
    await ctx.close();
  }
}
await browser.close();
