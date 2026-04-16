#!/usr/bin/env node
/**
 * scrape_manifest_urls.js
 *
 * For every entry in council_discovery_manifest.json that has a
 * base_url but empty (or scant) download_urls, fetch the landing page
 * and regex-extract hrefs matching the council's domain + data-file
 * extensions. Filter to probable FY 2023-24 URLs by checking for
 * year/month/quarter markers. Update the manifest in-place.
 *
 * Skips councils marked needs_playwright (Cloudflare, JS walls) and
 * tier=devolved. Also skips entries that already have >=10 explicit
 * download_urls (considered complete).
 *
 * Usage:
 *   node scripts/scrape_manifest_urls.js [--dry-run]
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const MANIFEST = path.join(__dirname, '..', 'data', 'uk', 'local_authorities', 'council_discovery_manifest.json');
const DRY_RUN = process.argv.includes('--dry-run');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
const TIMEOUT_MS = 30000;

function fetch(url, redirectCount = 0) {
  return new Promise((resolve) => {
    if (redirectCount > 5) return resolve({ ok: false, error: 'too many redirects' });
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, {
      headers: { 'User-Agent': UA, 'Accept': 'text/html,*/*' },
      timeout: TIMEOUT_MS
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        const next = new URL(res.headers.location, url).href;
        return resolve(fetch(next, redirectCount + 1));
      }
      if (res.statusCode !== 200) {
        res.resume();
        return resolve({ ok: false, status: res.statusCode });
      }
      let body = '';
      res.setEncoding('utf8');
      res.on('data', c => body += c);
      res.on('end', () => resolve({ ok: true, body, finalUrl: url }));
    });
    req.on('error', e => resolve({ ok: false, error: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ ok: false, error: 'timeout' }); });
  });
}

function extractDataUrls(html, baseUrl, expectedFormat) {
  // Relative hrefs → absolute via base URL
  const base = new URL(baseUrl);
  const hrefRe = /href\s*=\s*"([^"]+)"/gi;
  const allowedExts = expectedFormat && expectedFormat !== 'unknown' && expectedFormat !== 'mixed'
    ? [expectedFormat]
    : ['csv', 'xlsx', 'xls', 'ods', 'pdf', 'zip'];
  const extRe = new RegExp('\\.(' + allowedExts.join('|') + ')(\\?|$|#)', 'i');

  const found = new Set();
  let m;
  while ((m = hrefRe.exec(html)) !== null) {
    let href = m[1].replace(/&amp;/g, '&');
    if (!extRe.test(href)) continue;
    try {
      const abs = new URL(href, base.href).href;
      // Same-host filter to avoid CDN / third-party noise
      const u = new URL(abs);
      if (u.hostname !== base.hostname
          && !u.hostname.endsWith('.' + base.hostname.split('.').slice(-2).join('.'))) {
        // allow subdomains / .blob.core / gov.uk variants
        if (!/(gov\.uk|datopian|githubusercontent|archive\.org|opendata)/.test(u.hostname)) continue;
      }
      found.add(abs);
    } catch (e) { /* skip invalid urls */ }
  }
  return [...found];
}

function isFY2324(url) {
  // Heuristic: URL mentions 2023, 2024, 23-24, 23_24, Apr/May/…/Mar
  const lower = url.toLowerCase();
  if (/(2023|2024|23.24|23_24|202[34])/.test(lower)) return true;
  if (/(apr|may|jun|jul|aug|sep|oct|nov|dec|jan|feb|mar)/.test(lower)) return true;
  return false;
}

async function main() {
  if (!fs.existsSync(MANIFEST)) { console.error('Manifest missing'); process.exit(1); }
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));

  const candidates = manifest.filter(e =>
    e.base_url
    && !e.needs_playwright
    && e.tier !== 'devolved'
    && e.blocker_severity !== 'red'
    && (!e.download_urls || e.download_urls.length < 10)
  );

  console.log(`Manifest entries: ${manifest.length}`);
  console.log(`Scrape candidates: ${candidates.length}`);

  let enriched = 0, skippedFetch = 0, zeroFound = 0;
  const CONCURRENCY = 4;
  let i = 0;

  async function worker() {
    while (true) {
      const idx = i++;
      if (idx >= candidates.length) break;
      const e = candidates[idx];
      process.stdout.write(`  [${idx + 1}/${candidates.length}] ${e.name.slice(0, 50)}... `);
      const r = await fetch(e.base_url);
      if (!r.ok) {
        console.log(`fetch fail (${r.status || r.error})`);
        skippedFetch++;
        continue;
      }
      const urls = extractDataUrls(r.body, e.base_url, e.file_format);
      const fyUrls = urls.filter(isFY2324);
      if (fyUrls.length === 0) {
        console.log(`0 FY23/24 urls (${urls.length} total on page)`);
        zeroFound++;
        continue;
      }
      // Merge into existing download_urls without duplication
      const existing = new Set(e.download_urls || []);
      for (const u of fyUrls) existing.add(u);
      const before = (e.download_urls || []).length;
      e.download_urls = [...existing];
      const added = e.download_urls.length - before;
      console.log(`${added} new urls (${e.download_urls.length} total)`);
      if (added > 0) enriched++;
    }
  }

  const workers = Array.from({ length: CONCURRENCY }, () => worker());
  await Promise.all(workers);

  console.log(`\nResults: ${enriched} enriched, ${skippedFetch} fetch failed, ${zeroFound} had no FY23/24 links`);

  if (DRY_RUN) {
    console.log('Dry run — manifest not saved');
    return;
  }
  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`✓ Manifest updated: ${MANIFEST}`);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
