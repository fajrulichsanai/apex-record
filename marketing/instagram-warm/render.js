// Render posts.html -> 01.png … 06.png (1080x1350).
// Usage: npm i playwright && node render.js
const path = require('path');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 1400 } });
  await page.goto('file://' + path.join(__dirname, 'posts.html'), { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  for (let i = 1; i <= 6; i++) {
    await page.locator('#p' + i).screenshot({ path: path.join(__dirname, `0${i}.png`) });
  }
  await browser.close();
})();
