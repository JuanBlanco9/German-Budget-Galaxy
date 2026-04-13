#!/usr/bin/env node
/**
 * fix_oscar_na_bucket.js
 *
 * Removes the OSCAR II "n/a" NHS Trusts sub-bucket from the UK budget
 * tree for FY 2019/20, 2020/21, and 2021/22 (tree years 2020, 2021, 2022).
 *
 * BACKGROUND
 * ──────────
 * OSCAR II records DHSC > NHS Trusts as two siblings:
 *
 *   7.A Medical services    ← real provider operating spend, matches
 *                             TAC EXP0390 within ~1-2% across all years
 *
 *   n/a                     ← OSCAR II accounting artifact, same role as
 *                             the "Non-patient-facing NHS expenditure"
 *                             bucket removed from 2023 by
 *                             fix_oscar_2023_nhs.js, but with a different
 *                             parent label
 *
 * The `n/a` bucket grows year-over-year (£100B → £97B → £105B → £114B for
 * 2020 → 2021 → 2022 → 2023) and does not reconcile with any published
 * ground-truth number. It is structurally a duplication of the medical
 * services spend viewed from a different accounting angle.
 *
 * DIFFERENCE FROM fix_oscar_2023_nhs.js
 * ──────────────────────────────────────
 * The 2023 fix removed a named sub-node ("Non-patient-facing NHS
 * expenditure") from inside DHSC > NHS Trusts > n/a. That sub-node
 * existed alongside other real-spend items in the n/a bucket for 2023.
 *
 * For 2020-2022, the n/a bucket IS the artifact — there are no
 * real-spend items inside it alongside the duplication. We drop the
 * whole bucket.
 *
 * IDEMPOTENCY
 * ───────────
 * Sets _na_bucket_removed=true on the NHS Trusts node. Skips if set.
 *
 * PIPELINE ORDER
 * ──────────────
 * Must run BEFORE net_nhs_overlap.js because net_nhs_overlap DELETES
 * the children array of DHSC > NHS Trusts (it shrinks the node to a
 * scalar residual value). By the time netting has run, the n/a bucket
 * would already be gone and this script would abort with "n/a bucket
 * not found".
 *
 * The canonical pipeline order for a fresh year is:
 *
 *   1. fix_oscar_na_bucket.js   --year YYYY   (OSCAR II artifact removal)
 *   2. inject_nhs_trusts.js     --year YYYY   (add NHS Provider Sector)
 *   3. net_nhs_overlap.js       --year YYYY   (dedup NHS Trusts residual)
 *
 * Step 1 stands alone and does not depend on TAC data. Steps 2-3 together
 * net the NHS provider-side spend against DHSC's commissioner-side view.
 * Final DHSC > NHS Trusts value is typically £2-8B capital/PDC residual.
 *
 * Usage:
 *   node scripts/fix_oscar_na_bucket.js --year 2022 [--dry-run]
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const UK_DIR = path.join(DATA_DIR, 'uk');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const YEAR = args.find(a => a.match(/^\d{4}$/)) || (() => {
  console.error('Usage: node fix_oscar_na_bucket.js --year <YYYY> [--dry-run]');
  process.exit(1);
})();

function readJSON(fp) { return JSON.parse(fs.readFileSync(fp, 'utf8')); }
function writeJSON(fp, data) {
  if (DRY_RUN) { console.log(`  [DRY RUN] Would write ${fp}`); return; }
  fs.writeFileSync(fp, JSON.stringify(data, null, 2), 'utf8');
}
function sumChildren(children) { return children.reduce((s, c) => s + (c.value || 0), 0); }
function sortChildrenDesc(node) {
  if (node.children && node.children.length > 0) {
    node.children.sort((a, b) => b.value - a.value);
    node.children.forEach(sortChildrenDesc);
  }
  return node;
}

console.log(`Fix OSCAR II n/a bucket artifact — UK ${YEAR}`);
console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}\n`);

const treePath = path.join(UK_DIR, `uk_budget_tree_${YEAR}.json`);
if (!fs.existsSync(treePath)) { console.error('Missing tree:', treePath); process.exit(1); }
const tree = readJSON(treePath);

const dhsc = tree.children.find(c => c.id === 'department_of_health' || /^department.of.health/i.test(c.name));
if (!dhsc) { console.error('DHSC not found'); process.exit(1); }

const nhsT = (dhsc.children || []).find(c => /nhs trusts/i.test(c.name || ''));
if (!nhsT) { console.error('DHSC > NHS Trusts not found'); process.exit(1); }

if (nhsT._na_bucket_removed === true) {
  console.log('  SKIP: n/a bucket already removed (_na_bucket_removed=true)');
  console.log(`  Current NHS Trusts value: £${(nhsT.value/1e9).toFixed(2)}B`);
  process.exit(0);
}

const naBucket = (nhsT.children || []).find(c => c.name === 'n/a');
if (!naBucket) {
  console.error('  ABORT: no "n/a" bucket found inside DHSC > NHS Trusts');
  console.error(`  NHS Trusts children: ${(nhsT.children || []).map(c => c.name).join(', ') || '(none)'}`);
  process.exit(1);
}

// Pre-condition: n/a bucket must still be a child of NHS Trusts, which
// means net_nhs_overlap has NOT yet run for this year. If netting has
// already run, NHS Trusts.children is gone and the n/a bucket cannot
// be located. Abort if that state is detected.
if (nhsT._netted === true) {
  console.error('  ABORT: DHSC > NHS Trusts is already netted (_netted=true). The n/a bucket has been deleted by net_nhs_overlap. Run this script BEFORE net_nhs_overlap on a fresh year, or restore from backup.');
  process.exit(1);
}
if (nhsT.value < naBucket.value - 1) {
  console.error(`  ABORT: n/a bucket (£${(naBucket.value/1e9).toFixed(2)}B) exceeds NHS Trusts value (£${(nhsT.value/1e9).toFixed(2)}B). Cannot proceed safely.`);
  process.exit(1);
}

console.log('  Pre-fix state:');
console.log(`    DHSC > NHS Trusts:              £${(nhsT.value/1e9).toFixed(3)}B`);
console.log(`    DHSC > NHS Trusts > n/a bucket: £${(naBucket.value/1e9).toFixed(3)}B`);
(nhsT.children || []).forEach(c => {
  console.log(`      sibling:  £${(c.value/1e9).toFixed(2).padStart(7)}B  ${c.name}`);
});
console.log(`    DHSC total:                     £${(dhsc.value/1e9).toFixed(3)}B`);
console.log(`    Root total:                     £${(tree.value/1e9).toFixed(3)}B`);
console.log();

// Apply: drop the n/a bucket entirely from NHS Trusts children
const oldNhsTValue = nhsT.value;
const oldDhscValue = dhsc.value;
const oldRootValue = tree.value;
const removedValue = naBucket.value;

nhsT.children = (nhsT.children || []).filter(c => c.name !== 'n/a');
nhsT.value = sumChildren(nhsT.children);
nhsT._na_bucket_removed = true;
nhsT._na_bucket_removed_amount = removedValue;
nhsT._na_bucket_removed_note = `OSCAR II "n/a" sub-bucket removed as accounting artifact (£${(removedValue/1e9).toFixed(2)}B). This bucket is structurally a duplication of provider operating spend and does not reconcile with published DHSC totals. Same pattern as the 2023 "Non-patient-facing NHS expenditure" removal in fix_oscar_2023_nhs.js, but the bucket is labelled differently in OSCAR II ${YEAR}.`;

// Rename to match the 2023/2024 convention
if (!/residual/i.test(nhsT.name || '')) {
  nhsT.name = 'NHS Trusts (capital & residual funding)';
}

// Recalculate DHSC
dhsc.value = sumChildren(dhsc.children);

// Recalculate root
tree.value = sumChildren(tree.children);

// Re-sort
sortChildrenDesc(tree);

console.log('  Post-fix state:');
console.log(`    DHSC > NHS Trusts:  £${(nhsT.value/1e9).toFixed(3)}B  (was £${(oldNhsTValue/1e9).toFixed(3)}B, Δ -£${((oldNhsTValue - nhsT.value)/1e9).toFixed(2)}B)`);
console.log(`    DHSC total:         £${(dhsc.value/1e9).toFixed(3)}B  (was £${(oldDhscValue/1e9).toFixed(3)}B, Δ -£${((oldDhscValue - dhsc.value)/1e9).toFixed(2)}B)`);
console.log(`    Root total:         £${(tree.value/1e9).toFixed(3)}B  (was £${(oldRootValue/1e9).toFixed(3)}B, Δ -£${((oldRootValue - tree.value)/1e9).toFixed(2)}B)`);
console.log();

// Tree integrity check
let drift = 0;
function walk(n) {
  if (n.children && n.children.length > 0) {
    const sum = n.children.reduce((s, c) => s + (c.value || 0), 0);
    if (Math.abs(sum - n.value) > 0.5) drift++;
    n.children.forEach(walk);
  }
}
walk(tree);
console.log(`  Tree integrity: ${drift === 0 ? 'OK no drifts' : `FAIL ${drift} drifts`}`);

writeJSON(treePath, tree);
console.log(`\n  ${DRY_RUN ? '[DRY RUN]' : 'OK'} Written to ${path.basename(treePath)}`);
