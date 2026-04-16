#!/usr/bin/env node
/**
 * Convert London borough xlsx files to csv for the classifier pipeline.
 * Each borough has its own header row offset; we scan for the header
 * line by looking for known column keywords.
 *
 * Never uses sheet_to_csv (HANDOFF rule #1 — breaks amounts with commas).
 * Uses sheet_to_json with raw:true to preserve types, then manual CSV.
 */
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const SPEND = path.join(__dirname, '..', 'data', 'uk', 'local_authorities', 'spend');

// Per-borough: dir + header detection keyword + sheet name preference (if any)
const TARGETS = [
  { dir: 'city_of_london', headerKeyword: 'Supplier Name' },
  { dir: 'greenwich', headerKeyword: 'Creditor_Name' },
  { dir: 'harrow', headerKeyword: 'Beneficiary' },
  { dir: 'bromley', headerKeyword: 'Supplier_Name' },
  { dir: 'hillingdon', headerKeyword: 'Vendor Name' },
  { dir: 'lewisham', headerKeyword: 'SUPPLIER' },
  { dir: 'waltham_forest', headerKeyword: 'Supplier Name' },
  { dir: 'hammersmith_fulham', headerKeyword: 'Supplier Name' },
  // Richmond has one xlsx for July 2023, rest are CSV
  { dir: 'richmond', headerKeyword: 'PAYEE', onlyFiles: ['2023_07.xlsx'] },
  { dir: 'enfield', headerKeyword: 'Supplier Name' },

  // Combined Authorities (not London boroughs, but same xlsx→csv pattern)
  { dir: 'wmca', headerKeyword: 'Cost Centre' },

  // Metropolitan Districts with XLSX files
  { dir: 'kirklees_metropolitan_borough_council', headerKeyword: 'Supplier' },
  { dir: 'oldham_metropolitan_borough_council', headerKeyword: 'Supplier' },
  { dir: 'knowsley_metropolitan_borough_council', headerKeyword: 'Supplier' },
  { dir: 'st_helens_metropolitan_borough_council', headerKeyword: 'Supplier' },
  { dir: 'bury_metropolitan_borough_council', headerKeyword: 'Supplier' }
];

function csvEscape(v) {
  if (v === null || v === undefined) return '';
  const s = typeof v === 'number' ? String(v) : String(v);
  // Flatten embedded newlines — build_council_spend_lookup splits on \n
  // before CSV-parsing, so any multi-line quoted cell (common in LBHF xlsx
  // headers like "Amount £\n(Ex VAT)") produces broken column indexing.
  const flat = s.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (flat.includes(',') || flat.includes('"')) {
    return '"' + flat.replace(/"/g, '""') + '"';
  }
  return flat;
}

function convertFile(filePath, headerKeyword) {
  const wb = XLSX.readFile(filePath);
  // Pick the first sheet, or a named one if it matches "Data" / "Over 500"
  let sheetName = wb.SheetNames[0];
  for (const n of wb.SheetNames) {
    if (/data|over.?500|spend|published/i.test(n)) { sheetName = n; break; }
  }
  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' });
  if (rows.length < 2) return { ok: false, err: 'empty' };

  // Find header row by keyword (scan first 15 rows)
  let headerIdx = 0;
  for (let i = 0; i < Math.min(15, rows.length); i++) {
    const r = rows[i];
    if (r && r.some(c => c && String(c).toLowerCase().includes(headerKeyword.toLowerCase()))) {
      headerIdx = i;
      break;
    }
  }

  const headers = rows[headerIdx].map(csvEscape);
  const out = [headers.join(',')];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.length === 0) continue;
    if (!r.some(c => c !== null && c !== undefined && String(c).trim())) continue;
    out.push(r.map(csvEscape).join(','));
  }
  return { ok: true, rows: out.length - 1, csv: out.join('\n') };
}

function main() {
  let totalOk = 0, totalFail = 0;
  for (const t of TARGETS) {
    const dirPath = path.join(SPEND, t.dir);
    if (!fs.existsSync(dirPath)) continue;
    const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.xlsx'));
    for (const f of files) {
      if (t.onlyFiles && !t.onlyFiles.includes(f)) continue;
      const csvPath = path.join(dirPath, f.replace('.xlsx', '.csv'));
      if (fs.existsSync(csvPath)) continue;
      const fp = path.join(dirPath, f);
      const r = convertFile(fp, t.headerKeyword);
      if (r.ok) {
        fs.writeFileSync(csvPath, r.csv, 'utf8');
        console.log(`${t.dir}/${f} → ${r.rows} rows`);
        totalOk++;
      } else {
        console.log(`${t.dir}/${f} ✗ ${r.err}`);
        totalFail++;
      }
    }
  }
  console.log(`\nTotal: ${totalOk} converted, ${totalFail} failed`);
}

main();
