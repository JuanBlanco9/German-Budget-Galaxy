#!/usr/bin/env node
/**
 * inject_ca_spend_metadata.js
 *
 * Attaches `_top_suppliers` metadata to Combined Authority tree nodes
 * (GMCA, WMCA, WYCA) — but unlike councils which attach per-service,
 * CAs attach at the PARENT node. The CA chart-of-accounts is economic
 * (Capital / Supplies / Premises / Pay) not functional (Education /
 * Transport / etc.), so per-service classification systematically
 * mis-buckets >40% of the spend.
 *
 * This is the DHSC L5 pattern (see inject_dhsc_l5_suppliers.js):
 * aggregate all suppliers into a single top-N list, attach to the
 * parent entity, document the aggregation in the coverage_note.
 *
 * Read path:
 *   council_spend_lookup_{year}.json  (produced by build_council_spend_lookup.js)
 *
 * Write target (per CA):
 *   tree → Local Government (England) → Other Authorities → {CA name}
 *     ._top_suppliers = { spend_total, suppliers: [...], coverage_note, ... }
 *
 * Idempotency: skips if node already has _top_suppliers (unless --force).
 *
 * Usage: node scripts/inject_ca_spend_metadata.js [--dry-run] [--force] [--year 2024]
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
const YEAR = args.find(a => a.match(/^\d{4}$/)) || '2024';

const TOP_N = 15;

// Map from lookup key → exact tree node name.
// Includes CAs (under Other Authorities) AND councils whose classifier
// mapped everything to "Other Services" (single-bucket failure mode).
// For these councils, parent-level attachment is more useful than
// trying to force per-service attribution that doesn't match.
const CA_NODE_MAP = {
  'Greater Manchester Combined Authority': 'Greater Manchester Combined Authority',
  'West Midlands Combined Authority': 'West Midlands Combined Authority',
  'West Yorkshire Combined Authority': 'West Yorkshire Combined Authority',
  'Knowsley Metropolitan Borough Council': 'Knowsley',
  'Oldham Metropolitan Borough Council': 'Oldham',
  'St Helens Metropolitan Borough Council': 'St Helens MBC'
};

function readJSON(fp) { return JSON.parse(fs.readFileSync(fp, 'utf8')); }
function writeJSON(fp, data) {
  if (DRY_RUN) { console.log(`  [DRY RUN] Would write ${fp}`); return; }
  fs.writeFileSync(fp, JSON.stringify(data, null, 2), 'utf8');
}
function backup(fp) {
  if (!fs.existsSync(fp) || DRY_RUN) return;
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const stamp = new Date().toISOString().slice(0, 10);
  const dest = path.join(BACKUP_DIR, path.basename(fp).replace('.json', `.pre_ca_inject_${stamp}.json`));
  if (!fs.existsSync(dest)) {
    fs.copyFileSync(fp, dest);
    console.log(`  Backed up → ${path.relative(DATA_DIR, dest)}`);
  }
}

function normalizeName(n) {
  return String(n).toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();
}

function findNode(root, targetName) {
  const tgt = normalizeName(targetName);
  let found = null;
  function walk(n) {
    if (found) return;
    if (n.name && normalizeName(n.name) === tgt) { found = n; return; }
    for (const c of (n.children || [])) walk(c);
  }
  walk(root);
  return found;
}

// Flatten all services of a CA lookup entry into one combined supplier list.
// Dedupes by normalized supplier name, sums amounts across services.
function flattenSuppliers(entry) {
  const combined = {};
  let spendTotal = 0;
  let txCount = 0;
  for (const [svcName, svc] of Object.entries(entry.services || {})) {
    spendTotal += svc.service_total_in_spend_data || 0;
    txCount += svc.transaction_count || 0;
    for (const sup of (svc.top_suppliers || [])) {
      // Ignore the synthetic "Other (N suppliers)" rows that build_council_spend_lookup
      // creates per service — we aggregate raw top suppliers across services.
      if (/^Other \(\d+ suppliers\)$/.test(sup.name)) continue;
      const norm = normalizeName(sup.name);
      if (!combined[norm]) {
        combined[norm] = { name: sup.name, amount: 0, transactions: 0, services: new Set() };
      }
      combined[norm].amount += sup.amount || 0;
      combined[norm].transactions += sup.transactions || 0;
      combined[norm].services.add(svcName);
    }
  }
  const ranked = Object.values(combined).sort((a, b) => b.amount - a.amount);
  const topN = ranked.slice(0, TOP_N).map(s => ({
    name: s.name,
    amount: Math.round(s.amount),
    pct: spendTotal > 0 ? parseFloat((s.amount / spendTotal * 100).toFixed(1)) : 0,
    transactions: s.transactions
  }));
  const otherAmt = ranked.slice(TOP_N).reduce((s, x) => s + x.amount, 0);
  if (otherAmt > 0) {
    topN.push({
      name: `Other (${ranked.length - TOP_N} suppliers)`,
      amount: Math.round(otherAmt),
      pct: spendTotal > 0 ? parseFloat((otherAmt / spendTotal * 100).toFixed(1)) : 0,
      transactions: 0
    });
  }
  return {
    spend_total: Math.round(spendTotal),
    transaction_count: txCount,
    unique_suppliers: ranked.length,
    suppliers: topN
  };
}

// ─── Main ─────────────────────────────────────────────

console.log('Inject Combined Authority Spend Metadata');
console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}  Force: ${FORCE}  Year: ${YEAR}\n`);

const treePath = path.join(UK_DIR, `uk_budget_tree_${YEAR}.json`);
const lookupPath = path.join(SPEND_DIR, `council_spend_lookup_${YEAR}.json`);

if (!fs.existsSync(treePath)) { console.error('Missing tree:', treePath); process.exit(1); }
if (!fs.existsSync(lookupPath)) { console.error('Missing lookup:', lookupPath); process.exit(1); }

const tree = readJSON(treePath);
const lookup = readJSON(lookupPath);

let attached = 0, skipped = 0, missing = 0;

for (const [lookupKey, nodeName] of Object.entries(CA_NODE_MAP)) {
  const entry = lookup[lookupKey];
  if (!entry) {
    console.log(`  ${lookupKey}: NOT IN LOOKUP — skipped`);
    missing++;
    continue;
  }

  const node = findNode(tree, nodeName);
  if (!node) {
    console.log(`  ${lookupKey}: tree node "${nodeName}" NOT FOUND — skipped`);
    missing++;
    continue;
  }

  if (node._top_suppliers && !FORCE) {
    console.log(`  ${lookupKey}: already has _top_suppliers — skipped (use --force to override)`);
    skipped++;
    continue;
  }

  const flattened = flattenSuppliers(entry);
  const nodeValueM = (node.value / 1e6).toFixed(0);
  const spendM = (flattened.spend_total / 1e6).toFixed(0);
  const ratio = (flattened.spend_total / node.value).toFixed(2);

  node._top_suppliers = {
    ...flattened,
    source: entry.source,
    source_url: entry.source_url || null,
    archive_url: entry.archive_url || null,
    captured_at: entry.captured_at || null,
    fy_label: entry.fy_label,
    coverage_note: `Combined Authority spend > £500 aggregated across ALL services. This is a parent-level view (not per-service) because the CA chart of accounts is economic (Capital / Supplies / Premises / Pay) rather than functional. The total here (£${spendM}M) ${ratio >= 1 ? 'exceeds' : 'is below'} the MHCLG node value (£${nodeValueM}M) — ratio ${ratio}x. Typical differences: spend data includes capital + pass-through transfers to functional bodies (e.g. TfGM operating funding for GMCA) and excludes sub-£500 payments. Use this supplier list as context for where the money flows, not as a reconciliation of the tree value.`,
    view_scope: 'parent_aggregate',
    parent_node_value: node.value,
    coverage_ratio: parseFloat(ratio)
  };

  console.log(`  ${lookupKey}:`);
  console.log(`    node value: £${nodeValueM}M, spend total: £${spendM}M, ratio ${ratio}x`);
  console.log(`    ${flattened.unique_suppliers} unique suppliers, top ${Math.min(TOP_N, flattened.suppliers.length)} attached`);
  console.log(`    top 3: ${flattened.suppliers.slice(0, 3).map(s => s.name + ' £' + (s.amount/1e6).toFixed(1) + 'M').join(', ')}`);
  attached++;
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

console.log(`\nResults: ${attached} attached, ${skipped} skipped, ${missing} missing`);
console.log(`Tree integrity: ${drift === 0 ? '✓ unchanged' : '✗ ' + drift + ' drifts (BUG — investigate)'}`);

if (attached > 0) {
  backup(treePath);
  writeJSON(treePath, tree);
  console.log(`\n${DRY_RUN ? '[DRY RUN]' : '✓'} Written to ${path.basename(treePath)}`);
} else {
  console.log('\nNothing to write.');
}
