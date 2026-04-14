#!/usr/bin/env node
/**
 * build_gla_suppliers.js
 *
 * Produces a synthetic "Greater London Authority" entry in
 * council_spend_lookup_2024.json that aggregates three subsystems:
 *
 *   - LFB (London Fire Brigade) → single "Fire & Rescue" bucket
 *   - TfL (Transport for London) → single "Transport" bucket
 *   - GLA core → multi-service via `Service Expenditure Analysis` column
 *
 * GLA tree node is at Other Authorities > Greater London Authority, with
 * service children: Police, Transport, Fire & Rescue, Education, Planning,
 * Central Services, Environment, Housing, Culture, Children's Social Care.
 *
 * The existing inject_council_spend_metadata.js walker visits
 * lg.children > cls.children > council.children, so GLA fits the pattern
 * if we add it to the lookup with `Greater London Authority` as the key.
 *
 * MPS (Metropolitan Police) is NOT included — blocked by Cloudflare on
 * met.police.uk. GLA > Police stays without supplier metadata.
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const UK_DIR = path.join(DATA_DIR, 'uk');
const SPEND_DIR = path.join(UK_DIR, 'local_authorities', 'spend');
const LOOKUP_FILE = path.join(SPEND_DIR, 'council_spend_lookup_2024.json');

// ─── CSV parser ───────────────────────────────────────────

function parseCSVLine(line) {
  const r = [];
  let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (c === ',' && !inQ) { r.push(cur); cur = ''; }
    else cur += c;
  }
  r.push(cur);
  return r;
}

function readCSV(fp, headerRowIdx, encoding) {
  const buf = fs.readFileSync(fp);
  const raw = buf.toString(encoding || 'utf8').replace(/^\uFEFF/, '');
  const lines = raw.split(/\r?\n/);
  const headers = parseCSVLine(lines[headerRowIdx]).map(h => h.replace(/^"|"$/g, '').trim());
  const rows = [];
  for (let i = headerRowIdx + 1; i < lines.length; i++) {
    if (!lines[i] || !lines[i].replace(/[,\s]/g, '')) continue;
    const cols = parseCSVLine(lines[i]);
    const row = {};
    headers.forEach((h, j) => row[h] = (cols[j] || '').replace(/^"|"$/g, '').trim());
    rows.push(row);
  }
  return { headers, rows };
}

function parseAmount(s) {
  if (!s) return 0;
  const n = parseFloat(String(s).replace(/[£\s,"]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

// ─── Aggregation helpers ──────────────────────────────────

function buildServiceBucket(rowsBySupplier, fyLabel, source) {
  const entries = Object.entries(rowsBySupplier)
    .map(([name, d]) => ({ name, amount: d.amount, transactions: d.count }))
    .sort((a, b) => b.amount - a.amount);

  const serviceTotal = entries.reduce((s, e) => s + e.amount, 0);
  const uniqueSuppliers = entries.length;
  const transactionCount = entries.reduce((s, e) => s + e.transactions, 0);

  const top10 = entries.slice(0, 10).map(e => ({
    name: e.name,
    amount: Math.round(e.amount),
    pct: serviceTotal > 0 ? parseFloat((e.amount / serviceTotal * 100).toFixed(1)) : 0,
    transactions: e.transactions
  }));

  let top_suppliers = top10;
  if (entries.length > 10) {
    const otherAmt = entries.slice(10).reduce((s, e) => s + e.amount, 0);
    const otherTx = entries.slice(10).reduce((s, e) => s + e.transactions, 0);
    top_suppliers = [...top10, {
      name: `Other (${entries.length - 10} suppliers)`,
      amount: Math.round(otherAmt),
      pct: serviceTotal > 0 ? parseFloat((otherAmt / serviceTotal * 100).toFixed(1)) : 0,
      transactions: otherTx
    }];
  }

  return {
    service_total_in_spend_data: Math.round(serviceTotal),
    transaction_count: transactionCount,
    unique_suppliers: uniqueSuppliers,
    top_suppliers
  };
}

function addRow(bucket, supplier, amount) {
  if (!supplier || !amount) return;
  const name = supplier.trim().replace(/\s+/g, ' ');
  if (!name) return;
  if (!bucket[name]) bucket[name] = { amount: 0, count: 0 };
  bucket[name].amount += amount;
  bucket[name].count += 1;
}

// ─── LFB: 12 monthly CSVs → Fire & Rescue ─────────────────

function processLFB() {
  console.log('\n── LFB (London Fire Brigade) ──');
  const lfbDir = path.join(SPEND_DIR, 'lfb');
  const files = fs.readdirSync(lfbDir).filter(f => f.endsWith('.csv'));
  const bySupplier = {};
  let totalRows = 0;

  for (const f of files) {
    const { rows } = readCSV(path.join(lfbDir, f), 0, 'utf8');
    for (const r of rows) {
      const supplier = r['NAME VEND'];
      const amt = parseAmount(r['AMT TOTAL']);
      addRow(bySupplier, supplier, amt);
    }
    totalRows += rows.length;
    console.log(`  ${f}: ${rows.length} rows`);
  }

  console.log(`  Total rows: ${totalRows}, unique suppliers: ${Object.keys(bySupplier).length}`);
  const bucket = buildServiceBucket(
    bySupplier,
    '2023/24',
    'London Fire Brigade monthly spend > £250 disclosure (london-fire.gov.uk)'
  );
  console.log(`  Service total: £${(bucket.service_total_in_spend_data / 1e6).toFixed(1)}M`);
  return bucket;
}

// ─── TfL: 13 period CSVs → Transport ──────────────────────

function processTfL() {
  console.log('\n── TfL (Transport for London) ──');
  const tflDir = path.join(SPEND_DIR, 'tfl');
  const files = fs.readdirSync(tflDir)
    .filter(f => /^p\d+\.csv$/.test(f))
    .sort();
  const bySupplier = {};
  let totalRows = 0;

  for (const f of files) {
    // Header on row 7 (index 6), 6 metadata rows before
    const { rows } = readCSV(path.join(tflDir, f), 6, 'latin1');
    for (const r of rows) {
      const supplier = r['Vendor Name'];
      // Column header contains £ symbol (cp1252) → find the amount column dynamically
      const amtKey = Object.keys(r).find(k => k.startsWith('Amount'));
      const amt = parseAmount(r[amtKey]);
      addRow(bySupplier, supplier, amt);
    }
    totalRows += rows.length;
    console.log(`  ${f}: ${rows.length} rows`);
  }

  console.log(`  Total rows: ${totalRows}, unique suppliers: ${Object.keys(bySupplier).length}`);
  const bucket = buildServiceBucket(
    bySupplier,
    '2023/24',
    'Transport for London spend > £250 disclosure (tfl.gov.uk, periods 1-13)'
  );
  console.log(`  Service total: £${(bucket.service_total_in_spend_data / 1e9).toFixed(2)}B`);
  return bucket;
}

// ─── GLA core: consolidated CSV → multi-service ───────────

const GLA_SEA_TO_SERVICE = {
  'CAPITAL': 'Central Services',
  'CENTRAL SERVICES': 'Central Services',
  "CHILDREN'S & EDUCATION SERVICES": 'Education',
  'CORPORATE & DEMOCRATIC CORE': 'Central Services',
  'CULTURAL & RELATED SERVICES': 'Culture',
  'CULTURAL &  RELATED SERVICES': 'Culture',
  'DIGITAL TRANSFORMATI': 'Central Services',
  'ENVIRONMENT': 'Environment',
  'HIGHWAYS & TRANSPORT SERVICES': 'Transport',
  'HOUSING & LAND SERVICES': 'Housing',
  'HOUSING SERVICES': 'Housing',
  'LPC CORPORATE': 'Central Services',
  'PLANNING SERVICES': 'Planning',
  'PUBLIC HEALTH': null,
  'SUPPORT COSTS': 'Central Services',
  'SUPPORT COSTS ': 'Central Services'
};

function processGLACore() {
  console.log('\n── GLA Core (Greater London Authority) ──');
  const file = path.join(SPEND_DIR, 'gla_core', 'consolidated_p1_p13_2023_24.csv');
  // Header on row 10 (index 9)
  const { rows } = readCSV(file, 9, 'latin1');
  console.log(`  Rows: ${rows.length}`);

  // Partition by service
  const byService = {};
  let skipped = 0;
  for (const r of rows) {
    const sea = (r['Service Expenditure Analysis'] || '').trim();
    const service = GLA_SEA_TO_SERVICE[sea];
    if (!service) { skipped++; continue; }
    const supplier = r['Vendor Name'];
    const amt = parseAmount(r['Amount']);
    if (!byService[service]) byService[service] = {};
    addRow(byService[service], supplier, amt);
  }
  console.log(`  Skipped (no service mapping): ${skipped}`);

  const services = {};
  for (const [svcName, supplierMap] of Object.entries(byService)) {
    const bucket = buildServiceBucket(
      supplierMap,
      '2023/24',
      'Greater London Authority GLA & GLA Land & Property spend > £250 disclosure (data.london.gov.uk)'
    );
    services[svcName] = bucket;
    console.log(`  ${svcName}: £${(bucket.service_total_in_spend_data / 1e6).toFixed(1)}M  (${bucket.unique_suppliers} suppliers)`);
  }
  return services;
}

// ─── Main ─────────────────────────────────────────────────

function main() {
  console.log('=== Build GLA Subsystem Suppliers ===');

  const lfbBucket = processLFB();
  const tflBucket = processTfL();
  const glaCoreServices = processGLACore();

  // Merge TfL Transport with GLA core Transport (if any)
  const services = { ...glaCoreServices };
  if (services['Transport']) {
    console.log('\n  Note: GLA core had Transport rows — merging with TfL');
    // TfL dominates by orders of magnitude; simple concat + resort
    const merged = {};
    for (const s of services['Transport'].top_suppliers) {
      if (!s.name.startsWith('Other (')) merged[s.name] = { amount: s.amount, count: s.transactions };
    }
    for (const s of tflBucket.top_suppliers) {
      if (!s.name.startsWith('Other (')) {
        if (!merged[s.name]) merged[s.name] = { amount: 0, count: 0 };
        merged[s.name].amount += s.amount;
        merged[s.name].count += s.transactions;
      }
    }
    // Use TfL's authoritative totals for the bucket — GLA core Transport is negligible
    services['Transport'] = {
      service_total_in_spend_data: tflBucket.service_total_in_spend_data + services['Transport'].service_total_in_spend_data,
      transaction_count: tflBucket.transaction_count + services['Transport'].transaction_count,
      unique_suppliers: tflBucket.unique_suppliers + services['Transport'].unique_suppliers,
      top_suppliers: buildServiceBucket(merged, '2023/24', '').top_suppliers
    };
  } else {
    services['Transport'] = tflBucket;
  }
  services['Fire & Rescue'] = lfbBucket;

  // Compute total across all services
  const totalSpend = Object.values(services).reduce(
    (s, svc) => s + (svc.service_total_in_spend_data || 0), 0
  );

  const glaEntry = {
    la_name: 'Greater London Authority',
    la_code: 'E61000001',
    year: 2024,
    fy_label: '2023/24',
    source: 'GLA (data.london.gov.uk) + LFB (london-fire.gov.uk) + TfL (tfl.gov.uk)',
    total_transactions: Object.values(services).reduce((s, svc) => s + (svc.transaction_count || 0), 0),
    total_spend_gbp: totalSpend,
    services
  };

  console.log(`\n── Synthetic GLA entry ──`);
  console.log(`  Total spend: £${(totalSpend / 1e9).toFixed(2)}B`);
  console.log(`  Services: ${Object.keys(services).length}`);

  // Merge into lookup
  const lookup = JSON.parse(fs.readFileSync(LOOKUP_FILE, 'utf8'));
  lookup['Greater London Authority'] = glaEntry;
  fs.writeFileSync(LOOKUP_FILE, JSON.stringify(lookup, null, 2));
  console.log(`\n✓ Written to ${path.basename(LOOKUP_FILE)}`);
  console.log(`  Lookup now contains ${Object.keys(lookup).length} councils/entities`);
}

main();
