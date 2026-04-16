#!/usr/bin/env node
/**
 * upload_to_archive_org.js
 *
 * Uploads every raw council spend file to an Internet Archive collection
 * via the S3-compatible PUT API. Each file is addressed by
 * `{council_slug}_{filename}` inside the item `budget-galaxy-uk-councils-2024`.
 *
 * After upload, archive.org takes 5-30 min to index the files and make
 * them available at `https://archive.org/download/{item}/{filename}`.
 *
 * We also write a `archive_file_url` field into council_spend_lookup_2024.json
 * so downstream tooling (generate_sources_md.js, the frontend) can show
 * the permanent mirror URL alongside the live source.
 *
 * Rate limit: IA S3 API accepts one upload at a time per item, but the
 * server has x-concurrency-limit ~11. We pace at 1 req/sec.
 *
 * Usage:
 *   IA_ACCESS_KEY=... IA_SECRET_KEY=... node scripts/upload_to_archive_org.js [--dry-run] [--skip-existing]
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const SPEND_DIR = path.join(__dirname, '..', 'data', 'uk', 'local_authorities', 'spend');
const LOOKUP = path.join(SPEND_DIR, 'council_spend_lookup_2024.json');
const ITEM = 'budget-galaxy-uk-councils-2024';
const IA_ACCESS = process.env.IA_ACCESS_KEY;
const IA_SECRET = process.env.IA_SECRET_KEY;
const DRY_RUN = process.argv.includes('--dry-run');
const SKIP_EXISTING = process.argv.includes('--skip-existing');
const DELAY_MS = 1200;

if (!IA_ACCESS || !IA_SECRET) {
  console.error('IA_ACCESS_KEY and IA_SECRET_KEY required');
  process.exit(1);
}

// Must stay in sync with generate_sources_md.js DIR_MAP.
// If you add a council here, add it there too (or vice versa).
const DIR_MAP = {
  'Camden':                 ['camden_spend_2023_24.csv'],
  'Rochdale':               'rochdale',
  'Manchester':             'manchester',
  'Leeds':                  'leeds',
  'Bristol':                'bristol',
  'Sheffield':              'sheffield',
  'Dudley':                 'dudley',
  'Nottinghamshire':        'nottinghamshire',
  'Lambeth':                'lambeth',
  'Merton':                 'merton',
  'South Gloucestershire':  'south_glos',
  'East Sussex':            'east_sussex',
  'Norfolk':                'norfolk',
  'Kent':                   'kent',
  'Cornwall':               'cornwall',
  'Southwark':              'southwark',
  'Hertfordshire':          'hertfordshire',
  'Buckinghamshire':        'buckinghamshire',
  'North Yorkshire':        'north_yorkshire',
  'Bradford':               'bradford',
  'Liverpool':              'liverpool',
  'Croydon':                'croydon',
  'Coventry':               'coventry',
  'Birmingham':             ['birmingham_spend_2024_25.csv'],
  'Essex':                  'essex',
  'West Sussex':            'west_sussex',
  'Lancashire':             'lancashire',
  'Devon':                  'devon',
  'Staffordshire':          'staffordshire',
  'Lincolnshire':           'lincolnshire',
  'Hampshire':              'hampshire',
  'Surrey':                 'surrey',

  // London boroughs (session 2026-04-14/15)
  'City of London':         'city_of_london',
  'Havering':               'havering',
  'Greenwich':              'greenwich',
  'Haringey':               'haringey',
  'Harrow':                 'harrow',
  'Westminster':            'westminster',
  'Barking and Dagenham':   'barking_dagenham',
  'Bexley':                 'bexley',
  'Islington':              'islington',
  'Kensington and Chelsea': 'rbkc',
  'Tower Hamlets':          'tower_hamlets',
  'Barnet':                 'barnet',
  'Brent':                  'brent',
  'Hounslow':               'hounslow',
  'Ealing':                 'ealing',
  'Richmond':               'richmond',
  'Wandsworth':             'wandsworth',
  'Newham':                 'newham',
  'Redbridge':              'redbridge',
  'Hillingdon':             'hillingdon',
  'Enfield':                'enfield',
  'Kingston upon Thames':   'kingston',
  'Sutton':                 'sutton',
  'Lewisham':               'lewisham',
  'Hammersmith and Fulham': 'hammersmith_fulham',
  'Waltham Forest':         'waltham_forest',
  'Bromley':                'bromley',
  'Hackney':                'hackney',

  // Combined Authorities (session 2026-04-15)
  'Greater Manchester Combined Authority': 'gmca',
  'West Midlands Combined Authority':      'wmca',
  'West Yorkshire Combined Authority':     'wyca'
};

const GLA_SUBENTITIES = [
  { name: 'LFB', dir: 'lfb', slug: 'gla_lfb' },
  { name: 'TfL', dir: 'tfl', slug: 'gla_tfl' },
  { name: 'GLA core', dir: 'gla_core', slug: 'gla_core' },
  { name: 'MPS', dir: 'mps', slug: 'gla_mps' }
];

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function councilSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function listFiles(dirSpec) {
  const files = [];
  if (Array.isArray(dirSpec)) {
    for (const rel of dirSpec) {
      const fp = path.join(SPEND_DIR, rel);
      if (fs.existsSync(fp) && fs.statSync(fp).isFile()) {
        files.push({ path: fp, name: path.basename(rel) });
      }
    }
  } else {
    const dir = path.join(SPEND_DIR, dirSpec);
    if (!fs.existsSync(dir)) return [];
    for (const f of fs.readdirSync(dir).sort()) {
      const fp = path.join(dir, f);
      if (fs.statSync(fp).isFile()) files.push({ path: fp, name: f });
    }
  }
  return files;
}

function uploadFile(localPath, keyInItem) {
  return new Promise((resolve) => {
    const stat = fs.statSync(localPath);
    const options = {
      hostname: 's3.us.archive.org',
      port: 443,
      path: '/' + ITEM + '/' + keyInItem,
      method: 'PUT',
      headers: {
        'authorization': `LOW ${IA_ACCESS}:${IA_SECRET}`,
        'content-length': stat.size,
        'x-archive-auto-make-bucket': '1',
        'x-archive-meta-collection': 'opensource',
        'x-archive-meta-mediatype': 'data',
        'x-archive-meta-title': 'Budget Galaxy UK Council Spend Raw Data 2023-24',
        'x-archive-meta-creator': 'Budget Galaxy',
        'x-archive-meta-subject': 'UK local government transparency audit',
        'x-archive-meta-description': 'Raw spend over 500 GBP transparency disclosures from English local councils, captured by Budget Galaxy for the FY 2023/24 audit trail. Each file is unmodified from publisher original. SHA256 hashes and full manifest at https://github.com/JuanBlanco9/Budget-Galaxy/blob/main/data/uk/SOURCES.md'
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve({ ok: true, url: `https://archive.org/download/${ITEM}/${keyInItem}` });
        } else {
          resolve({ ok: false, status: res.statusCode, body: data.slice(0, 200) });
        }
      });
    });
    req.on('error', e => resolve({ ok: false, error: e.message }));
    req.setTimeout(120000, () => { req.destroy(); resolve({ ok: false, error: 'timeout' }); });
    const stream = fs.createReadStream(localPath);
    stream.on('error', e => resolve({ ok: false, error: 'stream ' + e.message }));
    stream.pipe(req);
  });
}

async function main() {
  const lookup = JSON.parse(fs.readFileSync(LOOKUP, 'utf8'));

  // Build flat task list
  const tasks = [];
  const missingFromLookup = [];
  const missingOnDisk = [];
  for (const [name, dirSpec] of Object.entries(DIR_MAP)) {
    const entry = lookup[name];
    if (!entry) { missingFromLookup.push(name); continue; }
    if (!entry.archive_files) entry.archive_files = {};
    const files = listFiles(dirSpec);
    if (files.length === 0) missingOnDisk.push(`${name} → ${JSON.stringify(dirSpec)}`);
    for (const f of files) {
      const slug = councilSlug(name);
      const key = `${slug}_${f.name}`;
      tasks.push({ council: name, localPath: f.path, keyInItem: key, target: entry.archive_files, fname: f.name });
    }
  }
  if (missingFromLookup.length) {
    console.warn(`WARN: ${missingFromLookup.length} councils in DIR_MAP but NOT in lookup (will skip):`);
    missingFromLookup.forEach(n => console.warn(`  - ${n}`));
  }
  if (missingOnDisk.length) {
    console.warn(`WARN: ${missingOnDisk.length} councils in DIR_MAP but no files on disk:`);
    missingOnDisk.forEach(n => console.warn(`  - ${n}`));
  }
  // GLA
  const glaEntry = lookup['Greater London Authority'];
  if (glaEntry) {
    if (!glaEntry.archive_files) glaEntry.archive_files = {};
    for (const sub of GLA_SUBENTITIES) {
      for (const f of listFiles(sub.dir)) {
        const key = `${sub.slug}_${f.name}`;
        tasks.push({ council: `GLA/${sub.name}`, localPath: f.path, keyInItem: key, target: glaEntry.archive_files, fname: `${sub.slug}/${f.name}` });
      }
    }
  }

  // Manifest-driven auto_configs councils — dir lives in the config.
  // Everything that came through build_from_manifest ends up here without
  // requiring DIR_MAP edits.
  const AUTO_CONFIGS_PATH = path.join(SPEND_DIR, 'auto_configs.json');
  if (fs.existsSync(AUTO_CONFIGS_PATH)) {
    const autoList = JSON.parse(fs.readFileSync(AUTO_CONFIGS_PATH, 'utf8'));
    for (const cfg of autoList) {
      const entry = lookup[cfg.name];
      if (!entry) { missingFromLookup.push(cfg.name); continue; }
      if (!entry.archive_files) entry.archive_files = {};
      const dirAbs = path.isAbsolute(cfg.dir) ? cfg.dir : path.join(SPEND_DIR, cfg.dir);
      const slug = councilSlug(cfg.name);
      if (!fs.existsSync(dirAbs)) { missingOnDisk.push(`${cfg.name} → ${dirAbs}`); continue; }
      for (const f of fs.readdirSync(dirAbs).sort()) {
        const fp = path.join(dirAbs, f);
        if (!fs.statSync(fp).isFile()) continue;
        if (!/\.(csv|xlsx|xls|ods|pdf)$/i.test(f)) continue;
        const key = `${slug}_${f}`;
        tasks.push({ council: cfg.name, localPath: fp, keyInItem: key, target: entry.archive_files, fname: f });
      }
    }
  }

  console.log(`Tasks: ${tasks.length} files`);
  const totalBytes = tasks.reduce((s, t) => s + fs.statSync(t.localPath).size, 0);
  console.log(`Total size: ${(totalBytes / 1024 / 1024).toFixed(1)} MB`);
  console.log(`Est time at ${DELAY_MS}ms pacing + upload: ${Math.ceil(tasks.length * 4 / 60)} min\n`);

  if (DRY_RUN) {
    tasks.slice(0, 10).forEach(t => console.log('  ', t.council, '→', t.keyInItem));
    console.log(`  ... and ${tasks.length - 10} more`);
    return;
  }

  let ok = 0, skip = 0, fail = 0;
  for (let i = 0; i < tasks.length; i++) {
    const t = tasks[i];
    process.stdout.write(`[${i + 1}/${tasks.length}] ${t.council}/${t.fname}... `);

    if (SKIP_EXISTING && t.target[t.fname]) {
      console.log('skip (already uploaded)');
      skip++;
      continue;
    }

    const r = await uploadFile(t.localPath, t.keyInItem);
    if (r.ok) {
      t.target[t.fname] = r.url;
      console.log('✓');
      ok++;
    } else {
      console.log(`✗ ${r.status || r.error || 'unknown'}`);
      fail++;
    }
    // Persist after every 5 uploads
    if (i % 5 === 0) fs.writeFileSync(LOOKUP, JSON.stringify(lookup, null, 2), 'utf8');
    if (i < tasks.length - 1) await sleep(DELAY_MS);
  }
  fs.writeFileSync(LOOKUP, JSON.stringify(lookup, null, 2), 'utf8');
  console.log(`\nDone: ${ok} uploaded, ${skip} skipped, ${fail} failed`);
  console.log(`\nFiles will be accessible at https://archive.org/download/${ITEM}/{filename}`);
  console.log(`after archive.org indexing completes (~5-30 min).`);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
