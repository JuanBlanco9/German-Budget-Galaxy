#!/usr/bin/env node
/**
 * enrich_supplier_geo.js
 *
 * Enriches _top_suppliers metadata with geographic data from Companies House.
 * Adds _postcode, _company_type, _local (boolean) to each supplier entry.
 *
 * Uses persistent cache to avoid re-fetching known suppliers.
 * Rate limited to 110ms between calls (safe under 600/min).
 *
 * Usage:
 *   CH_API_KEY="..." node scripts/enrich_supplier_geo.js [--dry-run] [--year 2024]
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const DATA_DIR = path.join(__dirname, '..', 'data');
const UK_DIR = path.join(DATA_DIR, 'uk');
const CACHE_FILE = path.join(UK_DIR, 'supplier_geo_cache.json');
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const YEAR = args.find(a => a.match(/^\d{4}$/)) || '2024';
const CH_API_KEY = process.env.CH_API_KEY;

if (!CH_API_KEY && !DRY_RUN) {
  console.error('Error: CH_API_KEY environment variable required');
  console.error('Usage: CH_API_KEY="your-key" node scripts/enrich_supplier_geo.js');
  process.exit(1);
}

// Council → local postcode prefixes
const COUNCIL_POSTCODES = {
  'Leeds': ['LS'],
  'Manchester': ['M'],
  'Sheffield': ['S'],
  'Bristol': ['BS'],
  'Camden': ['NW', 'WC', 'N'],
  'Rochdale': ['OL'],
  'Dudley': ['DY'],
  'Nottinghamshire CC': ['NG', 'DE'],
  'Lambeth': ['SE', 'SW'],
  'Merton': ['SW', 'SM', 'CR'],
  'South Gloucestershire': ['BS'],
  'East Sussex CC': ['BN', 'TN'],
  'Norfolk CC': ['NR', 'PE', 'IP'],
  'Kent CC': ['ME', 'CT', 'TN', 'DA'],
  'Cornwall': ['TR', 'PL'],
  'Southwark': ['SE'],
  'Hertfordshire CC': ['AL', 'EN', 'HP', 'SG', 'WD'],
  'Buckinghamshire': ['HP', 'MK', 'SL'],
  'North Yorkshire': ['YO', 'HG', 'DL'],
  'Bradford': ['BD'],
  'Liverpool': ['L'],
  'Croydon': ['CR', 'SE'],
  'Coventry': ['CV'],
  'Essex CC': ['CM', 'SS', 'CO', 'IG', 'RM'],
  'West Sussex CC': ['BN', 'RH', 'PO'],
  'Greater London Authority': ['E', 'EC', 'N', 'NW', 'SE', 'SW', 'W', 'WC']
};

// Skip patterns — these are not companies
const SKIP_PATTERNS = [
  /^NHS /i, /NHS$/i, /Foundation Trust/i, /^HM /i,
  /Council$/i, /Borough/i, /County Council/i,
  /Police/i, /Constabulary/i, /Fire (and|&) Rescue/i,
  /^Department /i, /^Ministry /i, /^HMRC$/i,
  /^Other \(/i, /^REDACTED$/i, /^Unknown$/i
];

function shouldSkip(name) {
  return SKIP_PATTERNS.some(p => p.test(name));
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function searchCompany(name) {
  return new Promise((resolve) => {
    const q = encodeURIComponent(name.slice(0, 100));
    const url = `/search/companies?q=${q}&items_per_page=1`;
    const auth = Buffer.from(CH_API_KEY + ':').toString('base64');

    const req = https.get({
      hostname: 'api.company-information.service.gov.uk',
      path: url,
      headers: { 'Authorization': 'Basic ' + auth }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          if (res.statusCode === 429) { resolve({ _retry: true }); return; }
          if (res.statusCode !== 200) { resolve(null); return; }
          const j = JSON.parse(data);
          const item = j.items?.[0];
          if (!item) { resolve(null); return; }

          // Check name similarity (basic)
          const a = name.toUpperCase().replace(/[^A-Z0-9]/g, '');
          const b = (item.title || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
          const shorter = Math.min(a.length, b.length);
          const longer = Math.max(a.length, b.length);
          // Check if one starts with the other or they share >60% of chars
          const startMatch = a.startsWith(b.slice(0, Math.floor(shorter * 0.6))) ||
                             b.startsWith(a.slice(0, Math.floor(shorter * 0.6)));
          if (!startMatch && shorter / longer < 0.5) { resolve(null); return; }

          const addr = item.registered_office_address || item.address || {};
          resolve({
            postcode: addr.postal_code || null,
            locality: addr.locality || null,
            company_type: item.company_type || null,
            status: item.company_status || null,
            ch_name: item.title
          });
        } catch (e) { resolve(null); }
      });
    });
    req.on('error', () => resolve(null));
    req.setTimeout(10000, () => { req.destroy(); resolve(null); });
  });
}

async function main() {
  const treePath = path.join(UK_DIR, `uk_budget_tree_${YEAR}.json`);
  const tree = JSON.parse(fs.readFileSync(treePath, 'utf8'));

  // Load cache
  let cache = {};
  if (fs.existsSync(CACHE_FILE)) {
    cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    console.log(`Loaded cache: ${Object.keys(cache).length} suppliers`);
  }

  // Extract all unique supplier names from tree
  const supplierNames = new Set();
  const councilForSupplier = new Map(); // track which council uses each supplier
  function walkCollect(n, councilName) {
    if (n._top_suppliers?.suppliers) {
      n._top_suppliers.suppliers.forEach(s => {
        if (s.name && !s.name.startsWith('Other (')) {
          supplierNames.add(s.name);
          if (!councilForSupplier.has(s.name)) councilForSupplier.set(s.name, councilName);
        }
      });
    }
    (n.children || []).forEach(c => walkCollect(c, councilName || n.name));
  }

  const lg = tree.children.find(c => c.id === 'local_government_england');
  if (lg) {
    lg.children.forEach(cls => cls.children.forEach(council => {
      (council.children || []).forEach(s => walkCollect(s, council.name));
    }));
  }

  console.log(`Unique suppliers in tree: ${supplierNames.size}`);

  // Determine which need API calls
  const toFetch = [];
  let skippedPublic = 0, cached = 0;
  for (const name of supplierNames) {
    if (cache[name]) { cached++; continue; }
    if (shouldSkip(name)) {
      cache[name] = { postcode: null, company_type: 'public_body', status: 'active', ch_name: null, _skipped: true };
      skippedPublic++;
      continue;
    }
    toFetch.push(name);
  }

  console.log(`Cached: ${cached}, Public bodies skipped: ${skippedPublic}, To fetch: ${toFetch.length}`);

  if (DRY_RUN) {
    console.log('\nDry run — sample of suppliers to fetch:');
    toFetch.slice(0, 20).forEach(n => console.log('  ', n));
    if (toFetch.length > 20) console.log(`  ... and ${toFetch.length - 20} more`);
    console.log(`\nEstimated time: ${Math.ceil(toFetch.length * 0.12 / 60)} minutes`);
    return;
  }

  // Fetch from Companies House
  let fetched = 0, found = 0, notFound = 0;
  for (const name of toFetch) {
    const result = await searchCompany(name);
    if (result?._retry) {
      console.log('  Rate limited, waiting 5s...');
      await sleep(5000);
      const retry = await searchCompany(name);
      if (retry && !retry._retry) {
        cache[name] = retry;
        if (retry.postcode) found++; else notFound++;
      } else {
        cache[name] = { postcode: null, company_type: null, status: null, ch_name: null };
        notFound++;
      }
    } else if (result) {
      cache[name] = result;
      if (result.postcode) found++; else notFound++;
    } else {
      cache[name] = { postcode: null, company_type: null, status: null, ch_name: null };
      notFound++;
    }
    fetched++;
    if (fetched % 100 === 0) {
      process.stdout.write(`  ${fetched}/${toFetch.length} (${found} found, ${notFound} not found)\n`);
      // Save cache periodically
      fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
    }
    await sleep(110);
  }

  // Final cache save
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
  console.log(`\nFetched: ${fetched}, Found postcode: ${found}, Not found: ${notFound}`);
  console.log(`Cache total: ${Object.keys(cache).length} suppliers`);

  // Apply to tree
  let enriched = 0;
  function walkApply(n, councilName) {
    if (n._top_suppliers?.suppliers) {
      for (const sup of n._top_suppliers.suppliers) {
        const entry = cache[sup.name];
        if (!entry) continue;
        if (entry.postcode) {
          sup._postcode = entry.postcode;
          enriched++;
          // Check if local
          const prefixes = COUNCIL_POSTCODES[councilName] || [];
          if (prefixes.length > 0) {
            const pc = entry.postcode.toUpperCase();
            sup._local = prefixes.some(p => pc.startsWith(p));
          }
        }
        if (entry.company_type) sup._company_type = entry.company_type;
      }
    }
    (n.children || []).forEach(c => walkApply(c, councilName));
  }

  if (lg) {
    lg.children.forEach(cls => cls.children.forEach(council => {
      (council.children || []).forEach(s => walkApply(s, council.name));
    }));
  }

  fs.writeFileSync(treePath, JSON.stringify(tree, null, 2));
  console.log(`\n✓ Enriched ${enriched} supplier entries with postcode/geo`);
  console.log(`✓ Written to uk_budget_tree_${YEAR}.json`);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
