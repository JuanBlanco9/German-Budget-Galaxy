#!/usr/bin/env node
/**
 * build_subcategory_lookup.js
 *
 * Builds _subcategories metadata for each council service node.
 * Shows what the spend within a service (e.g. "Adult Social Care") is
 * actually spent on (e.g. "Residential Care 36%", "Domiciliary Care 24%").
 *
 * Uses the same mapping files from classify_council_departments.js to
 * map each transaction to an MHCLG service, then groups by the purpose
 * column to create subcategory breakdowns.
 *
 * Output: modifies uk_budget_tree_{year}.json in-place, adding
 * _subcategories metadata to service nodes. Tree values unchanged.
 *
 * Usage: node scripts/build_subcategory_lookup.js [--year 2024] [--dry-run]
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const UK_DIR = path.join(DATA_DIR, 'uk');
const LA_DIR = path.join(UK_DIR, 'local_authorities');
const SPEND_DIR = path.join(LA_DIR, 'spend');
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const YEAR = args.find(a => a.match(/^\d{4}$/)) || '2024';
const TOP_SUB = 7;

function parseCSVLine(line, sep) {
  const r = []; let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { if (inQ && line[i + 1] === '"') { cur += '"'; i++; } else inQ = !inQ; }
    else if (c === sep && !inQ) { r.push(cur); cur = ''; }
    else cur += c;
  }
  r.push(cur); return r;
}

// Council configs — must have both dept and purpose columns
const COUNCILS = [
  {
    name: 'Kent', dir: 'kent', sep: ',', headerHint: 'Body',
    deptCol: 'Directorate', purposeCol: 'Service Description',
    amountCol: 'Invoice NET', mappingFile: 'kent_dept_mapping.json'
  },
  {
    name: 'East Sussex', dir: 'east_sussex', sep: ',',
    deptCol: 'Department', purposeCol: 'Payment Category',
    amountCol: 'Amount', mappingFile: 'east_sussex_dept_mapping.json'
  },
  {
    name: 'Sheffield', dir: 'sheffield', sep: ',',
    deptCol: 'Portfolio', purposeCol: 'Category Description',
    amountCol: 'Value', mappingFile: 'sheffield_dept_mapping.json'
  },
  {
    name: 'Buckinghamshire', dir: 'buckinghamshire', sep: ',',
    deptCol: 'Directorate', purposeCol: 'Expense type',
    amountCol: 'Invoice Amount', mappingFile: 'buckinghamshire_dept_mapping.json'
  },
  {
    name: 'North Yorkshire', dir: 'north_yorkshire', sep: ',',
    deptCol: 'DIRECTORATE_DESCRIPTION', purposeCol: 'COST_CENTRE_DESCRIPTION',
    amountCol: 'INVOICE_AMOUNT', mappingFile: 'north_yorkshire_dept_mapping.json'
  },
  {
    name: 'Hertfordshire', dir: 'hertfordshire', sep: ',',
    deptCol: 'Dept. where expenditure incurred',
    purposeCol: 'Purpose of Expenditure (Expenditure Category)',
    amountCol: 'Net Amount', mappingFile: 'hertfordshire_dept_mapping.json'
  },
  {
    name: 'Cornwall', dir: 'cornwall', sep: ',',
    deptCol: 'Directorate', purposeCol: 'Service/Board',
    amountCol: 'Net Amount', mappingFile: 'cornwall_dept_mapping.json'
  },
  {
    name: 'Bristol', dir: 'bristol', sep: ',',
    deptCol: 'Description 2', purposeCol: 'Description 1',
    amountCol: 'Amount', mappingFile: 'bristol_dept_mapping.json'
  },
  {
    name: 'Dudley', dir: 'dudley', sep: ',',
    deptCol: 'directorate', purposeCol: 'service',
    amountCol: 'amount net', mappingFile: 'dudley_dept_mapping.json'
  },
  {
    name: 'Lambeth', dir: 'lambeth', sep: ',',
    deptCol: 'Directorate', purposeCol: 'Division',
    amountCol: 'Amount', mappingFile: 'lambeth_dept_mapping.json'
  },
  {
    name: 'Merton', dir: 'merton', sep: ',',
    deptCol: 'Directorate', purposeCol: 'Purpose of Expenditure',
    amountCol: 'Gross Invoice Value', mappingFile: 'merton_dept_mapping.json'
  }
];

function processCouncil(cfg) {
  const mappingPath = path.join(SPEND_DIR, cfg.mappingFile);
  if (!fs.existsSync(mappingPath)) return null;
  const mapping = JSON.parse(fs.readFileSync(mappingPath, 'utf8')).patterns;

  const dirPath = path.join(SPEND_DIR, cfg.dir);
  if (!fs.existsSync(dirPath)) return null;
  const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.csv'));

  // { mhclgCategory: { purposeLabel: { value, tx } } }
  const result = {};
  let totalRows = 0;

  for (const file of files) {
    const fp = path.join(dirPath, file);
    const raw = fs.readFileSync(fp, 'utf8').replace(/^\uFEFF/, '');
    const lines = raw.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) continue;

    let headerRowIdx = 0;
    if (cfg.headerHint) {
      for (let k = 0; k < Math.min(8, lines.length); k++) {
        if (lines[k].includes(cfg.headerHint)) { headerRowIdx = k; break; }
      }
    }

    const headers = parseCSVLine(lines[headerRowIdx], cfg.sep).map(h => h.replace(/^"|"$/g, '').trim());
    const findCol = name => {
      let idx = headers.findIndex(h => h === name);
      if (idx < 0) idx = headers.findIndex(h => h.toLowerCase() === name.toLowerCase());
      return idx;
    };

    const dIdx = findCol(cfg.deptCol);
    const pIdx = findCol(cfg.purposeCol);
    const aIdx = findCol(cfg.amountCol);
    if (dIdx < 0 || pIdx < 0 || aIdx < 0) continue;

    for (let i = headerRowIdx + 1; i < lines.length; i++) {
      const cols = parseCSVLine(lines[i], cfg.sep);
      const dept = (cols[dIdx] || '').replace(/^"|"$/g, '').trim();
      const purpose = (cols[pIdx] || '').replace(/^"|"$/g, '').trim();
      const amtRaw = (cols[aIdx] || '').replace(/^"|"$/g, '').replace(/[£,\s]/g, '');
      const amt = parseFloat(amtRaw);
      if (isNaN(amt) || amt <= 0 || !dept) continue;

      // Look up MHCLG category from mapping
      const patKey = dept + '|' + purpose;
      const deptOnlyKey = dept + '|';
      const mhclg = mapping[patKey] || mapping[deptOnlyKey] || 'Other Services';

      if (!result[mhclg]) result[mhclg] = {};
      const label = purpose || 'Unspecified';
      if (!result[mhclg][label]) result[mhclg][label] = { value: 0, tx: 0 };
      result[mhclg][label].value += amt;
      result[mhclg][label].tx++;
      totalRows++;
    }
  }

  if (totalRows === 0) return null;

  // Build top subcategories per service
  const output = {};
  for (const [svc, purposes] of Object.entries(result)) {
    const total = Object.values(purposes).reduce((s, p) => s + p.value, 0);
    const sorted = Object.entries(purposes)
      .map(([name, d]) => ({ name, value: Math.round(d.value), tx: d.tx }))
      .sort((a, b) => b.value - a.value);

    if (sorted.length < 2) continue;

    const top = sorted.slice(0, TOP_SUB).map(s => ({
      ...s, pct: parseFloat((s.value / total * 100).toFixed(1))
    }));
    const otherVal = sorted.slice(TOP_SUB).reduce((s, x) => s + x.value, 0);
    if (otherVal > 0 && sorted.length > TOP_SUB) {
      top.push({
        name: 'Other',
        value: Math.round(otherVal),
        pct: parseFloat((otherVal / total * 100).toFixed(1)),
        tx: sorted.slice(TOP_SUB).reduce((s, x) => s + x.tx, 0)
      });
    }
    output[svc] = top;
  }

  return { name: cfg.name, services: output, totalRows };
}

// ─── Main ────────────────────────────────────────────

console.log(`Building subcategory lookup for ${YEAR}\n`);

const allSubcats = {};
for (const cfg of COUNCILS) {
  const result = processCouncil(cfg);
  if (!result) { console.log(`  ${cfg.name}: skipped (no data)`); continue; }
  allSubcats[cfg.name] = result.services;
  const svcs = Object.keys(result.services);
  console.log(`  ${cfg.name}: ${svcs.length} services with subcategories (${result.totalRows} rows)`);
  if (!DRY_RUN) {
    svcs.slice(0, 2).forEach(s => {
      console.log(`    ${s}: ${result.services[s].slice(0, 3).map(c => c.pct + '% ' + c.name).join(', ')}`);
    });
  }
}

if (DRY_RUN) { console.log('\nDry run — no changes made.'); process.exit(0); }

// Inject into tree
const treePath = path.join(UK_DIR, `uk_budget_tree_${YEAR}.json`);
const tree = JSON.parse(fs.readFileSync(treePath, 'utf8'));
const lg = tree.children.find(c => c.id === 'local_government_england');
if (!lg) { console.error('local_government_england not found'); process.exit(1); }

function normalizeName(n) { return String(n).toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim(); }

let injected = 0;
for (const cls of lg.children) {
  for (const council of cls.children) {
    const norm = normalizeName(council.name);
    let subcats = null;
    for (const [key, subs] of Object.entries(allSubcats)) {
      const keyNorm = normalizeName(key);
      if (norm === keyNorm || norm.startsWith(keyNorm + ' ') || keyNorm === norm.split(' ')[0]) {
        subcats = subs;
        break;
      }
    }
    if (!subcats) continue;

    for (const serviceNode of council.children || []) {
      if (subcats[serviceNode.name] && subcats[serviceNode.name].length >= 2) {
        serviceNode._subcategories = subcats[serviceNode.name];
        injected++;
      }
    }
  }
}

fs.writeFileSync(treePath, JSON.stringify(tree, null, 2));
console.log(`\n✓ Injected _subcategories into ${injected} service nodes`);
console.log(`✓ Written to uk_budget_tree_${YEAR}.json`);
