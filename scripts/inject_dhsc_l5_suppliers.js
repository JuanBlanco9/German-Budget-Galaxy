#!/usr/bin/env node
/**
 * inject_dhsc_l5_suppliers.js
 *
 * Attaches `_top_suppliers` metadata to the DHSC tree node using the existing
 * data/recipients/uk/l5_department_of_health_2024.json file.
 *
 * The L5 file contains 23 segments (NHS regions + DHSC directorates) with
 * top recipients per segment. We flatten the top recipients across ALL segments
 * to produce a single top-N list for the DHSC node, plus a per-segment summary.
 *
 * Output: tree DHSC node gains `_top_suppliers` metadata in the same shape as
 * Camden councils (for the existing renderCouncilSuppliersPanel frontend hook).
 *
 * The DHSC parent value is post-netting £83.4B (after v13 NHS provider netting
 * + OSCAR 2023 fix). The L5 file's £138B total represents the gross
 * commissioning view BEFORE netting — we disclose this clearly in the
 * coverage_note so users understand why the supplier total exceeds the parent.
 *
 * Idempotency: skips if DHSC._top_suppliers already exists.
 *
 * Usage: node scripts/inject_dhsc_l5_suppliers.js [--dry-run] [--year 2024]
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const UK_DIR = path.join(DATA_DIR, 'uk');
const RECIP_DIR = path.join(DATA_DIR, 'recipients', 'uk');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
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
  const dest = path.join(BACKUP_DIR, path.basename(fp).replace('.json', `.pre_v17c_${stamp}.json`));
  if (!fs.existsSync(dest)) {
    fs.copyFileSync(fp, dest);
    console.log(`  Backed up → ${path.relative(DATA_DIR, dest)}`);
  }
}

// Normalize recipient names to merge duplicates
function normalize(name) {
  return String(name)
    .toUpperCase()
    .replace(/[.,'""]/g, '')
    .replace(/&/g, 'AND')
    .replace(/\b(LIMITED|LTD|PLC|LLP|INC|CORP|CORPORATION|COMPANY|CO)\b/g, '')
    .replace(/[^A-Z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── Main ─────────────────────────────────────────────

console.log('Inject DHSC L5 suppliers metadata');
console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
console.log(`Year: ${YEAR}\n`);

const treePath = path.join(UK_DIR, `uk_budget_tree_${YEAR}.json`);
const l5Path = path.join(RECIP_DIR, 'l5_department_of_health_2024.json');

if (!fs.existsSync(l5Path)) {
  console.error('Missing:', l5Path);
  process.exit(1);
}

const tree = readJSON(treePath);
const l5 = readJSON(l5Path);

console.log('L5 file:');
console.log(`  Source: ${l5.source}`);
console.log(`  Total spend25k: £${(l5.total_spend25k/1e9).toFixed(1)}B`);
console.log(`  Months: ${l5.months_covered}`);
console.log(`  Segments: ${l5.segments.length}\n`);

const dhsc = tree.children.find(c => c.id === 'department_of_health');
if (!dhsc) { console.error('DHSC node not found'); process.exit(1); }

if (dhsc._top_suppliers) {
  console.log('  SKIP: DHSC already has _top_suppliers');
  process.exit(0);
}

// Aggregate ALL recipients across ALL segments, deduplicated by normalized name
const allRecipients = {};
let totalAggregated = 0;
let segmentSummaries = [];
let totalTransactions = 0;

for (const seg of l5.segments) {
  totalAggregated += seg.total || 0;
  totalTransactions += seg.transactions || 0;
  segmentSummaries.push({
    name: seg.segment,
    total: seg.total,
    recipient_count: (seg.top_recipients || []).length
  });
  for (const r of (seg.top_recipients || [])) {
    const norm = normalize(r.name);
    if (!allRecipients[norm]) {
      allRecipients[norm] = { name: r.name, amount: 0, segments: new Set() };
    }
    allRecipients[norm].amount += (r.amount || 0);
    allRecipients[norm].segments.add(seg.segment);
  }
}

// Sort by amount, take top 15
const allList = Object.values(allRecipients).sort((a, b) => b.amount - a.amount);
const top15 = allList.slice(0, 15).map(r => ({
  name: r.name,
  amount: Math.round(r.amount),
  pct: parseFloat((r.amount / totalAggregated * 100).toFixed(1)),
  segments: [...r.segments].slice(0, 3).join(', '),
  transactions: 0  // L5 doesn't track per-recipient txn count
}));

// "Other" bucket
const otherAmt = allList.slice(15).reduce((s, r) => s + r.amount, 0);
if (otherAmt > 0) {
  top15.push({
    name: `Other (${allList.length - 15} suppliers across all segments)`,
    amount: Math.round(otherAmt),
    pct: parseFloat((otherAmt / totalAggregated * 100).toFixed(1)),
    segments: '',
    transactions: 0
  });
}

console.log(`Aggregated ${allList.length} unique recipients across all segments`);
console.log(`Total recipient amounts: £${(totalAggregated/1e9).toFixed(1)}B`);
console.log(`Total transactions: ${totalTransactions.toLocaleString('en-GB')}\n`);

console.log('Top 15 recipients:');
top15.slice(0, 15).forEach(r => {
  console.log(`  £${(r.amount/1e9).toFixed(2).padStart(6)}B  ${r.pct.toString().padStart(5)}%  ${r.name}`);
});

// Attach metadata to DHSC node
dhsc._top_suppliers = {
  spend_total: totalAggregated,
  transaction_count: totalTransactions,
  unique_suppliers: allList.length,
  suppliers: top15,
  source: l5.source || 'NHS England ICB Allocations 2024-25 + DHSC Spending Over £25,000',
  fy_label: '2024/25',
  coverage_note: `These are payments captured by DHSC's Spending Over £25,000 transparency disclosure plus NHS England ICB allocations. Total £${(totalAggregated/1e9).toFixed(0)}B exceeds the visible DHSC node value (£${(dhsc.value/1e9).toFixed(0)}B) because the DHSC node has been netted against the NHS Provider Sector top-level node to avoid double-counting (see methodology). The supplier list is the GROSS commissioning view before netting — useful for seeing where money flows, not for reconciling to the visible total.`
};

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
console.log(`\nTree integrity: ${drift === 0 ? '✓ unchanged' : '✗ ' + drift + ' drifts (BUG)'}`);

backup(treePath);
writeJSON(treePath, tree);
console.log(`\n${DRY_RUN ? '[DRY RUN]' : '✓'} Written to ${path.basename(treePath)}`);
