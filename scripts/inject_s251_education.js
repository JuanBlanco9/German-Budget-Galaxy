#!/usr/bin/env node
/**
 * inject_s251_education.js
 *
 * Injects DfE Section 251 education breakdown as Level 6 children of each
 * council's "Education" leaf node in the Local Government tree.
 *
 * Pre-conditions:
 *   - data/uk/uk_budget_tree_{year}.json has local_government_england populated
 *     by inject_local_gov.js with per-council Education leaf nodes
 *   - data/uk/local_authorities/s251_lookup_{year}.json built by build_s251_lookup.js
 *   - data/uk/local_authorities/revenue_outturn_timeseries.csv (used to bridge
 *     council names → ONS codes via the same source MHCLG used for the tree)
 *
 * Matching strategy (3 tiers):
 *   1. Council name → ONS_code via revenue_outturn_timeseries.csv → S251 entry
 *      This is the authoritative path because the tree was BUILT from this CSV.
 *   2. Normalized name match (uppercase, strip suffixes, &→AND, etc.)
 *   3. Manual aliases for known mismatches (e.g., "Durham" ↔ "County Durham")
 *
 * Reconciliation:
 *   The S251 sum may differ from the MHCLG Revenue Outturn Education total
 *   by 5-15% (DfE and MHCLG use slightly different accounting bases — DfE
 *   includes academies recoupment, MHCLG includes Dedicated Schools Grant
 *   inflows differently). When this happens, scale the S251 children
 *   PROPORTIONALLY so they sum exactly to the MHCLG parent value, and
 *   document the scaling in _s251_scaling_factor on the parent.
 *
 * Idempotency: skips if Education node already has children with _source
 * starting with "DfE Section 251".
 *
 * Coverage expectation: ~150 of 401 councils. Lower-tier councils (Shire
 * Districts, Police, Fire, Combined Authorities) have NO education
 * responsibility and correctly do not appear in S251.
 *
 * Usage: node scripts/inject_s251_education.js [--dry-run] [--year 2024]
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const UK_DIR = path.join(DATA_DIR, 'uk');
const LA_DIR = path.join(UK_DIR, 'local_authorities');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const YEAR = args.find(a => a.match(/^\d{4}$/)) || '2024';

// Map calendar year to MHCLG year_ending code
const MHCLG_YEAR_MAP = {
  '2024': '202503', '2023': '202403', '2022': '202303',
  '2021': '202203', '2020': '202103', '2019': '202003',
  '2018': '201903', '2017': '201803'
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
  const dest = path.join(BACKUP_DIR, path.basename(fp).replace('.json', `.pre_v17a_${stamp}.json`));
  if (!fs.existsSync(dest)) {
    fs.copyFileSync(fp, dest);
    console.log(`  Backed up → ${path.relative(DATA_DIR, dest)}`);
  }
}

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function normalizeName(name) {
  return String(name)
    .toUpperCase()
    .replace(/['\u2019\u2018\u02bc`]/g, '')
    .replace(/&/g, 'AND')
    .replace(/\s+(CC|UA|MD|LB|UC)$/, '')           // strip MHCLG suffixes
    .replace(/^(THE\s+)?ROYAL\s+BOROUGH\s+OF\s+/i, '')
    .replace(/^CITY\s+OF\s+/i, '')
    .replace(/,?\s+CITY\s+OF$/i, '')                // "Bristol, City of" → "Bristol"
    .replace(/,?\s+COUNTY\s+OF$/i, '')              // "Herefordshire, County of"
    .replace(/^COUNTY\s+/i, '')                     // "County Durham" → "Durham"
    .replace(/\s+CITY$/i, '')                        // "Leicester City" → "Leicester"
    .replace(/\s+THE\s+/g, ' ')                      // "Telford & the Wrekin"
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim();
}

function parseCSVLine(line) {
  const r = []; let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { if (inQ && line[i+1] === '"') { cur += '"'; i++; } else inQ = !inQ; }
    else if (c === ',' && !inQ) { r.push(cur.trim()); cur = ''; }
    else cur += c;
  }
  r.push(cur.trim()); return r;
}

// ─── Build council name → ONS_code map from MHCLG CSV ─

function buildOnsLookup(targetYear) {
  const csvPath = path.join(LA_DIR, 'revenue_outturn_timeseries.csv');
  if (!fs.existsSync(csvPath)) {
    console.warn('  WARN: revenue_outturn CSV not found, skipping ONS bridge');
    return null;
  }
  const raw = fs.readFileSync(csvPath, 'utf8');
  const lines = raw.split('\n').filter(l => l.trim());
  const headers = parseCSVLine(lines[0]);
  const onsIdx = headers.indexOf('ONS_code');
  const nameIdx = headers.indexOf('LA_name');
  const yearIdx = headers.indexOf('year_ending');
  const statusIdx = headers.indexOf('status');

  // Build name → ons mapping. Use most recent submitted year per name.
  const map = {};
  for (let i = 1; i < lines.length; i++) {
    const c = parseCSVLine(lines[i]);
    if (c[statusIdx] !== 'submitted') continue;
    const name = c[nameIdx];
    const ons = c[onsIdx];
    if (!name || !ons) continue;
    if (!map[name]) map[name] = ons;
  }
  return map;
}

// ─── Main ─────────────────────────────────────────────

console.log('Inject S251 Education breakdown');
console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
console.log(`Year: ${YEAR}\n`);

const treePath = path.join(UK_DIR, `uk_budget_tree_${YEAR}.json`);
const lookupPath = path.join(LA_DIR, `s251_lookup_${YEAR}.json`);

const tree = readJSON(treePath);
const s251Lookup = readJSON(lookupPath);
console.log(`Loaded ${Object.keys(s251Lookup).length} S251 LA entries`);

// Build the various S251 indices
const s251ByCode = s251Lookup;
const s251ByNorm = {};
for (const [code, e] of Object.entries(s251Lookup)) {
  s251ByNorm[normalizeName(e.la_name)] = { code, ...e };
}

// Build ONS lookup from MHCLG CSV (most authoritative bridge)
const onsLookup = buildOnsLookup(YEAR);
console.log(`MHCLG CSV name→ONS map: ${onsLookup ? Object.keys(onsLookup).length : 0} entries\n`);

const lg = tree.children.find(c => c.id === 'local_government_england');
if (!lg) { console.error('local_government_england not found'); process.exit(1); }

let totalCouncils = 0;
let matched = 0;
let alreadyInjected = 0;
let scaledCouncils = 0;
const unmatched = [];
const matchedSamples = [];

for (const cls of lg.children) {
  for (const council of cls.children) {
    totalCouncils++;
    const educationNode = (council.children || []).find(c => c.name === 'Education');
    if (!educationNode || educationNode.value <= 0) continue;

    // Idempotency
    if (educationNode.children && educationNode.children.length > 0 &&
        educationNode.children[0]._source && String(educationNode.children[0]._source).startsWith('DfE Section 251')) {
      alreadyInjected++;
      continue;
    }

    // 3-tier matching: ONS via MHCLG → normalized name → none
    let s251Entry = null;
    if (onsLookup && onsLookup[council.name]) {
      const ons = onsLookup[council.name];
      if (s251ByCode[ons]) s251Entry = s251ByCode[ons];
    }
    if (!s251Entry) {
      const norm = normalizeName(council.name);
      if (s251ByNorm[norm]) s251Entry = s251ByNorm[norm];
    }
    if (!s251Entry) {
      unmatched.push(council.name);
      continue;
    }

    // Build children, scaling to match parent value
    const parentValue = educationNode.value;
    const s251Total = s251Entry.education_breakdown.reduce((s, b) => s + b.value, 0);
    const factor = parentValue / s251Total;

    if (Math.abs(factor - 1) > 0.05) scaledCouncils++;

    const baseId = educationNode.id;
    const children = s251Entry.education_breakdown
      .filter(b => b.value > 0)
      .map(b => ({
        id: baseId + '__' + slugify(b.name),
        name: b.name,
        value: Math.round(b.value * factor),
        _source: `DfE Section 251 ${parseInt(YEAR)-1}-${String(YEAR).slice(2)}`
      }))
      .sort((a, b) => b.value - a.value);

    // Reconcile rounding
    const childSum = children.reduce((s, c) => s + c.value, 0);
    if (childSum !== parentValue && children.length > 0) {
      const drift = parentValue - childSum;
      const largest = children.reduce((max, c) => c.value > max.value ? c : max);
      largest.value += drift;
    }

    educationNode.children = children;
    educationNode._s251_scaling_factor = parseFloat(factor.toFixed(4));
    educationNode._s251_la_code = s251Entry.la_code || s251Entry.code;
    if (Math.abs(factor - 1) > 0.05) {
      educationNode._note = `S251 raw total £${(s251Total/1e6).toFixed(1)}M scaled by factor ${factor.toFixed(3)} to match MHCLG Revenue Outturn parent £${(parentValue/1e6).toFixed(1)}M. DfE and MHCLG use slightly different accounting bases.`;
    }

    matched++;
    if (matchedSamples.length < 5) {
      matchedSamples.push({
        name: council.name, code: s251Entry.la_code || s251Entry.code,
        parent: parentValue, s251Total, factor, children
      });
    }
  }
}

console.log(`Total councils: ${totalCouncils}`);
console.log(`  S251 matched: ${matched}`);
console.log(`  Already injected: ${alreadyInjected}`);
console.log(`  Unmatched (no S251 data): ${unmatched.length}`);
console.log(`  With scaling factor > 5%: ${scaledCouncils}`);

// Sample
if (matchedSamples.length > 0) {
  console.log('\nSample matches:');
  matchedSamples.forEach(s => {
    console.log(`  ${s.name} (${s.code}) parent £${(s.parent/1e6).toFixed(1)}M, S251 raw £${(s.s251Total/1e6).toFixed(1)}M (factor ${s.factor.toFixed(3)})`);
    s.children.forEach(c => {
      const pct = (c.value / s.parent * 100).toFixed(0);
      console.log(`    £${(c.value/1e6).toFixed(1).padStart(7)}M  ${pct.padStart(3)}%  ${c.name}`);
    });
  });
}

// Tree integrity
let drift = 0;
function walk(n) {
  if (n.children && n.children.length > 0) {
    const sum = n.children.reduce((s, c) => s + (c.value || 0), 0);
    if (Math.abs(sum - n.value) > 0) drift++;
    n.children.forEach(walk);
  }
}
walk(tree);
console.log(`\nTree integrity: ${drift === 0 ? '✓' : '✗ ' + drift + ' drifts'}`);

backup(treePath);
writeJSON(treePath, tree);
console.log(`\n${DRY_RUN ? '[DRY RUN]' : '✓'} Written to ${path.basename(treePath)}`);
