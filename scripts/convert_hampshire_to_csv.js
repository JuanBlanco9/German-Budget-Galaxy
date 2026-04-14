#!/usr/bin/env node
/**
 * Convert Hampshire monthly xlsx files to csv.
 * Header is on row 3 (index 2); metadata rows 0-1.
 * Uses sheet_to_json(raw:true) to preserve numeric amounts — never
 * sheet_to_csv (HANDOFF rule #1: loses commas in quoted numbers).
 */
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const HAMPS_DIR = path.join(__dirname, '..', 'data', 'uk', 'local_authorities', 'spend', 'hampshire');

function csvEscape(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

const files = fs.readdirSync(HAMPS_DIR).filter(f => f.endsWith('.xlsx'));
for (const f of files) {
  const csvPath = path.join(HAMPS_DIR, f.replace('.xlsx', '.csv'));
  if (fs.existsSync(csvPath)) { console.log(`${f}: csv exists, skipping`); continue; }

  const wb = XLSX.readFile(path.join(HAMPS_DIR, f));
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' });
  if (rows.length < 4) { console.log(`${f}: too few rows`); continue; }

  // Find header row — scan for "Departments" in first 8 rows
  let headerIdx = -1;
  for (let i = 0; i < Math.min(8, rows.length); i++) {
    if (rows[i].includes('Departments')) { headerIdx = i; break; }
  }
  if (headerIdx < 0) { console.log(`${f}: no Departments header`); continue; }

  const headers = rows[headerIdx];
  const out = [headers.map(csvEscape).join(',')];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.length === 0) continue;
    if (!r.some(c => c !== null && c !== undefined && String(c).trim() !== '')) continue;
    out.push(headers.map((_, j) => csvEscape(r[j] ?? '')).join(','));
  }
  fs.writeFileSync(csvPath, out.join('\n'), 'utf8');
  console.log(`${f}: ${out.length - 1} rows → ${path.basename(csvPath)}`);
}
