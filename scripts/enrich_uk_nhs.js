#!/usr/bin/env node
/**
 * Enrich UK budget trees: inject NHS ICB allocations as children
 * of the "NHS Trusts" node under Department of Health.
 *
 * Replaces unhelpful OSCAR SEGMENT_L4 accounting lines with
 * 42 Integrated Care Boards that show real geographic distribution.
 */
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const DATA_DIR = path.resolve(__dirname, '..', 'data', 'uk');

// Parse ICB allocations from NHS England Excel
function parseICBAllocations(year) {
  // We have 2023-24/2024-25 combined file and 2025-26 file
  const files = [
    { path: path.join(__dirname, '..', 'data', 'recipients', 'uk', 'nhs_allocations_2023_2025.xlsx'), years: [2023, 2024] },
    { path: path.join(__dirname, '..', 'data', 'recipients', 'uk', 'nhs_allocations_2025_26.xlsx'), years: [2025] },
  ];

  const match = files.find(f => f.years.includes(year));
  if (!match || !fs.existsSync(match.path)) return null;

  const wb = XLSX.readFile(match.path);
  const fy = `${year}/${String(year + 1).slice(2)}`;
  const fyAlt = `${year}-${String(year + 1).slice(2)}`;

  const icbs = {};

  // Extract from each relevant sheet
  for (const sheetName of wb.SheetNames) {
    if (!sheetName.includes(String(year))) continue;
    const ws = wb.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
    if (data.length < 4) continue;

    const headers = data[2] || [];
    // Find the allocation column for this year - look for "Recurrent allocation (£k)" or "Combined allocation"
    let valIdx = -1;
    for (let i = headers.length - 1; i >= 0; i--) {
      const h = String(headers[i] || '');
      if (h.includes(String(year)) && (h.includes('Combined allocation') || h.includes('Total allocation'))) {
        valIdx = i; break;
      }
    }
    if (valIdx < 0) {
      for (let i = headers.length - 1; i >= 0; i--) {
        const h = String(headers[i] || '');
        if (h.includes(String(year)) && h.includes('Recurrent allocation (')) {
          valIdx = i; break;
        }
      }
    }
    if (valIdx < 0) continue;

    for (let i = 3; i < data.length; i++) {
      const r = data[i];
      if (!r || !r[3]) continue;
      const name = String(r[3]).trim();
      const region = r[1] ? String(r[1]).trim() : '';
      if (!name.startsWith('NHS ')) continue;
      const val = parseFloat(r[valIdx]) || 0;
      if (!icbs[name]) icbs[name] = { region, total: 0 };
      icbs[name].total += val;
    }
  }

  // Convert to array sorted by value (values in £k, convert to £)
  return Object.entries(icbs)
    .map(([name, d]) => ({ name, region: d.region, value: Math.round(d.total * 1000) }))
    .filter(x => x.value > 0)
    .sort((a, b) => b.value - a.value);
}

// Process each year
for (const year of [2020, 2021, 2022, 2023, 2024]) {
  const treePath = path.join(DATA_DIR, `uk_budget_tree_${year}.json`);
  if (!fs.existsSync(treePath)) continue;

  const tree = JSON.parse(fs.readFileSync(treePath, 'utf8'));

  // Find Department of Health
  const health = tree.children.find(c => c.name && c.name.includes('DEPARTMENT OF HEALTH'));
  if (!health) { console.log(`${year}: No Health dept found`); continue; }

  // Find NHS Trusts node (direct child of Health)
  const nhsTrusts = (health.children || []).find(c => c.name && c.name.includes('NHS Trusts'));
  if (!nhsTrusts) { console.log(`${year}: No NHS Trusts node`); continue; }

  // Parse ICB data for this year
  const icbs = parseICBAllocations(year);
  if (!icbs || icbs.length === 0) {
    console.log(`${year}: No ICB allocation data available`);
    continue;
  }

  const icbTotal = icbs.reduce((s, x) => s + x.value, 0);
  const nhsValue = nhsTrusts.value;

  // Create ICB children
  const deptId = health.id || 'department_of_health';
  const icbChildren = icbs.map(icb => ({
    id: deptId + '__nhs_trusts__' + icb.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/_+$/, ''),
    name: icb.name,
    value: icb.value,
    _source: 'NHS England ICB Allocations'
  }));

  // If NHS value > ICB total, add a remainder node
  const remainder = nhsValue - icbTotal;
  if (remainder > 1000000) {
    icbChildren.push({
      id: deptId + '__nhs_trusts__other_nhs_spending',
      name: 'Other NHS Trust Spending',
      value: remainder,
      _source: 'Remainder (NHS Trusts total minus ICB allocations)'
    });
  }

  // Replace children: if NHS Trusts has subfunctions, replace at that level
  if (nhsTrusts.children && nhsTrusts.children.length > 0) {
    // Check if there's a "7.A Medical services" subfunc
    const medSvc = nhsTrusts.children.find(c => c.name && c.name.includes('7.A Medical'));
    if (medSvc) {
      // Replace the subfunc's children (the useless SEGMENT_L4 lines) with ICBs
      medSvc.children = icbChildren.filter(c => c.value > 0);
      // Also handle the "n/a" subfunc if present
      const naSvc = nhsTrusts.children.find(c => c.name === 'n/a');
      if (naSvc && naSvc.value > 0 && !naSvc.children) {
        naSvc.children = [{
          id: deptId + '__nhs_trusts__na__non_patient_facing',
          name: 'Non-patient-facing NHS expenditure',
          value: naSvc.value,
          _source: 'OSCAR (not classified under COFOG Medical services)'
        }];
      }
    } else {
      nhsTrusts.children = icbChildren;
    }
  } else {
    // NHS Trusts is a leaf — set children directly
    nhsTrusts.children = icbChildren;
  }

  fs.writeFileSync(treePath, JSON.stringify(tree));
  console.log(`${year}: Injected ${icbs.length} ICBs (£${(icbTotal/1e9).toFixed(1)}B) into NHS Trusts (£${(nhsValue/1e9).toFixed(1)}B)`);
}

console.log('\nDone!');
