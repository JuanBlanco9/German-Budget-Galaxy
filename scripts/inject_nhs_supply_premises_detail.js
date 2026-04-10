#!/usr/bin/env node
/**
 * inject_nhs_supply_premises_detail.js
 *
 * Injects subcode-level breakdowns as Level 7 children of each NHS trust's
 * "Clinical Supplies & Drugs" and "Premises & Infrastructure" leaf nodes.
 *
 * Categories (from NHS TAC08 illustrative subcode definitions):
 *
 *   CLINICAL SUPPLIES & DRUGS  (parent v13 bucket)
 *     - Drugs costs                        (EXP0170)
 *     - Clinical supplies (excl drugs)     (EXP0150 + EXP0155)
 *     - General supplies & services        (EXP0160)
 *     - Inventories written down           (EXP0379 + EXP0380A)
 *
 *   PREMISES & INFRASTRUCTURE  (parent v13 bucket)
 *     - Premises (other)                   (EXP0220)
 *     - Depreciation                       (EXP0240)
 *     - Impairments net of reversals       (EXP0260)
 *     - Establishment costs                (EXP0200)
 *     - Transport                          (EXP0230A + EXP0230B)
 *     - PFI / LIFT charges                 (EXP0370 + EXP0375)
 *     - Amortisation                       (EXP0250)
 *     - Business rates                     (EXP0210)
 *     - Lease expenditure                  (EXP0340A + EXP0340B + EXP0340C + EXP0340D)
 *
 * Reconciliation:
 *   The parent values come from inject_nhs_trust_detail.js which already
 *   normalized them to sum exactly to EXP0390 minus other categories. The
 *   subcode children sum may differ from the parent by small amounts due to:
 *     (a) The v13 build_nhs_trust_breakdown.js groups EXP codes slightly
 *         differently (e.g., EXP0155 grouped with supplies, not separately)
 *     (b) Per-trust rounding adjustments
 *   The script absorbs any drift into the largest child to guarantee
 *   children-sum-equals-parent invariant.
 *
 * Idempotency: skips if "Clinical Supplies & Drugs" or "Premises &
 * Infrastructure" already has children.
 *
 * Usage: node scripts/inject_nhs_supply_premises_detail.js [--dry-run] [--year 2024]
 */

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const DATA_DIR = path.join(__dirname, '..', 'data');
const UK_DIR = path.join(DATA_DIR, 'uk');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const YEAR = args.find(a => a.match(/^\d{4}$/)) || '2024';

// ─── Subcode buckets ──────────────────────────────────

const SUPPLY_BUCKETS = [
  { name: 'Drugs costs',                       codes: ['EXP0170'] },
  { name: 'Clinical supplies & services',      codes: ['EXP0150', 'EXP0155'] },
  { name: 'General supplies & services',       codes: ['EXP0160'] },
  { name: 'Inventories written down',          codes: ['EXP0379', 'EXP0380A'] }
];

const PREMISES_BUCKETS = [
  { name: 'Premises (other)',                  codes: ['EXP0220'] },
  { name: 'Depreciation',                      codes: ['EXP0240'] },
  { name: 'Impairments net of reversals',      codes: ['EXP0260'] },
  { name: 'Establishment costs',               codes: ['EXP0200'] },
  { name: 'Transport (business + patient)',    codes: ['EXP0230A', 'EXP0230B'] },
  { name: 'PFI / LIFT charges',                codes: ['EXP0370', 'EXP0375'] },
  { name: 'Amortisation',                      codes: ['EXP0250'] },
  { name: 'Business rates',                    codes: ['EXP0210'] },
  { name: 'Lease expenditure',                 codes: ['EXP0340A', 'EXP0340B', 'EXP0340C', 'EXP0340D'] }
];

// ─── Helpers ──────────────────────────────────────────

function readJSON(fp) { return JSON.parse(fs.readFileSync(fp, 'utf8')); }

function writeJSON(fp, data) {
  if (DRY_RUN) { console.log(`  [DRY RUN] Would write ${fp}`); return; }
  fs.writeFileSync(fp, JSON.stringify(data, null, 2), 'utf8');
}

function backup(fp) {
  if (!fs.existsSync(fp) || DRY_RUN) return;
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const stamp = new Date().toISOString().slice(0, 10);
  const dest = path.join(BACKUP_DIR, path.basename(fp).replace('.json', `.pre_v16b_${stamp}.json`));
  if (!fs.existsSync(dest)) {
    fs.copyFileSync(fp, dest);
    console.log(`  Backed up → ${path.relative(DATA_DIR, dest)}`);
  }
}

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function normalizeRow(row) {
  const out = {};
  for (const k of Object.keys(row)) out[k.trim()] = row[k];
  return out;
}

function findSheet(wb, targetLower) {
  return wb.SheetNames.find(n => n.toLowerCase() === targetLower);
}

function isTotalMain(mainCode) {
  const m = String(mainCode || '');
  return !m.endsWith('P') && !m.endsWith('O');
}

function parseTACFile(filePath) {
  const wb = XLSX.readFile(filePath);
  const dataSheet = findSheet(wb, 'all data');
  const dataRows = XLSX.utils.sheet_to_json(wb.Sheets[dataSheet]).map(normalizeRow);

  const trustData = {};
  for (const row of dataRows) {
    if (!row.SubCode || !String(row.SubCode).startsWith('EXP')) continue;
    if (!row.MainCode || !String(row.MainCode).includes('CY')) continue;
    if (!isTotalMain(row.MainCode)) continue;
    const name = String(row.OrganisationName || '').trim();
    if (!name) continue;
    if (!trustData[name]) trustData[name] = {};
    trustData[name][row.SubCode] = parseFloat(row.Total) || 0;
  }
  return trustData;
}

// Build positive children from buckets, normalizing to parent value.
//
// The tricky case: v13 build_nhs_trust_breakdown.js sometimes scales down a
// trust's Premises (or Supplies) value when the raw EXP code sum exceeds the
// trust's total operating expenditure (EXP0390). For ~3 trusts the raw
// subcode sum can be 10-60% larger than the (scaled-down) parent value.
// Strategy:
//   - If subcode_sum <= parent: distribute as-is, push positive residual into "Other"
//   - If subcode_sum > parent (negative drift): scale all positive children
//     down by factor = parent / subcode_sum, preserving relative proportions
function buildBucketChildren(parentNode, codes, buckets, baseId) {
  const parentValue = parentNode.value;
  const children = buckets.map(b => {
    const sumK = b.codes.reduce((s, c) => s + (codes[c] || 0), 0);
    return {
      id: baseId + '__' + slugify(b.name),
      name: b.name,
      value: Math.round(sumK * 1000),
      _exp_codes: b.codes
    };
  });

  // Filter out zero/negative values (negatives are accounting reversals)
  let positive = children.filter(c => c.value > 0);
  if (positive.length === 0) return null;

  const subcodeSum = positive.reduce((s, c) => s + c.value, 0);

  if (subcodeSum > parentValue) {
    // Subcodes exceed parent (v13 scaled the parent down). Scale children
    // proportionally to fit the parent value, preserving relative weights.
    const factor = parentValue / subcodeSum;
    positive.forEach(c => { c.value = Math.round(c.value * factor); });
    // Force exact sum after rounding
    const newSum = positive.reduce((s, c) => s + c.value, 0);
    const finalDrift = parentValue - newSum;
    if (finalDrift !== 0 && positive.length > 0) {
      const largest = positive.reduce((max, c) => c.value > max.value ? c : max);
      largest.value += finalDrift;
    }
  } else if (subcodeSum < parentValue) {
    // Subcodes are slightly under parent — add a residual "Other" bucket
    positive.push({
      id: baseId + '__other',
      name: 'Other',
      value: parentValue - subcodeSum,
      _exp_codes: ['unaccounted']
    });
  }

  // Final integrity guarantee
  const finalSum = positive.reduce((s, c) => s + c.value, 0);
  if (finalSum !== parentValue) {
    const largest = positive.reduce((max, c) => c.value > max.value ? c : max);
    largest.value += (parentValue - finalSum);
  }

  return positive.filter(c => c.value > 0).sort((a, b) => b.value - a.value);
}

// ─── Main ─────────────────────────────────────────────

console.log('NHS Supply & Premises Detail Injection (Level 7)');
console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
console.log(`Year: ${YEAR}\n`);

const treePath = path.join(UK_DIR, `uk_budget_tree_${YEAR}.json`);
const tree = readJSON(treePath);

// Parse both TAC files for EXP code data
const trustsFile = path.join(UK_DIR, `nhs_tac_trusts_${YEAR}.xlsx`);
const ftFile = path.join(UK_DIR, `nhs_tac_ft_${YEAR}.xlsx`);
console.log(`Parsing ${path.basename(trustsFile)}...`);
const trustsExpData = parseTACFile(trustsFile);
console.log(`Parsing ${path.basename(ftFile)}...`);
const ftExpData = parseTACFile(ftFile);
const allExpData = { ...trustsExpData, ...ftExpData };
console.log(`Total trusts with EXP data: ${Object.keys(allExpData).length}\n`);

const nhsRoot = tree.children.find(c => c.id === 'nhs_provider_sector');
if (!nhsRoot) { console.error('nhs_provider_sector not found'); process.exit(1); }

let trustsProcessed = 0;
let suppliesInjected = 0;
let premisesInjected = 0;
let alreadyInjected = 0;
let unmatched = 0;

for (const sector of nhsRoot.children) {
  for (const trust of sector.children) {
    trustsProcessed++;
    const expCodes = allExpData[trust.name];
    if (!expCodes) {
      unmatched++;
      continue;
    }

    // Find Supplies node
    const suppliesNode = (trust.children || []).find(c => c.name === 'Clinical Supplies & Drugs');
    if (suppliesNode) {
      if (suppliesNode.children && suppliesNode.children.length > 0 && suppliesNode.children[0]._exp_codes) {
        alreadyInjected++;
      } else {
        const children = buildBucketChildren(suppliesNode, expCodes, SUPPLY_BUCKETS, suppliesNode.id);
        if (children && children.length > 0) {
          suppliesNode.children = children;
          suppliesNode._source = 'NHS TAC08 ' + (parseInt(YEAR) - 1) + '/' + String(YEAR).slice(2);
          suppliesInjected++;
        }
      }
    }

    // Find Premises node
    const premisesNode = (trust.children || []).find(c => c.name === 'Premises & Infrastructure');
    if (premisesNode) {
      if (premisesNode.children && premisesNode.children.length > 0 && premisesNode.children[0]._exp_codes) {
        // already injected (no double count)
      } else {
        const children = buildBucketChildren(premisesNode, expCodes, PREMISES_BUCKETS, premisesNode.id);
        if (children && children.length > 0) {
          premisesNode.children = children;
          premisesNode._source = 'NHS TAC08 ' + (parseInt(YEAR) - 1) + '/' + String(YEAR).slice(2);
          premisesInjected++;
        }
      }
    }
  }
}

console.log(`Trusts processed: ${trustsProcessed}`);
console.log(`  Supplies subcodes injected: ${suppliesInjected}`);
console.log(`  Premises subcodes injected: ${premisesInjected}`);
console.log(`  Already injected (skipped): ${alreadyInjected}`);
console.log(`  Unmatched (no EXP data): ${unmatched}`);

// Tree integrity check
let drift = 0;
const driftDetails = [];
function walk(n, p) {
  if (n.children && n.children.length > 0) {
    const sum = n.children.reduce((s, c) => s + (c.value || 0), 0);
    if (Math.abs(sum - n.value) > 0) {
      drift++;
      if (driftDetails.length < 10) driftDetails.push({ path: p + '/' + n.name, val: n.value, sum, delta: n.value - sum });
    }
    n.children.forEach(c => walk(c, p + '/' + (n.id || n.name).slice(0, 30)));
  }
}
walk(tree, '');
console.log(`\nTree integrity: ${drift === 0 ? '✓' : '✗ ' + drift + ' drifts'}`);
if (driftDetails.length > 0) {
  driftDetails.forEach(d => console.log(`  ${d.path} val=${d.val} sum=${d.sum} delta=${d.delta}`));
}

// Spot check
const acuteSector = nhsRoot.children.find(s => s.name.includes('Acute'));
const guys = (acuteSector?.children || []).find(t => /guy.*thomas/i.test(t.name));
if (guys) {
  ['Clinical Supplies & Drugs', 'Premises & Infrastructure'].forEach(catName => {
    const cat = (guys.children || []).find(c => c.name === catName);
    if (cat && cat.children) {
      console.log(`\nSpot check — ${guys.name} > ${catName}:`);
      console.log(`  Total: £${(cat.value/1e6).toFixed(0)}M`);
      cat.children.forEach(c => {
        const pct = (c.value / cat.value * 100).toFixed(0);
        console.log(`    £${(c.value/1e6).toFixed(0).padStart(4)}M  ${pct.padStart(3)}%  ${c.name}`);
      });
    }
  });
}

backup(treePath);
writeJSON(treePath, tree);
console.log(`\n${DRY_RUN ? '[DRY RUN]' : '✓'} Written to ${path.basename(treePath)}`);
