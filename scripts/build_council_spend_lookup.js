#!/usr/bin/env node
/**
 * build_council_spend_lookup.js
 *
 * Parses council "Spend Over £500" transparency data and aggregates per
 * council × service area × supplier, producing a metadata lookup of top
 * suppliers per service. Used by the Budget Explorer panel — NOT inserted
 * as tree children.
 *
 * WHY METADATA, NOT TREE CHILDREN
 * ────────────────────────────────
 * Spend > £500 is a separate accounting view from MHCLG net current
 * expenditure. It includes capital expenditure, transfers, and payroll
 * payments, but EXCLUDES payments below the £500 disclosure threshold.
 * The two totals do not reconcile and CANNOT be inserted as a sub-tree
 * that sums to the MHCLG service value without lying about the numbers.
 *
 * Instead, we extract the top N suppliers per service from the spend
 * data and store them as `_top_suppliers` metadata on each service node
 * in the tree. The frontend Budget Explorer renders this as an info
 * panel labeled "Top suppliers (transparency disclosure)" with a clear
 * disclaimer about coverage and reconciliation.
 *
 * Service mapping per council:
 *   Each council uses different organisational unit / department names.
 *   We define a mapping per council from those internal labels to the
 *   13 standardized MHCLG service categories. Unmapped transactions
 *   are aggregated into "Central Services" or skipped.
 *
 * Output: data/uk/local_authorities/spend/council_spend_lookup_{year}.json
 *   Schema:
 *   {
 *     "Camden": {
 *       "la_code": "E09000007",
 *       "year": 2024,
 *       "fy_label": "2023/24",
 *       "source": "Camden Council Open Data Portal (Socrata)",
 *       "total_transactions": 61550,
 *       "total_spend_gbp": 772200000,
 *       "services": {
 *         "Adult Social Care": {
 *           "service_total_in_spend": 153200000,
 *           "transaction_count": 8421,
 *           "top_suppliers": [
 *             { "name": "PROVIDER X", "amount": 12300000, "pct": 8.0,
 *               "transactions": 142 },
 *             ...
 *           ]
 *         },
 *         ...
 *       }
 *     }
 *   }
 *
 * Usage: node scripts/build_council_spend_lookup.js [--year 2024]
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const UK_DIR = path.join(DATA_DIR, 'uk');
const LA_DIR = path.join(UK_DIR, 'local_authorities');
const SPEND_DIR = path.join(LA_DIR, 'spend');
const args = process.argv.slice(2);
const YEAR = args.find(a => a.match(/^\d{4}$/)) || '2024';
const OUTPUT = path.join(SPEND_DIR, `council_spend_lookup_${YEAR}.json`);

// ─── Service categories (match the 13 MHCLG categories used in the tree) ──

const MHCLG_SERVICES = [
  'Education',
  'Adult Social Care',
  "Children's Social Care",
  'Public Health',
  'Housing',
  'Transport',
  'Environment',
  'Culture',
  'Planning',
  'Police',
  'Fire & Rescue',
  'Central Services',
  'Other Services'
];

// ─── Per-council service mapping rules ────────────────

// Each council has different organisational unit names. The mapping function
// returns the standardized MHCLG service for a given OU/department/purpose.

const CAMDEN_OU_MAP = {
  'Adults and Health': 'Adult Social Care',
  'Supporting People GF': 'Adult Social Care',  // social care for vulnerable adults
  'Children & Learning': 'Education',  // mostly schools, some CSC
  'Public Health GF': 'Public Health',
  'Property Management': 'Housing',  // largely council housing maintenance
  'Supporting Communities GF': 'Housing',  // homelessness + housing support
  'Supporting Communities HRA': 'Housing',  // housing revenue account
  'Environment and Sustainability': 'Environment',
  'Recreation': 'Culture',
  'Development': 'Planning',
  'Camden Council': 'Central Services',  // generic vendor payments
  'Corporate Services GF': 'Central Services',
  'Non Departmental GF': 'Central Services',
  'Non Departmental HRA': 'Housing',
  'Chief Executive GF': 'Central Services',
  'ICT Corporate Services': 'Central Services',
  'Pension Fund Revenue B3': 'Central Services'
};

// Camden does not have a clear "Children's Social Care" OU — it's bundled
// inside "Children & Learning". We use a heuristic: if purpose contains
// "child", "looked after", "fostering", "adoption" → CSC; else Education.
function camdenServiceForRow(ou, purpose) {
  const explicit = CAMDEN_OU_MAP[ou];
  if (explicit === 'Education' && purpose) {
    const p = String(purpose).toLowerCase();
    if (/looked after|foster|adoption|child protection|young person|residential childr/.test(p)) {
      return "Children's Social Care";
    }
  }
  return explicit || 'Other Services';
}

const BIRMINGHAM_DEPT_MAP = {
  // Birmingham uses simpler department labels
  'Adult Social Care': 'Adult Social Care',
  'Adults Social Care': 'Adult Social Care',
  'Children & Families': "Children's Social Care",
  'Children and Families': "Children's Social Care",
  'Education and Skills': 'Education',
  'Education': 'Education',
  'Council Management': 'Central Services',
  'Place': 'Environment',
  'Place, Prosperity and Sustainability': 'Environment',
  'Planning': 'Planning',
  'Strategic Services': 'Central Services',
  'Customer Services': 'Central Services',
  'Finance': 'Central Services',
  'Housing': 'Housing',
  'Housing & Markets': 'Housing',
  'Highways': 'Transport',
  'Transport': 'Transport',
  'Public Health': 'Public Health',
  'Streets and Parks': 'Environment',
  'Culture': 'Culture',
  'Libraries': 'Culture'
};

function birminghamServiceForRow(dept, summary, merchantCat) {
  // Try exact dept match first
  if (BIRMINGHAM_DEPT_MAP[dept]) return BIRMINGHAM_DEPT_MAP[dept];
  // Heuristic on summary/merchant
  const s = String(summary || '').toLowerCase();
  const m = String(merchantCat || '').toLowerCase();
  if (/social care|residential|fostering/.test(s + ' ' + m)) {
    if (/child|young/.test(s)) return "Children's Social Care";
    return 'Adult Social Care';
  }
  if (/school|education|sen /.test(s + ' ' + m)) return 'Education';
  if (/highway|transport|road|pothole/.test(s + ' ' + m)) return 'Transport';
  if (/housing|repair|tenant/.test(s + ' ' + m)) return 'Housing';
  if (/refuse|waste|street|park/.test(s + ' ' + m)) return 'Environment';
  if (/library|leisure|sport|art|museum|theatre/.test(s + ' ' + m)) return 'Culture';
  if (/health|wellbeing/.test(s + ' ' + m)) return 'Public Health';
  return 'Central Services';
}

// Rochdale uses 14 directorates
const ROCHDALE_DIR_MAP = {
  'ADULT CARE LCO FUNCTIONS': 'Adult Social Care',
  'BETTER CARE FUND POOLED BUDGET': 'Adult Social Care',
  'EARLY HELP AND SCHOOLS': 'Education',
  'CHILDRENS SOCIAL CARE': "Children's Social Care",
  'PUBLIC HEALTH': 'Public Health',
  'NEIGHBOURHOODS AND ENVIRONMENT': 'Environment',
  'PROPERTY AND HIGHWAYS': 'Transport',
  'ECONOMY DIRECTORATE': 'Planning',
  'RESOURCES': 'Central Services',
  'FINANCE CONTROL': 'Central Services',
  'COMMISSIONING AND STATUTORY': 'Central Services',
  'COLLECTION FUND': 'Central Services',
  'BUSINESS RATES BID INCOME': 'Central Services',
  'CONTROL ACCOUNT': 'Central Services'
};

// Manchester service areas — many variations, mapped by keyword
const MANCHESTER_SVC_MAP = {
  'Adult Social Care': 'Adult Social Care',
  'Adults Social Care': 'Adult Social Care',
  'Adult Services': 'Adult Social Care',
  'Childrens & Education Services': 'Education',
  'Childrens Services': "Children's Social Care",
  'Childrens Social Care': "Children's Social Care",
  'Education': 'Education',
  'Public Health': 'Public Health',
  'Housing Revenue Account': 'Housing',
  'Housing & Residential Growth': 'Housing',
  'Housing Operations': 'Housing',
  'Highways': 'Transport',
  'Highway Services': 'Transport',
  'Manchester Leisure': 'Culture',
  'Libraries': 'Culture',
  'Culture & Visitor Economy': 'Culture',
  'Neighbourhoods': 'Environment',
  'Waste Management': 'Environment',
  'Parks Leisure And Events': 'Culture',
  'Regeneration': 'Planning',
  'Regeneration Finance': 'Planning',
  'Planning': 'Planning'
};
function manchesterServiceForRow(svc) {
  if (!svc) return 'Central Services';
  if (MANCHESTER_SVC_MAP[svc]) return MANCHESTER_SVC_MAP[svc];
  const s = svc.toLowerCase();
  if (/adult|social care/.test(s) && !/children/.test(s)) return 'Adult Social Care';
  if (/children|child|young people|families/.test(s)) {
    if (/education|school/.test(s)) return 'Education';
    return "Children's Social Care";
  }
  if (/education|school/.test(s)) return 'Education';
  if (/health|wellbeing/.test(s)) return 'Public Health';
  if (/housing|tenant/.test(s)) return 'Housing';
  if (/highway|transport|road/.test(s)) return 'Transport';
  if (/environment|waste|parks|street/.test(s)) return 'Environment';
  if (/leisure|library|culture|museum|art/.test(s)) return 'Culture';
  if (/planning|regenerat|economic/.test(s)) return 'Planning';
  return 'Central Services';
}

// Leeds has Service Division Label which is the cleanest classifier
const LEEDS_SVC_MAP = {
  'Adults and Health': 'Adult Social Care',
  'Children and Families': "Children's Social Care",
  'City Development': 'Planning',
  'Communities Housing & Environment': 'Housing',
  'Communities, Housing & Environment': 'Housing',
  'Resources': 'Central Services',
  'Strategy & Resources': 'Central Services',
  'Public Health': 'Public Health',
  'Children & Families': "Children's Social Care",
  'Civic Enterprise Leeds': 'Central Services'
};
function leedsServiceForRow(svc, ou) {
  if (LEEDS_SVC_MAP[svc]) return LEEDS_SVC_MAP[svc];
  if (LEEDS_SVC_MAP[ou]) return LEEDS_SVC_MAP[ou];
  // Heuristic by combined string
  const s = (svc + ' ' + ou).toLowerCase();
  if (/adult|social care/.test(s) && !/children/.test(s)) return 'Adult Social Care';
  if (/children|child|young people|families/.test(s)) {
    if (/education|school/.test(s)) return 'Education';
    return "Children's Social Care";
  }
  if (/education|school|sen|learning/.test(s)) return 'Education';
  if (/health|wellbeing/.test(s)) return 'Public Health';
  if (/housing|tenant|hra/.test(s)) return 'Housing';
  if (/highway|transport|road/.test(s)) return 'Transport';
  if (/environment|waste|park|street|refuse/.test(s)) return 'Environment';
  if (/leisure|library|culture|museum|art/.test(s)) return 'Culture';
  if (/planning|regenerat|develop|economic/.test(s)) return 'Planning';
  return 'Central Services';
}

// ─── CSV parsers ──────────────────────────────────────

function parseCSVLine(line, sep) {
  const r = [];
  let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQ && line[i+1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (c === sep && !inQ) { r.push(cur); cur = ''; }
    else cur += c;
  }
  r.push(cur);
  return r;
}

function readCSV(filePath, sep) {
  const raw = fs.readFileSync(filePath, 'utf8');
  // Strip BOM
  const clean = raw.replace(/^\uFEFF/, '');
  const lines = clean.split('\n').filter(l => l.trim());
  const headers = parseCSVLine(lines[0], sep).map(h => h.replace(/^"|"$/g, '').trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i], sep);
    const row = {};
    headers.forEach((h, j) => row[h] = (cols[j] || '').replace(/^"|"$/g, ''));
    rows.push(row);
  }
  return rows;
}

// Normalize supplier names to merge duplicates (case, punctuation, common suffixes)
function normalizeSupplier(name) {
  return String(name)
    .toUpperCase()
    .replace(/[.,'""]/g, '')
    .replace(/&/g, 'AND')
    .replace(/\b(LIMITED|LTD|PLC|LLP|INC|CORP|CORPORATION|COMPANY|CO)\b/g, '')
    .replace(/[^A-Z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── Process Camden ───────────────────────────────────

function processCamden(year) {
  const fp = path.join(SPEND_DIR, 'camden_spend_2023_24.csv');
  if (!fs.existsSync(fp)) {
    console.log('  Camden file not found, skipping');
    return null;
  }
  console.log('Processing Camden...');
  const rows = readCSV(fp, ',');
  console.log(`  ${rows.length} transactions loaded`);

  // Aggregate per service × supplier
  const services = {};  // { serviceName: { suppliersMap: { norm: {name, amount, count} }, total } }
  let totalSpend = 0;

  for (const r of rows) {
    const amt = parseFloat(r.amount_gbp) || 0;
    if (amt <= 0) continue;
    const ou = r.organisational_unit || '';
    const purpose = r.purpose || '';
    const supplier = (r.beneficiary_name || '').trim();
    if (!supplier || supplier === 'REDACTED') continue;
    const service = camdenServiceForRow(ou, purpose);
    if (!service) continue;

    if (!services[service]) services[service] = { suppliers: {}, total: 0, txCount: 0 };
    services[service].total += amt;
    services[service].txCount++;
    const norm = normalizeSupplier(supplier);
    if (!services[service].suppliers[norm]) {
      services[service].suppliers[norm] = { name: supplier, amount: 0, count: 0 };
    }
    services[service].suppliers[norm].amount += amt;
    services[service].suppliers[norm].count++;
    totalSpend += amt;
  }

  // Build top suppliers per service
  const out = {};
  for (const [svc, data] of Object.entries(services)) {
    const all = Object.values(data.suppliers).sort((a, b) => b.amount - a.amount);
    const TOP_N = 25;
    const top = all.slice(0, TOP_N).map(s => ({
      name: s.name,
      amount: Math.round(s.amount),
      pct: parseFloat((s.amount / data.total * 100).toFixed(1)),
      transactions: s.count
    }));
    const otherAmt = all.slice(TOP_N).reduce((s, x) => s + x.amount, 0);
    if (otherAmt > 0) {
      top.push({
        name: `Other (${all.length - TOP_N} suppliers)`,
        amount: Math.round(otherAmt),
        pct: parseFloat((otherAmt / data.total * 100).toFixed(1)),
        transactions: all.slice(TOP_N).reduce((s, x) => s + x.count, 0)
      });
    }
    out[svc] = {
      service_total_in_spend_data: Math.round(data.total),
      transaction_count: data.txCount,
      unique_suppliers: all.length,
      top_suppliers: top
    };
  }

  return {
    la_name: 'Camden',
    la_code: 'E09000007',
    year,
    fy_label: '2023/24',
    source: 'Camden Council Open Data Portal (Socrata SODA API)',
    total_transactions: rows.length,
    total_spend_gbp: Math.round(totalSpend),
    services: out
  };
}

// ─── Generic monthly file processor ───────────────────
//
// Reads N CSV files (one per month), extracts (service, supplier, amount)
// triples using a config object that knows the council's specifics.

function processMonthlyCouncil(config) {
  const { dir, files, encoding, sep, headerHint, getService, columns, label } = config;
  if (!fs.existsSync(dir)) { console.log(`  ${label}: directory not found, skipping`); return null; }

  console.log(`Processing ${label}...`);
  const services = {};
  let totalSpend = 0;
  let totalRows = 0;
  let filesRead = 0;

  for (const f of files) {
    const fp = path.join(dir, f);
    if (!fs.existsSync(fp)) { continue; }
    const buf = fs.readFileSync(fp);
    const raw = buf.toString(encoding || 'utf8').replace(/^\uFEFF/, '');
    const lines = raw.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) continue;

    // Auto-detect header row by looking for the headerHint string in the first few lines.
    // Some councils prefix CSVs with title rows / grand totals before the actual header.
    let headerRowIdx = 0;
    if (headerHint) {
      for (let k = 0; k < Math.min(8, lines.length); k++) {
        if (lines[k].includes(headerHint)) { headerRowIdx = k; break; }
      }
    }

    const headerLine = lines[headerRowIdx];
    const headers = parseCSVLine(headerLine, sep || ',').map(h => h.replace(/^"|"$/g, '').trim());
    const colIdx = {};
    for (const [key, possible] of Object.entries(columns)) {
      for (const cand of possible) {
        const found = headers.findIndex(h => h === cand || h.toLowerCase() === cand.toLowerCase());
        if (found >= 0) { colIdx[key] = found; break; }
      }
    }

    for (let i = headerRowIdx + 1; i < lines.length; i++) {
      const ln = lines[i];
      // Skip filler rows like ",,,,,,"
      if (!ln.replace(/[,\s]/g, '')) continue;
      const cols = parseCSVLine(ln, sep || ',');
      const supplier = (cols[colIdx.supplier] || '').replace(/^"|"$/g, '').trim();
      if (!supplier) continue;
      // Parse amount (handle £, commas, quotes)
      const amtRaw = (cols[colIdx.amount] || '').replace(/^"|"$/g, '').replace(/[£,\s]/g, '');
      const amt = parseFloat(amtRaw);
      if (isNaN(amt) || amt <= 0) continue;
      // Sanity cap: no single transaction > £100M. Pair-reversal entries
      // (negative paired with equal positive) would otherwise inflate totals
      // because we drop negatives above. Seen in North Somerset 2023/24
      // (LUF 1 - Tropicana / RCKA LTD £4.58B reversal).
      if (amt > 100_000_000) continue;

      const svcArg1 = (cols[colIdx.service] || '').replace(/^"|"$/g, '').trim();
      const svcArg2 = (cols[colIdx.service2] || '').replace(/^"|"$/g, '').trim();
      const service = getService(svcArg1, svcArg2);
      if (!service) continue;

      if (!services[service]) services[service] = { suppliers: {}, total: 0, txCount: 0 };
      services[service].total += amt;
      services[service].txCount++;
      const norm = normalizeSupplier(supplier);
      if (!services[service].suppliers[norm]) {
        services[service].suppliers[norm] = { name: supplier, amount: 0, count: 0 };
      }
      services[service].suppliers[norm].amount += amt;
      services[service].suppliers[norm].count++;
      totalSpend += amt;
      totalRows++;
    }
    filesRead++;
  }

  console.log(`  ${label}: ${filesRead} files, ${totalRows} rows, £${(totalSpend/1e6).toFixed(1)}M`);

  // Build top suppliers per service
  const out = {};
  for (const [svc, data] of Object.entries(services)) {
    const all = Object.values(data.suppliers).sort((a, b) => b.amount - a.amount);
    const TOP_N = 25;
    const top = all.slice(0, TOP_N).map(s => ({
      name: s.name,
      amount: Math.round(s.amount),
      pct: parseFloat((s.amount / data.total * 100).toFixed(1)),
      transactions: s.count
    }));
    const otherAmt = all.slice(TOP_N).reduce((s, x) => s + x.amount, 0);
    if (otherAmt > 0) {
      top.push({
        name: `Other (${all.length - TOP_N} suppliers)`,
        amount: Math.round(otherAmt),
        pct: parseFloat((otherAmt / data.total * 100).toFixed(1)),
        transactions: all.slice(TOP_N).reduce((s, x) => s + x.count, 0)
      });
    }
    out[svc] = {
      service_total_in_spend_data: Math.round(data.total),
      transaction_count: data.txCount,
      unique_suppliers: all.length,
      top_suppliers: top
    };
  }

  return { services: out, totalSpend, totalRows };
}

// ─── Process Birmingham ───────────────────────────────
//
// KNOWN LIMITATION: Birmingham City Observatory's payments-to-suppliers-over-gbp500
// dataset is a ROLLING ~24-month window. As of April 2026, the live dataset only
// contains data from 2024-04-02 onwards — FY 2023-24 has been fully purged.
// No Wayback Machine snapshot exists from the window when FY 2023-24 was live.
// data.gov.uk never had Birmingham spending data. The legacy birmingham.gov.uk
// transparency URL returns HTTP 403.
//
// Birmingham issued a Section 114 notice in September 2023 (effectively bankrupt),
// which has affected transparency publishing. The only path to obtain historical
// FY 2023-24 data is an FOI request to foi.mailbox@birmingham.gov.uk.
//
// The function below is preserved so that when the rolling window eventually
// covers FY 2024-25, this script will pick it up automatically.

function processBirmingham(year) {
  const fp = path.join(SPEND_DIR, 'birmingham_spend_recent.csv');
  if (!fs.existsSync(fp)) {
    console.log('  Birmingham file not found, skipping');
    return null;
  }
  console.log('Processing Birmingham...');
  const rows = readCSV(fp, ';');
  console.log(`  ${rows.length} transactions loaded`);

  // Filter to FY 2023-24 (April 2023 to March 2024 inclusive)
  const fyRows = rows.filter(r => {
    const d = String(r.date || '');
    return d >= '2023-04-01' && d <= '2024-03-31';
  });
  console.log(`  ${fyRows.length} transactions in FY 2023-24`);

  if (fyRows.length === 0) {
    console.log('  No FY 2023-24 data — Birmingham CSV may be rolling 12-month window only');
    return null;
  }

  const services = {};
  let totalSpend = 0;

  for (const r of fyRows) {
    const amt = parseFloat(r.amount) || 0;
    if (amt <= 0) continue;
    const dept = r.department || '';
    const summary = r.summary || '';
    const merchant = r.merchant_category || '';
    const supplier = (r.beneficiary || '').trim();
    if (!supplier) continue;

    const service = birminghamServiceForRow(dept, summary, merchant);

    if (!services[service]) services[service] = { suppliers: {}, total: 0, txCount: 0 };
    services[service].total += amt;
    services[service].txCount++;
    const norm = normalizeSupplier(supplier);
    if (!services[service].suppliers[norm]) {
      services[service].suppliers[norm] = { name: supplier, amount: 0, count: 0 };
    }
    services[service].suppliers[norm].amount += amt;
    services[service].suppliers[norm].count++;
    totalSpend += amt;
  }

  const out = {};
  for (const [svc, data] of Object.entries(services)) {
    const all = Object.values(data.suppliers).sort((a, b) => b.amount - a.amount);
    const TOP_N = 25;
    const top = all.slice(0, TOP_N).map(s => ({
      name: s.name,
      amount: Math.round(s.amount),
      pct: parseFloat((s.amount / data.total * 100).toFixed(1)),
      transactions: s.count
    }));
    const otherAmt = all.slice(TOP_N).reduce((s, x) => s + x.amount, 0);
    if (otherAmt > 0) {
      top.push({
        name: `Other (${all.length - TOP_N} suppliers)`,
        amount: Math.round(otherAmt),
        pct: parseFloat((otherAmt / data.total * 100).toFixed(1)),
        transactions: all.slice(TOP_N).reduce((s, x) => s + x.count, 0)
      });
    }
    out[svc] = {
      service_total_in_spend_data: Math.round(data.total),
      transaction_count: data.txCount,
      unique_suppliers: all.length,
      top_suppliers: top
    };
  }

  return {
    la_name: 'Birmingham',
    la_code: 'E08000025',
    year,
    fy_label: '2023/24',
    source: 'Birmingham City Observatory (Opendatasoft API)',
    total_transactions: fyRows.length,
    total_spend_gbp: Math.round(totalSpend),
    services: out
  };
}

// ─── Process Rochdale (12 monthly files, latin1 encoding) ──

function processRochdale(year) {
  const dir = path.join(SPEND_DIR, 'rochdale');
  const months = ['2023_APR', '2023_MAY', '2023_JUN', '2023_JUL', '2023_AUG', '2023_SEP',
                  '2023_OCT', '2023_NOV', '2023_DEC', '2024_JAN', '2024_FEB', '2024_MAR'];
  const files = months.map(m => `${m}_Spend.csv`);
  const result = processMonthlyCouncil({
    label: 'Rochdale',
    dir, files, encoding: 'latin1', sep: ',',
    headerHint: 'ORGANISATION NAME',
    columns: {
      service: ['DIRECTORATE'],
      supplier: ['SUPPLIER NAME'],
      amount: ['AMOUNT (£)']
    },
    getService: (dir) => ROCHDALE_DIR_MAP[dir] || 'Central Services'
  });
  if (!result || result.totalRows === 0) return null;
  return {
    la_name: 'Rochdale',
    la_code: 'E08000005',
    year,
    fy_label: '2023/24',
    source: 'Rochdale Borough Council Open Data (Spend Over £500)',
    total_transactions: result.totalRows,
    total_spend_gbp: Math.round(result.totalSpend),
    services: result.services
  };
}

// ─── Process Manchester (12 monthly, header at row 3) ──

function processManchester(year) {
  const dir = path.join(SPEND_DIR, 'manchester');
  const files = ['apr_2023','may_2023','jun_2023','jul_2023','aug_2023','sep_2023',
                 'oct_2023','nov_2023','dec_2023','jan_2024','feb_2024','mar_2024'].map(m => `${m}.csv`);
  const result = processMonthlyCouncil({
    label: 'Manchester',
    dir, files, encoding: 'latin1', sep: ',',
    headerHint: 'Body Name',
    columns: {
      service: ['Service Area'],
      supplier: ['Supplier Name'],
      amount: ['Net Amount']
    },
    getService: (svc) => manchesterServiceForRow(svc)
  });
  if (!result || result.totalRows === 0) return null;
  return {
    la_name: 'Manchester',
    la_code: 'E08000003',
    year,
    fy_label: '2023/24',
    source: 'Manchester City Council Spend Over £500',
    total_transactions: result.totalRows,
    total_spend_gbp: Math.round(result.totalSpend),
    services: result.services
  };
}

// ─── Process Leeds (12 monthly, Service Division Label) ──

function processLeeds(year) {
  const dir = path.join(SPEND_DIR, 'leeds');
  const months = ['2023_04','2023_05','2023_06','2023_07','2023_08','2023_09',
                  '2023_10','2023_11','2023_12','2024_01','2024_02','2024_03'];
  const files = months.map(m => `spending_${m}.csv`);
  const result = processMonthlyCouncil({
    label: 'Leeds',
    dir, files, encoding: 'utf8', sep: ',',
    headerHint: 'Organisation Code',
    columns: {
      service: ['Organisational Unit'],   // top-level division
      service2: ['Service Division Label'],
      supplier: ['Beneficiary Name', 'Beneficiary'],
      amount: ['Amount']
    },
    getService: (ou, svc) => leedsServiceForRow(svc, ou)
  });
  if (!result || result.totalRows === 0) return null;
  return {
    la_name: 'Leeds',
    la_code: 'E08000035',
    year,
    fy_label: '2023/24',
    source: 'Leeds City Council via Data Mill North CKAN API',
    total_transactions: result.totalRows,
    total_spend_gbp: Math.round(result.totalSpend),
    services: result.services
  };
}

// ─── Generic: process any council using a pre-built LLM mapping file ─────────
//
// The mapping file is produced by scripts/classify_council_departments.js
// (Claude Haiku, run once offline). Format: { patterns: { "dept|purpose": "Category", ... } }
//
// This replaces the need for per-council hardcoded mapping objects.
// Existing manual processors (Camden, Rochdale, Manchester, Leeds) are kept
// as-is — they are battle-tested. New councils use this generic path.

function processCouncilWithMapping(config) {
  const {
    name, code, files, dir, deptCol, purposeCol, amountCol, supplierCol,
    sep, encoding, headerHint, mappingFile, year, fyLabel, source,
    supplierAliases
  } = config;

  // Load mapping
  if (!fs.existsSync(mappingFile)) {
    console.log(`  ${name}: mapping file not found: ${mappingFile}`);
    console.log(`  Run: node scripts/classify_council_departments.js --council ${name} ...`);
    return null;
  }
  const mapping = JSON.parse(fs.readFileSync(mappingFile, 'utf8'));
  const rawPatterns = mapping.patterns || {};
  const manualOverrides = mapping._manual_overrides || [];

  // Normalize mapping keys at load time to match the row-side normalization.
  // Without this, councils whose mapping was classified before the apostrophe
  // fix (commit 7902916) would silently regress: rows produce "Children's"
  // (normalized) but mapping has "Children\uFFFDs" → no match → Other Services.
  // 63 of 110 councils have this drift. When two keys collide after
  // normalization (e.g. mapping classified the variants differently), prefer
  // the non-"Other Services" value so we recover real classifications.
  const normKey = (k) => k.replace(/[\u2018\u2019\uFFFD]/g, "'");
  const patterns = {};
  let mergeConflicts = 0;
  for (const [k, v] of Object.entries(rawPatterns)) {
    const nk = normKey(k);
    if (patterns[nk] !== undefined && patterns[nk] !== v) {
      mergeConflicts++;
      if (patterns[nk] === 'Other Services' && v !== 'Other Services') patterns[nk] = v;
      // else keep existing (already non-Other or same)
    } else {
      patterns[nk] = v;
    }
  }
  const collapsed = Object.keys(rawPatterns).length - Object.keys(patterns).length;
  const cMsg = collapsed > 0 ? `, ${collapsed} keys collapsed via apostrophe normalization` + (mergeConflicts > 0 ? ` (${mergeConflicts} conflicts resolved)` : '') : '';
  console.log(`Processing ${name} (${Object.keys(patterns).length} mapped patterns${manualOverrides.length ? ', ' + manualOverrides.length + ' manual overrides' : ''}${cMsg})...`);

  // Apply council-scoped overrides AFTER pattern lookup but BEFORE "Other Services"
  // fallback. Each override has match.dept_exact (case-insensitive) and assign.
  // Designed for the case where dept name is an MHCLG literal (e.g. "Adult Social
  // Care") but classifier weighted purpose and chose Other/Central instead.
  function applyOverride(dept, purpose, mappedService) {
    for (const ov of manualOverrides) {
      const m = ov.match || {};
      if (m.dept_exact && (dept || '').trim().toLowerCase() === m.dept_exact.toLowerCase()) {
        return ov.assign;
      }
    }
    return mappedService;
  }
  let overrideCount = 0;

  // Resolve file list
  let fileList;
  if (files) {
    fileList = files;
  } else if (dir) {
    fileList = fs.readdirSync(dir).filter(f => f.endsWith('.csv')).map(f => path.join(dir, f));
  } else {
    console.log(`  ${name}: no files or dir specified`);
    return null;
  }

  const services = {};
  let totalSpend = 0;
  let totalRows = 0;
  let unmapped = 0;

  for (const fp of fileList) {
    if (!fs.existsSync(fp)) continue;
    const buf = fs.readFileSync(fp);
    const raw = buf.toString(encoding || 'utf8').replace(/^\uFEFF/, '');
    const lines = raw.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) continue;

    // Auto-detect header row
    let headerRowIdx = 0;
    if (headerHint) {
      for (let k = 0; k < Math.min(8, lines.length); k++) {
        if (lines[k].includes(headerHint)) { headerRowIdx = k; break; }
      }
    }

    const headers = parseCSVLine(lines[headerRowIdx], sep || ',').map(h => h.replace(/^"|"$/g, '').trim());
    const colIdx = {};
    const colNames = { dept: deptCol, purpose: purposeCol, supplier: supplierCol, amount: amountCol };
    for (const [key, colName] of Object.entries(colNames)) {
      if (!colName) continue;
      const found = headers.findIndex(h => h === colName || h.toLowerCase() === colName.toLowerCase());
      if (found >= 0) colIdx[key] = found;
    }

    if (colIdx.dept === undefined) {
      console.log(`  Warning: "${deptCol}" column not found in ${path.basename(fp)}, skipping`);
      continue;
    }

    for (let i = headerRowIdx + 1; i < lines.length; i++) {
      const ln = lines[i];
      if (!ln.replace(/[,\s]/g, '')) continue;
      const cols = parseCSVLine(ln, sep || ',');

      // Apostrophe normalization MUST mirror classify_council_departments.js.
      // Three forms collapsed: U+2018, U+2019, U+FFFD (replacement char from
      // cp1252-encoded apostrophe read as UTF-8 — 10/12 Telford monthly CSVs
      // ship pre-corrupted "Children\uFFFDs Safeguarding"). Heuristic but
      // consistent across observed councils.
      const normApos = (s) => s.replace(/[\u2018\u2019\uFFFD]/g, "'");
      const dept = normApos((cols[colIdx.dept] || '').replace(/^"|"$/g, '').trim());
      const purpose = colIdx.purpose !== undefined ? normApos((cols[colIdx.purpose] || '').replace(/^"|"$/g, '').trim()) : '';
      let supplier = (cols[colIdx.supplier] || '').replace(/^"|"$/g, '').trim();
      // Council-specific supplier aliases (e.g. merge "TfGM Interbank" +
      // "TFGM" under a single canonical name). Applied before dedup so the
      // display name and the normalized key both pick up the alias.
      if (supplierAliases) {
        const alias = supplierAliases[supplier] || supplierAliases[supplier.toLowerCase()];
        if (alias) supplier = alias;
      }
      const amtRaw = (cols[colIdx.amount] || '').replace(/^"|"$/g, '').replace(/[£,\s]/g, '');
      const amt = parseFloat(amtRaw);
      if (isNaN(amt) || amt <= 0 || !supplier) continue;
      // Sanity cap: no single transaction > £100M. Pair-reversal entries
      // (negative paired with equal positive) would otherwise inflate totals
      // because we drop negatives above. Seen in North Somerset 2023/24
      // (LUF 1 - Tropicana / RCKA LTD £4.58B reversal).
      if (amt > 100_000_000) continue;

      const patternKey = dept + '|' + purpose;
      let service = patterns[patternKey] || 'Other Services';
      const beforeOverride = service;
      service = applyOverride(dept, purpose, service);
      if (service !== beforeOverride) overrideCount++;
      if (service === '_excluded') continue;
      if (!patterns[patternKey] && service === 'Other Services') unmapped++;

      if (!services[service]) services[service] = { suppliers: {}, purposes: {}, total: 0, txCount: 0 };
      services[service].total += amt;
      services[service].txCount++;
      const norm = normalizeSupplier(supplier);
      if (!services[service].suppliers[norm]) {
        services[service].suppliers[norm] = { name: supplier, amount: 0, count: 0 };
      }
      services[service].suppliers[norm].amount += amt;
      services[service].suppliers[norm].count++;
      // Track purpose breakdown: use dept+purpose compound label so that
      // e.g. "Director Strategic Finance | Non-Domestic Rates" stays
      // distinguishable from other "Non-Domestic Rates" entries. Empty purpose
      // falls back to dept alone so label is never blank.
      const purposeLabel = purpose ? (dept ? `${dept} — ${purpose}` : purpose) : (dept || '(unspecified)');
      if (!services[service].purposes[purposeLabel]) {
        services[service].purposes[purposeLabel] = { label: purposeLabel, amount: 0, count: 0 };
      }
      services[service].purposes[purposeLabel].amount += amt;
      services[service].purposes[purposeLabel].count++;
      totalSpend += amt;
      totalRows++;
    }
  }

  if (totalRows === 0) { console.log(`  ${name}: no valid rows`); return null; }
  if (unmapped > 0) console.log(`  ${name}: ${unmapped} rows had unmapped patterns → "Other Services"`);
  if (overrideCount > 0) console.log(`  ${name}: ${overrideCount} rows reassigned by manual overrides`);
  console.log(`  ${name}: ${totalRows} rows, £${(totalSpend / 1e6).toFixed(1)}M total`);

  // Build top suppliers per service (same logic as other processors)
  const out = {};
  for (const [svc, data] of Object.entries(services)) {
    const all = Object.values(data.suppliers).sort((a, b) => b.amount - a.amount);
    const TOP_N = 25;
    const top = all.slice(0, TOP_N).map(s => ({
      name: s.name,
      amount: Math.round(s.amount),
      pct: parseFloat((s.amount / data.total * 100).toFixed(1)),
      transactions: s.count
    }));
    const otherAmt = all.slice(TOP_N).reduce((s, x) => s + x.amount, 0);
    if (otherAmt > 0) {
      top.push({
        name: `Other (${all.length - TOP_N} suppliers)`,
        amount: Math.round(otherAmt),
        pct: parseFloat((otherAmt / data.total * 100).toFixed(1)),
        transactions: all.slice(TOP_N).reduce((s, x) => s + x.count, 0)
      });
    }
    // Build top purposes (what's inside each service category, especially
    // useful for "Other Services" which otherwise looks opaque). Top 10 by £
    // plus a rollup of the remainder.
    const allPurposes = Object.values(data.purposes || {}).sort((a, b) => b.amount - a.amount);
    const TOP_P = 10;
    const topPurposes = allPurposes.slice(0, TOP_P).map(p => ({
      label: p.label,
      amount: Math.round(p.amount),
      pct: parseFloat((p.amount / data.total * 100).toFixed(1)),
      transactions: p.count
    }));
    const otherPurposeAmt = allPurposes.slice(TOP_P).reduce((s, x) => s + x.amount, 0);
    if (otherPurposeAmt > 0) {
      topPurposes.push({
        label: `Other (${allPurposes.length - TOP_P} purposes)`,
        amount: Math.round(otherPurposeAmt),
        pct: parseFloat((otherPurposeAmt / data.total * 100).toFixed(1)),
        transactions: allPurposes.slice(TOP_P).reduce((s, x) => s + x.count, 0)
      });
    }
    out[svc] = {
      service_total_in_spend_data: Math.round(data.total),
      transaction_count: data.txCount,
      unique_suppliers: all.length,
      top_suppliers: top,
      top_purposes: topPurposes
    };
  }

  return {
    la_name: name,
    la_code: code,
    year: year || parseInt(YEAR),
    fy_label: fyLabel || '2023/24',
    source: source || `${name} Council Spend Over £500 (LLM-classified)`,
    total_transactions: totalRows,
    total_spend_gbp: Math.round(totalSpend),
    services: out
  };
}

// ─── LLM-classified council configs ─────────────────────
// Each entry is a council that uses a mapping file from classify_council_departments.js.
// To add a new council: 1) download CSV, 2) run classifier, 3) add config here.

const LLM_COUNCILS = [
  {
    name: 'Bristol',
    code: 'E06000023',
    dir: path.join(SPEND_DIR, 'bristol'),
    deptCol: 'Description 2',
    purposeCol: null,
    amountCol: 'Amount',
    supplierCol: 'Name',
    sep: ',',
    encoding: 'utf8',
    mappingFile: path.join(SPEND_DIR, 'bristol_dept_mapping.json'),
    fyLabel: '2023/24',
    source: 'Bristol City Council Spend Over £500 (bristol.gov.uk)'
  },
  {
    name: 'Sheffield',
    code: 'E08000019',
    dir: path.join(SPEND_DIR, 'sheffield'),
    deptCol: 'Portfolio',
    purposeCol: 'Category Description',
    amountCol: 'Value',
    supplierCol: 'Supplier',
    sep: ',',
    encoding: 'utf8',
    mappingFile: path.join(SPEND_DIR, 'sheffield_dept_mapping.json'),
    fyLabel: '2023/24',
    source: 'Sheffield City Council Spend Over £250 (Data Mill North)'
  },
  {
    name: 'Dudley',
    code: 'E08000027',
    dir: path.join(SPEND_DIR, 'dudley'),
    deptCol: 'directorate',
    purposeCol: 'service',
    amountCol: 'amount net',
    supplierCol: 'supplier name',
    sep: ',',
    encoding: 'utf8',
    mappingFile: path.join(SPEND_DIR, 'dudley_dept_mapping.json'),
    fyLabel: '2023/24',
    source: 'Dudley Council Spend Over £500 (dudley.gov.uk)'
  },
  {
    name: 'Nottinghamshire',
    code: 'E10000024',
    dir: path.join(SPEND_DIR, 'nottinghamshire'),
    deptCol: 'Service Label',
    purposeCol: null,
    amountCol: 'Net Amount',
    supplierCol: 'Supplier Name',
    sep: ',',
    encoding: 'utf8',
    mappingFile: path.join(SPEND_DIR, 'nottinghamshire_dept_mapping.json'),
    fyLabel: '2023/24',
    source: 'Nottinghamshire CC Spend Over £500 (nottinghamshire.gov.uk)'
  },
  {
    name: 'Lambeth',
    code: 'E09000022',
    dir: path.join(SPEND_DIR, 'lambeth'),
    deptCol: 'Directorate',
    purposeCol: 'Division',
    amountCol: 'Amount',
    supplierCol: 'Supplier Name *******',
    sep: ',',
    encoding: 'utf8',
    mappingFile: path.join(SPEND_DIR, 'lambeth_dept_mapping.json'),
    fyLabel: '2023/24',
    source: 'Lambeth Council Spend Over £500 (lambeth.gov.uk)'
  },
  {
    name: 'Merton',
    code: 'E09000024',
    dir: path.join(SPEND_DIR, 'merton'),
    deptCol: 'Directorate',
    purposeCol: 'Purpose of Expenditure',
    amountCol: 'Gross Invoice Value',
    supplierCol: 'Supplier Name',
    sep: ',',
    encoding: 'utf8',
    mappingFile: path.join(SPEND_DIR, 'merton_dept_mapping.json'),
    fyLabel: '2023/24',
    source: 'Merton Council Spend Over £500 (merton.gov.uk)'
  },
  {
    name: 'South Gloucestershire',
    code: 'E06000025',
    dir: path.join(SPEND_DIR, 'south_glos'),
    deptCol: 'Dept',
    purposeCol: 'Cost Centre Description',
    amountCol: 'GL Code Net Amount',
    supplierCol: 'Creditor Name',
    sep: ',',
    encoding: 'utf8',
    headerHint: 'Ref No',
    mappingFile: path.join(SPEND_DIR, 'south_gloucestershire_dept_mapping.json'),
    fyLabel: '2023/24',
    source: 'South Gloucestershire Council Spend Over £500 (southglos.gov.uk)'
  },
  {
    name: 'East Sussex',
    code: 'E10000011',
    dir: path.join(SPEND_DIR, 'east_sussex'),
    deptCol: 'Department',
    purposeCol: 'Payment Category',
    amountCol: 'Amount',
    supplierCol: 'Name',
    sep: ',',
    encoding: 'utf8',
    mappingFile: path.join(SPEND_DIR, 'east_sussex_dept_mapping.json'),
    fyLabel: '2023/24',
    source: 'East Sussex CC Spend Over £500 (eastsussex.gov.uk)'
  },
  {
    name: 'Norfolk',
    code: 'E10000020',
    dir: path.join(SPEND_DIR, 'norfolk'),
    deptCol: 'Directorate',
    purposeCol: null,
    amountCol: 'Net Amount',
    supplierCol: 'Supplier Name',
    sep: ',',
    encoding: 'utf8',
    headerHint: 'Organisation',
    mappingFile: path.join(SPEND_DIR, 'norfolk_dept_mapping.json'),
    fyLabel: '2023/24',
    source: 'Norfolk CC Spend Over £500 (norfolk.gov.uk)'
  },
  {
    name: 'Kent',
    code: 'E10000016',
    dir: path.join(SPEND_DIR, 'kent'),
    deptCol: 'Directorate',
    purposeCol: 'Service Description',
    amountCol: 'Invoice NET',
    supplierCol: 'Supplier Name',
    sep: ',',
    encoding: 'utf8',
    headerHint: 'Body',
    mappingFile: path.join(SPEND_DIR, 'kent_dept_mapping.json'),
    fyLabel: '2023/24',
    source: 'Kent CC Invoices Over £250 (kent.gov.uk)'
  },
  {
    name: 'Cornwall',
    code: 'E06000052',
    dir: path.join(SPEND_DIR, 'cornwall'),
    deptCol: 'Directorate',
    purposeCol: 'Service/Board',
    amountCol: 'Net Amount',
    supplierCol: 'Supplier Name',
    sep: ',',
    encoding: 'utf8',
    mappingFile: path.join(SPEND_DIR, 'cornwall_dept_mapping.json'),
    fyLabel: '2023/24',
    source: 'Cornwall Council Spend Over £500 (cornwall.gov.uk)'
  },
  {
    name: 'Southwark',
    code: 'E09000028',
    dir: path.join(SPEND_DIR, 'southwark'),
    deptCol: 'department',
    purposeCol: null,
    amountCol: 'amount',
    supplierCol: 'beneficiary',
    sep: ',',
    encoding: 'utf8',
    mappingFile: path.join(SPEND_DIR, 'southwark_dept_mapping.json'),
    fyLabel: '2023/24',
    source: 'Southwark Council Spend Over £250 (southwark.gov.uk)'
  },
  {
    name: 'Hertfordshire',
    code: 'E10000015',
    dir: path.join(SPEND_DIR, 'hertfordshire'),
    deptCol: 'Dept. where expenditure incurred',
    purposeCol: 'Purpose of Expenditure (Expenditure Category)',
    amountCol: 'Net Amount',
    supplierCol: 'Supplier (Beneficiary)',
    sep: ',',
    encoding: 'utf8',
    mappingFile: path.join(SPEND_DIR, 'hertfordshire_dept_mapping.json'),
    fyLabel: '2023/24',
    source: 'Hertfordshire CC Supplier Payments Over £250 (hertfordshire.gov.uk)'
  },
  {
    name: 'Buckinghamshire',
    code: 'E06000060',
    dir: path.join(SPEND_DIR, 'buckinghamshire'),
    deptCol: 'Directorate',
    purposeCol: 'Expense type',
    amountCol: 'Invoice Amount',
    supplierCol: 'Supplier Name',
    sep: ',',
    encoding: 'utf8',
    mappingFile: path.join(SPEND_DIR, 'buckinghamshire_dept_mapping.json'),
    fyLabel: '2023/24',
    source: 'Buckinghamshire Council Spend Over £500 (buckinghamshire.gov.uk)'
  },
  {
    name: 'North Yorkshire',
    code: 'E06000065',
    dir: path.join(SPEND_DIR, 'north_yorkshire'),
    deptCol: 'DIRECTORATE_DESCRIPTION',
    purposeCol: 'COST_CENTRE_DESCRIPTION',
    amountCol: 'INVOICE_AMOUNT',
    supplierCol: 'SUPPLIER_NAME',
    sep: ',',
    encoding: 'utf8',
    mappingFile: path.join(SPEND_DIR, 'north_yorkshire_dept_mapping.json'),
    fyLabel: '2023/24',
    source: 'North Yorkshire Council Spend Over £500 (datanorthyorkshire.org)'
  },
  {
    name: 'Bradford',
    code: 'E08000032',
    dir: path.join(SPEND_DIR, 'bradford'),
    deptCol: 'Service Label',
    purposeCol: 'Expenditure Category',
    amountCol: 'Net Amount £',
    supplierCol: 'Supplier Name',
    sep: ',',
    encoding: 'utf8',
    mappingFile: path.join(SPEND_DIR, 'bradford_dept_mapping.json'),
    fyLabel: '2023/24',
    source: 'Bradford Council Spend Over £500 (datahub.bradford.gov.uk)'
  },
  {
    name: 'Liverpool',
    code: 'E08000012',
    dir: path.join(SPEND_DIR, 'liverpool'),
    deptCol: 'Service Area',
    purposeCol: 'Expense Type',
    amountCol: 'Actual Value',
    supplierCol: 'Vendor',
    sep: ',',
    encoding: 'utf8',
    mappingFile: path.join(SPEND_DIR, 'liverpool_dept_mapping.json'),
    fyLabel: '2023/24',
    source: 'Liverpool City Council Spend Over £500 (liverpool.gov.uk)'
  },
  {
    name: 'Croydon',
    code: 'E09000008',
    dir: path.join(SPEND_DIR, 'croydon'),
    deptCol: 'Cost Centre Level 3 Description',
    purposeCol: 'Subjective Description',
    amountCol: 'Amount',
    supplierCol: 'Vendor Name',
    sep: ',',
    encoding: 'utf8',
    mappingFile: path.join(SPEND_DIR, 'croydon_dept_mapping.json'),
    fyLabel: '2023/24',
    source: 'Croydon Council Payments Over £500 (croydon.gov.uk)'
  },
  {
    name: 'Coventry',
    code: 'E08000026',
    dir: path.join(SPEND_DIR, 'coventry'),
    deptCol: 'Directorate(T)',
    purposeCol: 'Proclass(T)',
    amountCol: 'Amount',
    supplierCol: 'Supplier(T)',
    sep: ',',
    encoding: 'utf8',
    mappingFile: path.join(SPEND_DIR, 'coventry_dept_mapping.json'),
    fyLabel: '2023/24',
    source: 'Coventry City Council Spend Over £500 (coventry.gov.uk)'
  },
  {
    name: 'Essex',
    code: 'E10000012',
    dir: path.join(SPEND_DIR, 'essex'),
    deptCol: 'Function',
    purposeCol: 'Spend Description',
    amountCol: 'Value',
    supplierCol: 'Name',
    sep: ',',
    encoding: 'utf8',
    mappingFile: path.join(SPEND_DIR, 'essex_dept_mapping.json'),
    fyLabel: '2023/24',
    source: 'Essex County Council Day-to-Day Spending (essex.gov.uk)'
  },
  {
    name: 'West Sussex',
    code: 'E10000032',
    dir: path.join(SPEND_DIR, 'west_sussex'),
    deptCol: 'Service Label',
    purposeCol: 'Expenditure Category',
    amountCol: 'Total',
    supplierCol: 'Supplier name',
    sep: ',',
    encoding: 'utf8',
    mappingFile: path.join(SPEND_DIR, 'west_sussex_dept_mapping.json'),
    fyLabel: '2023/24',
    source: 'West Sussex CC Spend Data (westsussex.gov.uk)'
  },
  {
    name: 'Lancashire',
    code: 'E10000017',
    dir: path.join(SPEND_DIR, 'lancashire'),
    deptCol: 'Service label',
    purposeCol: null,
    amountCol: 'Amount',
    supplierCol: 'Supplier name',
    sep: ',',
    encoding: 'utf8',
    mappingFile: path.join(SPEND_DIR, 'lancashire_dept_mapping.json'),
    fyLabel: '2023/24',
    source: 'Lancashire County Council Payments to Suppliers (transparency.lancashire.gov.uk, 11/12 months — March 2024 not published upstream)'
  },
  {
    name: 'Devon',
    code: 'E10000008',
    dir: path.join(SPEND_DIR, 'devon'),
    deptCol: 'Expense Area',
    purposeCol: 'Expense Type',
    amountCol: 'Amount',
    supplierCol: 'Supplier Name',
    sep: ',',
    encoding: 'utf8',
    mappingFile: path.join(SPEND_DIR, 'devon_dept_mapping.json'),
    fyLabel: '2023/24',
    source: 'Devon County Council Spending Over £500 (github.com/Devon-County-Council/spending)'
  },
  {
    name: 'Staffordshire',
    code: 'E10000028',
    dir: path.join(SPEND_DIR, 'staffordshire'),
    deptCol: 'OrganisationalUnit',
    purposeCol: 'Purpose',
    amountCol: 'Amount',
    supplierCol: 'BeneficiaryName',
    sep: ',',
    encoding: 'utf8',
    mappingFile: path.join(SPEND_DIR, 'staffordshire_dept_mapping.json'),
    fyLabel: '2023/24',
    source: 'Staffordshire County Council Expenditure Over £500 (staffordshire.gov.uk)'
  },
  {
    name: 'Lincolnshire',
    code: 'E10000019',
    dir: path.join(SPEND_DIR, 'lincolnshire'),
    deptCol: 'OrganisationalUnit',
    purposeCol: 'CategoryInternalName',
    amountCol: 'Amount',
    supplierCol: 'BeneficiaryName',
    sep: ',',
    encoding: 'utf8',
    mappingFile: path.join(SPEND_DIR, 'lincolnshire_dept_mapping.json'),
    fyLabel: '2023/24',
    source: 'Lincolnshire County Council Spending (lcc.portaljs.com via Datopian — includes transactions below £500)'
  },
  {
    name: 'Hampshire',
    code: 'E10000014',
    dir: path.join(SPEND_DIR, 'hampshire'),
    deptCol: 'Departments',
    purposeCol: 'Expense type',
    amountCol: 'Amount',
    supplierCol: 'Supplier name (Amended)',
    sep: ',',
    encoding: 'utf8',
    mappingFile: path.join(SPEND_DIR, 'hampshire_dept_mapping.json'),
    fyLabel: '2023/24',
    source: 'Hampshire County Council Payments to Suppliers (documents.hants.gov.uk, 12/12 months via Playwright)'
  },
  {
    name: 'Surrey',
    code: 'E10000030',
    dir: path.join(SPEND_DIR, 'surrey'),
    deptCol: 'Department Incurring Spend',
    purposeCol: 'Merchant Category',
    amountCol: 'Gross Amount',
    supplierCol: 'Beneficiary Name',
    sep: ',',
    encoding: 'latin1',
    mappingFile: path.join(SPEND_DIR, 'surrey_dept_mapping.json'),
    fyLabel: '2023/24 (Q3+Q4 only, 6 of 12 months)',
    source: 'Surrey County Council Transparency (surreyi.gov.uk, Oct 2023 – Mar 2024 via Playwright; Apr-Sep 2023 deleted from upstream rolling window)'
  },
  {
    name: 'Birmingham',
    code: 'E08000025',
    files: [path.join(SPEND_DIR, 'birmingham_spend_2024_25.csv')],
    deptCol: 'department',
    purposeCol: null,
    amountCol: 'amount',
    supplierCol: 'beneficiary',
    sep: ';',
    encoding: 'utf8',
    mappingFile: path.join(SPEND_DIR, 'birmingham_dept_mapping.json'),
    fyLabel: '2024/25',
    source: 'Birmingham City Council Spend Over £500 (City Observatory, FY 2024-25)'
  },

  // ═══ LONDON BOROUGHS (session 2026-04-14/15) ═══

  { name: 'City of London', code: 'E09000001', dir: path.join(SPEND_DIR, 'city_of_london'),
    deptCol: 'Department', purposeCol: 'Purpose of Expenditure', amountCol: 'Net Amount',
    supplierCol: 'Supplier Name', sep: ',', encoding: 'utf8',
    mappingFile: path.join(SPEND_DIR, 'city_of_london_dept_mapping.json'),
    fyLabel: '2023/24',
    source: 'City of London Corporation — Local Authority Expenditure monthly XLSX (cityoflondon.gov.uk)' },

  { name: 'Havering', code: 'E09000016', dir: path.join(SPEND_DIR, 'havering'),
    deptCol: 'Local Authority Department', purposeCol: 'Purpose of Expenditure', amountCol: 'Amount (excluding VAT)',
    supplierCol: 'Beneficiary', sep: ',', encoding: 'utf8',
    mappingFile: path.join(SPEND_DIR, 'havering_dept_mapping.json'),
    fyLabel: '2023/24',
    source: 'London Borough of Havering — Spend Over £500 (havering.gov.uk)' },

  { name: 'Greenwich', code: 'E09000011', dir: path.join(SPEND_DIR, 'greenwich'),
    deptCol: 'LA Department', purposeCol: 'Expenditure Category/Description', amountCol: 'Invoice Line Amount',
    supplierCol: 'Creditor_Name', sep: ',', encoding: 'utf8',
    mappingFile: path.join(SPEND_DIR, 'greenwich_dept_mapping.json'),
    fyLabel: '2023/24',
    source: 'Royal Borough of Greenwich — Greater than £500 quarterly (royalgreenwich.gov.uk)' },

  { name: 'Haringey', code: 'E09000014', dir: path.join(SPEND_DIR, 'haringey'),
    deptCol: 'Department', purposeCol: 'Purpose', amountCol: 'Amount',
    supplierCol: 'Supplier Name', sep: ',', encoding: 'utf8',
    mappingFile: path.join(SPEND_DIR, 'haringey_dept_mapping.json'),
    fyLabel: '2023/24',
    source: 'London Borough of Haringey — Council Expenditure quarterly (haringey.gov.uk)' },

  { name: 'Harrow', code: 'E09000015', dir: path.join(SPEND_DIR, 'harrow'),
    deptCol: 'Department', purposeCol: 'Category/Purpose', amountCol: 'Gross',
    supplierCol: 'Updated Beneficiary', sep: ',', encoding: 'utf8',
    mappingFile: path.join(SPEND_DIR, 'harrow_dept_mapping.json'),
    fyLabel: '2023/24',
    source: 'London Borough of Harrow — Council Spend quarterly (harrow.gov.uk)' },

  { name: 'Westminster', code: 'E09000033', dir: path.join(SPEND_DIR, 'westminster'),
    deptCol: 'Department', purposeCol: 'Expense type', amountCol: 'Amount',
    supplierCol: 'Supplier name', sep: ',', encoding: 'utf8',
    mappingFile: path.join(SPEND_DIR, 'westminster_dept_mapping.json'),
    fyLabel: '2023/24',
    source: 'Westminster City Council — Expenditure Over £500 quarterly (westminster.gov.uk)' },

  { name: 'Barking and Dagenham', code: 'E09000002', dir: path.join(SPEND_DIR, 'barking_dagenham'),
    deptCol: 'Cost Centre Description', purposeCol: 'Nominal Description', amountCol: 'Gross',
    supplierCol: 'Supplier', sep: ',', encoding: 'utf8', headerHint: 'Supplier',
    mappingFile: path.join(SPEND_DIR, 'barking_dagenham_dept_mapping.json'),
    fyLabel: '2023/24',
    source: 'London Borough of Barking & Dagenham — Payments over £250 (lbbd.gov.uk, filtered to £500+)' },

  { name: 'Bexley', code: 'E09000004', dir: path.join(SPEND_DIR, 'bexley'),
    deptCol: 'Service Area', purposeCol: 'Expense Type', amountCol: 'Amount',
    supplierCol: 'Supplier', sep: ',', encoding: 'utf8', headerHint: 'Supplier',
    mappingFile: path.join(SPEND_DIR, 'bexley_dept_mapping.json'),
    fyLabel: '2023/24',
    source: 'London Borough of Bexley — Payments over £500 (bexley.gov.uk)' },

  { name: 'Islington', code: 'E09000019', dir: path.join(SPEND_DIR, 'islington'),
    deptCol: 'Department', purposeCol: 'Spend Type', amountCol: 'Net Amount',
    supplierCol: 'Supplier Name', sep: ',', encoding: 'utf8',
    mappingFile: path.join(SPEND_DIR, 'islington_dept_mapping.json'),
    fyLabel: '2023/24',
    source: 'London Borough of Islington — Council Spending quarterly (islington.gov.uk)' },

  { name: 'Kensington and Chelsea', code: 'E09000020', dir: path.join(SPEND_DIR, 'rbkc'),
    deptCol: 'Directorate / service where expenditure incurred', purposeCol: 'purpose_of_spend', amountCol: 'Net Amount',
    supplierCol: 'Supplier (Beneficiary) name', sep: ',', encoding: 'latin1',
    mappingFile: path.join(SPEND_DIR, 'rbkc_dept_mapping.json'),
    fyLabel: '2023/24 (calendar quarters)',
    source: 'Royal Borough of Kensington & Chelsea — Suppliers/Contracts/Transactions calendar quarterly (rbkc.gov.uk)' },

  { name: 'Tower Hamlets', code: 'E09000030', dir: path.join(SPEND_DIR, 'tower_hamlets'),
    deptCol: 'Directorate', purposeCol: 'Expense Type', amountCol: 'Net Amount',
    supplierCol: 'Supplier Name', sep: ',', encoding: 'utf8',
    mappingFile: path.join(SPEND_DIR, 'tower_hamlets_dept_mapping.json'),
    fyLabel: '2023/24',
    source: 'London Borough of Tower Hamlets — 250 Spend (towerhamlets.gov.uk, filtered to £500+)' },

  { name: 'Barnet', code: 'E09000003', dir: path.join(SPEND_DIR, 'barnet'),
    deptCol: 'Department', purposeCol: 'Expenditure Type', amountCol: 'Expenditure Amount (exc VAT)',
    supplierCol: 'Vendor Name', sep: ',', encoding: 'latin1',
    mappingFile: path.join(SPEND_DIR, 'barnet_dept_mapping.json'),
    fyLabel: '2023/24',
    source: 'London Borough of Barnet — Expenditure Reporting (open.barnet.gov.uk CKAN)' },

  { name: 'Brent', code: 'E09000005', dir: path.join(SPEND_DIR, 'brent'),
    deptCol: 'Cost Centre Description', purposeCol: 'Subjective Description', amountCol: 'Amount',
    supplierCol: 'Vendor Name 2', sep: ',', encoding: 'utf8', headerHint: 'Vendor Name',
    mappingFile: path.join(SPEND_DIR, 'brent_dept_mapping.json'),
    fyLabel: '2023/24',
    source: 'London Borough of Brent — What We Spend quarterly (data.brent.gov.uk CKAN)' },

  { name: 'Hounslow', code: 'E09000018', dir: path.join(SPEND_DIR, 'hounslow'),
    deptCol: 'OrganisationalUnit', purposeCol: 'Purpose', amountCol: 'Amount',
    supplierCol: 'BeneficiaryName', sep: ',', encoding: 'utf8',
    mappingFile: path.join(SPEND_DIR, 'hounslow_dept_mapping.json'),
    fyLabel: '2023/24',
    source: 'London Borough of Hounslow — Invoices over £500 (data.hounslow.gov.uk / Datopian)' },

  { name: 'Ealing', code: 'E09000009', dir: path.join(SPEND_DIR, 'ealing'),
    deptCol: 'Service Label', purposeCol: 'Expenditure Category', amountCol: 'Net Amount',
    supplierCol: 'Amended Supplier Name', sep: ',', encoding: 'utf8',
    mappingFile: path.join(SPEND_DIR, 'ealing_dept_mapping.json'),
    fyLabel: '2023/24',
    source: 'London Borough of Ealing — Council Spending Over £250 (ealing.gov.uk, filtered to £500+)' },

  { name: 'Richmond', code: 'E09000027', dir: path.join(SPEND_DIR, 'richmond'),
    deptCol: 'DIRECTORATE', purposeCol: 'ACTIVITY', amountCol: 'PAYMENT AMOUNT',
    supplierCol: 'PAYEE', sep: ',', encoding: 'latin1',
    mappingFile: path.join(SPEND_DIR, 'richmond_dept_mapping.json'),
    fyLabel: '2023/24',
    source: 'London Borough of Richmond upon Thames — Council Payments to Suppliers (richmond.gov.uk)' },

  { name: 'Wandsworth', code: 'E09000032', dir: path.join(SPEND_DIR, 'wandsworth'),
    deptCol: 'DIRECTORATE', purposeCol: 'ACTIVITY', amountCol: 'PAYMENT AMOUNT',
    supplierCol: 'PAYEE', sep: ',', encoding: 'latin1',
    mappingFile: path.join(SPEND_DIR, 'wandsworth_dept_mapping.json'),
    fyLabel: '2023/24',
    source: 'London Borough of Wandsworth — Council Expenditure (wandsworth.gov.uk)' },

  { name: 'Newham', code: 'E09000025', dir: path.join(SPEND_DIR, 'newham'),
    deptCol: 'Local Authority Department', purposeCol: 'Purpose', amountCol: 'Amount',
    supplierCol: 'BENEFICIARY', sep: ',', encoding: 'utf8',
    mappingFile: path.join(SPEND_DIR, 'newham_dept_mapping.json'),
    fyLabel: '2023/24',
    source: 'London Borough of Newham — Payments to Suppliers over £250 (newham.gov.uk, filtered to £500+)' },

  { name: 'Redbridge', code: 'E09000026', dir: path.join(SPEND_DIR, 'redbridge'),
    deptCol: 'Directorate', purposeCol: 'Service', amountCol: 'Amount',
    supplierCol: 'Supplier description', sep: ',', encoding: 'utf8',
    mappingFile: path.join(SPEND_DIR, 'redbridge_dept_mapping.json'),
    fyLabel: '2023/24',
    source: 'London Borough of Redbridge — Payments Over £500 (data.redbridge.gov.uk)' },

  { name: 'Hillingdon', code: 'E09000017', dir: path.join(SPEND_DIR, 'hillingdon'),
    deptCol: 'Cclvl4 Desc', purposeCol: 'Account Desc', amountCol: 'Distrib Amount SUM',
    supplierCol: 'Vendor Name', sep: ',', encoding: 'utf8',
    mappingFile: path.join(SPEND_DIR, 'hillingdon_dept_mapping.json'),
    fyLabel: '2023/24',
    source: 'London Borough of Hillingdon — Council Spending Over £500 (pre.hillingdon.gov.uk)' },

  { name: 'Enfield', code: 'E09000010', dir: path.join(SPEND_DIR, 'enfield'),
    deptCol: 'Service Area Categorisation', purposeCol: 'Expenses Type', amountCol: 'Net Amount',
    supplierCol: 'Supplier Name', sep: ',', encoding: 'utf8',
    mappingFile: path.join(SPEND_DIR, 'enfield_dept_mapping.json'),
    fyLabel: '2023/24',
    source: 'London Borough of Enfield — Monthly Transactions over £250 (enfield.gov.uk, via Playwright profile; filtered to £500+)' },

  { name: 'Kingston upon Thames', code: 'E09000021', dir: path.join(SPEND_DIR, 'kingston'),
    deptCol: 'Expense Area', purposeCol: 'Expense Type', amountCol: 'Amount £ (Excl VAT)',
    supplierCol: 'Supplier name', sep: ',', encoding: 'latin1',
    mappingFile: path.join(SPEND_DIR, 'kingston_dept_mapping.json'),
    fyLabel: '2023/24',
    source: 'Royal Borough of Kingston upon Thames — Over £500 Transparency Code (kingston.gov.uk)' },

  { name: 'Sutton', code: 'E09000029', dir: path.join(SPEND_DIR, 'sutton'),
    deptCol: 'Expense Area', purposeCol: 'Expense Type', amountCol: 'Amount £ (Excl VAT)',
    supplierCol: 'Supplier name', sep: ',', encoding: 'latin1',
    mappingFile: path.join(SPEND_DIR, 'sutton_dept_mapping.json'),
    fyLabel: '2023/24 (11/12 months, Sep 2023 gap)',
    source: 'London Borough of Sutton — Payments over £500 (sutton.gov.uk, Liferay DMS, Sep 2023 missing from source)' },

  { name: 'Lewisham', code: 'E09000023', dir: path.join(SPEND_DIR, 'lewisham'),
    deptCol: 'DEPARTMENT', purposeCol: 'DESCRIPTION', amountCol: '£ SPEND (EXCLUDING VAT)',
    supplierCol: 'SUPPLIER', sep: ',', encoding: 'utf8', headerHint: 'SUPPLIER',
    mappingFile: path.join(SPEND_DIR, 'lewisham_dept_mapping.json'),
    fyLabel: '2023/24 (10/12 months, Apr+Jun 2023 broken upstream)',
    source: 'London Borough of Lewisham — Council Spending Over £250 (lewisham.gov.uk, filtered to £500+)' },

  { name: 'Hammersmith and Fulham', code: 'E09000013', dir: path.join(SPEND_DIR, 'hammersmith_fulham'),
    deptCol: 'Cost Center/Capital Project Description', purposeCol: 'GL Account Description', amountCol: 'Amount £ (Ex VAT)',
    supplierCol: 'Supplier Name', sep: ',', encoding: 'utf8',
    mappingFile: path.join(SPEND_DIR, 'hammersmith_fulham_dept_mapping.json'),
    fyLabel: '2023/24 (3/4 quarters, Q3 Oct-Dec 2023 unrecoverable)',
    source: 'London Borough of Hammersmith & Fulham — Spend Data quarterly (lbhf.gov.uk, Q1+Q2 via live origin UA override, Q3 FOI-only)' },

  { name: 'Waltham Forest', code: 'E09000031', dir: path.join(SPEND_DIR, 'waltham_forest'),
    deptCol: 'Division', purposeCol: 'Service', amountCol: 'Invoice Amount',
    supplierCol: 'Supplier Name', sep: ',', encoding: 'utf8',
    mappingFile: path.join(SPEND_DIR, 'waltham_forest_dept_mapping.json'),
    fyLabel: '2023/24 (7/12 months, Apr-Aug 2023 purged by rolling window)',
    source: 'London Borough of Waltham Forest — Council Spending above £500 (walthamforest.gov.uk)' },

  { name: 'Bromley', code: 'E09000006', dir: path.join(SPEND_DIR, 'bromley'),
    deptCol: 'Portfolio', purposeCol: 'Merchant Category', amountCol: 'Net Amount',
    supplierCol: 'Supplier_Name', sep: ',', encoding: 'utf8',
    mappingFile: path.join(SPEND_DIR, 'bromley_dept_mapping.json'),
    fyLabel: '2023/24',
    source: 'London Borough of Bromley — Payments to Suppliers Over £500 (bromley.gov.uk)' },

  { name: 'Hackney', code: 'E09000012', dir: path.join(SPEND_DIR, 'hackney'),
    deptCol: '7. DEPARTMENT', purposeCol: '8. PURPOSE OF EXPENDITURE', amountCol: 'Total',
    supplierCol: '5. BENEFICIARY', sep: ',', encoding: 'utf8',
    mappingFile: path.join(SPEND_DIR, 'hackney_dept_mapping.json'),
    fyLabel: '2023/24 (11/12 months, May 2023 mislabeled in source)',
    source: 'London Borough of Hackney — Council Spending Over £250 (hackney.gov.uk via Google Drive, filtered to £500+)' },

  // ─── Combined Authorities (FY 2023-24) ─────────────────────────────
  // GMCA, WMCA, WYCA — injected as metadata on their own tree nodes
  // under Local Government (England) > Other Authorities. They are not
  // double-counted against member councils: MHCLG Revenue Outturn already
  // treats each CA as a distinct entity reporting only its own expenditure.
  // LCRCA excluded — no transparency publication (per discovery 2026-04-15).

  { name: 'Greater Manchester Combined Authority', code: 'E47000001',
    dir: path.join(SPEND_DIR, 'gmca'),
    deptCol: 'Procurement Category', purposeCol: 'Purpose of Spend',
    amountCol: 'Net Amount', supplierCol: 'Beneficiary',
    sep: ',', encoding: 'utf8',
    mappingFile: path.join(SPEND_DIR, 'gmca_dept_mapping.json'),
    fyLabel: '2023/24',
    source: 'Greater Manchester Combined Authority — Quarterly Spend over £500 (greatermanchester-ca.gov.uk)',
    // Merge both TfGM supplier variants (interbank operating transfers +
    // direct invoices) under one canonical display name. Keeps the panel
    // honest without making the user parse internal finance jargon.
    supplierAliases: {
      'TfGM Interbank': 'Transport for Greater Manchester',
      'TFGM': 'Transport for Greater Manchester',
      'TfGM': 'Transport for Greater Manchester',
      'Transport for Greater Manchester': 'Transport for Greater Manchester'
    } },

  { name: 'West Midlands Combined Authority', code: 'E47000007',
    dir: path.join(SPEND_DIR, 'wmca'),
    deptCol: 'Cost Centre', purposeCol: 'Expense Type',
    amountCol: 'Amount', supplierCol: 'Supplier Name',
    sep: ',', encoding: 'utf8', headerHint: 'Cost Centre',
    mappingFile: path.join(SPEND_DIR, 'wmca_dept_mapping.json'),
    fyLabel: '2023/24 (8/12 months, Apr-Jul 2023 PDF-only upstream)',
    source: 'West Midlands Combined Authority — Monthly Financial Disclosures (wmca.org.uk, Aug 2023 onwards in XLSX)' },

  { name: 'West Yorkshire Combined Authority', code: 'E47000003',
    files: [path.join(SPEND_DIR, 'wyca', 'wyca_fy2324_unified.csv')],
    deptCol: 'directorate', purposeCol: 'purpose',
    amountCol: 'amount', supplierCol: 'supplier',
    sep: ',', encoding: 'utf8',
    mappingFile: path.join(SPEND_DIR, 'wyca_dept_mapping.json'),
    fyLabel: '2023/24 (3/4 quarters, Q2 upstream truncated)',
    source: 'West Yorkshire Combined Authority — Quarterly Transparency Expenditure (westyorks-ca.gov.uk, 3 schemas unified via preprocess_wyca.js)' }
];

// ─── Main ─────────────────────────────────────────────

console.log(`Building council spend lookup for ${YEAR}\n`);

// Preserve externally-built entries (e.g. GLA subsystem from build_gla_suppliers.js).
// Previously this script overwrote the lookup file every run and silently dropped GLA.
const lookup = fs.existsSync(OUTPUT) ? JSON.parse(fs.readFileSync(OUTPUT, 'utf8')) : {};

// Helper: merge newly-built council entry with preserved audit trail fields
// (source_url, archive_url, captured_at, archive_files) from the existing
// entry. Without this, re-running the build clobbers archive.org mirror URLs
// populated by archive_sources.js and upload_to_archive_org.js.
function mergeEntry(name, newEntry) {
  const existing = lookup[name] || {};
  lookup[name] = Object.assign({}, newEntry, {
    source_url: existing.source_url || newEntry.source_url,
    archive_url: existing.archive_url || newEntry.archive_url,
    captured_at: existing.captured_at || newEntry.captured_at,
    archive_status: existing.archive_status || newEntry.archive_status,
    archive_files: existing.archive_files || newEntry.archive_files
  });
}

// ── Manual processors (battle-tested, kept as-is) ──

const camden = processCamden(YEAR);
if (camden) {
  mergeEntry('Camden', camden);
  console.log(`  Camden: £${(camden.total_spend_gbp/1e6).toFixed(1)}M total, ${Object.keys(camden.services).length} services\n`);
  Object.entries(camden.services).forEach(([svc, d]) => {
    console.log(`    ${svc.padEnd(25)} £${(d.service_total_in_spend_data/1e6).toFixed(1).padStart(6)}M  (${d.transaction_count} tx, ${d.unique_suppliers} suppliers)`);
  });
}
console.log();

const birmingham = processBirmingham(YEAR);
if (birmingham) {
  mergeEntry('Birmingham', birmingham);
  console.log(`\n  Birmingham: £${(birmingham.total_spend_gbp/1e6).toFixed(1)}M total, ${Object.keys(birmingham.services).length} services\n`);
  Object.entries(birmingham.services).forEach(([svc, d]) => {
    console.log(`    ${svc.padEnd(25)} £${(d.service_total_in_spend_data/1e6).toFixed(1).padStart(6)}M  (${d.transaction_count} tx, ${d.unique_suppliers} suppliers)`);
  });
}

console.log();
const rochdale = processRochdale(YEAR);
if (rochdale) {
  mergeEntry('Rochdale', rochdale);
  console.log(`\n  Rochdale: £${(rochdale.total_spend_gbp/1e6).toFixed(1)}M total, ${Object.keys(rochdale.services).length} services\n`);
  Object.entries(rochdale.services).sort((a,b) => b[1].service_total_in_spend_data - a[1].service_total_in_spend_data).forEach(([svc, d]) => {
    console.log(`    ${svc.padEnd(25)} £${(d.service_total_in_spend_data/1e6).toFixed(1).padStart(6)}M  (${d.transaction_count} tx, ${d.unique_suppliers} suppliers)`);
  });
}

console.log();
const manchester = processManchester(YEAR);
if (manchester) {
  mergeEntry('Manchester', manchester);
  console.log(`\n  Manchester: £${(manchester.total_spend_gbp/1e6).toFixed(1)}M total, ${Object.keys(manchester.services).length} services\n`);
  Object.entries(manchester.services).sort((a,b) => b[1].service_total_in_spend_data - a[1].service_total_in_spend_data).forEach(([svc, d]) => {
    console.log(`    ${svc.padEnd(25)} £${(d.service_total_in_spend_data/1e6).toFixed(1).padStart(6)}M  (${d.transaction_count} tx, ${d.unique_suppliers} suppliers)`);
  });
}

console.log();
const leeds = processLeeds(YEAR);
if (leeds) {
  mergeEntry('Leeds', leeds);
  console.log(`\n  Leeds: £${(leeds.total_spend_gbp/1e6).toFixed(1)}M total, ${Object.keys(leeds.services).length} services\n`);
  Object.entries(leeds.services).sort((a,b) => b[1].service_total_in_spend_data - a[1].service_total_in_spend_data).forEach(([svc, d]) => {
    console.log(`    ${svc.padEnd(25)} £${(d.service_total_in_spend_data/1e6).toFixed(1).padStart(6)}M  (${d.transaction_count} tx, ${d.unique_suppliers} suppliers)`);
  });
}

// ── LLM-classified councils (generic path) ──

for (const cfg of LLM_COUNCILS) {
  console.log();
  const result = processCouncilWithMapping(cfg);
  if (result) {
    mergeEntry(cfg.name, result);
    console.log(`\n  ${cfg.name}: £${(result.total_spend_gbp/1e6).toFixed(1)}M total, ${Object.keys(result.services).length} services\n`);
    Object.entries(result.services).sort((a, b) => b[1].service_total_in_spend_data - a[1].service_total_in_spend_data).forEach(([svc, d]) => {
      console.log(`    ${svc.padEnd(25)} £${(d.service_total_in_spend_data/1e6).toFixed(1).padStart(6)}M  (${d.transaction_count} tx, ${d.unique_suppliers} suppliers)`);
    });
  }
}

// ── Manifest-driven councils (auto_configs.json generated from discovery reports) ──

const AUTO_CONFIGS = path.join(SPEND_DIR, 'auto_configs.json');
if (fs.existsSync(AUTO_CONFIGS)) {
  // Pre-flight: validate column resolution before building. Catches schema
  // drift (Bolton mar_2024, Cheshire West purposeCol=null patterns) upfront
  // instead of after-the-fact via low coverage. Skip with NO_VALIDATE=1.
  if (!process.env.NO_VALIDATE) {
    const { spawnSync } = require('child_process');
    const validatorPath = path.join(__dirname, 'validate_auto_configs.js');
    if (fs.existsSync(validatorPath)) {
      const result = spawnSync('node', [validatorPath, '--quiet'], { stdio: 'inherit' });
      if (result.status !== 0) {
        console.error('\n✗ Validator failed. Fix auto_configs.json mismatches above, or set NO_VALIDATE=1 to skip.');
        process.exit(1);
      }
    }
  }

  const autoList = JSON.parse(fs.readFileSync(AUTO_CONFIGS, 'utf8'));
  console.log(`\n━━━ Auto-configs from manifest: ${autoList.length} councils ━━━\n`);
  for (const cfg of autoList) {
    // Absolutise the dir/mappingFile paths (generator writes relative where possible)
    if (cfg.dir && !path.isAbsolute(cfg.dir)) cfg.dir = path.join(SPEND_DIR, cfg.dir);
    if (cfg.mappingFile && !path.isAbsolute(cfg.mappingFile)) cfg.mappingFile = path.join(SPEND_DIR, cfg.mappingFile);
    console.log();
    const result = processCouncilWithMapping(cfg);
    if (result) {
      // Carry through provenance fields from the manifest into the merged entry
      if (cfg.source_url) result.source_url = cfg.source_url;
      mergeEntry(cfg.name, result);
      console.log(`\n  ${cfg.name}: £${(result.total_spend_gbp/1e6).toFixed(1)}M total, ${Object.keys(result.services).length} services\n`);
      Object.entries(result.services).sort((a, b) => b[1].service_total_in_spend_data - a[1].service_total_in_spend_data).forEach(([svc, d]) => {
        console.log(`    ${svc.padEnd(25)} £${(d.service_total_in_spend_data/1e6).toFixed(1).padStart(6)}M  (${d.transaction_count} tx, ${d.unique_suppliers} suppliers)`);
      });
    }
  }
}

fs.writeFileSync(OUTPUT, JSON.stringify(lookup, null, 2));
console.log(`\n✓ Written: ${path.relative(DATA_DIR, OUTPUT)}`);
