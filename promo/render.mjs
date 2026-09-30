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

const slides = [
  { s: 'klinis', name: '01-rekam-medis' },
  { s: 'bisnis', name: '02-laporan-bisnis' },
];

const browser = await chromium.launch();
for (const { s, name } of slides) {
  for (const theme of ['light', 'dark']) {
    for (const scale of [1, 2]) {
      const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: scale });
      const p = await ctx.newPage();
      const errors = [];
      p.on('pageerror', (e) => errors.push(e));
      await p.goto(`${page}?s=${s}&theme=${theme}`);
      await p.evaluate(() => document.fonts.ready);
      if (errors.length) throw errors[0];
      const out = path.join(dir, 'output', `apexrecord-${name}-${theme}${scale === 2 ? '@2x' : ''}.png`);
      await p.screenshot({ path: out, clip: { x: 0, y: 0, width: 1920, height: 1080 } });
      console.log('✓', path.relative(dir, out));
      await ctx.close();
    }
  }
}
await browser.close();
