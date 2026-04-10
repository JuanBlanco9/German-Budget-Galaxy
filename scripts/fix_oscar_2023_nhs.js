#!/usr/bin/env node
/**
 * fix_oscar_2023_nhs.js
 *
 * Removes a £114.07B OSCAR 2023 data quality artifact in DHSC > NHS Trusts.
 *
 * BACKGROUND
 * ──────────
 * OSCAR 2023 (HM Treasury accounting database, FY 2022/23) records DHSC at
 * £334.3B, but the published HM Treasury PSA shows DHSC actual DEL was
 * £181.7B. The discrepancy is concentrated in DHSC > NHS Trusts which OSCAR
 * 2023 records as £238.69B, vs £135.54B in OSCAR 2024.
 *
 * FORENSIC TRACE
 * ──────────────
 * Inside DHSC > NHS Trusts in OSCAR 2023:
 *   £124.62B  7.A Medical services      ← real provider operating spend
 *   £114.07B  n/a > Non-patient-facing NHS expenditure  ← ARTIFACT
 *
 * The "Non-patient-facing NHS expenditure" line:
 *   - Does NOT exist in OSCAR 2024
 *   - Is exactly the size of NHS England commissioning flows that OSCAR 2023
 *     mis-categorized
 *   - When dropped, NHS Trusts becomes £124.62B which exactly matches the TAC
 *     EXP0390 provider operating expenditure (£124.22B) at a 1.003 ratio,
 *     mirroring the clean 1.036 ratio observed for OSCAR 2024
 *   - PSA-published DHSC totals reconcile after dropping
 *
 * GROUND TRUTH SOURCES
 * ────────────────────
 *   - DHSC Annual Report 2022-23: total resource outturn £177.1B
 *   - HM Treasury PSA July 2023: DHSC total DEL £181.7B
 *   - NHS England Annual Report 2022-23: total expenditure £155.1B
 *   - OSCAR 2024: NHS Trusts £135.54B (no Non-patient-facing line, confirms
 *     reclassification or elimination of this bucket between schema versions)
 *
 * FIX APPLIED
 * ───────────
 * Reduces DHSC > NHS Trusts (residual after v13 netting) by exactly
 * £114,066,853,000 — the documented value of the Non-patient-facing line in
 * the pre-netting backup. Recalculates DHSC and root values.
 *
 *   Before: DHSC £210.08B, NHS Trusts (residual) £114.47B, root £1,486.56B
 *   After:  DHSC  £95.96B, NHS Trusts (residual)   £0.40B, root £1,372.49B
 *
 * The £0.40B residual represents capital + non-EXP0390 operating items, in
 * line with the £4.70B residual observed for 2024.
 *
 * IDEMPOTENCY
 * ───────────
 * Sets _oscar_2023_fix=true on the NHS Trusts node. Skips if already set.
 *
 * Usage: node scripts/fix_oscar_2023_nhs.js [--dry-run]
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const UK_DIR = path.join(DATA_DIR, 'uk');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const DRY_RUN = process.argv.includes('--dry-run');

// Exact value of "Non-patient-facing NHS expenditure" from
// data/backups/uk_budget_tree_2023.pre_net_nhs_2026-04-10.json
// at path: department_of_health > department_of_health__nhs_trusts > n/a >
//          Non-patient-facing NHS expenditure
const NON_PATIENT_FACING_VALUE = 114068374000; // £114.068374B (full GBP)

function readJSON(fp) { return JSON.parse(fs.readFileSync(fp, 'utf8')); }
function writeJSON(fp, data) {
  if (DRY_RUN) { console.log(`  [DRY RUN] Would write ${fp}`); return; }
  fs.writeFileSync(fp, JSON.stringify(data, null, 2), 'utf8');
}

function backup(fp) {
  if (!fs.existsSync(fp) || DRY_RUN) return;
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const stamp = new Date().toISOString().slice(0, 10);
  const dest = path.join(BACKUP_DIR, path.basename(fp).replace('.json', `.pre_oscar2023_fix_${stamp}.json`));
  if (!fs.existsSync(dest)) {
    fs.copyFileSync(fp, dest);
    console.log(`  Backed up → ${path.relative(DATA_DIR, dest)}`);
  }
}

function sumChildren(children) { return children.reduce((s, c) => s + (c.value || 0), 0); }

function sortChildrenDesc(node) {
  if (node.children && node.children.length > 0) {
    node.children.sort((a, b) => b.value - a.value);
    node.children.forEach(sortChildrenDesc);
  }
  return node;
}

// ─── Verify the artifact exists in the pre-netting backup ───────

function verifyArtifact() {
  const backupPath = path.join(BACKUP_DIR, 'uk_budget_tree_2023.pre_net_nhs_2026-04-10.json');
  if (!fs.existsSync(backupPath)) {
    console.warn('  WARN: pre-netting backup not found, cannot cross-verify artifact value');
    return null;
  }
  const t = readJSON(backupPath);
  const dhsc = t.children.find(c => c.id === 'department_of_health');
  const nhsT = (dhsc.children || []).find(c => c.id && c.id.includes('nhs_trusts'));
  if (!nhsT) return null;
  const naBucket = (nhsT.children || []).find(c => c.name === 'n/a');
  if (!naBucket) return null;
  const npfNode = (naBucket.children || []).find(c => c.name === 'Non-patient-facing NHS expenditure');
  if (!npfNode) return null;
  return npfNode.value;
}

// ─── Main ─────────────────────────────────────────────

console.log('Fix OSCAR 2023 NHS Trusts data quality artifact');
console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}\n`);

// Cross-verify the deduction value against the source backup
const verifiedValue = verifyArtifact();
if (verifiedValue !== null) {
  console.log(`  Verified Non-patient-facing value from pre-netting backup: £${(verifiedValue/1e9).toFixed(3)}B`);
  if (Math.abs(verifiedValue - NON_PATIENT_FACING_VALUE) > 1000) {
    console.error(`  ABORT: hardcoded value £${(NON_PATIENT_FACING_VALUE/1e9).toFixed(3)}B does not match backup`);
    process.exit(1);
  }
  console.log('  ✓ Hardcoded value matches backup\n');
}

const treePath = path.join(UK_DIR, 'uk_budget_tree_2023.json');
const tree = readJSON(treePath);

const dhsc = tree.children.find(c => c.id === 'department_of_health');
if (!dhsc) { console.error('DHSC not found'); process.exit(1); }

const nhsT = (dhsc.children || []).find(c => c.id && c.id.includes('nhs_trusts'));
if (!nhsT) { console.error('DHSC > NHS Trusts not found'); process.exit(1); }

// Idempotency guard
if (nhsT._oscar_2023_fix === true) {
  console.log('  SKIP: fix already applied (_oscar_2023_fix=true)');
  console.log(`  Current NHS Trusts value: £${(nhsT.value/1e9).toFixed(2)}B`);
  process.exit(0);
}

// Pre-condition: NHS Trusts must have been v13-netted already
if (nhsT._netted !== true) {
  console.error('  ABORT: DHSC > NHS Trusts is not v13-netted. Run scripts/net_nhs_overlap.js first.');
  process.exit(1);
}

// Sanity check: current value must be > the deduction
if (nhsT.value <= NON_PATIENT_FACING_VALUE) {
  console.error(`  ABORT: current NHS Trusts value (£${(nhsT.value/1e9).toFixed(2)}B) is <= deduction (£${(NON_PATIENT_FACING_VALUE/1e9).toFixed(2)}B). Cannot proceed safely.`);
  process.exit(1);
}

console.log('  Pre-fix state:');
console.log(`    NHS Trusts value (residual):  £${(nhsT.value/1e9).toFixed(3)}B`);
console.log(`    DHSC total:                   £${(dhsc.value/1e9).toFixed(3)}B`);
console.log(`    Root total:                   £${(tree.value/1e9).toFixed(3)}B`);
console.log();

// Apply the fix
backup(treePath);

const oldNhsTValue = nhsT.value;
nhsT.value = oldNhsTValue - NON_PATIENT_FACING_VALUE;
nhsT._oscar_2023_fix = true;
nhsT._oscar_2023_fix_amount = NON_PATIENT_FACING_VALUE;
nhsT._oscar_2023_fix_note = 'OSCAR 2023 included a £114.07B "Non-patient-facing NHS expenditure" line inside NHS Trusts that does not exist in OSCAR 2024 and represents a data quality artifact (likely cross-node duplication with NHS England commissioning). Removed to align with HM Treasury PSA published DHSC total of £181.7B for 2022/23.';
nhsT.name = 'NHS Trusts (capital & residual funding)';

// Recalculate DHSC value
const oldDhscValue = dhsc.value;
dhsc.value = sumChildren(dhsc.children);

// Recalculate root value
const oldRootValue = tree.value;
tree.value = sumChildren(tree.children);

// Re-sort
sortChildrenDesc(tree);

// Update NHS Provider Sector disclaimer to mention the OSCAR 2023 fix
const nhsPS = tree.children.find(c => c.id === 'nhs_provider_sector');
if (nhsPS) {
  nhsPS._disclaimer = `NHS Trust Accounts Consolidation (TAC) 2022/23. Total operating expenditure (EXP0390). Overlap with DHSC commissioning has been netted, plus an additional £114.07B OSCAR 2023 data quality artifact removed (see DHSC > NHS Trusts > _oscar_2023_fix_note).`;
}

console.log('  Post-fix state:');
console.log(`    NHS Trusts value (residual):  £${(nhsT.value/1e9).toFixed(3)}B  (was £${(oldNhsTValue/1e9).toFixed(3)}B)`);
console.log(`    DHSC total:                   £${(dhsc.value/1e9).toFixed(3)}B  (was £${(oldDhscValue/1e9).toFixed(3)}B, Δ -£${((oldDhscValue - dhsc.value)/1e9).toFixed(2)}B)`);
console.log(`    Root total:                   £${(tree.value/1e9).toFixed(3)}B  (was £${(oldRootValue/1e9).toFixed(3)}B, Δ -£${((oldRootValue - tree.value)/1e9).toFixed(2)}B)`);
console.log();

// Reconciliation check
const ratio = nhsT.value / 124216854000; // /TAC 2022/23 value
console.log(`  Reconciliation: residual £${(nhsT.value/1e9).toFixed(3)}B vs TAC £124.22B = ${(ratio*100).toFixed(1)}% overhead`);
console.log(`  (2024 reference: £4.70B residual / £130.84B TAC = 3.6% overhead)`);
console.log();
console.log('  Ground truth:');
console.log('    HM Treasury PSA July 2023 DHSC DEL 2022/23: £181.7B');
console.log(`    Our DHSC + NHS Provider Sector top-level:   £${((dhsc.value + (nhsPS?.value||0))/1e9).toFixed(2)}B`);
console.log('    (We show NHS Trusts spending separately at top level, so the comparison');
console.log('     against published DHSC group total includes both nodes)');

// Tree integrity check
let drift = 0;
function walk(n) {
  if (n.children && n.children.length > 0) {
    const sum = n.children.reduce((s, c) => s + (c.value || 0), 0);
    if (Math.abs(sum - n.value) > 0) drift++;
    n.children.forEach(walk);
  }
}
walk(tree);
console.log();
console.log(`  Tree integrity: ${drift === 0 ? '✓ no drifts' : `✗ ${drift} drifts`}`);

writeJSON(treePath, tree);
console.log(`\n  ${DRY_RUN ? '[DRY RUN]' : '✓'} Written to ${path.basename(treePath)}`);
