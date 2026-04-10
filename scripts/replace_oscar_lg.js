#!/usr/bin/env node
/**
 * replace_oscar_lg.js
 *
 * For UK trees 2020-2023: removes the OSCAR II "LOCAL GOVERNMENT ENGLAND"
 * department (a coarse 2-line accounting view, £141-164B) and injects the
 * richer MHCLG Revenue Outturn version (13 service categories × ~400 councils,
 * £107-121B). Same dataset, two views — OSCAR is the funding-side, MHCLG is
 * the spending-side breakdown.
 *
 * Why this is needed:
 *   The OSCAR `LOCAL GOVERNMENT ENGLAND` department was a placeholder line
 *   in OSCAR II accounting (2020-2023). It was removed in OSCAR's 2024 release.
 *   It overlaps entirely with our MHCLG Revenue Outturn injection target,
 *   so to apply v12 Local Gov enrichment to historical years we have to
 *   remove the legacy OSCAR node first.
 *
 * Effect:
 *   Root drops by (OSCAR LG ENGLAND value − MHCLG value), which represents
 *   the double-counting that existed in trees before this fix.
 *
 *   2020: £141.7B → £106.5B  (Δ -£35B)
 *   2021: £141.8B → £107.5B  (Δ -£34B)
 *   2022: £149.9B → £114.0B  (Δ -£36B)
 *   2023: £163.8B → £121.2B  (Δ -£43B)
 *
 * Idempotency:
 *   - If OSCAR LG ENGLAND already removed and MHCLG injected: SKIP entire year.
 *   - If OSCAR LG ENGLAND has _source field (means we already injected): SKIP.
 *   - Detection: OSCAR original has children = [England Local Authorities,
 *     England Housing Revenue Account] OR has no _source field.
 *
 * Usage: node scripts/replace_oscar_lg.js [--dry-run] [--year YYYY|all]
 *        Defaults to all years 2020-2023.
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const UK_DIR = path.join(DATA_DIR, 'uk');
const LA_DIR = path.join(UK_DIR, 'local_authorities');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const yearArg = args.find(a => a.match(/^\d{4}$/) || a === 'all') || 'all';

const TARGET_YEARS = yearArg === 'all' ? ['2020', '2021', '2022', '2023'] : [yearArg];

const OSCAR_TO_CSV = {
  '2024': '202503', '2023': '202403', '2022': '202303',
  '2021': '202203', '2020': '202103', '2019': '202003',
  '2018': '201903', '2017': '201803'
};

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

const CLASS_LABELS = {
  'Shire County': 'Shire Counties',
  'Shire District': 'Shire Districts',
  'Met District': 'Metropolitan Districts',
  'London': 'London Boroughs',
  'Unitary Authority': 'Unitary Authorities',
  'Other': 'Other Authorities'
};

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
  const dest = path.join(BACKUP_DIR, path.basename(fp).replace('.json', `.pre_replace_oscar_${stamp}.json`));
  if (!fs.existsSync(dest)) {
    fs.copyFileSync(fp, dest);
    console.log(`  Backed up → ${path.relative(DATA_DIR, dest)}`);
  }
}

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function sumChildren(children) { return children.reduce((s, c) => s + (c.value || 0), 0); }

function sortChildrenDesc(node) {
  if (node.children && node.children.length > 0) {
    node.children.sort((a, b) => b.value - a.value);
    node.children.forEach(sortChildrenDesc);
  }
  return node;
}

function parseCSVLine(line) {
  const result = [];
  let current = '', inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i+1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (c === ',' && !inQuotes) { result.push(current.trim()); current = ''; }
    else current += c;
  }
  result.push(current.trim());
  return result;
}

function parseCSV(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const lines = raw.split('\n').filter(l => l.trim());
  const headers = parseCSVLine(lines[0]);
  return lines.slice(1).map(line => {
    const vals = parseCSVLine(line);
    const row = {};
    headers.forEach((h, j) => row[h] = vals[j] || '');
    return row;
  });
}

// ─── Build MHCLG branch (same logic as inject_local_gov.js) ───

function buildLocalGovTree(rows, csvYear) {
  const filtered = rows.filter(r =>
    r.year_ending === csvYear &&
    r.status === 'submitted' &&
    r.LA_class !== 'Eng' &&
    r.LA_class !== ''
  );

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
      const totalThousands = parseFloat(la['RSX_totsx_net_cur_exp']) || 0;
      if (totalThousands <= 0) continue;
      const totalFull = totalThousands * 1000;

      const services = [];
      for (const sc of SERVICE_COLS) {
        const val = parseFloat(la[sc.col]) || 0;
        if (val > 0) services.push({
          id: slugify(la.LA_name) + '__' + slugify(sc.name),
          name: sc.name,
          value: val * 1000
        });
      }

      const namedSum = services.reduce((s, c) => s + c.value, 0);
      const laNode = {
        id: slugify(la.LA_name),
        name: la.LA_name.replace(/ UA$| MD$| LB$/, ''),
        value: totalFull
      };
      if (services.length > 0) {
        services.sort((a, b) => b.value - a.value);
        laNode.children = services;
        laNode.value = namedSum;
      }
      laNodes.push(laNode);
    }

    if (laNodes.length === 0) continue;
    laNodes.sort((a, b) => b.value - a.value);
    classChildren.push({
      id: 'lg_' + slugify(cls),
      name: CLASS_LABELS[cls] || cls,
      value: sumChildren(laNodes),
      children: laNodes
    });
  }

  classChildren.sort((a, b) => b.value - a.value);
  return {
    id: 'local_government_england',
    name: 'Local Government (England)',
    value: sumChildren(classChildren),
    children: classChildren,
    _disclaimer: 'MHCLG Revenue Outturn Summary. Net current expenditure by service. Covers England only — Scotland, Wales and Northern Ireland shown separately.',
    _source: 'MHCLG Revenue Outturn (RO5)'
  };
}

// ─── Detect whether a tree's local_government_england is OSCAR or MHCLG ──

function isOscarLgEngland(node) {
  // OSCAR: name is uppercase "LOCAL GOVERNMENT ENGLAND", no _source, has children like
  // "England Local Authorities" / "England Housing Revenue Account"
  if (node._source === 'MHCLG Revenue Outturn (RO5)') return false;
  const name = (node.name || '').toUpperCase();
  if (name === 'LOCAL GOVERNMENT ENGLAND') return true;
  return false;
}

// ─── Main ─────────────────────────────────────────────

console.log('Replace OSCAR LG ENGLAND with MHCLG Revenue Outturn');
console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
console.log(`Years: ${TARGET_YEARS.join(', ')}\n`);

const csvPath = path.join(LA_DIR, 'revenue_outturn_timeseries.csv');
if (!fs.existsSync(csvPath)) { console.error('Missing CSV:', csvPath); process.exit(1); }

console.log('Parsing revenue_outturn_timeseries.csv...');
const csvRows = parseCSV(csvPath);
console.log(`  ${csvRows.length} rows\n`);

for (const year of TARGET_YEARS) {
  const treePath = path.join(UK_DIR, `uk_budget_tree_${year}.json`);
  console.log(`── ${year} ──`);
  if (!fs.existsSync(treePath)) { console.log(`  SKIP: no tree`); continue; }

  const tree = readJSON(treePath);

  // Find existing local_government_england node
  const existingIdx = tree.children.findIndex(c => c.id === 'local_government_england');
  let existingNode = existingIdx >= 0 ? tree.children[existingIdx] : null;

  if (existingNode && existingNode._source === 'MHCLG Revenue Outturn (RO5)') {
    console.log(`  SKIP: already MHCLG (£${(existingNode.value/1e9).toFixed(1)}B)`);
    continue;
  }

  // Build MHCLG version
  const csvYear = OSCAR_TO_CSV[year];
  if (!csvYear) { console.log(`  SKIP: no CSV mapping`); continue; }
  const mhclgBranch = buildLocalGovTree(csvRows, csvYear);
  if (mhclgBranch.value === 0) { console.log(`  SKIP: MHCLG empty for ${csvYear}`); continue; }

  let oldOscarValue = 0;
  if (existingNode) {
    if (!isOscarLgEngland(existingNode)) {
      console.log(`  WARN: existing local_government_england is not OSCAR pattern. Skipping.`);
      console.log(`        name="${existingNode.name}" _source="${existingNode._source}"`);
      continue;
    }
    oldOscarValue = existingNode.value;
    // Remove OSCAR node
    tree.children.splice(existingIdx, 1);
    console.log(`  Removed OSCAR LG ENGLAND: £${(oldOscarValue/1e9).toFixed(1)}B`);
  } else {
    console.log(`  No existing local_government_england node`);
  }

  // Insert MHCLG version
  backup(treePath);
  tree.children.push(mhclgBranch);
  const oldRoot = tree.value;
  tree.value = sumChildren(tree.children);
  if (!tree.name.includes('Public Spending')) {
    tree.name = `UK Public Spending ${year}`;
  }
  sortChildrenDesc(tree);

  const delta = tree.value - oldRoot;
  console.log(`  + MHCLG Local Gov: £${(mhclgBranch.value/1e9).toFixed(1)}B (${mhclgBranch.children.length} classes, ${mhclgBranch.children.reduce((s,c)=>s+c.children.length,0)} councils)`);
  console.log(`  Root: £${(oldRoot/1e9).toFixed(1)}B → £${(tree.value/1e9).toFixed(1)}B (Δ ${delta>=0?'+':''}£${(delta/1e9).toFixed(1)}B)`);

  writeJSON(treePath, tree);
  console.log(`  ${DRY_RUN ? '[DRY RUN]' : '✓'} Written\n`);
}

console.log('Done.');
