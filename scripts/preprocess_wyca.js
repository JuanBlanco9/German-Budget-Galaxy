#!/usr/bin/env node
/**
 * preprocess_wyca.js
 *
 * One-off preprocessor for West Yorkshire Combined Authority FY 2023-24
 * transparency data. WYCA published 3 distinct XLSX schemas in a single
 * fiscal year (they changed FMIS between Q2 and Q3), so the standard
 * build_council_spend_lookup.js config-per-council model can't parse them.
 *
 * This script reads each quarter with its own parser, normalises to a
 * unified CSV with columns: date, supplier, directorate, purpose, amount.
 * The build script then consumes the unified CSV like any other council.
 *
 * Q2 2023 (Jul-Sep) is known to be BROKEN upstream — only 28 data rows
 * before an empty tail. We process whatever is there and flag the gap
 * in a separate metadata file (data/uk/local_authorities/spend/wyca/
 * wyca_data_notes.json).
 *
 * Output: data/uk/local_authorities/spend/wyca/wyca_fy2324_unified.csv
 *
 * Not reusable for other councils. Not a framework. One-off.
 */

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const SPEND = path.join(__dirname, '..', 'data', 'uk', 'local_authorities', 'spend', 'wyca');
const OUT = path.join(SPEND, 'wyca_fy2324_unified.csv');
const NOTES = path.join(SPEND, 'wyca_data_notes.json');

function csvEscape(v) {
  if (v === null || v === undefined) return '';
  const s = typeof v === 'number' ? String(v) : String(v);
  const flat = s.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (flat.includes(',') || flat.includes('"')) return '"' + flat.replace(/"/g, '""') + '"';
  return flat;
}

// Excel serial date → ISO yyyy-mm-dd (or empty string on failure)
function serialToIso(serial) {
  if (typeof serial !== 'number') return String(serial || '');
  // Excel epoch is 1899-12-30 (adjusted for the 1900 leap year bug)
  const ms = (serial - 25569) * 86400 * 1000;
  if (!isFinite(ms)) return '';
  const d = new Date(ms);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function parseQ1(fp) {
  // Q1 schema: Sheet1, header row 3
  // cols: Document Ref | Date | Beneficiary | Directorate | Summary of Purpose | Merchant Category | Value £
  const wb = XLSX.readFile(fp);
  const ws = wb.Sheets['Sheet1'] || wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' });
  const out = [];
  for (let i = 4; i < rows.length; i++) {
    const r = rows[i];
    const supplier = String(r[2] || '').trim();
    const dept = String(r[3] || '').trim();
    const purpose = String(r[4] || '').trim();
    const amt = typeof r[6] === 'number' ? r[6] : parseFloat(String(r[6] || '').replace(/[£,\s]/g, ''));
    if (!supplier || isNaN(amt) || amt <= 0) continue;
    out.push({ date: serialToIso(r[1]), supplier, dept, purpose, amount: amt });
  }
  return out;
}

function parseQ2(fp) {
  // Q2 schema: Report sheet, header row 5
  // cols: * | Date | Beneficiary | Department | Purpose | Merchant Category | Amount (Exclusive)
  // Q2 is known broken — only 28 data rows. We extract what's there.
  const wb = XLSX.readFile(fp);
  const ws = wb.Sheets['Report'] || wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' });
  const out = [];
  for (let i = 6; i < rows.length; i++) {
    const r = rows[i];
    const supplier = String(r[2] || '').trim();
    const dept = String(r[3] || '').trim();
    const purpose = String(r[4] || '').trim();
    const amt = typeof r[6] === 'number' ? r[6] : parseFloat(String(r[6] || '').replace(/[£,\s]/g, ''));
    if (!supplier || isNaN(amt) || amt <= 0) continue;
    out.push({ date: serialToIso(r[1]), supplier, dept, purpose, amount: amt });
  }
  return out;
}

function parseQ3Q4(fp) {
  // Q3/Q4 schema: Report sheet, header row 5
  // cols: * | Reference | Invoice Date | Posting Date | Creditor Account | Directorate |
  //       Account Sub Group 1 Description | Account Sub Group 2 Description |
  //       Amount (Inclusive) | VAT | Amount (Exclusive)
  const wb = XLSX.readFile(fp);
  const ws = wb.Sheets['Report'] || wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' });
  const out = [];
  for (let i = 6; i < rows.length; i++) {
    const r = rows[i];
    const supplier = String(r[4] || '').trim();
    const dept = String(r[5] || '').trim();
    // Use Sub Group 2 (more specific) as purpose; fall back to Sub Group 1.
    const purpose = String(r[7] || r[6] || '').trim();
    const amt = typeof r[10] === 'number' ? r[10] : parseFloat(String(r[10] || '').replace(/[£,\s]/g, ''));
    if (!supplier || isNaN(amt) || amt <= 0) continue;
    out.push({ date: serialToIso(r[2]), supplier, dept, purpose, amount: amt });
  }
  return out;
}

const QUARTERS = [
  { q: 'Q1 2023 (Apr-Jun)', file: 'q1_apr_jun_2023.xlsx', parser: parseQ1 },
  { q: 'Q2 2023 (Jul-Sep)', file: 'q2_jul_sep_2023.xlsx', parser: parseQ2 },
  { q: 'Q3 2023 (Oct-Dec)', file: 'q3_oct_dec_2023.xlsx', parser: parseQ3Q4 },
  { q: 'Q4 2024 (Jan-Mar)', file: 'q4_jan_mar_2024.xlsx', parser: parseQ3Q4 }
];

const all = [];
const perQuarter = {};
for (const q of QUARTERS) {
  const fp = path.join(SPEND, q.file);
  if (!fs.existsSync(fp)) { console.log(`  ${q.q}: file missing`); continue; }
  const rows = q.parser(fp);
  const total = rows.reduce((s, r) => s + r.amount, 0);
  perQuarter[q.q] = { rows: rows.length, total };
  console.log(`  ${q.q}: ${rows.length} rows, £${(total / 1e6).toFixed(2)}M`);
  all.push(...rows);
}

const grand = all.reduce((s, r) => s + r.amount, 0);
console.log(`\nTotal: ${all.length} rows, £${(grand / 1e6).toFixed(2)}M`);

// Write unified CSV
const header = ['date', 'supplier', 'directorate', 'purpose', 'amount'];
const lines = [header.join(',')];
for (const r of all) {
  lines.push([r.date, r.supplier, r.dept, r.purpose, r.amount].map(csvEscape).join(','));
}
fs.writeFileSync(OUT, lines.join('\n'), 'utf8');
console.log(`\nWrote: ${OUT}`);

// Write data notes describing the Q2 upstream gap
const notes = {
  council: 'West Yorkshire Combined Authority',
  fy: '2023-24',
  source: 'https://www.westyorks-ca.gov.uk/about-us/governance-and-transparency/transparency-and-freedom-of-information/what-we-spend-and-how-we-spend-it/',
  schemas_observed: 3,
  schema_notes: [
    'Q1 uses "Sheet1" with columns Document Ref/Date/Beneficiary/Directorate/Summary of Purpose/Merchant Category/Value £',
    'Q2 uses "Report" sheet with columns */Date/Beneficiary/Department/Purpose/Merchant Category/Amount (Exclusive) — CIAXLONE export format',
    'Q3+Q4 use "Report" sheet with 11 columns including Creditor Account, Directorate, Account Sub Group 1/2, Amount (Inclusive+VAT+Exclusive) — appears to be a new FMIS rolled out Aug/Sep 2023'
  ],
  per_quarter: perQuarter,
  known_gaps: [
    {
      quarter: 'Q2 2023 (Jul-Sep)',
      issue: 'Upstream file truncated — contains only ~28 data rows before empty tail. Wayback Machine copies match the same truncated state (publisher uploaded it that way). Coverage for FY 2023-24 is effectively 3/4 quarters. Tree node _data_notes should reflect this.'
    }
  ],
  total_rows_parsed: all.length,
  total_amount_gbp: grand
};
fs.writeFileSync(NOTES, JSON.stringify(notes, null, 2), 'utf8');
console.log(`Wrote: ${NOTES}`);
