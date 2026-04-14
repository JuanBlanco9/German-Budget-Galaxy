#!/usr/bin/env node
/**
 * capture_cf_clearance.js
 *
 * Opens a visible Chromium window to the site you're trying to scrape.
 * You solve the Cloudflare challenge (or just wait for it to auto-pass
 * because a real browser is present), then press Enter in the terminal.
 * The script saves the full storage state (cookies + localStorage) to a
 * JSON file that `download_playwright.js` can load afterward.
 *
 * Cookies typically stay valid for 30 days. Re-run this when downloads
 * start 403'ing again.
 *
 * Usage:
 *   node scripts/capture_cf_clearance.js <site> [url]
 *
 *   site = surrey | mps | london   (or any short name — becomes the filename)
 *   url  = optional override; defaults to the preset for that site
 *
 * Examples:
 *   node scripts/capture_cf_clearance.js surrey
 *   node scripts/capture_cf_clearance.js mps
 *   node scripts/capture_cf_clearance.js london https://data.london.gov.uk/dataset?q=mopac
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const STATE_DIR = path.join(__dirname, '..', 'data', 'uk', 'local_authorities', 'spend', '.playwright-state');

const PRESETS = {
  surrey: 'https://www.surreyi.gov.uk/dataset/council-spending',
  mps:    'https://www.met.police.uk/foi-ai/metropolitan-police/disclosure-2023/',
  london: 'https://data.london.gov.uk/dataset?q=mopac+spend',
  hampshire: 'https://www.hants.gov.uk/aboutthecouncil/informationandstats/opendata/opendatasearch/supplierpayments'
};

async function main() {
  const site = process.argv[2];
  const url = process.argv[3] || PRESETS[site];
  if (!site || !url) {
    console.error('Usage: node scripts/capture_cf_clearance.js <surrey|mps|london|hampshire> [url]');
    process.exit(1);
  }

  if (!fs.existsSync(STATE_DIR)) fs.mkdirSync(STATE_DIR, { recursive: true });
  const stateFile = path.join(STATE_DIR, `${site}.json`);
  const profileDir = path.join(STATE_DIR, `${site}-profile`);

  console.log(`\nOpening real Chrome to: ${url}`);
  console.log(`Using a persistent profile at: ${profileDir}`);
  console.log(`(looks like a real browser to Cloudflare)\n`);

  // launchPersistentContext uses the real Chrome installed on your system
  // (channel:'chrome') with a real user profile dir. This defeats the
  // automation detection that makes Cloudflare loop on bundled Chromium.
  const context = await chromium.launchPersistentContext(profileDir, {
    headless: false,
    channel: 'chrome',
    viewport: null,  // use real window size
    args: [
      '--disable-blink-features=AutomationControlled',
      '--start-maximized'
    ],
    ignoreDefaultArgs: ['--enable-automation']
  });
  // Patch navigator.webdriver as an extra belt
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  const page = context.pages()[0] || await context.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 }).catch(e => {
    console.log('Navigation warning:', e.message.slice(0, 100));
  });

  // Wait for user confirmation via stdin
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  await new Promise(resolve => {
    rl.question('>>> Press Enter when the page is loaded and shows real content <<<\n', () => {
      rl.close();
      resolve();
    });
  });

  // Save storage state — for persistent contexts, cookies/state are in
  // the profile dir but we ALSO export a portable JSON so the downloader
  // can load it without a persistent context of its own.
  await context.storageState({ path: stateFile });
  const allCookies = await context.cookies();
  const cfCookies = allCookies.filter(c => c.name === 'cf_clearance' || c.name.startsWith('__cf'));
  console.log(`\nSaved state → ${stateFile}`);
  console.log(`Profile dir    → ${profileDir}`);
  console.log(`Cloudflare cookies captured: ${cfCookies.map(c => c.name).join(', ') || 'none detected'}`);
  console.log(`Total cookies: ${allCookies.length}`);

  await context.close();
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
