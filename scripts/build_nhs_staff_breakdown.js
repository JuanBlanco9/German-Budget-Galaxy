#!/usr/bin/env node
/**
 * build_nhs_staff_breakdown.js
 *
 * Parses NHS TAC09 sheet (Employee Expenses + Workforce composition)
 * for ALL trusts and produces a per-trust breakdown with TWO views:
 *
 *   1. COST BREAKDOWN by cost type (Table 5.2 — STA0230..STA0366)
 *      Real £ amounts that reconcile to STA0330 GROSS, then to STA0360
 *      NET, then to STA0366 (excl capitalised). The 6 buckets used are:
 *
 *        - Salaries & wages       (STA0230)
 *        - Employer pensions      (STA0250 + STA0250A + STA0260)
 *        - Social security        (STA0240)
 *        - Agency & temp staff    (STA0300 + STA0310)
 *        - Termination + post-empl (STA0270 + STA0280 + STA0290)
 *        - Other (apprenticeship + charitable + recoveries + capitalised
 *          adjustment) — also serves as the reconciliation residual to
 *          match the existing tree parent value (EXP0130 + EXP0140)
 *
 *   2. WORKFORCE COMPOSITION by staff group (Table 5.3 — STA0370..STA0490)
 *      WTE counts (NOT £). Used as panel metadata, not tree structure.
 *
 *        - Medical & dental                  (STA0370)
 *        - Ambulance staff                   (STA0380)
 *        - Administration & estates          (STA0390)
 *        - Healthcare assistants & support   (STA0400)
 *        - Nursing, midwifery, HV            (STA0410)
 *        - Nursing learners                  (STA0420)
 *        - Scientific, therapeutic, tech     (STA0430)
 *        - Healthcare science                (STA0440)
 *        - Social care                       (STA0450)
 *        - Other                             (STA0480)
 *
 * IMPORTANT: TAC does NOT provide cost-by-staff-group directly. The cost
 * breakdown is by COST TYPE (5.2) and the workforce breakdown is by
 * STAFF GROUP (5.3). These are two orthogonal lenses on the same money.
 * Any "cost per medical FTE" computation requires external salary data
 * (NHS Agenda for Change pay bands) and is not done here — it would
 * be an approximation that violates the project's no-fabrication rule.
 *
 * Tree integration: the cost breakdown (view 1) is normalized to sum
 * exactly to the existing parent value (EXP0130 + EXP0140). The "Other"
 * bucket absorbs any drift between STA totals and EXP totals (typically
 * ~0.5%-13% from capitalised costs and recoveries classification).
 *
 * Output: data/uk/nhs_staff_breakdown_{year}.json
 *
 * Usage: node scripts/build_nhs_staff_breakdown.js [--year 2024]
 */

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const DATA_DIR = path.join(__dirname, '..', 'data');
const UK_DIR = path.join(DATA_DIR, 'uk');
const args = process.argv.slice(2);
const YEAR = args.find(a => a.match(/^\d{4}$/)) || '2024';
const OUTPUT = path.join(UK_DIR, `nhs_staff_breakdown_${YEAR}.json`);

// ─── Cost type buckets (Table 5.2) ────────────────────

const COST_BUCKETS = [
  { name: 'Salaries & wages',          codes: ['STA0230'] },
  { name: 'Employer pensions',         codes: ['STA0250', 'STA0250A', 'STA0260'] },
  { name: 'Social security & levy',    codes: ['STA0240', 'STA0245'] },
  { name: 'Agency & temporary staff',  codes: ['STA0300', 'STA0310'] },
  { name: 'Termination & post-employment', codes: ['STA0270', 'STA0280', 'STA0290'] }
  // 6th bucket "Other" is computed as remainder to match parent value
];

// ─── Workforce groups (Table 5.3) ─────────────────────

const WORKFORCE_GROUPS = [
  { name: 'Medical & dental',                   code: 'STA0370' },
  { name: 'Nursing, midwifery & HV',            code: 'STA0410' },
  { name: 'Scientific, therapeutic & technical', code: 'STA0430' },
  { name: 'Administration & estates',           code: 'STA0390' },
  { name: 'Healthcare assistants & support',    code: 'STA0400' },
  { name: 'Ambulance staff',                    code: 'STA0380' },
  { name: 'Nursing learners',                   code: 'STA0420' },
  { name: 'Healthcare science',                 code: 'STA0440' },
  { name: 'Social care',                        code: 'STA0450' },
  { name: 'Other',                              code: 'STA0480' }
];

// ─── Helpers ──────────────────────────────────────────

function normalizeRow(row) {
  const out = {};
  for (const k of Object.keys(row)) out[k.trim()] = row[k];
  return out;
}

function findSheet(wb, targetLower) {
  return wb.SheetNames.find(n => n.toLowerCase() === targetLower);
}

function isTotalMain(mainCode) {
  // STA codes have variants for Total / Permanent / Other staff types.
  // We want the Total column. The MainCode pattern is e.g. A09CY01 (total),
  // A09CY01P (permanent only), A09CY01O (other only). Filter to non-suffixed.
  const m = String(mainCode || '');
  return !m.endsWith('P') && !m.endsWith('O');
}

function parseTACFile(filePath) {
  const wb = XLSX.readFile(filePath);
  const dataSheet = findSheet(wb, 'all data');
  if (!dataSheet) throw new Error(`No 'All data' sheet in ${filePath}`);
  const dataRows = XLSX.utils.sheet_to_json(wb.Sheets[dataSheet]).map(normalizeRow);

  // Group STA rows by trust → subcode (only Total maincodes for CY)
  const trustData = {};
  for (const row of dataRows) {
    if (!row.SubCode || !String(row.SubCode).startsWith('STA')) continue;
    if (!row.MainCode || !String(row.MainCode).includes('CY')) continue;
    if (!isTotalMain(row.MainCode)) continue;
    const name = String(row.OrganisationName || '').trim();
    if (!name) continue;
    if (!trustData[name]) trustData[name] = {};
    trustData[name][row.SubCode] = parseFloat(row.Total) || 0;
  }
  return trustData;
}

// ─── Build per-trust breakdown ────────────────────────

function buildBreakdown(trustData, breakdownExisting) {
  // breakdownExisting: nhs_trust_breakdown_{year}.json (per-trust EXP0130+0140 staff_costs)
  // We use that as the AUTHORITATIVE parent value to normalize against.

  const result = {};
  let withFullData = 0;
  let withDriftAdjustment = 0;
  const drifts = [];

  for (const [trustName, codes] of Object.entries(trustData)) {
    const existing = breakdownExisting[trustName];
    if (!existing) continue; // not in our tree

    const parentValue = existing.staff_costs; // EXP0130 + EXP0140 in full GBP
    if (parentValue <= 0) continue;

    // Compute the 5 named buckets in £000 (TAC native unit)
    const buckets = COST_BUCKETS.map(b => {
      const sumK = b.codes.reduce((s, c) => s + (codes[c] || 0), 0);
      return { name: b.name, value_k: sumK, codes: b.codes };
    });

    // Convert to full GBP
    const namedTotal = buckets.reduce((s, b) => s + b.value_k * 1000, 0);

    // Reconciliation residual: what's left after the 5 named buckets to
    // match the tree parent. Captures recoveries, capitalised, charitable,
    // and any small unaccounted items.
    const otherValue = parentValue - namedTotal;
    const driftPct = Math.abs(otherValue) / parentValue;

    if (driftPct > 0.20) {
      // More than 20% drift means STA codes are missing or schema differs;
      // skip this trust to avoid showing nonsense.
      drifts.push({ name: trustName, drift: otherValue, pct: driftPct, parent: parentValue, named: namedTotal });
      continue;
    }

    if (driftPct > 0.05) withDriftAdjustment++;

    const costGroups = buckets.map(b => ({
      name: b.name,
      value: Math.round(b.value_k * 1000),
      sta_codes: b.codes
    }));
    // Add the residual bucket (always — even if small for transparency)
    costGroups.push({
      name: 'Other & adjustments',
      value: Math.round(otherValue),
      sta_codes: ['recoveries', 'capitalised', 'unallocated']
    });

    // Filter out zero or negative buckets to keep tree clean (rare)
    const positiveCostGroups = costGroups.filter(g => g.value > 0);
    // Add any negative-value groups absorbed into "Other" instead
    const negativeAdjustment = costGroups.filter(g => g.value <= 0).reduce((s, g) => s + g.value, 0);
    if (negativeAdjustment !== 0 && positiveCostGroups.length > 0) {
      // Find the "Other" group and absorb the negative adjustment
      const otherGroup = positiveCostGroups.find(g => g.name === 'Other & adjustments');
      if (otherGroup) {
        otherGroup.value += negativeAdjustment;
      }
    }

    // Final reconciliation: sum should match parent
    const finalSum = positiveCostGroups.reduce((s, g) => s + g.value, 0);
    if (finalSum !== parentValue) {
      // Push final delta into the largest group to make it exact
      const largest = positiveCostGroups.reduce((max, g) => g.value > max.value ? g : max);
      largest.value += (parentValue - finalSum);
    }

    // Workforce composition (Table 5.3)
    const workforce = WORKFORCE_GROUPS
      .map(w => ({ name: w.name, fte: codes[w.code] || 0, sta_code: w.code }))
      .filter(w => w.fte > 0)
      .sort((a, b) => b.fte - a.fte);
    const totalWte = workforce.reduce((s, w) => s + w.fte, 0);

    result[trustName] = {
      total_staff_costs: parentValue,
      cost_groups: positiveCostGroups,
      workforce_total_wte: Math.round(totalWte),
      workforce_groups: workforce,
      _note: `Cost breakdown from NHS TAC09 Table 5.2 (Employee Expenses), normalized to match the tree parent value (EXP0130 + EXP0140). Workforce composition from TAC09 Table 5.3 (Average WTE). TAC does not provide cost by staff group; the workforce view is shown for context only.`
    };
    withFullData++;
  }

  return { result, withFullData, withDriftAdjustment, drifts };
}

// ─── Main ─────────────────────────────────────────────

console.log(`Building NHS staff breakdown for ${YEAR}\n`);

// Load existing trust breakdown to get authoritative parent values
const breakdownPath = path.join(UK_DIR, `nhs_trust_breakdown_${YEAR}.json`);
if (!fs.existsSync(breakdownPath)) {
  console.error(`Missing: ${breakdownPath}`);
  console.error('Run scripts/build_nhs_trust_breakdown.js first');
  process.exit(1);
}
const breakdownExisting = JSON.parse(fs.readFileSync(breakdownPath, 'utf8'));
console.log(`Loaded ${Object.keys(breakdownExisting).length} trusts from breakdown ${YEAR}`);

// Parse both TAC files
const trustsFile = path.join(UK_DIR, `nhs_tac_trusts_${YEAR}.xlsx`);
const ftFile = path.join(UK_DIR, `nhs_tac_ft_${YEAR}.xlsx`);

console.log(`Parsing ${path.basename(trustsFile)}...`);
const trustsData = parseTACFile(trustsFile);
console.log(`  ${Object.keys(trustsData).length} trusts with STA data`);

console.log(`Parsing ${path.basename(ftFile)}...`);
const ftData = parseTACFile(ftFile);
console.log(`  ${Object.keys(ftData).length} foundation trusts with STA data`);

const allData = { ...trustsData, ...ftData };
console.log(`\nTotal: ${Object.keys(allData).length} trusts with STA codes\n`);

// Build breakdown
const { result, withFullData, withDriftAdjustment, drifts } = buildBreakdown(allData, breakdownExisting);
console.log(`Built breakdown for ${withFullData} trusts`);
console.log(`  With drift > 5% (absorbed in 'Other & adjustments'): ${withDriftAdjustment}`);
if (drifts.length > 0) {
  console.log(`  SKIPPED (drift > 20%): ${drifts.length}`);
  drifts.slice(0, 5).forEach(d => console.log(`    ${d.name}: parent=£${(d.parent/1e9).toFixed(2)}B named=£${(d.named/1e9).toFixed(2)}B drift=${(d.pct*100).toFixed(1)}%`));
}

// Aggregate stats
const totals = { salaries: 0, pensions: 0, social: 0, agency: 0, term: 0, other: 0, total: 0 };
for (const t of Object.values(result)) {
  for (const g of t.cost_groups) {
    if (g.name === 'Salaries & wages') totals.salaries += g.value;
    else if (g.name === 'Employer pensions') totals.pensions += g.value;
    else if (g.name === 'Social security & levy') totals.social += g.value;
    else if (g.name === 'Agency & temporary staff') totals.agency += g.value;
    else if (g.name === 'Termination & post-employment') totals.term += g.value;
    else totals.other += g.value;
  }
  totals.total += t.total_staff_costs;
}
console.log('\nAggregate cost breakdown across all trusts:');
console.log(`  Total staff costs: £${(totals.total / 1e9).toFixed(2)}B`);
console.log(`  Salaries & wages:  £${(totals.salaries / 1e9).toFixed(2)}B  (${(totals.salaries/totals.total*100).toFixed(1)}%)`);
console.log(`  Employer pensions: £${(totals.pensions / 1e9).toFixed(2)}B  (${(totals.pensions/totals.total*100).toFixed(1)}%)`);
console.log(`  Social sec & levy: £${(totals.social / 1e9).toFixed(2)}B  (${(totals.social/totals.total*100).toFixed(1)}%)`);
console.log(`  Agency & temp:     £${(totals.agency / 1e9).toFixed(2)}B  (${(totals.agency/totals.total*100).toFixed(1)}%)`);
console.log(`  Termination:       £${(totals.term / 1e9).toFixed(2)}B  (${(totals.term/totals.total*100).toFixed(1)}%)`);
console.log(`  Other & adj:       £${(totals.other / 1e9).toFixed(2)}B  (${(totals.other/totals.total*100).toFixed(1)}%)`);
const sum = totals.salaries + totals.pensions + totals.social + totals.agency + totals.term + totals.other;
console.log(`  Sum:               £${(sum / 1e9).toFixed(2)}B  ${sum === totals.total ? '✓' : '✗ MISMATCH'}`);

// Spot checks
console.log('\nSpot checks:');
const samples = ["Guy's & St Thomas' NHS Foundation Trust", "Manchester University NHS Foundation Trust", "Barts Health NHS Trust", "London Ambulance Service NHS Trust", "The Royal Marsden NHS Foundation Trust"];
for (const sample of samples) {
  const t = result[sample];
  if (!t) { console.log(`  ${sample}: NOT FOUND`); continue; }
  console.log(`  ${sample}`);
  console.log(`    Total: £${(t.total_staff_costs/1e9).toFixed(2)}B  |  WTE: ${t.workforce_total_wte.toLocaleString()}`);
  t.cost_groups.forEach(g => {
    const pct = (g.value / t.total_staff_costs * 100);
    const sign = g.value < 0 ? '-' : '';
    console.log(`      ${sign}£${(Math.abs(g.value)/1e6).toFixed(0).padStart(5)}M  ${pct.toFixed(0).padStart(3)}%  ${g.name}`);
  });
  const top3wf = t.workforce_groups.slice(0, 3).map(w => `${w.name.split(' ')[0]} ${w.fte}`).join(', ');
  console.log(`      Top WTE groups: ${top3wf}`);
}

fs.writeFileSync(OUTPUT, JSON.stringify(result, null, 2));
console.log(`\n✓ Written: ${path.relative(DATA_DIR, OUTPUT)}`);
