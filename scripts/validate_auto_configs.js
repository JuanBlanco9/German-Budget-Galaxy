#!/usr/bin/env node
/**
 * validate_auto_configs.js
 *
 * Schema-drift validator for data/uk/local_authorities/spend/auto_configs.json.
 *
 * For each council, opens the first CSV in `dir` and verifies that the
 * configured deptCol / purposeCol / amountCol / supplierCol exist in the
 * header row (using the same exact-case-insensitive match as the build).
 *
 * On mismatch: prints the closest 3 actual headers via Levenshtein distance
 * so the operator can fix the auto_config or sed-rename the source CSV.
 *
 * Exit code: 0 = clean, 1 = at least one council has a mismatch.
 *
 * Why this exists: 6+ instances of silent schema drift have shipped wrong
 * totals (Bury, Reading, Derby, H&F, Westmorland, Bolton mar_2024). The
 * build script's column resolution silently treats unrecognized columns
 * as null and drops rows. Catching this upfront beats noticing low
 * coverage after the fact.
 *
 * Usage:
 *   node scripts/validate_auto_configs.js
 *   node scripts/validate_auto_configs.js --council "Bolton"   # filter
 *   node scripts/validate_auto_configs.js --quiet               # only errors
 */

const fs = require('fs');
const path = require('path');

const SPEND_DIR = path.join(__dirname, '..', 'data', 'uk', 'local_authorities', 'spend');
const AUTO_CONFIGS = path.join(SPEND_DIR, 'auto_configs.json');

// ─── CLI ────────────────────────────────────────────────

const args = process.argv.slice(2);
const filter = args.includes('--council') ? args[args.indexOf('--council') + 1] : null;
const quiet = args.includes('--quiet');

// ─── CSV parser (matches build_council_spend_lookup.js) ─

function parseCSVLine(line, sep) {
  const r = [];
  let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (c === sep && !inQ) { r.push(cur); cur = ''; }
    else cur += c;
  }
  r.push(cur);
  return r;
}

// ─── Levenshtein distance (for fuzzy suggestions) ───────

function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const al = a.toLowerCase(), bl = b.toLowerCase();
  const v0 = new Array(bl.length + 1);
  const v1 = new Array(bl.length + 1);
  for (let i = 0; i <= bl.length; i++) v0[i] = i;
  for (let i = 0; i < al.length; i++) {
    v1[0] = i + 1;
    for (let j = 0; j < bl.length; j++) {
      const cost = al[i] === bl[j] ? 0 : 1;
      v1[j + 1] = Math.min(v1[j] + 1, v0[j + 1] + 1, v0[j] + cost);
    }
    for (let j = 0; j <= bl.length; j++) v0[j] = v1[j];
  }
  return v0[bl.length];
}

function suggestClosest(target, headers, n = 3) {
  return headers
    .map(h => ({ h, d: levenshtein(target, h) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, n)
    .map(x => `"${x.h}" (d=${x.d})`);
}

// ─── Header reader (respects encoding + headerHint) ─────

function readHeaders(filePath, encoding, headerHint, sep) {
  const buf = fs.readFileSync(filePath);
  const raw = buf.toString(encoding || 'utf8').replace(/^\uFEFF/, '');
  const lines = raw.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 1) return null;

  let headerRowIdx = 0;
  if (headerHint) {
    for (let k = 0; k < Math.min(8, lines.length); k++) {
      if (lines[k].includes(headerHint)) { headerRowIdx = k; break; }
    }
  }
  return parseCSVLine(lines[headerRowIdx], sep || ',').map(h => h.replace(/^"|"$/g, '').trim());
}

// ─── Column matcher (matches build script's resolution) ─

function columnExists(colName, headers) {
  if (!colName) return null; // not configured
  return headers.some(h => h === colName || h.toLowerCase() === colName.toLowerCase());
}

// ─── Main validator ─────────────────────────────────────

function validateCouncil(cfg) {
  const issues = []; // { severity, message }

  // Resolve dir
  const dir = cfg.dir && !path.isAbsolute(cfg.dir) ? path.join(SPEND_DIR, cfg.dir) : cfg.dir;
  if (!dir || !fs.existsSync(dir)) {
    issues.push({ severity: 'error', message: `dir not found: ${dir}` });
    return issues;
  }

  // Pick first CSV (minimal scope — extend to all-files later if needed)
  const csvs = fs.readdirSync(dir).filter(f => f.endsWith('.csv')).sort();
  if (csvs.length === 0) {
    issues.push({ severity: 'error', message: `no CSVs in ${dir}` });
    return issues;
  }
  const sampleFile = path.join(dir, csvs[0]);

  // Read headers
  let headers;
  try {
    headers = readHeaders(sampleFile, cfg.encoding, cfg.headerHint, cfg.sep);
  } catch (e) {
    issues.push({ severity: 'error', message: `failed to read ${csvs[0]}: ${e.message}` });
    return issues;
  }
  if (!headers || headers.length === 0) {
    issues.push({ severity: 'error', message: `empty header in ${csvs[0]}` });
    return issues;
  }

  // Validate each configured column
  const cols = [
    { key: 'deptCol', value: cfg.deptCol, required: true },
    { key: 'purposeCol', value: cfg.purposeCol, required: false }, // legitimately optional
    { key: 'amountCol', value: cfg.amountCol, required: true },
    { key: 'supplierCol', value: cfg.supplierCol, required: true }
  ];

  for (const col of cols) {
    if (col.value == null) {
      if (col.required) {
        issues.push({ severity: 'error', message: `${col.key} is null/missing — REQUIRED` });
      } else {
        issues.push({ severity: 'warn', message: `${col.key} is null (purpose patterns will collapse to dept|"")` });
      }
      continue;
    }
    if (!columnExists(col.value, headers)) {
      const closest = suggestClosest(col.value, headers, 3);
      issues.push({
        severity: 'error',
        message: `${col.key}="${col.value}" not in ${csvs[0]}\n      closest: ${closest.join(', ')}`
      });
    }
  }

  return issues;
}

// ─── Run ────────────────────────────────────────────────

if (!fs.existsSync(AUTO_CONFIGS)) {
  console.error(`✗ auto_configs.json not found at ${AUTO_CONFIGS}`);
  process.exit(2);
}

const configs = JSON.parse(fs.readFileSync(AUTO_CONFIGS, 'utf8'));
const filtered = filter ? configs.filter(c => c.name.toLowerCase().includes(filter.toLowerCase())) : configs;

let errorCount = 0, warnCount = 0, cleanCount = 0;

console.log(`\nValidating ${filtered.length} council auto_configs against first CSV in each dir...\n`);

for (const cfg of filtered) {
  const issues = validateCouncil(cfg);
  const errors = issues.filter(i => i.severity === 'error');
  const warns = issues.filter(i => i.severity === 'warn');

  if (errors.length > 0) {
    console.log(`✗ ${cfg.name}`);
    for (const e of errors) console.log(`    ERROR: ${e.message}`);
    for (const w of warns) console.log(`    WARN:  ${w.message}`);
    errorCount++;
  } else if (warns.length > 0) {
    if (!quiet) console.log(`⚠ ${cfg.name}`);
    for (const w of warns) if (!quiet) console.log(`    WARN: ${w.message}`);
    warnCount++;
  } else {
    if (!quiet) console.log(`✓ ${cfg.name}`);
    cleanCount++;
  }
}

console.log(`\n── Summary ──`);
console.log(`  Clean:   ${cleanCount}`);
console.log(`  Warning: ${warnCount}`);
console.log(`  Error:   ${errorCount}`);

if (errorCount > 0) {
  console.log(`\n${errorCount} council(s) have schema mismatches. Fix auto_configs.json or rename source CSV headers.`);
  process.exit(1);
}
console.log(`\nAll required columns resolved. Safe to run build_council_spend_lookup.js.`);
process.exit(0);
