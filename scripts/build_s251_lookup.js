#!/usr/bin/env node
/**
 * build_s251_lookup.js
 *
 * Parses DfE Section 251 (LA and school expenditure) data and produces a
 * per-LA lookup with the education breakdown grouped into 5 navigable buckets.
 *
 * S251 has ~83 line items per LA per year, organized in 3 main_categories:
 *   - Schools (50 sub-items, lines 1.0.x through 1.8.1)
 *   - Dedicated schools grant (7 items, often suppressed for small LAs)
 *   - Other education and community (26 sub-items, lines 2.0.x through 2.4.3)
 *
 * We collapse this into 5 buckets that match the way most observers understand
 * council education spending:
 *
 *   1. Schools block            (1.0.x — Individual Schools Budget + high needs places)
 *   2. High needs (SEND)         (1.2.x — top-ups, alternative provision, support)
 *   3. Early years               (1.3.x — central early years entitlement)
 *   4. Central school services   (1.1.x + 1.4.x + 1.5.x + 1.6.x + 1.7.x —
 *                                 admissions, schools forum, asset management,
 *                                 welfare, growth)
 *   5. Other education & community (entire main_category 2 — central services,
 *                                   SEN admin, transport, adult learning, pensions)
 *
 * Output: data/uk/local_authorities/s251_lookup_{year}.json
 *
 * Usage: node scripts/build_s251_lookup.js [--year 2024]
 *        Year is the calendar year ending the FY (2024 = FY 2024-25)
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const UK_DIR = path.join(DATA_DIR, 'uk');
const LA_DIR = path.join(UK_DIR, 'local_authorities');
const args = process.argv.slice(2);
const YEAR = args.find(a => a.match(/^\d{4}$/)) || '2024';

// S251 uses 6-digit time period codes: 202425 = FY 2024-25
const TIME_PERIOD_MAP = {
  '2024': '202425',
  '2023': '202324',
  '2022': '202223',
  '2021': '202122',
  '2020': '202021',
  '2019': '201920',
  '2018': '201819',
  '2017': '201718',
  '2016': '201617'
};
const timePeriod = TIME_PERIOD_MAP[YEAR];
if (!timePeriod) { console.error('No time_period mapping for year', YEAR); process.exit(1); }

const OUTPUT = path.join(LA_DIR, `s251_lookup_${YEAR}.json`);
const INPUT = path.join(LA_DIR, 's251_alleducation_la_regional_national.csv');

// ─── Bucket categorization function ───────────────────

function categorizeRow(mainCat, expCode) {
  // expCode looks like "1.0.1 Individual Schools Budget..."
  const m = String(expCode).match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!m) return null;
  const major = parseInt(m[1]);
  const middle = parseInt(m[2]);

  // Skip TOTAL rows (they would double-count)
  if (/total|TOTAL/i.test(expCode) && /\d\.\d+\.\d/.test(expCode)) {
    // 1.8.1 TOTAL SCHOOLS, 2.4.3 Total Other... — these are sums, skip
    if (/total/i.test(expCode)) return null;
  }

  // Special cases for total rows by exact code
  if (/^1\.8\.1/.test(expCode)) return null;  // TOTAL SCHOOLS
  if (/^2\.4\.3/.test(expCode)) return null;  // Total Other education
  if (/^1\.9\./.test(expCode))   return null; // DSG metadata, not spend

  if (major === 1) {
    // Schools main_category
    if (middle === 0) return 'Schools block';
    if (middle === 1) return 'Central school services';   // School-level support
    if (middle === 2) return 'High needs (SEND)';
    if (middle === 3) return 'Early years';
    if (middle === 4) return 'Central school services';   // Admissions, forum, growth
    if (middle === 5) return 'Central school services';   // Welfare, asset mgmt
    if (middle === 6) return 'Central school services';   // Same but funded differently
    if (middle === 7) return 'Central school services';   // Other specific grants
  } else if (major === 2) {
    return 'Other education & community';
  }
  return null;
}

// ─── CSV parsing ──────────────────────────────────────

function parseCSVLine(line) {
  const result = [];
  let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQ && line[i+1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (c === ',' && !inQ) { result.push(cur); cur = ''; }
    else cur += c;
  }
  result.push(cur);
  return result;
}

// ─── Main ─────────────────────────────────────────────

console.log(`Building S251 lookup for ${YEAR} (time_period=${timePeriod})\n`);

if (!fs.existsSync(INPUT)) {
  console.error('Missing:', INPUT);
  process.exit(1);
}

const raw = fs.readFileSync(INPUT, 'utf8');
const lines = raw.split('\n');
console.log(`Read ${lines.length} lines from S251 CSV`);

const headers = parseCSVLine(lines[0]);
const idx = {};
headers.forEach((h, i) => idx[h] = i);

// Required columns
const requiredCols = ['time_period', 'la_name', 'new_la_code', 'main_category', 'category_of_expenditure', 'net_expenditure', 'geographic_level'];
for (const c of requiredCols) {
  if (idx[c] === undefined) { console.error('Missing column:', c); process.exit(1); }
}

// Group by LA
const laData = {};

for (let i = 1; i < lines.length; i++) {
  if (!lines[i]) continue;
  const cols = parseCSVLine(lines[i]);
  if (cols[idx.time_period] !== timePeriod) continue;
  if (cols[idx.geographic_level] !== 'Local authority') continue;

  const laCode = cols[idx.new_la_code];
  const laName = cols[idx.la_name];
  if (!laCode || !laName) continue;

  const mainCat = cols[idx.main_category];
  const expCode = cols[idx.category_of_expenditure];
  const netStr = cols[idx.net_expenditure];

  // Skip suppressed values (often "x" or "z" for confidential/zero LAs)
  if (!netStr || netStr === 'x' || netStr === 'z' || netStr === '..') continue;
  const netVal = parseFloat(netStr);
  if (isNaN(netVal)) continue;

  const bucket = categorizeRow(mainCat, expCode);
  if (!bucket) continue;

  if (!laData[laCode]) {
    laData[laCode] = {
      la_name: laName,
      la_code: laCode,
      year: YEAR,
      buckets: {}
    };
  }
  if (!laData[laCode].buckets[bucket]) {
    laData[laCode].buckets[bucket] = 0;
  }
  laData[laCode].buckets[bucket] += netVal;
}

console.log(`Parsed ${Object.keys(laData).length} LAs with S251 data\n`);

// Convert buckets to ordered breakdown array
const lookup = {};
const BUCKET_ORDER = [
  'Schools block',
  'High needs (SEND)',
  'Central school services',
  'Early years',
  'Other education & community'
];

let totalEducation = 0;
const aggregateByBucket = {};

for (const [code, data] of Object.entries(laData)) {
  const breakdown = [];
  let total = 0;
  for (const bucket of BUCKET_ORDER) {
    const v = data.buckets[bucket];
    if (v && v > 0) {
      breakdown.push({ name: bucket, value: Math.round(v) });
      total += v;
      aggregateByBucket[bucket] = (aggregateByBucket[bucket] || 0) + v;
    }
  }
  if (breakdown.length === 0) continue;
  totalEducation += total;
  lookup[code] = {
    la_name: data.la_name,
    la_code: code,
    year: YEAR,
    education_breakdown: breakdown,
    total: Math.round(total)
  };
}

console.log(`Aggregate education spend across ${Object.keys(lookup).length} LAs: £${(totalEducation/1e9).toFixed(2)}B\n`);
console.log('By bucket:');
BUCKET_ORDER.forEach(b => {
  const v = aggregateByBucket[b] || 0;
  console.log(`  ${b.padEnd(35)} £${(v/1e9).toFixed(2).padStart(6)}B  (${(v/totalEducation*100).toFixed(1)}%)`);
});

// Spot checks
console.log('\nSpot checks:');
const samples = ['E08000005', 'E08000025', 'E09000007', 'E10000027']; // Rochdale, Birmingham, Camden, Somerset
for (const code of samples) {
  const lk = lookup[code];
  if (!lk) { console.log(`  ${code}: NOT FOUND`); continue; }
  console.log(`  ${lk.la_name} (${code}) total £${(lk.total/1e6).toFixed(1)}M`);
  lk.education_breakdown.forEach(b => {
    const pct = (b.value / lk.total * 100).toFixed(0);
    console.log(`    £${(b.value/1e6).toFixed(1).padStart(6)}M  ${pct.padStart(3)}%  ${b.name}`);
  });
}

fs.writeFileSync(OUTPUT, JSON.stringify(lookup, null, 2));
console.log(`\n✓ Written: ${path.relative(DATA_DIR, OUTPUT)}`);
