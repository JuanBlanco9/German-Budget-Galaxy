#!/usr/bin/env node
/**
 * build_nhs_trust_breakdown.js
 *
 * Parses NHS TAC EXP subcodes for ALL trusts (Trusts + FTs) and builds
 * a 4-category expenditure breakdown per trust.
 *
 * Categories (verified against TAC08 illustrative file):
 *
 *   STAFF COSTS:
 *     EXP0130  Staff and executive directors costs
 *     EXP0140  Non-executive directors
 *
 *   CLINICAL SUPPLIES & DRUGS:
 *     EXP0150  Supplies and services - clinical (excl drugs)
 *     EXP0155  Supplies and services - clinical: COVID donated
 *     EXP0160  Supplies and services - general
 *     EXP0170  Drugs costs
 *     EXP0379  COVID inventory writedowns
 *     EXP0380A Inventories written down
 *
 *   PREMISES & INFRASTRUCTURE:
 *     EXP0200  Establishment
 *     EXP0210  Premises - business rates
 *     EXP0220  Premises - other
 *     EXP0230A Transport (business travel)
 *     EXP0230B Transport (other incl patient travel)
 *     EXP0240  Depreciation
 *     EXP0250  Amortisation
 *     EXP0260  Impairments net of reversals
 *     EXP0340A-D Lease expenditure (short term, low value, variable, VAT)
 *     EXP0370  PFI/LIFT on-SoFP charges
 *     EXP0375  PFI/LIFT off-SoFP charges
 *
 *   OTHER OPERATING COSTS:
 *     Computed as remainder: EXP0390 - (Staff + Supplies + Premises)
 *     Includes purchased healthcare (EXP0100, 0102, 0110, 0112, 0120),
 *     R&D (0300, 0310), education (0320, 0330A/B), clinical negligence
 *     (0290A/B), consultancy (0190), audit (0280A/B), redundancy (0350,
 *     0360), provisions, legal, insurance, hospitality, and other
 *     EXP0380x miscellaneous items.
 *
 * Output: data/uk/nhs_trust_breakdown_2024.json
 *   {
 *     "Barts Health NHS Trust": {
 *       "nhs_code": "R1H",
 *       "total": 2372157000,
 *       "staff_costs": 1454224000,
 *       "supplies": 464237000,
 *       "premises": 155891000,
 *       "other": 297805000,
 *       "sector": "Acute",
 *       "region": "London",
 *       "icb_code": "QMF",
 *       "icb_name": "NHS NORTH EAST LONDON INTEGRATED CARE BOARD"
 *     }
 *   }
 *
 * Reconciliation: staff + supplies + premises + other === total (always).
 * If staff+supplies+premises > total (rare due to negative items),
 * "other" will be set to 0 and a _discrepancy field added.
 */

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const DATA_DIR = path.join(__dirname, '..', 'data');
const UK_DIR = path.join(DATA_DIR, 'uk');
const args = process.argv.slice(2);
const YEAR = args.find(a => a.match(/^\d{4}$/)) || '2024';
const OUTPUT = path.join(UK_DIR, `nhs_trust_breakdown_${YEAR}.json`);

// ─── Category definitions ─────────────────────────────

const STAFF_CODES = ['EXP0130', 'EXP0140'];
const SUPPLIES_CODES = ['EXP0150', 'EXP0155', 'EXP0160', 'EXP0170', 'EXP0379', 'EXP0380A'];
const PREMISES_CODES = [
  'EXP0200', 'EXP0210', 'EXP0220', 'EXP0230A', 'EXP0230B',
  'EXP0240', 'EXP0250', 'EXP0260',
  'EXP0340A', 'EXP0340B', 'EXP0340C', 'EXP0340D',
  'EXP0370', 'EXP0375'
];
const TOTAL_CODE = 'EXP0390';

// ─── Helpers ──────────────────────────────────────────

// Helpers to handle column header variants across years/files
function normalizeRow(row) {
  const out = {};
  for (const k of Object.keys(row)) out[k.trim()] = row[k];
  return out;
}

function findSheet(wb, targetLower) {
  return wb.SheetNames.find(n => n.toLowerCase() === targetLower);
}

// Trust name normalization for fuzzy matching across years (renames + curly quotes)
function normalizeName(name) {
  return String(name)
    .toUpperCase()
    .replace(/['\u2019\u2018\u02bc`]/g, '')
    .replace(/&/g, 'AND')
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim();
}

const TRUST_STOPWORDS = new Set(['NHS', 'TRUST', 'FOUNDATION', 'FT', 'THE']);
function tokenSet(name) {
  return new Set(normalizeName(name).split(' ').filter(t => t && !TRUST_STOPWORDS.has(t)));
}
function isSubsetMatch(expTokens, provTokens) {
  if (provTokens.size < 2) return false;
  for (const t of provTokens) if (!expTokens.has(t)) return false;
  return true;
}

function parseTACFile(filePath) {
  const wb = XLSX.readFile(filePath);

  // Read providers for sector/region (with normalized lookup tier for fuzzy match)
  const provSheetName = findSheet(wb, 'list of providers');
  const provRows = XLSX.utils.sheet_to_json(wb.Sheets[provSheetName]).map(normalizeRow);
  const provMap = {};
  const provMapNorm = {};
  for (const row of provRows) {
    const name = String(row['Full name of Provider'] || '').trim();
    const code = String(row['NHS code'] || '').trim();
    if (name) {
      const entry = {
        nhs_code: code,
        region: String(row['Region'] || '').trim(),
        sector: String(row['Sector'] || '').trim()
      };
      provMap[name] = entry;
      provMapNorm[normalizeName(name)] = entry;
    }
  }

  function lookupProvider(name) {
    return provMap[name] || provMapNorm[normalizeName(name)] || {};
  }

  // Read all expenditure rows (case-insensitive sheet match)
  const dataSheetName = findSheet(wb, 'all data');
  if (!dataSheetName) throw new Error(`No 'All data' sheet in ${filePath}`);
  const dataRows = XLSX.utils.sheet_to_json(wb.Sheets[dataSheetName]).map(normalizeRow);

  // Group EXP rows by trust
  const trustData = {};
  for (const row of dataRows) {
    if (!row.SubCode || !String(row.SubCode).startsWith('EXP')) continue;
    if (!row.MainCode || !String(row.MainCode).includes('CY')) continue;
    const name = String(row.OrganisationName || '').trim();
    if (!name) continue;
    if (!trustData[name]) trustData[name] = { provider: lookupProvider(name), codes: {} };
    trustData[name].codes[row.SubCode] = parseFloat(row.Total) || 0;
  }

  return trustData;
}

function buildBreakdown(trustData, icbMapping) {
  const result = {};
  let withDiscrepancy = 0;
  let unclassified = 0;

  // Build name → entry lookup from ICB mapping (the master classifier)
  // Has 211 trusts × {trust_name, nhs_code, region, sector, icb_code, icb_name}
  // 3-tier matching: exact, normalized, token-subset
  const icbByName = {};
  const icbByNorm = {};
  const icbByTokens = [];
  for (const [code, info] of Object.entries(icbMapping)) {
    const n = info.trust_name;
    if (!n) continue;
    icbByName[n] = info;
    icbByNorm[normalizeName(n)] = info;
    icbByTokens.push({ tokens: tokenSet(n), info });
  }

  function lookupClassification(name) {
    let entry = icbByName[name];
    if (entry) return entry;
    entry = icbByNorm[normalizeName(name)];
    if (entry) return entry;
    const expTokens = tokenSet(name);
    for (const c of icbByTokens) {
      if (isSubsetMatch(expTokens, c.tokens)) return c.info;
    }
    return null;
  }

  for (const [name, info] of Object.entries(trustData)) {
    const codes = info.codes;
    const totalK = codes[TOTAL_CODE] || 0;
    if (totalK <= 0) continue; // skip trusts with no operating expenditure

    let staffK = STAFF_CODES.reduce((s, c) => s + (codes[c] || 0), 0);
    let suppliesK = SUPPLIES_CODES.reduce((s, c) => s + (codes[c] || 0), 0);
    let premisesK = PREMISES_CODES.reduce((s, c) => s + (codes[c] || 0), 0);
    let otherK = totalK - staffK - suppliesK - premisesK;

    let discrepancy = null;
    if (otherK < 0) {
      // Sum of explicit categories exceeds total (rare — caused by negative items
      // like impairment reversals or credit allowances inside EXP0390). Scale the
      // three positive categories proportionally so they sum exactly to total.
      discrepancy = otherK;
      const overshoot = -otherK; // amount to remove
      const positiveSum = staffK + suppliesK + premisesK;
      if (positiveSum > 0) {
        const factor = (positiveSum - overshoot) / positiveSum;
        staffK *= factor;
        suppliesK *= factor;
        premisesK *= factor;
      }
      otherK = 0;
      withDiscrepancy++;
    }

    // Convert thousands → full GBP
    const total = Math.round(totalK * 1000);
    let staff = Math.round(staffK * 1000);
    let supplies = Math.round(suppliesK * 1000);
    let premises = Math.round(premisesK * 1000);
    let other = Math.round(otherK * 1000);

    // Reconcile rounding: if rounding caused drift, adjust "other" or premises
    const sum = staff + supplies + premises + other;
    if (sum !== total) {
      const drift = total - sum;
      if (discrepancy === null) {
        other += drift;
      } else {
        // discrepancy case: other is locked at 0, push drift into premises
        premises += drift;
      }
    }

    // Look up classification via ICB mapping (master classifier with fuzzy match).
    // Falls back to TAC List of Providers if ICB mapping doesn't have the trust.
    const icbInfo = lookupClassification(name) || {};
    const nhsCode = icbInfo.nhs_code || info.provider.nhs_code || '';
    if (!icbInfo.sector) unclassified++;

    result[name] = {
      nhs_code: nhsCode,
      total,
      staff_costs: staff,
      supplies,
      premises,
      other,
      sector: icbInfo.sector || info.provider.sector || 'Unknown',
      region: icbInfo.region || info.provider.region || 'Unknown',
      icb_code: icbInfo.icb_code || null,
      icb_name: icbInfo.icb_name || null
    };

    if (discrepancy !== null) {
      result[name]._discrepancy = Math.round(discrepancy * 1000);
    }
  }

  return { result, withDiscrepancy, unclassified };
}

// ─── Main ─────────────────────────────────────────────

console.log(`Building NHS trust expenditure breakdown for ${YEAR}\n`);

// Load ICB mapping
const icbMappingPath = path.join(UK_DIR, 'nhs_icb_trust_mapping.json');
if (!fs.existsSync(icbMappingPath)) {
  console.error('Missing ICB mapping. Run scripts/build_icb_mapping.js first.');
  process.exit(1);
}
const icbMapping = JSON.parse(fs.readFileSync(icbMappingPath, 'utf8'));
console.log(`Loaded ICB mapping: ${Object.keys(icbMapping).length} trusts`);

// Parse both TAC files
const trustsFile = path.join(UK_DIR, `nhs_tac_trusts_${YEAR}.xlsx`);
const ftFile = path.join(UK_DIR, `nhs_tac_ft_${YEAR}.xlsx`);

console.log(`Parsing ${path.basename(trustsFile)}...`);
const trustsData = parseTACFile(trustsFile);
console.log(`  ${Object.keys(trustsData).length} trusts with EXP data`);

console.log(`Parsing ${path.basename(ftFile)}...`);
const ftData = parseTACFile(ftFile);
console.log(`  ${Object.keys(ftData).length} foundation trusts with EXP data`);

// Combine
const allData = { ...trustsData, ...ftData };
console.log(`\nTotal: ${Object.keys(allData).length} trusts/FTs\n`);

// Build breakdown
const { result, withDiscrepancy, unclassified } = buildBreakdown(allData, icbMapping);
console.log(`Built breakdown for ${Object.keys(result).length} trusts`);
console.log(`  With sum > total discrepancies (capped at 0): ${withDiscrepancy}`);
console.log(`  Unclassified (no ICB mapping match): ${unclassified}`);

// Aggregate stats
const totals = { staff: 0, supplies: 0, premises: 0, other: 0, total: 0 };
for (const t of Object.values(result)) {
  totals.staff += t.staff_costs;
  totals.supplies += t.supplies;
  totals.premises += t.premises;
  totals.other += t.other;
  totals.total += t.total;
}
console.log('\nAggregate (across all 206+ trusts):');
console.log(`  Total:    £${(totals.total / 1e9).toFixed(2)}B`);
console.log(`  Staff:    £${(totals.staff / 1e9).toFixed(2)}B  (${(totals.staff/totals.total*100).toFixed(1)}%)`);
console.log(`  Supplies: £${(totals.supplies / 1e9).toFixed(2)}B  (${(totals.supplies/totals.total*100).toFixed(1)}%)`);
console.log(`  Premises: £${(totals.premises / 1e9).toFixed(2)}B  (${(totals.premises/totals.total*100).toFixed(1)}%)`);
console.log(`  Other:    £${(totals.other / 1e9).toFixed(2)}B  (${(totals.other/totals.total*100).toFixed(1)}%)`);
const sum = totals.staff + totals.supplies + totals.premises + totals.other;
console.log(`  Sum:      £${(sum / 1e9).toFixed(2)}B  (${sum === totals.total ? '✓ matches total' : '✗ MISMATCH ' + (totals.total - sum)})`);

// Spot checks
console.log('\nSpot checks:');
const samples = ['Barts Health NHS Trust', 'Manchester University NHS Foundation Trust', 'Guy\'s & St Thomas\' NHS Foundation Trust', 'London Ambulance Service NHS Trust', 'The Royal Marsden NHS Foundation Trust'];
for (const sample of samples) {
  const t = result[sample];
  if (!t) { console.log(`  ${sample}: NOT FOUND`); continue; }
  console.log(`  ${sample} [${t.sector}]`);
  console.log(`    Total: £${(t.total/1e9).toFixed(2)}B  | ICB: ${t.icb_name || 'none'}`);
  console.log(`    Staff: £${(t.staff_costs/1e9).toFixed(2)}B (${(t.staff_costs/t.total*100).toFixed(0)}%)  Supplies: £${(t.supplies/1e6).toFixed(0)}M (${(t.supplies/t.total*100).toFixed(0)}%)  Premises: £${(t.premises/1e6).toFixed(0)}M (${(t.premises/t.total*100).toFixed(0)}%)  Other: £${(t.other/1e6).toFixed(0)}M (${(t.other/t.total*100).toFixed(0)}%)`);
}

fs.writeFileSync(OUTPUT, JSON.stringify(result, null, 2));
console.log(`\n✓ Written: ${path.relative(DATA_DIR, OUTPUT)}`);
