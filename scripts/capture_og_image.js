#!/usr/bin/env node
/**
 * capture_og_image.js
 *
 * Takes a screenshot of the Budget Galaxy Multiverse view for Open Graph previews.
 * Output: frontend/og_preview.jpg (1200x630, optimized for social sharing)
 *
 * Usage: node scripts/capture_og_image.js [--url https://budgetgalaxy.com]
 */

const puppeteer = require('puppeteer');
const path = require('path');

const URL = process.argv.find(a => a.startsWith('--url='))?.split('=')[1]
  || process.argv[process.argv.indexOf('--url') + 1]
  || 'https://budgetgalaxy.com';

const OUTPUT = path.join(__dirname, '..', 'frontend', 'og_preview.jpg');

(async () => {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1200,630']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 2 });

  console.log(`Loading ${URL}...`);
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 30000 });

  // Click the Multiverse card on the landing page to enter directly
  console.log('Clicking Multiverse card...');
  await page.evaluate(() => {
    // Try clicking the Multiverse card or the first country card to enter the app
    const mvCard = document.querySelector('[onclick*="multiverse"], [onclick*="mv"]');
    if (mvCard) { mvCard.click(); return; }
    // Fallback: click any country card
    const cards = document.querySelectorAll('.country-card, [onclick*="selectCountry"], [onclick*="enterApp"]');
    if (cards.length) cards[0].click();
  });

  await new Promise(r => setTimeout(r, 3000));

  // Now click the ALL button in the country switcher
  console.log('Navigating to Multiverse...');
  await page.evaluate(() => {
    const allBtn = document.querySelector('.country-switch button[data-country="mv"]');
    if (allBtn) allBtn.click();
  });

  // Wait for the Multiverse SVG to render
  console.log('Waiting for Multiverse to render...');
  await page.waitForSelector('#multiverse-container svg circle', { timeout: 20000 });

  // Extra wait for labels and animations to settle
  await new Promise(r => setTimeout(r, 3000));

  // Hide UI elements that shouldn't be in the OG image
  await page.evaluate(() => {
    // Hide header, tabs, year selector, footer
    const hide = [
      '.header',
      '.tabs',
      '.galaxy-lang-toggle',
      '#mv-info',
    ];
    hide.forEach(sel => {
      const el = document.querySelector(sel);
      if (el) el.style.display = 'none';
    });

    // Make the multiverse container fill the viewport
    const mv = document.getElementById('tab-multiverse');
    if (mv) {
      mv.style.position = 'fixed';
      mv.style.top = '0';
      mv.style.left = '0';
      mv.style.width = '100vw';
      mv.style.height = '100vh';
      mv.style.zIndex = '9999';
    }

    // Add a subtle branding overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;bottom:20px;right:24px;z-index:10000;font-family:Inter,system-ui,sans-serif;text-align:right';
    overlay.innerHTML = `
      <div style="font-size:28px;font-weight:800;color:rgba(255,255,255,.9);text-shadow:0 2px 8px rgba(0,0,0,.7);letter-spacing:-0.5px">
        Budget Galaxy
      </div>
      <div style="font-size:13px;color:rgba(79,195,247,.8);font-weight:500;text-shadow:0 1px 4px rgba(0,0,0,.7)">
        Total public spending &mdash; DE &bull; US &bull; FR &bull; UK
      </div>
    `;
    document.body.appendChild(overlay);
  });

  // Final wait for layout
  await new Promise(r => setTimeout(r, 1000));

  console.log(`Capturing screenshot to ${OUTPUT}...`);
  await page.screenshot({
    path: OUTPUT,
    type: 'jpeg',
    quality: 90,
    clip: { x: 0, y: 0, width: 1200, height: 630 }
  });

  await browser.close();

  const fs = require('fs');
  const size = fs.statSync(OUTPUT).size;
  console.log(`Done! ${OUTPUT} (${(size / 1024).toFixed(0)} KB)`);
  console.log('\nNext steps:');
  console.log('1. Upload: scp -i ~/.ssh/id_agro_intel frontend/og_preview.jpg root@96.30.199.112:/opt/germany-ngo-map/frontend/');
  console.log('2. Update meta tags in index.html: og:image -> /og_preview.jpg');
})();
