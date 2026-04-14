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

function normalizeName(n) {
  return String(n)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim();
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
// Strict matcher: exact match OR "X CC" (shire county suffix). No first-word
// match — that was overmatching Police/Fire authorities with the same prefix.
for (const cls of lg.children) {
  for (const council of cls.children) {
    let entry = null;
    const norm = normalizeName(council.name);
    for (const [key, e] of Object.entries(lookup)) {
      const keyNorm = normalizeName(key);
      if (norm === keyNorm || norm === keyNorm + ' CC') {
        entry = e;
        break;
      }
    }
    if (!entry) continue;

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
