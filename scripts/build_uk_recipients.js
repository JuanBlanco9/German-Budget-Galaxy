#!/usr/bin/env node
/**
 * Build UK Top 100 recipients per department for Budget Galaxy.
 *
 * Sources:
 *   - NHS Allocations (for Department of Health): ICB-level allocations
 *   - Spend Over £25k (for DWP, DfE, MoD, HMT): monthly transaction CSVs/ODS/XLSX
 *
 * Output: data/recipients/uk/recipients_uk_{dept_id}_{year}.json
 */

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const YEAR = 2024;
const BASE = path.resolve(__dirname, '..', 'data', 'recipients', 'uk');
const SPEND_DIR = path.join(BASE, 'spend25k');
const OUT_DIR = path.resolve(__dirname, '..', 'data', 'recipients', 'uk');

// Department config: maps to tree names & total values from OSCAR 2024
const DEPTS = {
  dwp: {
    name: 'Department for Work and Pensions',
    tree_name: 'DEPARTMENT FOR WORK AND PENSIONS',
    total: 297400000000,
    files: Array.from({length:12}, (_,i) => `dwp_${String(i+1).padStart(2,'0')}.csv`),
    format: 'dwp'
  },
  dhsc: {
    name: 'Department of Health and Social Care',
    tree_name: 'DEPARTMENT OF HEALTH',
    total: 214200000000,
    files: Array.from({length:12}, (_,i) => `dhsc_${String(i+1).padStart(2,'0')}.csv`),
    format: 'standard'
  },
  dfe: {
    name: 'Department for Education',
    tree_name: 'DEPARTMENT FOR EDUCATION',
    total: 140300000000,
    files: Array.from({length:12}, (_,i) => `dfe_${String(i+1).padStart(2,'0')}.csv`),
    format: 'standard'
  },
  mod: {
    name: 'Ministry of Defence',
    tree_name: 'MINISTRY OF DEFENCE',
    total: 71900000000,
    files: Array.from({length:12}, (_,i) => `mod_${String(i+1).padStart(2,'0')}.ods`),
    format: 'ods'
  },
  hmt: {
    name: 'HM Treasury',
    tree_name: 'HM TREASURY',
    total: 63500000000,
    files: [
      ...Array.from({length:3}, (_,i) => `hmt_${String(i+1).padStart(2,'0')}.csv`),
      ...Array.from({length:9}, (_,i) => `hmt_${String(i+4).padStart(2,'0')}.xlsx`)
    ],
    format: 'hmt'
  }
};

// ─── Parsing helpers ────────────────────────────────────────

function parseAmount(raw) {
  if (typeof raw === 'number') return raw;
  if (!raw) return 0;
  let s = String(raw).trim();
  // Remove BOM, £, currency symbols, replacement chars, whitespace
  s = s.replace(/[\ufeff\ufffd\u00a3£$€\s]/g, '').replace(/,/g, '');
  // Handle parentheses as negative
  if (s.startsWith('(') && s.endsWith(')')) s = '-' + s.slice(1, -1);
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function normalizeSupplier(name) {
  if (!name) return '';
  let s = String(name).trim().toUpperCase();
  // Remove common suffixes
  s = s.replace(/\b(LIMITED|LTD|PLC|LLP|INC|CORP|UK)\b\.?/g, '').trim();
  // Remove location/ref codes like "- 2WM", "- LON", "(T/A ...)"
  s = s.replace(/\s*-\s*[A-Z0-9]{2,5}$/g, '').trim();
  s = s.replace(/\s*\(T\/A[^)]*\)/gi, '').trim();
  // Collapse whitespace
  s = s.replace(/\s+/g, ' ');
  // Remove trailing punctuation
  s = s.replace(/[.,;:\-]+$/, '').trim();
  return s;
}

function classifySupplier(name) {
  const u = (name || '').toUpperCase();
  if (/\bNHS\b/.test(u)) return 'NHS Body';
  if (/\bCOUNCIL\b|\bBOROUGH\b|\bLOCAL AUTH/.test(u)) return 'Local Authority';
  if (/\bUNIVERSIT/.test(u)) return 'University';
  if (/\bCHARIT|\bTRUST\b(?!.*NHS)|\bFOUNDATION\b/.test(u)) return 'Charity/Trust';
  if (/\bBAE\b|\bBOEING\b|\bAIRBUS\b|\bRolls.?Royce\b|\bRaytheon\b|\bTHALES\b|\bLEONARDO\b|\bMBDA\b|\bBABCOCK\b|\bQINETIQ\b/i.test(u)) return 'Defence Contractor';
  if (/\bDELOITTE\b|\bPWC\b|\bKPMG\b|\bERNST\b|\bMCKINSEY\b|\bACCENTURE\b|\bCAPGEMINI\b/i.test(u)) return 'Consultancy';
  if (/\bSERCO\b|\bCAPITA\b|\bATOS\b|\bG4S\b|\bSOPRA\b|\bCGI\b|\bFUJITSU\b/i.test(u)) return 'Outsourcing/IT';
  return 'Contractor';
}

// ─── CSV Parsers by format ──────────────────────────────────

function parseDwpCsv(filePath) {
  const rows = [];
  const raw = fs.readFileSync(filePath, 'latin1');
  const lines = raw.split('\n');
  // DWP: header-aware (format changed mid-2024, added Transaction Number column)
  const header = parseCSVLine(lines[0]);
  const supplierIdx = header.findIndex(h => /supplier/i.test(h));
  const amountIdx = header.findIndex(h => /amount/i.test(h));
  if (supplierIdx < 0 || amountIdx < 0) {
    console.warn(`  WARN: DWP headers: ${header.join(' | ')}`);
    return rows;
  }
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const parts = parseCSVLine(line);
    if (parts.length <= Math.max(supplierIdx, amountIdx)) continue;
    rows.push({ supplier: parts[supplierIdx], amount: parseAmount(parts[amountIdx]) });
  }
  return rows;
}

function parseStandardCsv(filePath) {
  const rows = [];
  const raw = fs.readFileSync(filePath, 'latin1');
  const lines = raw.split('\n');
  // Find header to locate Supplier and Amount columns
  const header = parseCSVLine(lines[0]);
  const supplierIdx = header.findIndex(h => /supplier/i.test(h));
  const amountIdx = header.findIndex(h => /^amount$/i.test(h));
  if (supplierIdx < 0 || amountIdx < 0) {
    console.warn(`  WARN: Could not find Supplier/Amount columns in ${path.basename(filePath)}`);
    console.warn(`  Headers: ${header.join(' | ')}`);
    return rows;
  }
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const parts = parseCSVLine(line);
    if (parts.length <= Math.max(supplierIdx, amountIdx)) continue;
    rows.push({ supplier: parts[supplierIdx], amount: parseAmount(parts[amountIdx]) });
  }
  return rows;
}

function parseOdsFile(filePath) {
  const rows = [];
  try {
    const wb = XLSX.readFile(filePath);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
    if (data.length < 2) return rows;
    const header = data[0].map(h => String(h || ''));
    const supplierIdx = header.findIndex(h => /supplier/i.test(h));
    const amountIdx = header.findIndex(h => /^total$/i.test(h) || /^amount$/i.test(h));
    if (supplierIdx < 0 || amountIdx < 0) {
      console.warn(`  WARN: ODS headers: ${header.join(' | ')}`);
      return rows;
    }
    for (let i = 1; i < data.length; i++) {
      const r = data[i];
      if (!r || !r[supplierIdx]) continue;
      rows.push({ supplier: String(r[supplierIdx]), amount: parseAmount(r[amountIdx]) });
    }
  } catch (e) {
    console.warn(`  WARN: Failed to read ${path.basename(filePath)}: ${e.message}`);
  }
  return rows;
}

function parseXlsxFile(filePath) {
  const rows = [];
  try {
    const wb = XLSX.readFile(filePath);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
    if (data.length < 2) return rows;
    const header = data[0].map(h => String(h || ''));
    const supplierIdx = header.findIndex(h => /supplier/i.test(h));
    const amountIdx = header.findIndex(h => /^amount$/i.test(h) || /^total$/i.test(h));
    if (supplierIdx < 0 || amountIdx < 0) {
      console.warn(`  WARN: XLSX headers: ${header.join(' | ')}`);
      return rows;
    }
    for (let i = 1; i < data.length; i++) {
      const r = data[i];
      if (!r || !r[supplierIdx]) continue;
      rows.push({ supplier: String(r[supplierIdx]), amount: parseAmount(r[amountIdx]) });
    }
  } catch (e) {
    console.warn(`  WARN: Failed to read ${path.basename(filePath)}: ${e.message}`);
  }
  return rows;
}

// ─── CSV line parser (handles quoted fields) ────────────────

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        result.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
  }
  result.push(current.trim());
  return result;
}

// ─── NHS Allocations parser (special for Health dept) ───────

function buildNhsAllocations() {
  console.log('\n=== DEPARTMENT OF HEALTH (NHS Allocations) ===');
  const allocFile = path.join(BASE, 'nhs_allocations_2023_2025.xlsx');
  const wb = XLSX.readFile(allocFile);

  // We'll combine Core + PMC + Other Primary Care + Running Costs for 2024-25
  const icbs = {}; // code -> { name, region, core, pmc, other, running }

  function extractSheet(sheetName, valueColSearch, codeCol = 2, nameCol = 3, regionCol = 1) {
    const ws = wb.Sheets[sheetName];
    if (!ws) { console.warn('  Sheet not found:', sheetName); return; }
    const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
    const headers = data[2] || [];
    // Find the allocation column
    let valIdx = -1;
    for (let i = headers.length - 1; i >= 0; i--) {
      if (headers[i] && String(headers[i]).includes(valueColSearch)) { valIdx = i; break; }
    }
    if (valIdx < 0) {
      console.warn('  Could not find column:', valueColSearch, 'in', sheetName);
      return;
    }
    for (let i = 3; i < data.length; i++) {
      const r = data[i];
      if (!r || !r[codeCol] || !r[nameCol]) continue;
      const code = String(r[codeCol]).trim();
      const name = String(r[nameCol]).trim();
      const region = r[regionCol] ? String(r[regionCol]).trim() : '';
      // Skip region totals and ENGLAND total
      if (['ENGLAND', 'Midlands', 'London', 'North East and Yorkshire', 'South East',
           'North West', 'East of England', 'South West'].includes(name)) continue;
      if (code.length > 5) continue; // skip non-ICB rows
      const val = parseAmount(r[valIdx]);
      if (!icbs[code]) icbs[code] = { name, region, core: 0, pmc: 0, other: 0, running: 0 };
      return { code, name, region, val, valIdx };
    }
  }

  // Extract each funding stream
  const sheets = [
    { name: 'ICB Core Allocations 2024-25', search: '2024/25 Combined allocation', field: 'core' },
    { name: 'PMC Allocations 2024-25', search: '2024/25 Recurrent allocation (', field: 'pmc' },
  ];

  for (const s of sheets) {
    const ws = wb.Sheets[s.name];
    if (!ws) { console.warn('  Sheet not found:', s.name); continue; }
    const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
    const headers = data[2] || [];
    let valIdx = -1;
    for (let i = headers.length - 1; i >= 0; i--) {
      if (headers[i] && String(headers[i]).includes(s.search)) { valIdx = i; break; }
    }
    // Fallback: try "Total allocation" or last numeric-looking column
    if (valIdx < 0) {
      for (let i = headers.length - 1; i >= 0; i--) {
        if (headers[i] && String(headers[i]).includes('Total allocation')) { valIdx = i; break; }
      }
    }
    if (valIdx < 0) {
      for (let i = headers.length - 1; i >= 0; i--) {
        if (headers[i] && String(headers[i]).includes('Recurrent allocation')) { valIdx = i; break; }
      }
    }
    console.log(`  ${s.name}: using col ${valIdx} "${(headers[valIdx]||'').toString().slice(0,60)}"`);

    for (let i = 3; i < data.length; i++) {
      const r = data[i];
      if (!r || !r[2] || !r[3]) continue;
      const code = String(r[2]).trim();
      const name = String(r[3]).trim();
      const region = r[1] ? String(r[1]).trim() : '';
      // Skip totals
      if (['ENGLAND','Midlands','London','North East and Yorkshire','South East',
           'North West','East of England','South West'].includes(name)) continue;
      if (!name.startsWith('NHS ')) continue; // only individual ICBs
      const val = parseAmount(r[valIdx]);
      if (!icbs[code]) icbs[code] = { name, region, core: 0, pmc: 0, other: 0, running: 0 };
      icbs[code][s.field] = val;
      icbs[code].name = name;
      icbs[code].region = region;
    }
  }

  // Other Primary Care sheet has different structure
  const opcWs = wb.Sheets['Other Primary Care'];
  if (opcWs) {
    const data = XLSX.utils.sheet_to_json(opcWs, { header: 1 });
    const headers = data[2] || [];
    // Find 2024/25 allocation column
    let valIdx = -1;
    for (let i = 0; i < headers.length; i++) {
      if (headers[i] && String(headers[i]).includes('2024/25') && String(headers[i]).includes('allocation')) {
        valIdx = i; break;
      }
    }
    if (valIdx < 0) {
      // Try last columns that mention 2024
      for (let i = headers.length - 1; i >= 0; i--) {
        if (headers[i] && String(headers[i]).includes('2024')) { valIdx = i; break; }
      }
    }
    console.log(`  Other Primary Care: using col ${valIdx} "${(headers[valIdx]||'').toString().slice(0,60)}"`);
    for (let i = 3; i < data.length; i++) {
      const r = data[i];
      if (!r || !r[2] || !r[3]) continue;
      const code = String(r[2]).trim();
      const name = String(r[3]).trim();
      if (!name.includes('ICB') && !name.startsWith('NHS ')) continue;
      const val = parseAmount(r[valIdx]);
      if (!icbs[code]) icbs[code] = { name, region: '', core: 0, pmc: 0, other: 0, running: 0 };
      icbs[code].other = val;
    }
  }

  // Running costs
  const rcWs = wb.Sheets['ICB running cost allowance'];
  if (rcWs) {
    const data = XLSX.utils.sheet_to_json(rcWs, { header: 1 });
    const headers = data[2] || [];
    let valIdx = headers.findIndex(h => h && String(h).includes('2024/25'));
    console.log(`  Running costs: using col ${valIdx} "${(headers[valIdx]||'').toString().slice(0,60)}"`);
    for (let i = 3; i < data.length; i++) {
      const r = data[i];
      if (!r || !r[2] || !r[3]) continue;
      const code = String(r[2]).trim();
      const name = String(r[3]).trim();
      if (!name.startsWith('NHS ')) continue;
      const val = parseAmount(r[valIdx]);
      if (!icbs[code]) icbs[code] = { name, region: '', core: 0, pmc: 0, other: 0, running: 0 };
      icbs[code].running = val;
    }
  }

  // Combine and rank
  const ranked = Object.entries(icbs).map(([code, d]) => {
    // Values are in £k (thousands)
    const totalK = d.core + d.pmc + d.other + d.running;
    return {
      code,
      name: d.name,
      region: d.region,
      amount: Math.round(totalK * 1000), // convert to £
      core: Math.round(d.core * 1000),
      pmc: Math.round(d.pmc * 1000),
      other: Math.round(d.other * 1000),
      running: Math.round(d.running * 1000),
    };
  }).filter(x => x.amount > 0).sort((a, b) => b.amount - a.amount);

  console.log(`  Found ${ranked.length} ICBs`);
  console.log(`  Top 5: ${ranked.slice(0,5).map(x => x.name + ': £' + (x.amount/1e9).toFixed(2) + 'B').join(', ')}`);
  const totalAlloc = ranked.reduce((s, x) => s + x.amount, 0);
  console.log(`  Total ICB allocations: £${(totalAlloc/1e9).toFixed(2)}B`);

  const top100 = ranked.slice(0, 100);
  const top100sum = top100.reduce((s, x) => s + x.amount, 0);
  const deptTotal = DEPTS.dhsc.total;

  const output = {
    dept: 'Department of Health and Social Care',
    dept_id: 'uk_health',
    year: YEAR,
    currency: 'GBP',
    total_dept: deptTotal,
    top100_coverage_pct: parseFloat((top100sum / deptTotal * 100).toFixed(1)),
    recipients: top100.map((r, i) => ({
      rank: i + 1,
      name: r.name,
      type: 'Integrated Care Board',
      amount: r.amount,
      pct_of_dept: parseFloat((r.amount / deptTotal * 100).toFixed(2)),
      description: `NHS ICB covering ${r.region} region. Core: £${(r.core/1e6).toFixed(0)}M, Primary Medical Care: £${(r.pmc/1e6).toFixed(0)}M, Other Primary Care: £${(r.other/1e6).toFixed(0)}M, Running: £${(r.running/1e6).toFixed(0)}M`,
      location: r.region + ', England',
      source: 'NHS England ICB Allocations Combined 2023-24 and 2024-25 v1.2'
    })),
    source: 'NHS England, ICB Allocations Combined 2023-24 and 2024-25 (https://www.england.nhs.uk/publication/allocation-of-resources-2023-24-to-2024-25/)',
    generated: new Date().toISOString().slice(0, 10)
  };

  const outPath = path.join(OUT_DIR, `recipients_uk_health_${YEAR}.json`);
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`  Written: ${outPath}`);
  console.log(`  Coverage: ${output.top100_coverage_pct}%`);
  return output;
}

// ─── Spend Over £25k parser (for DWP, DfE, MoD, HMT) ──────

function buildSpendRecipients(deptKey) {
  const dept = DEPTS[deptKey];
  console.log(`\n=== ${dept.name.toUpperCase()} (Spend Over £25k) ===`);

  const allRows = [];
  for (const f of dept.files) {
    const fp = path.join(SPEND_DIR, f);
    if (!fs.existsSync(fp)) { console.warn(`  MISSING: ${f}`); continue; }

    let rows;
    if (f.endsWith('.ods')) {
      rows = parseOdsFile(fp);
    } else if (f.endsWith('.xlsx')) {
      rows = parseXlsxFile(fp);
    } else if (dept.format === 'dwp') {
      rows = parseDwpCsv(fp);
    } else {
      rows = parseStandardCsv(fp);
    }
    console.log(`  ${f}: ${rows.length} transactions`);
    allRows.push(...rows);
  }

  console.log(`  Total transactions: ${allRows.length}`);

  // Group by normalized supplier name
  const suppliers = {};
  for (const r of allRows) {
    const norm = normalizeSupplier(r.supplier);
    const orig = r.supplier ? r.supplier.trim() : '';
    if (!norm) continue;
    if (!suppliers[norm]) suppliers[norm] = { originalName: orig, total: 0, count: 0 };
    suppliers[norm].total += r.amount;
    suppliers[norm].count++;
    // Keep the most common original name
    if (orig.length > suppliers[norm].originalName.length) {
      suppliers[norm].originalName = orig;
    }
  }

  // Rank by total spend
  const ranked = Object.entries(suppliers)
    .map(([norm, d]) => ({
      name: d.originalName || norm,
      normalizedName: norm,
      amount: Math.round(d.total),
      transactions: d.count,
      type: classifySupplier(d.originalName || norm)
    }))
    .filter(x => x.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  console.log(`  Unique suppliers: ${ranked.length}`);
  console.log(`  Top 5: ${ranked.slice(0,5).map(x => x.name + ': £' + (x.amount/1e6).toFixed(1) + 'M').join(', ')}`);

  const top100 = ranked.slice(0, 100);
  const top100sum = top100.reduce((s, x) => s + x.amount, 0);
  const totalSpend = ranked.reduce((s, x) => s + x.amount, 0);

  // Map dept keys to tree-friendly IDs
  const idMap = { dwp: 'uk_dwp', dfe: 'uk_dfe', mod: 'uk_mod', hmt: 'uk_hmt' };

  const output = {
    dept: dept.name,
    dept_id: idMap[deptKey],
    year: YEAR,
    currency: 'GBP',
    total_dept: dept.total,
    total_spend25k: totalSpend,
    top100_coverage_pct: parseFloat((top100sum / totalSpend * 100).toFixed(1)),
    top100_coverage_of_dept_pct: parseFloat((top100sum / dept.total * 100).toFixed(1)),
    recipients: top100.map((r, i) => ({
      rank: i + 1,
      name: r.name,
      type: r.type,
      amount: r.amount,
      pct_of_dept: parseFloat((r.amount / dept.total * 100).toFixed(2)),
      transactions: r.transactions,
      source: `UK Government Spending Over £25,000, ${dept.name}, Calendar Year ${YEAR}`
    })),
    source: `UK Government Spending Over £25,000 (https://www.gov.uk/government/collections/spending-over-25-000)`,
    note: 'Only covers transactions over £25,000. Coverage of total departmental spending depends on the proportion of spend that occurs in transactions over £25k.',
    generated: new Date().toISOString().slice(0, 10)
  };

  const outPath = path.join(OUT_DIR, `recipients_${idMap[deptKey]}_${YEAR}.json`);
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`  Written: ${outPath}`);
  console.log(`  Top 100 coverage of Spend>25k: ${output.top100_coverage_pct}%`);
  console.log(`  Top 100 coverage of dept total: ${output.top100_coverage_of_dept_pct}%`);
  return output;
}

// ─── Main ───────────────────────────────────────────────────

console.log('Building UK recipient data for', YEAR);
console.log('Base dir:', BASE);

// 1. NHS Allocations for Health
const health = buildNhsAllocations();

// 2. Spend Over £25k for other departments
for (const key of ['dwp', 'dfe', 'mod', 'hmt']) {
  buildSpendRecipients(key);
}

console.log('\n=== DONE ===');
console.log('Output files:');
fs.readdirSync(OUT_DIR).filter(f => f.startsWith('recipients_uk_')).forEach(f => {
  const fp = path.join(OUT_DIR, f);
  const size = fs.statSync(fp).size;
  console.log(`  ${f} (${(size/1024).toFixed(1)} KB)`);
});
