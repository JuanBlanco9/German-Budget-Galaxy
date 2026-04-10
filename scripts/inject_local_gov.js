#!/usr/bin/env node
/**
 * inject_local_gov.js
 *
 * Parses MHCLG Revenue Outturn timeseries CSV and injects a
 * "Local Government (England)" top-level node into the UK budget tree.
 *
 * Source: MHCLG Revenue Outturn Summary (RO5) 2017-2025
 * File:   data/uk/local_authorities/revenue_outturn_timeseries.csv
 *
 * CRITICAL: Injected as a NEW top-level sibling of existing departments,
 *           NEVER as a child of any department.
 *
 * Usage: node scripts/inject_local_gov.js [--dry-run] [--year 2024]
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const UK_DIR = path.join(DATA_DIR, 'uk');
const LA_DIR = path.join(UK_DIR, 'local_authorities');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');

// Target year: uk_budget_tree_2024.json = fiscal 2024-25
// But the CSV uses year_ending format: 202403 = FY 2023-24
// OSCAR 2024 = FY 2024-25, so we want year_ending=202503
// However, 202503 may have fewer submissions. Let's check both.
const yearArg = args.find(a => a.match(/^\d{4}$/)) || '2024';

// Fiscal year mapping:
// OSCAR tree 2024 = FY 2024-25 → CSV year_ending 202503
// OSCAR tree 2023 = FY 2023-24 → CSV year_ending 202403
// We'll prefer the most complete year available.
const OSCAR_TO_CSV = {
  '2024': '202503',
  '2023': '202403',
  '2022': '202303',
  '2021': '202203',
  '2020': '202103',
  '2019': '202003',
  '2018': '201903',
  '2017': '201803'
};

// Service category labels
const SERVICE_COLS = [
  { col: 'RSX_edu_net_cur_exp', name: 'Education' },
  { col: 'RSX_asc_net_cur_exp', name: 'Adult Social Care' },
  { col: 'RSX_csc_net_cur_exp', name: "Children's Social Care" },
  { col: 'RSX_phs_net_cur_exp', name: 'Public Health' },
  { col: 'RSX_hous_net_cur_exp', name: 'Housing' },
  { col: 'RSX_trans_net_cur_exp', name: 'Transport' },
  { col: 'RSX_env_net_cur_exp', name: 'Environment' },
  { col: 'RSX_cul_net_cur_exp', name: 'Culture' },
  { col: 'RSX_plan_net_cur_exp', name: 'Planning' },
  { col: 'RSX_pol_net_cur_exp', name: 'Police' },
  { col: 'RSX_frs_net_cur_exp', name: 'Fire & Rescue' },
  { col: 'RSX_cen_net_cur_exp', name: 'Central Services' },
  { col: 'RSX_oth_net_cur_exp', name: 'Other Services' }
];

// Class labels for display
const CLASS_LABELS = {
  'Shire County': 'Shire Counties',
  'Shire District': 'Shire Districts',
  'Met District': 'Metropolitan Districts',
  'London': 'London Boroughs',
  'Unitary Authority': 'Unitary Authorities',
  'Other': 'Other Authorities'
};

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
  const dest = path.join(BACKUP_DIR, path.basename(fp));
  if (!fs.existsSync(dest)) {
    fs.copyFileSync(fp, dest);
    console.log(`  Backed up → ${path.relative(DATA_DIR, dest)}`);
  }
}

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
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

// ─── Parse CSV ────────────────────────────────────────

function parseCSV(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const lines = raw.split('\n').filter(l => l.trim());
  const headers = parseCSVLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = parseCSVLine(lines[i]);
    const row = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = vals[j] || '';
    }
    rows.push(row);
  }
  return rows;
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += c;
    }
  }
  result.push(current.trim());
  return result;
}

// ─── Build tree ───────────────────────────────────────

function buildLocalGovTree(rows, csvYear) {
  // Filter for target year, submitted status, exclude totals and "Eng"
  const filtered = rows.filter(r =>
    r.year_ending === csvYear &&
    r.status === 'submitted' &&
    r.LA_class !== 'Eng' &&
    r.LA_class !== ''
  );

  console.log(`  Filtered: ${filtered.length} submitted LAs for year_ending=${csvYear}`);

  // Group by LA_class
  const byClass = {};
  for (const r of filtered) {
    const cls = r.LA_class || 'Other';
    if (!byClass[cls]) byClass[cls] = [];
    byClass[cls].push(r);
  }

  const classChildren = [];
  for (const [cls, las] of Object.entries(byClass)) {
    const laNodes = [];
    for (const la of las) {
      const totalStr = la['RSX_totsx_net_cur_exp'];
      const totalThousands = parseFloat(totalStr) || 0;
      if (totalThousands <= 0) continue;
      const totalFull = totalThousands * 1000; // GBP thousands → GBP

      // Build service breakdown
      const services = [];
      for (const sc of SERVICE_COLS) {
        const val = parseFloat(la[sc.col]) || 0;
        if (val > 0) {
          services.push({
            id: slugify(la.LA_name) + '__' + slugify(sc.name),
            name: sc.name,
            value: val * 1000
          });
        }
      }

      // Compute remainder (total - sum of named services)
      const namedSum = services.reduce((s, c) => s + c.value, 0);
      // Use totalFull as truth, don't add remainder unless significant
      // (negative services like "Other" can cause total < sum)

      const laNode = {
        id: slugify(la.LA_name),
        name: la.LA_name.replace(/ UA$| MD$| LB$/, ''),
        value: totalFull
      };

      if (services.length > 0) {
        services.sort((a, b) => b.value - a.value);
        laNode.children = services;
        // Use children sum as parent value to guarantee reconciliation.
        // The CSV totsx column may differ from sum of services by tiny amounts
        // (£1-2k) due to MHCLG adjustments not in per-service columns.
        laNode.value = namedSum;
      }

      laNodes.push(laNode);
    }

    if (laNodes.length === 0) continue;

    laNodes.sort((a, b) => b.value - a.value);

    const displayName = CLASS_LABELS[cls] || cls;
    classChildren.push({
      id: 'lg_' + slugify(cls),
      name: displayName,
      value: sumChildren(laNodes),
      children: laNodes
    });
  }

  classChildren.sort((a, b) => b.value - a.value);
  const totalValue = sumChildren(classChildren);

  return {
    id: 'local_government_england',
    name: 'Local Government (England)',
    value: totalValue,
    children: classChildren,
    _disclaimer: 'MHCLG Revenue Outturn Summary. Net current expenditure by service. Covers England only — Scotland, Wales and Northern Ireland shown separately.',
    _source: 'MHCLG Revenue Outturn (RO5)'
  };
}

// ─── Main ─────────────────────────────────────────────

console.log('Budget Galaxy — Local Government (England) Injection');
console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
console.log(`Target tree year: ${yearArg}\n`);

const csvPath = path.join(LA_DIR, 'revenue_outturn_timeseries.csv');
if (!fs.existsSync(csvPath)) {
  console.error('Missing:', csvPath);
  process.exit(1);
}

// Parse CSV
console.log('  Parsing revenue_outturn_timeseries.csv...');
const rows = parseCSV(csvPath);
console.log(`  Total rows: ${rows.length}`);

// Determine CSV year
let csvYear = OSCAR_TO_CSV[yearArg];
if (!csvYear) {
  console.error(`No CSV year mapping for OSCAR year ${yearArg}`);
  process.exit(1);
}

// Check if that year has data, fallback to previous year if sparse
const targetRows = rows.filter(r => r.year_ending === csvYear && r.status === 'submitted');
console.log(`  Rows for ${csvYear}: ${targetRows.length} submitted`);

if (targetRows.length < 100) {
  const fallback = OSCAR_TO_CSV[(parseInt(yearArg) - 1).toString()];
  if (fallback) {
    const fallbackRows = rows.filter(r => r.year_ending === fallback && r.status === 'submitted');
    console.log(`  Sparse data for ${csvYear} (${targetRows.length} rows). Falling back to ${fallback} (${fallbackRows.length} rows)`);
    csvYear = fallback;
  }
}

// Build tree
const lgBranch = buildLocalGovTree(rows, csvYear);
console.log(`\n  Local Government (England): £${(lgBranch.value / 1e9).toFixed(1)}B`);
lgBranch.children.forEach(s => {
  console.log(`    ${s.name}: £${(s.value / 1e9).toFixed(1)}B (${s.children.length} councils)`);
});

// Inject into UK tree
const treePath = path.join(UK_DIR, `uk_budget_tree_${yearArg}.json`);
const tree = readJSON(treePath);
if (!tree) { console.error('Missing UK tree:', treePath); process.exit(1); }

if (tree.children.find(c => c.id === 'local_government_england')) {
  console.log('\n  SKIP: local_government_england already exists in tree');
  process.exit(0);
}

backup(treePath);

tree.children.push(lgBranch);
const oldValue = tree.value;
tree.value = sumChildren(tree.children);

if (!tree.name.includes('Public Spending')) {
  tree.name = `UK Public Spending ${yearArg}`;
}

sortChildrenDesc(tree);

console.log(`\n  Root: £${(oldValue / 1e9).toFixed(1)}B → £${(tree.value / 1e9).toFixed(1)}B`);

writeJSON(treePath, tree);
console.log(`  ${DRY_RUN ? '[DRY RUN]' : '✓'} Written to ${path.basename(treePath)}`);
