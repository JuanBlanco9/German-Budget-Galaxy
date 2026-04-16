#!/usr/bin/env node
/**
 * generate_build_configs_from_manifest.js
 *
 * Reads the council discovery manifest and generates a JSON file
 * of config entries that build_council_spend_lookup.js consumes at
 * runtime. Avoids the need to hardcode 30+ council blocks.
 *
 * Only includes councils that:
 *   - have a local spend dir with >= 1 CSV file
 *   - have a {slug}_dept_mapping.json next to the spend dir
 *   - have a schema with both supplier_col and amount_col
 *   - are not already in the lookup (wave-1 councils, GLA subsystem, 3 CAs)
 *
 * Output:
 *   data/uk/local_authorities/spend/auto_configs.json
 *   [
 *     { name, code, dir, deptCol, purposeCol, amountCol, supplierCol,
 *       sep, encoding, headerHint, mappingFile, fyLabel, source, ... },
 *     ...
 *   ]
 *
 * build_council_spend_lookup.js is extended separately to concatenate
 * this array into its own CONFIGS list.
 *
 * Usage:
 *   node scripts/generate_build_configs_from_manifest.js [--dry-run]
 */

const fs = require('fs');
const path = require('path');

const SPEND_DIR = path.join(__dirname, '..', 'data', 'uk', 'local_authorities', 'spend');
const MANIFEST = path.join(__dirname, '..', 'data', 'uk', 'local_authorities', 'council_discovery_manifest.json');
const OUT = path.join(SPEND_DIR, 'auto_configs.json');
const DRY_RUN = process.argv.includes('--dry-run');

function slugify(name) {
  return String(name).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function normaliseCouncilName(s) {
  return String(s).toLowerCase()
    .replace(/&/g, 'and')
    .replace(/\broyal borough of\b/g, '')
    .replace(/\blondon borough of\b/g, '')
    .replace(/\bmetropolitan borough of\b/g, '')
    .replace(/\bmetropolitan borough\b/g, '')
    .replace(/\bborough of\b/g, '')
    .replace(/\bcouncil of the\b/g, '')
    .replace(/\b(city|county|borough|metropolitan|district|unitary) council\b/g, '')
    .replace(/\bcouncil\b/g, '')
    .replace(/\b(city|county|borough|corporation|mbc|cc)\b/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Marker tokens — if one side has it and the other doesn't, names refer
// to different entities (e.g. "Hampshire" county vs "Hampshire Police").
const MARKER_TOKENS = [
  'police', 'pcc', 'constabulary', 'constable', 'commissioner',
  'combined authority', 'combined', 'mayor', 'mayoral',
  'fire', 'fire and rescue', 'rescue',
  'waste', 'waste disposal'
];
function hasMarker(norm, marker) {
  return new RegExp('(?:^|\\s)' + marker + '(?:\\s|$)').test(norm);
}
function markersDiverge(a, b) {
  for (const m of MARKER_TOKENS) {
    if (hasMarker(a, m) !== hasMarker(b, m)) return true;
  }
  return false;
}

// Map manifest encoding values to what build_council_spend_lookup expects.
// Node's Buffer.toString only accepts 'utf8', 'latin1', 'ascii', 'base64', etc.
// Anything else (including 'unknown', 'windows-1252', 'iso-8859-1') must be
// mapped to a supported name or the build will crash mid-run.
function mapEncoding(enc) {
  if (!enc) return 'utf8';
  if (enc === 'utf8-bom') return 'utf8';
  if (enc === 'cp1252' || enc === 'windows-1252') return 'latin1';
  if (enc === 'iso-8859-1') return 'latin1';
  if (enc === 'unknown') return 'utf8';
  return enc;
}

// Map manifest sep to raw char
function mapSep(sep) {
  if (sep === 'semicolon') return ';';
  if (sep === 'tab') return '\t';
  return ',';
}

// Best-effort: normalise compound column names. Some Sonnet outputs concat
// alternatives with " / " — take the first half.
function firstCol(col) {
  if (!col) return null;
  const trimmed = String(col).trim();
  if (trimmed.includes(' / ')) return trimmed.split(' / ')[0].trim();
  return trimmed;
}

// Minimal CSV line parser (handles quoted commas)
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

// Read the header row of the first CSV in a dir. If the header is not on
// row 0 (metadata prelude), scan the first 8 rows for one that contains a
// header-hint keyword.
function readFirstHeader(dir, sep, encoding, headerHint) {
  const csvs = fs.readdirSync(dir).filter(f => /\.csv$/i.test(f));
  if (csvs.length === 0) return null;
  const fp = path.join(dir, csvs[0]);
  let raw;
  try {
    const buf = fs.readFileSync(fp);
    raw = buf.toString(encoding === 'latin1' ? 'latin1' : 'utf8').replace(/^\uFEFF/, '');
  } catch (e) { return null; }
  const lines = raw.split(/\r?\n/).filter(l => l.length > 0);
  if (lines.length === 0) return null;
  let headerIdx = 0;
  if (headerHint) {
    for (let k = 0; k < Math.min(8, lines.length); k++) {
      if (lines[k].toLowerCase().includes(String(headerHint).toLowerCase())) {
        headerIdx = k;
        break;
      }
    }
  }
  return parseCSVLine(lines[headerIdx], sep).map(h => h.replace(/^"|"$/g, '').trim());
}

// Levenshtein distance between two strings
function levenshtein(a, b) {
  if (a === b) return 0;
  const al = a.length, bl = b.length;
  if (al === 0) return bl;
  if (bl === 0) return al;
  const v0 = new Array(bl + 1);
  const v1 = new Array(bl + 1);
  for (let i = 0; i <= bl; i++) v0[i] = i;
  for (let i = 0; i < al; i++) {
    v1[0] = i + 1;
    for (let j = 0; j < bl; j++) {
      const cost = a[i] === b[j] ? 0 : 1;
      v1[j + 1] = Math.min(v1[j] + 1, v0[j + 1] + 1, v0[j] + cost);
    }
    for (let j = 0; j <= bl; j++) v0[j] = v1[j];
  }
  return v0[bl];
}

// Resolve a manifest column name against actual header columns.
// Returns { match: <header col>, strategy: 'exact|substring|fuzzy|none', distance? }
function resolveColumn(manifestCol, headerCols) {
  if (!manifestCol || !headerCols || headerCols.length === 0) return { match: null, strategy: 'none' };
  // Exact match (case-insensitive)
  const mLower = manifestCol.toLowerCase();
  const exact = headerCols.find(h => h.toLowerCase() === mLower);
  if (exact) return { match: exact, strategy: 'exact' };
  // Substring either direction
  const sub = headerCols.find(h => {
    const hLower = h.toLowerCase();
    return hLower.includes(mLower) || mLower.includes(hLower);
  });
  if (sub) return { match: sub, strategy: 'substring' };
  // Fuzzy: Levenshtein distance threshold = 1/3 of the longer length, up to 6
  let best = null;
  let bestDist = Infinity;
  for (const h of headerCols) {
    const d = levenshtein(h.toLowerCase(), mLower);
    if (d < bestDist) { bestDist = d; best = h; }
  }
  const maxAllowed = Math.min(6, Math.ceil(Math.max(manifestCol.length, (best || '').length) / 3));
  if (best && bestDist <= maxAllowed) return { match: best, strategy: 'fuzzy', distance: bestDist };
  return { match: null, strategy: 'none', closestCandidate: best, closestDistance: bestDist };
}

function main() {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  const lookupPath = path.join(SPEND_DIR, 'council_spend_lookup_2024.json');
  const lookup = fs.existsSync(lookupPath) ? JSON.parse(fs.readFileSync(lookupPath, 'utf8')) : {};
  const lookupNorms = Object.keys(lookup).map(normaliseCouncilName).filter(Boolean);
  function inLookup(name) {
    const norm = normaliseCouncilName(name);
    if (!norm || norm.length < 6) return false;
    for (const existing of lookupNorms) {
      if (!existing || existing.length < 6) continue;
      if (norm === existing) return true;
      if (markersDiverge(norm, existing)) continue;
      if (existing.length >= 6 && (norm.startsWith(existing) || norm.endsWith(existing))) return true;
      if (norm.length >= 6 && (existing.startsWith(norm) || existing.endsWith(norm))) return true;
    }
    return false;
  }

  const configs = [];
  const skipped = {
    devolved: 0, red: 0, in_lookup: 0, no_dir: 0, no_files: 0,
    no_mapping: 0, no_schema: 0, dup_slug: 0
  };
  const seenSlugs = new Set();

  for (const e of manifest) {
    if (!e.name) continue;
    if (e.tier === 'devolved') { skipped.devolved++; continue; }
    if (e.blocker_severity === 'red') { skipped.red++; continue; }
    if (inLookup(e.name)) { skipped.in_lookup++; continue; }

    const slug = slugify(e.name);
    if (seenSlugs.has(slug)) { skipped.dup_slug++; continue; }

    const dir = path.join(SPEND_DIR, slug);
    if (!fs.existsSync(dir)) { skipped.no_dir++; continue; }
    const csvs = fs.readdirSync(dir).filter(f => /\.csv$/i.test(f));
    if (csvs.length === 0) { skipped.no_files++; continue; }

    const mappingPath = path.join(SPEND_DIR, `${slug}_dept_mapping.json`);
    if (!fs.existsSync(mappingPath)) { skipped.no_mapping++; continue; }

    const schema = e.schema || {};
    const rawDept = firstCol(schema.dept_col);
    const rawSupplier = firstCol(schema.supplier_col);
    const rawAmount = firstCol(schema.amount_col);
    const rawPurpose = firstCol(schema.purpose_col);

    if (!rawDept || !rawSupplier || !rawAmount) {
      skipped.no_schema++;
      continue;
    }

    // ── Validate column names against the real header of the first CSV ──
    const sep = mapSep(schema.sep);
    const encoding = mapEncoding(schema.encoding);
    const headerCols = readFirstHeader(dir, sep, encoding, rawSupplier);
    if (!headerCols) {
      console.log(`  [${slug}] could not read header of first CSV — keeping manifest column names verbatim`);
      seenSlugs.add(slug);
      configs.push({
        name: e.name, code: e.code || null, dir,
        deptCol: rawDept, purposeCol: rawPurpose || null, amountCol: rawAmount, supplierCol: rawSupplier,
        sep, encoding, headerHint: rawSupplier || rawDept, mappingFile: mappingPath,
        fyLabel: '2023/24',
        source: `${e.name} — ${e.base_url || 'Spend Over £500 transparency disclosure'}`,
        source_url: e.base_url || null,
        _manifest_blocker: e.blocker_severity,
        _manifest_complications: e.complications || [],
        _validation_note: 'header not readable'
      });
      continue;
    }

    const validated = {};
    const warnings = [];
    for (const [key, raw] of [['dept', rawDept], ['purpose', rawPurpose], ['amount', rawAmount], ['supplier', rawSupplier]]) {
      if (!raw) { validated[key] = null; continue; }
      const r = resolveColumn(raw, headerCols);
      validated[key] = r.match;
      if (r.strategy !== 'exact') {
        warnings.push(`${key}: "${raw}" → "${r.match || '(none)'}" [${r.strategy}${r.distance !== undefined ? ', d=' + r.distance : ''}${r.closestCandidate ? ', closest="' + r.closestCandidate + '" d=' + r.closestDistance : ''}]`);
      }
    }

    if (!validated.dept || !validated.supplier || !validated.amount) {
      console.log(`  [${slug}] COLUMN RESOLUTION FAILED — dept/supplier/amount must all resolve`);
      for (const w of warnings) console.log('     ' + w);
      console.log('     header: ' + headerCols.slice(0, 10).join(' | '));
      skipped.no_schema++;
      continue;
    }

    if (warnings.length > 0) {
      console.log(`  [${slug}] column remaps:`);
      for (const w of warnings) console.log('     ' + w);
    }

    seenSlugs.add(slug);

    const cfg = {
      name: e.name,
      code: e.code || null,
      dir, // build will resolve absolute
      deptCol: validated.dept,
      purposeCol: validated.purpose || null,
      amountCol: validated.amount,
      supplierCol: validated.supplier,
      sep,
      encoding,
      headerHint: validated.supplier || validated.dept,
      mappingFile: mappingPath,
      fyLabel: '2023/24',
      source: `${e.name} — ${e.base_url || 'Spend Over £500 transparency disclosure'}`,
      source_url: e.base_url || null,
      _manifest_blocker: e.blocker_severity,
      _manifest_complications: e.complications || [],
      _validation_warnings: warnings.length > 0 ? warnings : undefined
    };
    configs.push(cfg);
  }

  console.log(`Manifest: ${manifest.length} entries`);
  console.log(`Generated configs: ${configs.length}`);
  console.log('Skipped:');
  for (const [k, n] of Object.entries(skipped)) if (n > 0) console.log(`  ${k}: ${n}`);

  if (DRY_RUN) {
    console.log('\nFirst 5 configs:');
    for (const c of configs.slice(0, 5)) console.log('  ' + c.name + ':', { deptCol: c.deptCol, supplierCol: c.supplierCol, amountCol: c.amountCol, purposeCol: c.purposeCol });
    return;
  }

  fs.writeFileSync(OUT, JSON.stringify(configs, null, 2), 'utf8');
  console.log(`\n✓ Written: ${OUT}`);
}

main();
