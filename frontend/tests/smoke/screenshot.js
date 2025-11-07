const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const PNG = require('pngjs').PNG;
const pixelmatch = require('pixelmatch');

(async ()=>{
  const url = process.env.APP_URL || 'http://localhost:5173/';
  const outDir = path.resolve(__dirname, 'out');
  const baselineDir = path.resolve(__dirname, 'baseline');
  const diffDir = path.resolve(__dirname, 'diff');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  if (!fs.existsSync(baselineDir)) fs.mkdirSync(baselineDir, { recursive: true });
  if (!fs.existsSync(diffDir)) fs.mkdirSync(diffDir, { recursive: true });

  console.log('Opening', url);
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 900 });
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForSelector('.app-container', { timeout: 10000 });
    const el = await page.$('.app-container');
    const bb = await el.boundingBox();
    const outPath = path.join(outDir, 'home.png');
    await page.screenshot({ path: outPath, clip: { x: Math.round(bb.x), y: Math.round(bb.y), width: Math.round(bb.width), height: Math.round(bb.height) } });
    console.log('Saved screenshot to', outPath);

    const baselinePath = path.join(baselineDir, 'home.png');
    if (!fs.existsSync(baselinePath)){
      fs.copyFileSync(outPath, baselinePath);
      console.log('Baseline image did not exist. Saved current screenshot as baseline:', baselinePath);
      process.exit(0);
    }

    const img1 = PNG.sync.read(fs.readFileSync(baselinePath));
    const img2 = PNG.sync.read(fs.readFileSync(outPath));
    if (img1.width !== img2.width || img1.height !== img2.height){
      console.error('Screenshot size differs from baseline.');
      process.exit(2);
    }
    const diff = new PNG({width: img1.width, height: img1.height});
    const numDiff = pixelmatch(img1.data, img2.data, diff.data, img1.width, img1.height, {threshold: 0.12});
    const diffPath = path.join(diffDir, 'home-diff.png');
    fs.writeFileSync(diffPath, PNG.sync.write(diff));
    console.log(`Pixel diff: ${numDiff} pixels. Diff saved to ${diffPath}`);
    if (numDiff > 50){
      console.error('Visual regression detected (pixels > 50). Failing.');
      process.exit(3);
    }
    console.log('Visual check passed.');
    process.exit(0);
  } catch (e){
    console.error('Error while taking screenshot', e);
    process.exit(4);
  } finally {
    await browser.close();
  }
})();
