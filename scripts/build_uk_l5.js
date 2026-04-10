#!/usr/bin/env node
/**
 * Build UK Level 5 recipient data for Budget Galaxy.
 * Parses Spend Over £25k files (any format: CSV, XLSX, ODS)
 * and generates l5_{dept_slug}_{year}.json per department.
 *
 * Also consolidates existing recipients_uk_*.json files into the new L5 format.
 */
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const YEAR = 2024;
const BASE = path.resolve(__dirname, '..', 'data', 'recipients', 'uk');
const OUT_DIR = BASE;

// Department tree values from OSCAR 2024 (for pct_of_dept calculation)
const DEPT_TOTALS = {
  department_for_work_and_pensions: 297400000000,
  department_of_health: 214200000000,
  department_for_education: 140300000000,
  ministry_of_defence: 71900000000,
  hm_treasury: 63500000000,
  ministry_of_housing_communities_and_local_government: 46100000000,
  department_for_transport: 41200000000,
  hm_revenue_and_customs: 34300000000,
  department_for_energy_security_and_net_zero: 22100000000,
  home_office: 17400000000,
  cabinet_office: 15800000000,
  ministry_of_justice: 14300000000,
  department_for_science_innovation_and_technology: 14200000000,
  department_for_culture_media_and_sport: 13200000000,
  foreign_commonwealth_and_development_office: 12500000000,
  department_for_environment_food_and_rural_affairs: 8900000000,
  department_for_business_and_trade: 2700000000,
};

// Map sample files to department slugs
const DEPT_FILES = {
  // Already processed (12 months in spend25k/)
  department_for_work_and_pensions: { name: 'Department for Work and Pensions', files: Array.from({length:12},(_,i)=>'dwp_'+String(i+1).padStart(2,'0')+'.csv'), dir: 'spend25k' },
  department_of_health: { name: 'Department of Health and Social Care', files: Array.from({length:12},(_,i)=>'dhsc_'+String(i+1).padStart(2,'0')+'.csv'), dir: 'spend25k' },
  department_for_education: { name: 'Department for Education', files: Array.from({length:12},(_,i)=>'dfe_'+String(i+1).padStart(2,'0')+'.csv'), dir: 'spend25k' },
  ministry_of_defence: { name: 'Ministry of Defence', files: Array.from({length:12},(_,i)=>'mod_'+String(i+1).padStart(2,'0')+'.ods'), dir: 'spend25k' },
  hm_treasury: { name: 'HM Treasury', files: [...Array.from({length:3},(_,i)=>'hmt_'+String(i+1).padStart(2,'0')+'.csv'),...Array.from({length:9},(_,i)=>'hmt_'+String(i+4).padStart(2,'0')+'.xlsx')], dir: 'spend25k' },
  // New departments (single sample month)
  department_for_transport: { name: 'Department for Transport', files: ['raw/dft_oct24.csv'], dir: 'spend25k', partial: true },
  hm_revenue_and_customs: { name: 'HM Revenue and Customs', files: ['raw/hmrc_jan24.csv'], dir: 'spend25k', partial: true },
  home_office: { name: 'Home Office', files: ['raw/ho_jan24.csv'], dir: 'spend25k', partial: true },
  cabinet_office: { name: 'Cabinet Office', files: ['raw/cab_dec24.csv'], dir: 'spend25k', partial: true },
  ministry_of_justice: { name: 'Ministry of Justice', files: ['raw/moj_jan24.csv'], dir: 'spend25k', partial: true },
  department_for_science_innovation_and_technology: { name: 'Department for Science, Innovation and Technology', files: ['raw/dsit_apr24.csv'], dir: 'spend25k', partial: true },
  department_for_culture_media_and_sport: { name: 'Department for Culture, Media and Sport', files: ['raw/dcms_apr24.ods'], dir: 'spend25k', partial: true },
  foreign_commonwealth_and_development_office: { name: 'Foreign, Commonwealth and Development Office', files: ['raw/fcdo_sep24.csv'], dir: 'spend25k', partial: true },
  department_for_environment_food_and_rural_affairs: { name: 'Department for Environment, Food and Rural Affairs', files: ['raw/defra_jun24.csv'], dir: 'spend25k', partial: true },
  ministry_of_housing_communities_and_local_government: { name: 'Ministry of Housing, Communities and Local Government', files: ['raw/mhclg_sep24.csv'], dir: 'spend25k', partial: true },
};

// ─── Parsing helpers ────────────────────────────────────────

function parseCSVLine(line) {
  const result = [];
  let current = '', inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') { if (i+1 < line.length && line[i+1] === '"') { current += '"'; i++; } else inQuotes = false; }
      else current += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ',') { result.push(current.trim()); current = ''; }
      else current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function parseAmount(raw) {
  if (typeof raw === 'number') return raw;
  if (!raw) return 0;
  let s = String(raw).trim().replace(/[\ufeff\ufffd\u00a3£$€\s]/g, '').replace(/,/g, '');
  if (s.startsWith('(') && s.endsWith(')')) s = '-' + s.slice(1, -1);
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function normalizeSupplier(name) {
  if (!name) return '';
  let s = String(name).trim().toUpperCase();
  s = s.replace(/\b(LIMITED|LTD|PLC|LLP|INC|CORP|UK)\b\.?/g, '').trim();
  s = s.replace(/\s*-\s*[A-Z0-9]{2,5}$/g, '').trim();
  s = s.replace(/\s*\(T\/A[^)]*\)/gi, '').trim();
  s = s.replace(/\s+/g, ' ').replace(/[.,;:\-]+$/, '').trim();
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

// ─── Universal file parser ──────────────────────────────────

function parseSpendFile(filePath) {
  const rows = [];
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.ods' || ext === '.xlsx') {
    try {
      const wb = XLSX.readFile(filePath);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
      if (data.length < 2) return rows;
      const header = data[0].map(h => String(h || '').trim());
      const si = header.findIndex(h => /supplier/i.test(h));
      const ai = header.findIndex(h => /amount|^total$|^£$|\.amt$/i.test(h));
      if (si < 0 || ai < 0) return rows;
      for (let i = 1; i < data.length; i++) {
        const r = data[i];
        if (!r || !r[si]) continue;
        rows.push({ supplier: String(r[si]), amount: parseAmount(r[ai]) });
      }
    } catch (e) { /* skip unreadable */ }
  } else {
    // CSV (read as latin1 for £ symbol compatibility)
    const raw = fs.readFileSync(filePath, 'latin1');
    const lines = raw.split('\n');
    if (lines.length < 2) return rows;
    const header = parseCSVLine(lines[0]).map(h => h.replace(/[\ufeff]/g, ''));
    const si = header.findIndex(h => /supplier/i.test(h));
    const ai = header.findIndex(h => /amount|^£$|^total$|\.amt$|value/i.test(h));
    if (si < 0 || ai < 0) return rows;
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const parts = parseCSVLine(line);
      if (parts.length <= Math.max(si, ai)) continue;
      rows.push({ supplier: parts[si], amount: parseAmount(parts[ai]) });
    }
  }
  return rows;
}

// ─── Main build ─────────────────────────────────────────────

console.log('Building UK L5 recipient data for', YEAR);

for (const [deptSlug, config] of Object.entries(DEPT_FILES)) {
  const deptTotal = DEPT_TOTALS[deptSlug] || 1;
  console.log(`\n=== ${config.name} ===`);

  const allRows = [];
  let filesRead = 0;
  for (const f of config.files) {
    const fp = path.join(BASE, config.dir, f);
    if (!fs.existsSync(fp)) continue;
    const rows = parseSpendFile(fp);
    if (rows.length > 0) { allRows.push(...rows); filesRead++; }
  }

  if (allRows.length === 0) {
    console.log('  No data found, skipping');
    continue;
  }
  console.log(`  ${filesRead} files, ${allRows.length} transactions`);

  // Group by normalized supplier
  const suppliers = {};
  for (const r of allRows) {
    const norm = normalizeSupplier(r.supplier);
    const orig = r.supplier ? r.supplier.trim() : '';
    if (!norm) continue;
    if (!suppliers[norm]) suppliers[norm] = { originalName: orig, total: 0, count: 0 };
    suppliers[norm].total += r.amount;
    suppliers[norm].count++;
    if (orig.length > suppliers[norm].originalName.length) suppliers[norm].originalName = orig;
  }

  const ranked = Object.entries(suppliers)
    .map(([norm, d]) => ({
      name: d.originalName || norm,
      amount: Math.round(d.total),
      transactions: d.count,
      type: classifySupplier(d.originalName || norm)
    }))
    .filter(x => x.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  console.log(`  ${ranked.length} unique suppliers`);
  if (ranked[0]) console.log(`  #1: ${ranked[0].name}: £${(ranked[0].amount/1e6).toFixed(1)}M`);

  const top100 = ranked.slice(0, 100);
  const top100sum = top100.reduce((s, x) => s + x.amount, 0);
  const totalSpend = ranked.reduce((s, x) => s + x.amount, 0);

  const output = {
    dept: config.name,
    dept_id: deptSlug,
    year: YEAR,
    currency: 'GBP',
    total_dept: deptTotal,
    total_spend25k: totalSpend,
    top100_coverage_pct: parseFloat((top100sum / totalSpend * 100).toFixed(1)),
    top100_coverage_of_dept_pct: parseFloat((top100sum / deptTotal * 100).toFixed(1)),
    partial: config.partial || false,
    months_covered: filesRead,
    recipients: top100.map((r, i) => ({
      rank: i + 1,
      name: r.name,
      type: r.type,
      amount: r.amount,
      pct_of_dept: parseFloat((r.amount / deptTotal * 100).toFixed(3)),
      transactions: r.transactions,
    })),
    source: `UK Government Spending Over £25,000, ${config.name}, ${YEAR}` + (config.partial ? ' (partial - single month sample)' : ''),
    note: 'Only covers transactions over £25,000. Does not include benefit payments to citizens.',
    generated: new Date().toISOString().slice(0, 10)
  };

  const outPath = path.join(OUT_DIR, `l5_${deptSlug}_${YEAR}.json`);
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`  -> ${path.basename(outPath)} (${(fs.statSync(outPath).size/1024).toFixed(0)}KB)`);
}

console.log('\n=== NHS Health (from ICB allocations) ===');
// Copy existing NHS recipients as L5 format
const nhsPath = path.join(BASE, 'recipients_uk_health_2024.json');
if (fs.existsSync(nhsPath)) {
  const nhs = JSON.parse(fs.readFileSync(nhsPath));
  const l5nhs = {
    dept: 'Department of Health and Social Care',
    dept_id: 'department_of_health',
    year: YEAR,
    currency: 'GBP',
    total_dept: 214200000000,
    total_icb_allocations: nhs.recipients.reduce((s,r)=>s+r.amount, 0),
    top100_coverage_pct: nhs.top100_coverage_pct,
    partial: false,
    recipients: nhs.recipients.map(r => ({
      rank: r.rank,
      name: r.name,
      type: 'Integrated Care Board',
      amount: r.amount,
      pct_of_dept: r.pct_of_dept,
      description: r.description,
      location: r.location,
    })),
    source: nhs.source,
    note: 'ICB allocations cover ~58% of DHSC budget. Remaining is direct NHS England commissioning, capital, and admin.',
    generated: new Date().toISOString().slice(0, 10)
  };
  const outPath = path.join(OUT_DIR, 'l5_department_of_health_2024.json');
  fs.writeFileSync(outPath, JSON.stringify(l5nhs, null, 2));
  console.log(`  -> l5_department_of_health_2024.json (${(fs.statSync(outPath).size/1024).toFixed(0)}KB)`);
}

console.log('\n=== DONE ===');
const l5files = fs.readdirSync(OUT_DIR).filter(f => f.startsWith('l5_'));
console.log(`${l5files.length} L5 files generated:`);
l5files.sort().forEach(f => {
  const j = JSON.parse(fs.readFileSync(path.join(OUT_DIR, f)));
  const partial = j.partial ? ' (PARTIAL)' : '';
  console.log(`  ${f.padEnd(65)} ${j.recipients.length} recipients${partial}`);
});
