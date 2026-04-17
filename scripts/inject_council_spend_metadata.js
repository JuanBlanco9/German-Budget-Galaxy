#!/usr/bin/env node
/**
 * inject_council_spend_metadata.js
 *
 * Attaches `_top_suppliers` metadata to council service nodes from the
 * council_spend_lookup_{year}.json. This is METADATA only — no tree
 * children are added, no values change. The frontend Budget Explorer
 * reads `_top_suppliers` and renders an info panel.
 *
 * Why metadata, not children:
 *   Spend > £500 transparency data uses a different accounting basis
 *   than MHCLG net current expenditure (it includes capital, transfers,
 *   payroll, but excludes payments below the £500 threshold). The two
 *   totals do not reconcile and cannot be inserted as a sub-tree that
 *   sums to the MHCLG service value.
 *
 * Metadata schema written to each service node:
 *   _top_suppliers: {
 *     spend_total: number,            // total in spend > £500 dataset for this service
 *     transaction_count: number,
 *     unique_suppliers: number,
 *     suppliers: [{name, amount, pct, transactions}, ...],  // top 10 + Other
 *     source: string,                 // source attribution
 *     fy_label: string,               // "2023/24"
 *     coverage_note: string           // explains why total may differ from parent
 *   }
 *
 * Idempotency: skips if _top_suppliers already exists.
 *
 * Usage: node scripts/inject_council_spend_metadata.js [--dry-run] [--year 2024]
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const UK_DIR = path.join(DATA_DIR, 'uk');
const LA_DIR = path.join(UK_DIR, 'local_authorities');
const SPEND_DIR = path.join(LA_DIR, 'spend');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const FORCE = args.includes('--force');
const CLEAR = args.includes('--clear');
const YEAR = args.find(a => a.match(/^\d{4}$/)) || '2024';

function readJSON(fp) { return JSON.parse(fs.readFileSync(fp, 'utf8')); }
function writeJSON(fp, data) {
  if (DRY_RUN) { console.log(`  [DRY RUN] Would write ${fp}`); return; }
  fs.writeFileSync(fp, JSON.stringify(data, null, 2), 'utf8');
}
function backup(fp) {
  if (!fs.existsSync(fp) || DRY_RUN) return;
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const stamp = new Date().toISOString().slice(0, 10);
  const dest = path.join(BACKUP_DIR, path.basename(fp).replace('.json', `.pre_v17b_${stamp}.json`));
  if (!fs.existsSync(dest)) {
    fs.copyFileSync(fp, dest);
    console.log(`  Backed up → ${path.relative(DATA_DIR, dest)}`);
  }
}

// Hard-coded aliases for councils whose tree name and lookup key diverge
// beyond what normalisation can reconcile (abbreviations, re-namings).
const NAME_ALIASES = {
  'BCP COUNCIL': 'BOURNEMOUTH CHRISTCHURCH AND POOLE',
  'CITY OF YORK COUNCIL': 'YORK',
  'COUNTY DURHAM COUNCIL': 'DURHAM',
  'COUNCIL OF THE ISLES OF SCILLY': 'ISLES OF SCILLY',
  'KINGSTON UPON HULL CITY COUNCIL': 'KINGSTON UPON HULL',
  'WIGAN METROPOLITAN BOROUGH COUNCIL': 'WIGAN',
  'OLDHAM METROPOLITAN BOROUGH COUNCIL': 'OLDHAM',
  'KNOWSLEY METROPOLITAN BOROUGH COUNCIL': 'KNOWSLEY',
  'ST HELENS METROPOLITAN BOROUGH COUNCIL': 'ST HELENS',
  'SEFTON METROPOLITAN BOROUGH COUNCIL': 'SEFTON',
  'KIRKLEES METROPOLITAN BOROUGH COUNCIL': 'KIRKLEES',
  'SOUTH TYNESIDE METROPOLITAN BOROUGH COUNCIL': 'SOUTH TYNESIDE',
  'NORTH TYNESIDE METROPOLITAN BOROUGH COUNCIL': 'NORTH TYNESIDE',
  'BLACKPOOL COUNCIL': 'BLACKPOOL',
  'WAKEFIELD METROPOLITAN DISTRICT COUNCIL': 'WAKEFIELD',
  'TELFORD AND WREKIN COUNCIL': 'TELFORD AND THE WREKIN',
  'RICHMOND': 'RICHMOND UPON THAMES',
  'DERBY CITY COUNCIL': 'DERBY CITY',
  'CITY OF WOLVERHAMPTON COUNCIL': 'WOLVERHAMPTON',
  'LEICESTER CITY COUNCIL': 'LEICESTER CITY',
  'NOTTINGHAM CITY COUNCIL': 'NOTTINGHAM CITY',
  'MEDWAY COUNCIL': 'MEDWAY TOWNS',
  'NEWCASTLE UPON TYNE CITY COUNCIL': 'NEWCASTLE',
  'PLYMOUTH CITY COUNCIL': 'PLYMOUTH',
  'BEDFORD BOROUGH COUNCIL': 'BEDFORD',
  'STOCKTON-ON-TEES BOROUGH COUNCIL': 'STOCKTON ON TEES',
  'DARLINGTON BOROUGH COUNCIL': 'DARLINGTON',
  'HALTON BOROUGH COUNCIL': 'HALTON',
  'REDCAR AND CLEVELAND BOROUGH COUNCIL': 'REDCAR AND CLEVELAND',
  'SOUTHAMPTON CITY COUNCIL': 'SOUTHAMPTON',
  'LEICESTERSHIRE COUNTY COUNCIL': 'LEICESTERSHIRE',
  'EAST RIDING OF YORKSHIRE COUNCIL': 'EAST RIDING OF YORKSHIRE'
};

function normalizeName(n) {
  let s = String(n).toUpperCase().replace(/&/g, 'AND');
  if (NAME_ALIASES[s.trim()]) return NAME_ALIASES[s.trim()];
  return s
    .replace(/\bMETROPOLITAN BOROUGH COUNCIL\b/g, '')
    .replace(/\bMETROPOLITAN DISTRICT COUNCIL\b/g, '')
    .replace(/\bCOUNTY COUNCIL\b/g, '')
    .replace(/\bCITY COUNCIL\b/g, '')
    .replace(/\bBOROUGH COUNCIL\b/g, '')
    .replace(/\bDISTRICT COUNCIL\b/g, '')
    .replace(/\bCOUNCIL\b/g, '')
    .replace(/\bROYAL BOROUGH OF\b/g, '')
    .replace(/\bLONDON BOROUGH OF\b/g, '')
    .replace(/\bCC\b/g, '')
    .replace(/\bMBC\b/g, '')
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim();
}

// Marker-token exclusion: if one side has "POLICE"/"COMBINED AUTHORITY" etc
// and the other does not, they're different entities.
const INJECT_MARKERS = ['POLICE', 'PCC', 'CONSTABULARY', 'COMBINED AUTHORITY', 'MAYOR', 'MAYORAL', 'FIRE', 'WASTE'];
function markersDiverge(a, b) {
  for (const m of INJECT_MARKERS) {
    const rx = new RegExp('(?:^|\\s)' + m + '(?:\\s|$)');
    if (rx.test(a) !== rx.test(b)) return true;
  }
  return false;
}

// ─── Main ─────────────────────────────────────────────

console.log('Inject Council Spend Metadata');
console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
console.log(`Year: ${YEAR}\n`);

const treePath = path.join(UK_DIR, `uk_budget_tree_${YEAR}.json`);
const lookupPath = path.join(SPEND_DIR, `council_spend_lookup_${YEAR}.json`);

const tree = readJSON(treePath);
const lookup = readJSON(lookupPath);
console.log(`Loaded ${Object.keys(lookup).length} councils with spend data\n`);

const lg = tree.children.find(c => c.id === 'local_government_england');
if (!lg) { console.error('local_government_england not found'); process.exit(1); }

let councilsAttached = 0;
let servicesAttached = 0;
let alreadyHas = 0;
const matchedLookupKeys = new Set();

// Optional: clear all existing _top_suppliers first (--clear)
if (CLEAR) {
  let cleared = 0;
  function clearWalk(n) {
    if (n._top_suppliers) { delete n._top_suppliers; cleared++; }
    (n.children || []).forEach(clearWalk);
  }
  clearWalk(tree);
  console.log(`Cleared ${cleared} existing _top_suppliers entries\n`);
}

// Walk: for each council node, see if its name matches any in the lookup.
// Matcher: after normalising both sides (strip "Council", "County Council",
// "Royal Borough of", "CC" suffix, etc), require EXACT equality. Substring
// matching over-matches shire districts to their parent county (e.g.
// "CAMBRIDGE" ⊂ "CAMBRIDGESHIRE"). Marker tokens guard cross-category
// matches (Hampshire county vs Hampshire Police).
for (const cls of lg.children) {
  for (const council of cls.children) {
    let entry = null;
    let matchedKey = null;
    const norm = normalizeName(council.name);
    if (!norm || norm.length < 4) continue;
    for (const [key, e] of Object.entries(lookup)) {
      const keyNorm = normalizeName(key);
      if (!keyNorm || keyNorm.length < 4) continue;
      if (markersDiverge(norm, keyNorm)) continue;
      if (norm === keyNorm) { entry = e; matchedKey = key; break; }
    }
    if (!entry) continue;
    matchedLookupKeys.add(matchedKey);

    let attachedHere = 0;
    for (const serviceNode of council.children || []) {
      const svcName = serviceNode.name;
      const svcData = entry.services[svcName];
      if (!svcData) continue;
      if (serviceNode._top_suppliers && !FORCE) { alreadyHas++; continue; }

      // Source URL + Wayback archive URL: per-service overrides (needed for
      // GLA where each service maps to a different publisher) fall back to
      // council-level. archive_url + captured_at come from archive_sources.js.
      const source_url = svcData.source_url || entry.source_url || null;
      const archive_url = svcData.archive_url || entry.archive_url || null;
      const captured_at = svcData.captured_at || entry.captured_at || null;

      serviceNode._top_suppliers = {
        spend_total: svcData.service_total_in_spend_data,
        transaction_count: svcData.transaction_count,
        unique_suppliers: svcData.unique_suppliers,
        suppliers: svcData.top_suppliers,
        source: entry.source,
        source_url,
        archive_url,
        captured_at,
        fy_label: entry.fy_label,
        coverage_note: 'These are payments captured by the council\'s Spend Over £500 transparency disclosure. The total here may not equal the MHCLG service value above because spend data includes capital and transfers but excludes payments below the £500 threshold. Use these as supplier-level context, not as a reconciled sub-budget.'
      };
      attachedHere++;
      servicesAttached++;
    }
    if (attachedHere > 0) {
      councilsAttached++;
      console.log(`  ${council.name}: attached _top_suppliers to ${attachedHere} service nodes`);
    }
  }
}

console.log(`\nResults:`);
console.log(`  Councils attached: ${councilsAttached}`);
console.log(`  Service nodes attached: ${servicesAttached}`);
console.log(`  Already had metadata: ${alreadyHas}`);

// Name-resolution check: find lookup entries that didn't match any tree node.
// Three known instances historically (Wigan MBC, Wakefield, Telford) where
// silent miss → wrong tree shipped because operator missed "0 attached" log.
// Suggest closest LG-England council names via Levenshtein so the fix
// (NAME_ALIAS or rename in lookup) is one edit.
function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const al = a.toLowerCase(), bl = b.toLowerCase();
  const v0 = new Array(bl.length + 1), v1 = new Array(bl.length + 1);
  for (let i = 0; i <= bl.length; i++) v0[i] = i;
  for (let i = 0; i < al.length; i++) {
    v1[0] = i + 1;
    for (let j = 0; j < bl.length; j++) {
      const cost = al[i] === bl[j] ? 0 : 1;
      v1[j + 1] = Math.min(v1[j] + 1, v0[j + 1] + 1, v0[j] + cost);
    }
    for (let j = 0; j <= bl.length; j++) v0[j] = v1[j];
  }
  return v0[bl.length];
}

const lgCouncilNames = [];
for (const cls of lg.children) for (const c of (cls.children || [])) lgCouncilNames.push(c.name);

// Known orphans: lookup entries that legitimately have no LG-England tree node
// (e.g. tree-base bugs awaiting separate fix). Listed here to document the gap
// AND keep the warning loud — every run reminds the operator. Unknown orphans
// (not in this set) still hard-fail.
const KNOWN_ORPHANS = new Set([
  // Empty. Birmingham was previously here (s114 bankruptcy → not_submitted in
  // RO5 returns) but is now in the tree via the fallback chain in
  // replace_oscar_lg.js (uses 202303 data tagged _estimated_source_year).
]);

const orphanLookupKeys = Object.keys(lookup).filter(k => !matchedLookupKeys.has(k));
const unknownOrphans = orphanLookupKeys.filter(k => !KNOWN_ORPHANS.has(k));
const knownOrphansFound = orphanLookupKeys.filter(k => KNOWN_ORPHANS.has(k));

if (knownOrphansFound.length > 0) {
  console.log(`\n⚠ ${knownOrphansFound.length} known orphan(s) — documented gap, no fix in this script:`);
  for (const key of knownOrphansFound) console.log(`    "${key}"`);
}

if (unknownOrphans.length > 0) {
  console.log(`\n✗ ${unknownOrphans.length} UNKNOWN orphan(s) — lookup entries with no matching tree node:`);
  for (const key of unknownOrphans) {
    const closest = lgCouncilNames
      .map(n => ({ n, d: levenshtein(key, n) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, 3)
      .map(x => `"${x.n}" (d=${x.d})`);
    console.log(`    "${key}"`);
    console.log(`        closest tree nodes: ${closest.join(', ')}`);
    console.log(`        fix: add NAME_ALIAS in injector OR add to KNOWN_ORPHANS if intentional`);
  }
  console.log(`\n✗ Refusing to write tree — fix unknown orphans above.`);
  process.exit(1);
}

// Tree integrity (should be unchanged — metadata only)
let drift = 0;
function walk(n) {
  if (n.children && n.children.length > 0) {
    const sum = n.children.reduce((s, c) => s + (c.value || 0), 0);
    if (Math.abs(sum - n.value) > 0) drift++;
    n.children.forEach(walk);
  }
}
walk(tree);
console.log(`Tree integrity: ${drift === 0 ? '✓ unchanged' : '✗ ' + drift + ' drifts (BUG)'}`);

backup(treePath);
writeJSON(treePath, tree);
console.log(`\n${DRY_RUN ? '[DRY RUN]' : '✓'} Written to ${path.basename(treePath)}`);
