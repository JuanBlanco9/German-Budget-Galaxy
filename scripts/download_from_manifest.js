#!/usr/bin/env node
/**
 * download_from_manifest.js
 *
 * Consumes data/uk/local_authorities/council_discovery_manifest.json
 * (produced by parse_discovery_reports.js) and batch-downloads raw
 * spend files for every council whose download URLs are fully enumerated
 * and whose blocker_severity is green or yellow.
 *
 * Councils marked red or needs_playwright=true are logged and skipped —
 * they need a separate download path (manual browser, FOI, Playwright,
 * or re-discovery with alt sources). Councils with only a url_pattern
 * and no explicit download_urls are also skipped because we don't try
 * to template-expand here (risk of false URLs that look valid).
 *
 * Per-council output dir:
 *   data/uk/local_authorities/spend/{slug}/
 *     where slug = council.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')
 *
 * Results log:
 *   /tmp/download_from_manifest.log
 *
 * Usage:
 *   node scripts/download_from_manifest.js [--dry-run] [--only-green] [--limit N]
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const MANIFEST = path.join(__dirname, '..', 'data', 'uk', 'local_authorities', 'council_discovery_manifest.json');
const SPEND_DIR = path.join(__dirname, '..', 'data', 'uk', 'local_authorities', 'spend');

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const ONLY_GREEN = args.includes('--only-green');
const LIMIT = args.includes('--limit') ? parseInt(args[args.indexOf('--limit') + 1], 10) : 0;

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
const MAX_CONCURRENCY = 4;
const REQUEST_TIMEOUT_MS = 90000;

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function filenameFromUrl(url) {
  try {
    const u = new URL(url);
    let name = decodeURIComponent(path.basename(u.pathname));
    // If the path ends with a slash or lacks an extension, fall back to a hash
    if (!name || !/\.[a-z0-9]+$/i.test(name)) {
      name = 'file_' + Math.abs(hash(url)).toString(36) + '.bin';
    }
    return name.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 200);
  } catch (e) {
    return 'file_' + Math.abs(hash(url)).toString(36) + '.bin';
  }
}

function hash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

function download(url, destPath, attempt = 1) {
  return new Promise((resolve) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, {
      headers: { 'User-Agent': UA, 'Accept': '*/*' },
      timeout: REQUEST_TIMEOUT_MS
    }, (res) => {
      // Redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        const next = new URL(res.headers.location, url).href;
        resolve(download(next, destPath, attempt));
        return;
      }
      if (res.statusCode !== 200) {
        res.resume();
        if (attempt < 2) {
          setTimeout(() => resolve(download(url, destPath, attempt + 1)), 800);
        } else {
          resolve({ ok: false, status: res.statusCode });
        }
        return;
      }
      const tmp = destPath + '.part';
      const out = fs.createWriteStream(tmp);
      res.pipe(out);
      out.on('finish', () => {
        out.close(() => {
          fs.renameSync(tmp, destPath);
          resolve({ ok: true, bytes: fs.statSync(destPath).size });
        });
      });
      out.on('error', e => { try { fs.unlinkSync(tmp); } catch(_){} resolve({ ok: false, error: e.message }); });
    });
    req.on('error', e => {
      if (attempt < 2) setTimeout(() => resolve(download(url, destPath, attempt + 1)), 800);
      else resolve({ ok: false, error: e.message });
    });
    req.on('timeout', () => {
      req.destroy();
      if (attempt < 2) setTimeout(() => resolve(download(url, destPath, attempt + 1)), 800);
      else resolve({ ok: false, error: 'timeout' });
    });
  });
}

async function main() {
  if (!fs.existsSync(MANIFEST)) {
    console.error('Manifest not found:', MANIFEST);
    console.error('Run scripts/parse_discovery_reports.js first.');
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  console.log(`Loaded ${manifest.length} manifest entries`);

  // Load existing lookup to skip councils already in it.
  // Normalize both sides aggressively: strip "City/County/Borough Council", "Royal Borough of",
  // "London Borough of", "Corporation", etc. After normalisation we do BIDIRECTIONAL substring
  // matching so "Bexley London Borough Council" matches lookup key "Bexley", and
  // "Devon County Council" matches "Devon".
  function normaliseCouncilName(s) {
    return String(s).toLowerCase()
      .replace(/&/g, 'and')
      .replace(/\broyal borough of\b/g, '')
      .replace(/\blondon borough of\b/g, '')
      .replace(/\bmetropolitan borough of\b/g, '')
      .replace(/\bmetropolitan borough\b/g, '')
      .replace(/\bborough of\b/g, '')
      .replace(/\bcouncil of the\b/g, '')
      .replace(/\b(city|county|borough|metropolitan|district|unitary) council\b/g, '')
      .replace(/\bcouncil\b/g, '')
      .replace(/\b(city|county|borough|corporation|authority|mbc|cc)\b/g, '')
      .replace(/\bpolice and crime commissioner\b/g, 'police')
      .replace(/[^a-z0-9 ]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  const lookupPath = path.join(SPEND_DIR, 'council_spend_lookup_2024.json');
  const lookup = fs.existsSync(lookupPath) ? JSON.parse(fs.readFileSync(lookupPath, 'utf8')) : {};
  const lookupNorms = Object.keys(lookup).map(normaliseCouncilName).filter(Boolean);
  // Pre-compute GLA subsystem children so we skip LFB / TfL / MPS / GLA core re-downloads
  const glaAliases = ['london fire brigade', 'transport for london', 'metropolitan police', 'greater london authority'];
  function inLookup(name) {
    const norm = normaliseCouncilName(name);
    if (!norm) return false;
    for (const existing of lookupNorms) {
      if (norm === existing) return true;
      // Bidirectional prefix/substring: both halves must share a significant token overlap
      if (existing.length >= 4 && (norm.startsWith(existing) || norm.endsWith(existing))) return true;
      if (norm.length >= 4 && (existing.startsWith(norm) || existing.endsWith(norm))) return true;
    }
    for (const alias of glaAliases) {
      if (norm.includes(alias) || alias.includes(norm)) return true;
    }
    return false;
  }

  // Filter: councils we can download now
  const eligible = [];
  const skipped = { already_in_lookup: 0, devolved: 0, red: 0, no_urls: 0, yellow_skipped: 0 };
  for (const e of manifest) {
    const name = e.name || '';
    if (!name) { skipped.no_urls++; continue; }
    if (inLookup(name)) { skipped.already_in_lookup++; continue; }
    if (e.tier === 'devolved' || /welsh|scotland|northern ireland|gwynedd|cardiff|swansea|newport|vale of glamorgan/i.test(name)) {
      skipped.devolved++; continue;
    }
    if (e.blocker_severity === 'red' || e.needs_playwright) {
      skipped.red++; continue;
    }
    if (ONLY_GREEN && e.blocker_severity !== 'green') {
      skipped.yellow_skipped++; continue;
    }
    if (!e.download_urls || e.download_urls.length === 0) {
      skipped.no_urls++; continue;
    }
    eligible.push(e);
  }

  console.log(`\nEligible: ${eligible.length} councils`);
  console.log('Skipped:');
  for (const [k, n] of Object.entries(skipped)) if (n > 0) console.log(`  ${k}: ${n}`);

  if (LIMIT > 0) eligible.splice(LIMIT);

  if (DRY_RUN) {
    console.log(`\nDry run — would download:`);
    for (const e of eligible) {
      console.log(`  ${e.name} [${e.blocker_severity}] — ${e.download_urls.length} files`);
    }
    return;
  }

  // Download with bounded concurrency across all councils
  const tasks = [];
  for (const e of eligible) {
    const dir = path.join(SPEND_DIR, slugify(e.name));
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    for (const url of e.download_urls) {
      const fname = filenameFromUrl(url);
      const dest = path.join(dir, fname);
      tasks.push({ council: e.name, url, dest, fname });
    }
  }

  console.log(`\nTotal download tasks: ${tasks.length}`);
  let okCount = 0, failCount = 0, skipExists = 0;
  let i = 0;
  async function worker(wid) {
    while (true) {
      const idx = i++;
      if (idx >= tasks.length) break;
      const t = tasks[idx];
      if (fs.existsSync(t.dest) && fs.statSync(t.dest).size > 0) {
        skipExists++;
        continue;
      }
      const r = await download(t.url, t.dest);
      if (r.ok) {
        okCount++;
        console.log(`  [${idx + 1}/${tasks.length}] ${t.council}/${t.fname} ✓ ${(r.bytes / 1024).toFixed(0)}KB`);
      } else {
        failCount++;
        console.log(`  [${idx + 1}/${tasks.length}] ${t.council}/${t.fname} ✗ ${r.status || r.error}`);
      }
    }
  }
  const workers = Array.from({ length: MAX_CONCURRENCY }, (_, w) => worker(w));
  await Promise.all(workers);

  console.log(`\nDone: ${okCount} downloaded, ${skipExists} already present, ${failCount} failed`);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
