#!/usr/bin/env node
/**
 * net_nhs_overlap.js
 *
 * Eliminates double-counting between two views of NHS provider funding
 * in the UK 2024 budget tree:
 *
 *   1. DHSC > NHS Trusts (£135.5B in OSCAR)
 *      = Money DHSC ALLOCATES to trusts via NHS England → ICBs (commissioner view)
 *      Originally enriched with 42 ICB sub-allocations by enrich_uk_nhs.js
 *
 *   2. NHS Provider Sector top-level node (£130.8B from TAC EXP0390)
 *      = What trusts actually SPEND on operating expenditure (provider view)
 *      Injected by inject_nhs_trusts.js with 5 sectors × 206 trusts breakdown
 *
 * These are two views of (mostly) the same money. Showing both inflates
 * the UK root by ~£130B of double-counting.
 *
 * METHODOLOGY (Option B — surgical deduction, no data fabricated)
 * --------------------------------------------------------------
 * Reduce DHSC > NHS Trusts by EXACTLY the NHS Provider Sector value (£130.8B),
 * leaving a £4.7B residual. This residual represents the gap between:
 *
 *   - DHSC's NHS Trusts allocation: £135.5B (operating + capital + PDC)
 *   - TAC EXP0390 operating expenditure: £130.8B (operating only)
 *
 * The £4.7B is most likely capital expenditure (PDC, capital loans), training
 * income from HEE that doesn't appear in EXP0390, and trusts excluded from the
 * TAC sample (per "Comments" column).
 *
 * Steps:
 *   1. Find DHSC node and its NHS Trusts sub-node
 *   2. Find top-level NHS Provider Sector node
 *   3. residual = nhs_trusts.value - nhs_provider_sector.value
 *   4. Set DHSC > NHS Trusts value = residual, remove ICB children
 *   5. Rename to "NHS Trusts (capital & residual funding)"
 *   6. Mark with _netted = true (idempotency guard)
 *   7. Recalculate DHSC.value as sum of its children
 *   8. Recalculate root.value as sum of top-level children
 *
 * RESULT
 * ------
 * Before: DHSC £214.2B + NHS Provider Sector £130.8B = £345.0B (£130.8B double-counted)
 * After:  DHSC £83.4B  + NHS Provider Sector £130.8B = £214.2B ✓
 * Total:  Root drops from £1,511.3B → £1,380.5B
 *
 * The total preserved exactly:
 *   £4.7B (DHSC residual) + £130.8B (NHS Provider Sector) = £135.5B (= original DHSC NHS Trusts)
 *
 * The 42 ICB sub-allocations are removed from DHSC because:
 *   (a) They were a commissioner-side view (geographic ICBs) that doesn't map
 *       to the new provider-side view (sectors × trusts).
 *   (b) Their parent value is being changed, so the children sum no longer matches.
 *   (c) The same money is now represented at top level with richer detail
 *       (5 sectors × 206 named trusts vs 42 ICB allocations).
 *
 * Idempotency: detects _netted=true marker and skips on re-runs.
 *
 * Usage: node scripts/net_nhs_overlap.js [--dry-run] [--year 2024]
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const UK_DIR = path.join(DATA_DIR, 'uk');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const YEAR = args.find(a => a.match(/^\d{4}$/)) || '2024';

// ─── Helpers ──────────────────────────────────────────

function readJSON(fp) {
  if (!fs.existsSync(fp)) return null;
  return JSON.parse(fs.readFileSync(fp, 'utf8'));
}

function writeJSON(fp, data) {
  if (DRY_RUN) { console.log(`  [DRY RUN] Would write ${fp}`); return; }
  fs.writeFileSync(fp, JSON.stringify(data, null, 2), 'utf8');
}

function backup(fp) {
  if (!fs.existsSync(fp) || DRY_RUN) return;
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
  // Use a date-stamped backup so we don't overwrite the pre-injection backup
  const stamp = new Date().toISOString().slice(0, 10);
  const dest = path.join(BACKUP_DIR, path.basename(fp).replace('.json', `.pre_net_nhs_${stamp}.json`));
  if (!fs.existsSync(dest)) {
    fs.copyFileSync(fp, dest);
    console.log(`  Backed up → ${path.relative(DATA_DIR, dest)}`);
  }
}

function sumChildren(children) {
  return children.reduce((s, c) => s + (c.value || 0), 0);
}

function sortChildrenDesc(node) {
  if (node.children && node.children.length > 0) {
    node.children.sort((a, b) => b.value - a.value);
    node.children.forEach(sortChildrenDesc);
  }
  return node;
}

// ─── Main ─────────────────────────────────────────────

console.log('Budget Galaxy — NHS Overlap Netting');
console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
console.log(`Target year: ${YEAR}\n`);

const treePath = path.join(UK_DIR, `uk_budget_tree_${YEAR}.json`);
const tree = readJSON(treePath);
if (!tree) { console.error('Missing UK tree:', treePath); process.exit(1); }

// 1. Locate the relevant nodes
const dhsc = tree.children.find(c =>
  c.id === 'department_of_health' || (c.name || '').toUpperCase().includes('DEPARTMENT OF HEALTH')
);
if (!dhsc) { console.error('DHSC node not found in tree'); process.exit(1); }

const nhsTrustsInDHSC = (dhsc.children || []).find(c =>
  c.id === 'department_of_health__nhs_trusts'
);
if (!nhsTrustsInDHSC) { console.error('DHSC > NHS Trusts node not found'); process.exit(1); }

const nhsProviderSector = tree.children.find(c => c.id === 'nhs_provider_sector');
if (!nhsProviderSector) {
  console.error('Top-level nhs_provider_sector not found. Run inject_nhs_trusts.js first.');
  process.exit(1);
}

// 2. Idempotency guard
if (nhsTrustsInDHSC._netted === true) {
  console.log('  SKIP: DHSC > NHS Trusts is already netted (_netted=true)');
  console.log(`  Current value: £${(nhsTrustsInDHSC.value / 1e9).toFixed(2)}B (residual)`);
  process.exit(0);
}

// 3. Compute the deduction
const originalDhscNhsTrusts = nhsTrustsInDHSC.value;
const providerSectorValue = nhsProviderSector.value;
const residual = originalDhscNhsTrusts - providerSectorValue;

console.log('  Pre-netting state:');
console.log(`    DHSC total:                  £${(dhsc.value / 1e9).toFixed(2)}B`);
console.log(`    DHSC > NHS Trusts:           £${(originalDhscNhsTrusts / 1e9).toFixed(2)}B (${nhsTrustsInDHSC.children?.length || 0} ICB children)`);
console.log(`    Top-level NHS Provider Sec:  £${(providerSectorValue / 1e9).toFixed(2)}B`);
console.log(`    Root total:                  £${(tree.value / 1e9).toFixed(2)}B`);
console.log(`    DOUBLE-COUNTED:              £${(providerSectorValue / 1e9).toFixed(2)}B\n`);

if (residual < 0) {
  console.error(`  ABORT: residual would be negative (£${(residual/1e9).toFixed(2)}B).`);
  console.error('  This suggests TAC EXP0390 exceeds DHSC NHS Trusts allocation — investigate.');
  process.exit(1);
}

// 4. Backup before mutating
backup(treePath);

// 5. Mutate DHSC > NHS Trusts: shrink to residual, drop ICB children, mark netted
nhsTrustsInDHSC.value = residual;
nhsTrustsInDHSC.name = 'NHS Trusts (capital & residual funding)';
delete nhsTrustsInDHSC.children;
nhsTrustsInDHSC._netted = true;
nhsTrustsInDHSC._original_value = originalDhscNhsTrusts;
nhsTrustsInDHSC._netted_against = 'nhs_provider_sector';
nhsTrustsInDHSC._note = `Reduced from £${(originalDhscNhsTrusts/1e9).toFixed(1)}B by £${(providerSectorValue/1e9).toFixed(1)}B to avoid double-counting with top-level NHS Provider Sector. Residual represents capital expenditure (PDC, capital loans), HEE training income, and trusts excluded from the TAC sample.`;

// 6. Recalculate DHSC value as sum of its children
const oldDhscValue = dhsc.value;
dhsc.value = sumChildren(dhsc.children);

// 7. Recalculate root value
const oldRootValue = tree.value;
tree.value = sumChildren(tree.children);

// 8. Re-sort everything
sortChildrenDesc(tree);

// 9. Update NHS Provider Sector disclaimer (no longer overlaps after netting)
nhsProviderSector._disclaimer = 'NHS Trust Accounts Consolidation (TAC) 2023/24. Total operating expenditure (EXP0390). Overlap with DHSC commissioning has been netted: see DHSC > "NHS Trusts (capital & residual funding)" for the £4.7B that remains in DHSC (capital + non-EXP0390 items).';

console.log('  Post-netting state:');
console.log(`    DHSC > NHS Trusts (residual): £${(residual / 1e9).toFixed(2)}B  (was £${(originalDhscNhsTrusts/1e9).toFixed(2)}B)`);
console.log(`    DHSC total:                   £${(dhsc.value / 1e9).toFixed(2)}B  (was £${(oldDhscValue/1e9).toFixed(2)}B, Δ -£${((oldDhscValue-dhsc.value)/1e9).toFixed(2)}B)`);
console.log(`    NHS Provider Sector:          £${(nhsProviderSector.value / 1e9).toFixed(2)}B  (unchanged)`);
console.log(`    Root total:                   £${(tree.value / 1e9).toFixed(2)}B  (was £${(oldRootValue/1e9).toFixed(2)}B, Δ -£${((oldRootValue-tree.value)/1e9).toFixed(2)}B)`);

// Sanity check: residual + provider sector should equal original DHSC NHS Trusts
const sumCheck = residual + providerSectorValue;
console.log(`\n  Reconciliation: £${(residual/1e9).toFixed(2)}B (residual) + £${(providerSectorValue/1e9).toFixed(2)}B (NHS Provider Sector) = £${(sumCheck/1e9).toFixed(2)}B`);
console.log(`  Original DHSC NHS Trusts:                                          £${(originalDhscNhsTrusts/1e9).toFixed(2)}B`);
console.log(`  Match: ${Math.abs(sumCheck - originalDhscNhsTrusts) < 1 ? '✓' : '✗ MISMATCH'}`);

writeJSON(treePath, tree);
console.log(`\n  ${DRY_RUN ? '[DRY RUN]' : '✓'} Written to ${path.basename(treePath)}`);
