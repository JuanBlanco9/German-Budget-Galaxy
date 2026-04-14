#!/usr/bin/env node
/**
 * archive_sources.js
 *
 * Takes each council's source_url and creates a persistent snapshot in
 * the Internet Archive (Wayback Machine). Writes the resulting
 * archive_url + captured_at timestamp back to the lookup JSON so that
 * even if the live source breaks, the audit trail persists.
 *
 * Wayback "Save Page Now" endpoint:
 *   POST https://web.archive.org/save/<URL>
 * returns a Content-Location header pointing at the new snapshot.
 *
 * Rate limit: ~4 requests/minute per Wayback's current guidance.
 * Uses a 15-second delay between requests to stay safely under the limit.
 *
 * Idempotency: skips entries that already have an archive_url.
 * Pass --force to re-archive everything.
 *
 * Usage:
 *   node scripts/archive_sources.js [--force] [--dry-run]
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const LOOKUP = path.join(__dirname, '..', 'data', 'uk', 'local_authorities', 'spend', 'council_spend_lookup_2024.json');
const FORCE = process.argv.includes('--force');
const DRY_RUN = process.argv.includes('--dry-run');
const DELAY_MS = 15000;  // 4/min

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function waybackSave(url) {
  return new Promise((resolve) => {
    const saveUrl = 'https://web.archive.org/save/' + url;
    const req = https.get(saveUrl, {
      headers: {
        'User-Agent': 'Budget-Galaxy-Audit/1.0 (budgetgalaxy.com)',
        'Accept': 'text/html'
      }
    }, (res) => {
      // Wayback Save Page Now returns a 302 redirect where `location`
      // header points at the new snapshot URL. NOT content-location.
      const loc = res.headers['location'] || res.headers['content-location'];
      if (res.statusCode === 302 && loc) {
        const archiveUrl = loc.startsWith('http') ? loc : ('https://web.archive.org' + loc);
        // Drain body then resolve
        res.on('data', () => {});
        res.on('end', () => resolve({ ok: true, url: archiveUrl, status: 302 }));
        return;
      }
      // Non-redirect: read body and look for /web/<timestamp>/ inline
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        const m = data.match(/\/web\/\d{14}\/[^"'\s<]+/);
        if (m) {
          resolve({ ok: true, url: 'https://web.archive.org' + m[0], status: res.statusCode });
          return;
        }
        resolve({ ok: false, status: res.statusCode, body: data.slice(0, 200) });
      });
    });
    req.on('error', (e) => resolve({ ok: false, error: e.message }));
    req.setTimeout(60000, () => { req.destroy(); resolve({ ok: false, error: 'timeout' }); });
  });
}

async function main() {
  const lookup = JSON.parse(fs.readFileSync(LOOKUP, 'utf8'));
  const now = new Date().toISOString();

  const tasks = [];
  for (const [name, entry] of Object.entries(lookup)) {
    // Council-level URL
    if (entry.source_url && (!entry.archive_url || FORCE)) {
      tasks.push({ name, level: 'council', url: entry.source_url, target: entry });
    }
    // GLA per-service URLs
    if (entry.services) {
      for (const [svcName, svcData] of Object.entries(entry.services)) {
        if (svcData.source_url && (!svcData.archive_url || FORCE)) {
          tasks.push({ name: `${name}/${svcName}`, level: 'service', url: svcData.source_url, target: svcData });
        }
      }
    }
  }

  console.log(`Tasks to archive: ${tasks.length}`);
  console.log(`Estimated time: ${Math.ceil(tasks.length * DELAY_MS / 60000)} minutes\n`);

  if (DRY_RUN) {
    tasks.forEach(t => console.log(`  ${t.name}: ${t.url}`));
    return;
  }

  let ok = 0, fail = 0;
  for (let i = 0; i < tasks.length; i++) {
    const t = tasks[i];
    process.stdout.write(`[${i + 1}/${tasks.length}] ${t.name}... `);
    const result = await waybackSave(t.url);
    if (result.ok) {
      t.target.archive_url = result.url;
      t.target.captured_at = now;
      console.log(`✓ ${result.url.slice(0, 80)}`);
      ok++;
    } else {
      // Fallback: use wildcard Wayback search as the "archive" URL. It
      // may or may not resolve to a real snapshot, but it gives the user
      // a starting point for manual verification.
      t.target.archive_url = 'https://web.archive.org/web/*/' + t.url;
      t.target.captured_at = now;
      t.target.archive_status = 'pending';
      console.log(`✗ ${result.status || result.error || 'unknown'} — fallback to wildcard`);
      fail++;
    }
    // Save progress after each request so we don't lose state on crash
    fs.writeFileSync(LOOKUP, JSON.stringify(lookup, null, 2), 'utf8');
    if (i < tasks.length - 1) await sleep(DELAY_MS);
  }

  console.log(`\nDone: ${ok} snapshots, ${fail} fallbacks`);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
