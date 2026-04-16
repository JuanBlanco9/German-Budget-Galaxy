#!/usr/bin/env node
/**
 * download_playwright.js
 *
 * Headless-browser downloader for councils whose data CDNs block plain
 * curl (Cloudflare, IP allowlists, JS challenges). Uses Playwright's
 * built-in APIRequestContext, which shares cookies with a real Chromium
 * navigation session, so challenge tokens from a successful page load
 * carry over to subsequent file requests.
 *
 * Usage:
 *   node scripts/download_playwright.js <council>
 *
 * Councils supported: hampshire, surrey, mps
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SPEND_DIR = path.join(__dirname, '..', 'data', 'uk', 'local_authorities', 'spend');

const TARGETS = {
  hampshire: {
    warmupUrl: 'https://www.hants.gov.uk/aboutthecouncil/informationandstats/opendata/opendatasearch/supplierpayments',
    dir: path.join(SPEND_DIR, 'hampshire'),
    files: [
      ['apr_2023.xlsx', 'https://documents.hants.gov.uk/opendata/2022-2023-All-Departments-Output-HCC-Transparency-Reporting-April2023.xlsx'],
      ['may_2023.xlsx', 'https://documents.hants.gov.uk/opendata/2023-2024-All-Departments-Output-HCC-Transparency-Reporting-May2023.xlsx'],
      ['jun_2023.xlsx', 'https://documents.hants.gov.uk/opendata/2023-2024-All-Departments-Output-HCC-Transparency-Reporting-June2023.xlsx'],
      ['jul_2023.xlsx', 'https://documents.hants.gov.uk/opendata/2023-2024-All-Departments-Output-HCC-Transparency-Reporting-July2023.xlsx'],
      ['aug_2023.xlsx', 'https://documents.hants.gov.uk/opendata/2023-2024-All-Departments-Output-HCC-Transparency-Reporting-August2023.xlsx'],
      ['sep_2023.xlsx', 'https://documents.hants.gov.uk/opendata/2023-2024-All-Departments-Output-HCC-Transparency-Reporting-September2023.xlsx'],
      ['oct_2023.xlsx', 'https://documents.hants.gov.uk/opendata/2023-2024-All-Departments-Output-HCC-Transparency-Reporting-October2023.xlsx'],
      ['nov_2023.xlsx', 'https://documents.hants.gov.uk/opendata/2023-2024-All-Departments-Output-HCC-Transparency-Reporting-November2023.xlsx'],
      ['dec_2023.xlsx', 'https://documents.hants.gov.uk/opendata/2023-2024-All-Departments-Output-HCC-Transparency-Reporting-December2023.xlsx'],
      ['jan_2024.xlsx', 'https://documents.hants.gov.uk/opendata/2023-2024-All-Departments-Output-HCC-Transparency-Reporting-January2024.xlsx'],
      ['feb_2024.xlsx', 'https://documents.hants.gov.uk/opendata/2023-2024-All-Departments-Output-HCC-Transparency-Reporting-February2024.xlsx'],
      ['mar_2024.xlsx', 'https://documents.hants.gov.uk/opendata/2023-2024-All-Departments-Output-HCC-Transparency-Reporting-March2024.xlsx']
    ]
  },
  surrey: {
    warmupUrl: 'https://www.surreyi.gov.uk/dataset/council-spending',
    dir: path.join(SPEND_DIR, 'surrey'),
    files: null  // discover dynamically
  },
  mps: {
    warmupUrl: 'https://www.met.police.uk/SysSiteAssets/foi-media/metropolitan-police/disclosure_2023/september_2023/metropolitan-police-service---expenditure-data.xlsx',
    dir: path.join(SPEND_DIR, 'mps'),
    files: null  // discover dynamically
  },
  ntyneside: {
    warmupUrl: 'https://my.northtyneside.gov.uk/page/20287/transparency',
    dir: path.join(SPEND_DIR, 'north_tyneside_metropolitan_borough_council'),
    files: [
      // FY 23/24: 8 URLs confirmed via Google index (Agent 2). Apr/May/Dec 23 + Mar 24 missing.
      ['nt_jun_2023.csv', 'https://my.northtyneside.gov.uk/sites/default/files/web-page-related-files/Invoices%20over%20250%20June%202023.xlsx.csv'],
      ['nt_jul_2023.csv', 'https://my.northtyneside.gov.uk/sites/default/files/web-page-related-files/Invoices%20over%20250%20July%202023.csv'],
      ['nt_aug_2023.csv', 'https://my.northtyneside.gov.uk/sites/default/files/web-page-related-files/Invoices%20over%20250%20August%202023.csv'],
      ['nt_sep_2023.csv', 'https://my.northtyneside.gov.uk/sites/default/files/web-page-related-files/Invoices%20over%20250%20September%202023.csv'],
      ['nt_oct_2023.csv', 'https://my.northtyneside.gov.uk/sites/default/files/web-page-related-files/Invoices%20over%20250%20October%202023.csv'],
      ['nt_nov_2023.csv', 'https://northtyneside.gov.uk/sites/default/files/web-page-related-files/Invoices%20over%20250%20November%2023.csv'],
      ['nt_jan_2024.csv', 'https://my.northtyneside.gov.uk/sites/default/files/web-page-related-files/Invoices%20over%20250%20January%2024.csv'],
      ['nt_feb_2024.csv', 'https://legacy.northtyneside.gov.uk/sites/default/files/web-page-related-files/Invoices%20over%20250%20February%2024.csv']
    ]
  }
};

async function main() {
  const council = process.argv[2];
  if (!council || !TARGETS[council]) {
    console.error('Usage: node scripts/download_playwright.js <hampshire|surrey|mps>');
    process.exit(1);
  }
  const target = TARGETS[council];

  if (!fs.existsSync(target.dir)) fs.mkdirSync(target.dir, { recursive: true });

  console.log(`\n=== Playwright download: ${council} ===`);

  // Cloudflare's cf_clearance cookie is bound to the exact browser
  // fingerprint (TLS/JA3 + UA) that generated it. Exporting to a new
  // context fails. Instead, launch the SAME persistent profile that
  // capture_cf_clearance.js built — reuses all the state that matters.
  const profileDir = path.join(SPEND_DIR, '.playwright-state', `${council}-profile`);
  const hasProfile = fs.existsSync(profileDir);
  if (hasProfile) console.log(`Using persistent profile: ${profileDir}`);

  let context, browser;
  if (hasProfile) {
    context = await chromium.launchPersistentContext(profileDir, {
      headless: false,   // must match capture mode — headless=true invalidates the cookie
      channel: 'chrome',
      viewport: null,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--window-position=-2400,-2400'  // push offscreen so it's not in the way
      ],
      ignoreDefaultArgs: ['--enable-automation'],
      acceptDownloads: true
    });
  } else {
    browser = await chromium.launch({ headless: true });
    context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
      locale: 'en-GB',
      acceptDownloads: true
    });
  }
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });
  const page = context.pages()[0] || await context.newPage();

  // Warmup: load the landing page so cookies (including any Cloudflare
  // clearance) are established in the browser context.
  console.log(`Warmup: ${target.warmupUrl}`);
  try {
    await page.goto(target.warmupUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    // Wait for any Cloudflare challenge JS to finish
    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
    console.log(`  Title: ${await page.title()}`);
    if ((await page.title()).includes('Just a moment')) {
      console.log('  Cloudflare challenge detected — waiting up to 15s...');
      await page.waitForTimeout(15000);
      console.log(`  Title after wait: ${await page.title()}`);
    }
  } catch (e) {
    console.log(`  Warmup error (non-fatal): ${e.message.slice(0, 100)}`);
  }

  // Click-triggered downloads preserve session cookies and referer headers
  // that the CDN expects. context.request.get() strips those and gets 403.
  async function downloadViaClick(url, outPath) {
    const [dl] = await Promise.all([
      page.waitForEvent('download', { timeout: 30000 }),
      page.evaluate(u => { window.location.href = u; }, url)
    ]);
    await dl.saveAs(outPath);
    return fs.statSync(outPath).size;
  }

  let files = target.files;

  // Surrey: scrape dataset resource URLs from the page
  if (council === 'surrey' && !files) {
    console.log('\nDiscovering Surrey file URLs...');
    const links = await page.evaluate(() => [...document.querySelectorAll('a')]
      .map(a => a.href)
      .filter(h => h.match(/\.csv$|\.xlsx?$|\.ods$/i)));
    console.log(`  Found ${links.length} file links`);
    links.forEach(l => console.log('    ', l));
    files = links.map((u, i) => [`surrey_${i}.` + u.split('.').pop(), u]);
  }

  // MPS: scrape expenditure report links
  if (council === 'mps' && !files) {
    console.log('\nDiscovering MPS file URLs...');
    // Try the FOI disclosure page
    try {
      await page.goto('https://www.met.police.uk/foi-ai/metropolitan-police/disclosure-logs-2023/expenditure/', { waitUntil: 'domcontentloaded', timeout: 60000 });
      const links = await page.evaluate(() => [...document.querySelectorAll('a')]
        .map(a => a.href)
        .filter(h => h.match(/\.xlsx?$|\.csv$|expenditure|payment|invoice/i)));
      console.log(`  Found ${links.length} candidate links`);
      links.forEach(l => console.log('    ', l));
      files = links.slice(0, 20).map((u, i) => [`mps_${i}.xlsx`, u]);
    } catch (e) {
      console.log(`  MPS discovery error: ${e.message.slice(0, 100)}`);
      files = [];
    }
  }

  if (!files || files.length === 0) {
    console.log('No files to download — exiting');
    await browser.close();
    return;
  }

  // Download each file via click-triggered download events
  let ok = 0, fail = 0;
  for (const [name, url] of files) {
    const outPath = path.join(target.dir, name);
    if (fs.existsSync(outPath) && fs.statSync(outPath).size > 1000) {
      console.log(`  ${name}: exists (${fs.statSync(outPath).size} bytes) — skipping`);
      ok++;
      continue;
    }
    try {
      const size = await downloadViaClick(url, outPath);
      if (size < 1000) {
        console.log(`  ${name}: suspiciously small (${size} bytes)`);
        fs.unlinkSync(outPath);
        fail++;
        continue;
      }
      console.log(`  ${name}: ${size} bytes`);
      ok++;
    } catch (e) {
      console.log(`  ${name}: ERROR ${e.message.slice(0, 120)}`);
      fail++;
    }
    // Small delay between requests to look human
    await page.waitForTimeout(800 + Math.floor(Math.random() * 700));
  }

  console.log(`\nResult: ${ok} ok, ${fail} failed out of ${files.length}`);
  await context.close();
  if (browser) await browser.close();
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
