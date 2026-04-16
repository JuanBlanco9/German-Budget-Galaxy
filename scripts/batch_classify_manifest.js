#!/usr/bin/env node
/**
 * batch_classify_manifest.js
 *
 * Iterates every eligible council in the manifest and invokes
 * classify_council_departments.js with the schema extracted by the
 * Sonnet parser. Only touches councils that have FY 23/24 files on
 * disk (post-filter_fy2324_files.js) and aren't already in the lookup.
 *
 * Writes {council_slug}_dept_mapping.json per council. Does NOT touch
 * the lookup — safe to run in parallel with the upload.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=... node scripts/batch_classify_manifest.js [--dry-run] [--limit N]
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const SPEND_DIR = path.join(__dirname, '..', 'data', 'uk', 'local_authorities', 'spend');
const MANIFEST = path.join(__dirname, '..', 'data', 'uk', 'local_authorities', 'council_discovery_manifest.json');
const CLASSIFIER = path.join(__dirname, 'classify_council_departments.js');

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const LIMIT = args.includes('--limit') ? parseInt(args[args.indexOf('--limit') + 1], 10) : 0;

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('ANTHROPIC_API_KEY required');
  process.exit(1);
}

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

// Marker tokens that should prevent substring matching across categories.
// If one side has a token and the other does not, the names refer to
// different entities even if they share a geographical prefix.
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

// ─── Column-name resolution (ported from generate_build_configs_from_manifest.js) ──

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

function readFirstHeader(files, sep, encoding, headerHint) {
  if (!files || files.length === 0) return null;
  const fp = files[0];
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
  return parseCSVLine(lines[headerIdx], sep).map(h => h.replace(/^"|"$/g, '').trim()).filter(h => h.length > 0);
}

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

function resolveColumn(manifestCol, headerCols) {
  if (!manifestCol || !headerCols || headerCols.length === 0) return { match: null, strategy: 'none' };
  // Compound "A / B" — try each half
  if (String(manifestCol).includes(' / ')) {
    for (const half of manifestCol.split(' / ').map(s => s.trim())) {
      const r = resolveColumn(half, headerCols);
      if (r.match) return { ...r, strategy: r.strategy + '-half' };
    }
  }
  const mLower = manifestCol.toLowerCase();
  const exact = headerCols.find(h => h.toLowerCase() === mLower);
  if (exact) return { match: exact, strategy: 'exact' };
  // Normalise whitespace: collapse multi-space and compare
  const mCollapsed = mLower.replace(/\s+/g, ' ');
  const collapsed = headerCols.find(h => h.toLowerCase().replace(/\s+/g, ' ') === mCollapsed);
  if (collapsed) return { match: collapsed, strategy: 'whitespace' };
  // Substring
  const sub = headerCols.find(h => {
    const hLower = h.toLowerCase();
    return hLower.includes(mLower) || mLower.includes(hLower);
  });
  if (sub) return { match: sub, strategy: 'substring' };
  // Fuzzy Levenshtein
  let best = null;
  let bestDist = Infinity;
  for (const h of headerCols) {
    const d = levenshtein(h.toLowerCase().replace(/\s+/g, ' '), mCollapsed);
    if (d < bestDist) { bestDist = d; best = h; }
  }
  const maxAllowed = Math.min(6, Math.ceil(Math.max(manifestCol.length, (best || '').length) / 3));
  if (best && bestDist <= maxAllowed) return { match: best, strategy: 'fuzzy', distance: bestDist };
  return { match: null, strategy: 'none', closestCandidate: best, closestDistance: bestDist };
}

function mapEncoding(enc) {
  if (!enc) return 'utf8';
  if (enc === 'utf8-bom') return 'utf8';
  if (enc === 'cp1252' || enc === 'windows-1252') return 'latin1';
  if (enc === 'iso-8859-1') return 'latin1';
  if (enc === 'unknown') return 'utf8';
  return enc;
}

function runClassifier(council, files, deptCol, purposeCol, sep, encoding, headerHint) {
  return new Promise((resolve) => {
    const args = [CLASSIFIER, '--council', council];
    for (const f of files) args.push('--file', f);
    args.push('--dept-col', deptCol);
    if (purposeCol) args.push('--purpose-col', purposeCol);
    if (sep && sep !== 'comma') args.push('--sep', sep === 'semicolon' ? ';' : '\t');
    if (encoding && encoding !== 'utf8' && encoding !== 'utf8-bom' && encoding !== 'unknown') args.push('--encoding', encoding);
    if (headerHint) args.push('--header-hint', headerHint);
    const proc = spawn(process.execPath, args, {
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    let out = '', err = '';
    proc.stdout.on('data', d => out += d.toString());
    proc.stderr.on('data', d => err += d.toString());
    proc.on('close', code => {
      resolve({ code, out, err });
    });
  });
}

async function main() {
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
      // Bidirectional prefix match, but only if marker tokens agree.
      // Prevents "hampshire isle wight police" from matching "hampshire"
      // (marker "police" present on one side, absent on the other).
      if (markersDiverge(norm, existing)) continue;
      if (existing.length >= 6 && (norm.startsWith(existing) || norm.endsWith(existing))) return true;
      if (norm.length >= 6 && (existing.startsWith(norm) || existing.endsWith(norm))) return true;
    }
    return false;
  }

  const eligible = [];
  const skipped = { no_files: 0, devolved: 0, red: 0, in_lookup: 0, no_dept_col: 0, mapping_exists: 0, dup_slug: 0, column_unresolved: 0, header_unreadable: 0 };
  const seenSlugs = new Set();
  for (const e of manifest) {
    if (!e.name) continue;
    if (e.tier === 'devolved') { skipped.devolved++; continue; }
    if (e.blocker_severity === 'red') { skipped.red++; continue; }
    if (inLookup(e.name)) { skipped.in_lookup++; continue; }

    const slug = slugify(e.name);
    if (seenSlugs.has(slug)) { skipped.dup_slug++; continue; }

    const dir = path.join(SPEND_DIR, slug);
    if (!fs.existsSync(dir)) { skipped.no_files++; continue; }
    const files = fs.readdirSync(dir)
      .filter(f => /\.(csv)$/i.test(f)) // classifier wants CSVs
      .map(f => path.join(dir, f));
    if (files.length === 0) { skipped.no_files++; continue; }

    const rawDeptCol = e.schema && e.schema.dept_col;
    if (!rawDeptCol) { skipped.no_dept_col++; continue; }

    // Skip if mapping already exists (idempotency). Re-run happens via deleting
    // the mapping file first.
    const mappingPath = path.join(SPEND_DIR, `${slug}_dept_mapping.json`);
    if (fs.existsSync(mappingPath)) { skipped.mapping_exists++; continue; }

    // ── Validate column names against the actual CSV header ──
    const sepChar = (e.schema.sep === 'semicolon') ? ';' : (e.schema.sep === 'tab') ? '\t' : ',';
    const encoding = mapEncoding(e.schema.encoding);
    const rawPurposeCol = e.schema.purpose_col;
    const rawSupplierCol = e.schema.supplier_col;

    const headerCols = readFirstHeader(files, sepChar, encoding, rawSupplierCol || rawDeptCol);
    if (!headerCols) {
      console.log(`  [${slug}] header unreadable — skipping`);
      skipped.header_unreadable++;
      continue;
    }

    const deptResolution = resolveColumn(rawDeptCol, headerCols);
    if (!deptResolution.match) {
      console.log(`  [${slug}] dept column "${rawDeptCol}" unresolved`);
      console.log(`    header: ${headerCols.slice(0, 8).join(' | ')}`);
      if (deptResolution.closestCandidate) console.log(`    closest: "${deptResolution.closestCandidate}" (d=${deptResolution.closestDistance})`);
      skipped.column_unresolved++;
      continue;
    }
    const purposeResolution = rawPurposeCol ? resolveColumn(rawPurposeCol, headerCols) : { match: null, strategy: 'none' };
    if (rawPurposeCol && purposeResolution.strategy !== 'exact' && purposeResolution.match) {
      console.log(`  [${slug}] purpose remap: "${rawPurposeCol}" → "${purposeResolution.match}" [${purposeResolution.strategy}]`);
    }
    if (deptResolution.strategy !== 'exact') {
      console.log(`  [${slug}] dept remap: "${rawDeptCol}" → "${deptResolution.match}" [${deptResolution.strategy}${deptResolution.distance !== undefined ? ', d=' + deptResolution.distance : ''}]`);
    }

    seenSlugs.add(slug);

    eligible.push({
      council: slug,
      name: e.name,
      files,
      deptCol: deptResolution.match,
      purposeCol: purposeResolution.match,
      sep: e.schema.sep,
      encoding,
      headerHint: rawSupplierCol || deptResolution.match
    });
  }

  console.log(`Manifest: ${manifest.length} entries`);
  console.log(`Eligible for classification: ${eligible.length}`);
  console.log('Skipped:');
  for (const [k, n] of Object.entries(skipped)) if (n > 0) console.log(`  ${k}: ${n}`);

  if (LIMIT > 0) eligible.splice(LIMIT);

  if (DRY_RUN) {
    console.log('\nEligible councils:');
    for (const e of eligible) {
      console.log(`  ${e.council.padEnd(55)} ${e.files.length} files  dept="${e.deptCol}" purpose="${e.purposeCol || ''}"`);
    }
    return;
  }

  let ok = 0, fail = 0;
  for (let i = 0; i < eligible.length; i++) {
    const e = eligible[i];
    process.stdout.write(`[${i + 1}/${eligible.length}] ${e.council} (${e.files.length} files)... `);
    const r = await runClassifier(e.council, e.files, e.deptCol, e.purposeCol, e.sep, e.encoding, e.headerHint);
    if (r.code === 0) {
      // Check if mapping actually got written
      const mappingPath = path.join(SPEND_DIR, `${e.council}_dept_mapping.json`);
      if (fs.existsSync(mappingPath)) {
        const m = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));
        console.log(`✓ ${Object.keys(m.patterns || {}).length} patterns`);
        ok++;
      } else {
        console.log(`✗ exit 0 but no mapping file`);
        if (r.err) console.log(`   stderr: ${r.err.split('\n').slice(0, 3).join(' | ')}`);
        fail++;
      }
    } else {
      console.log(`✗ exit ${r.code}`);
      if (r.err) console.log(`   stderr: ${r.err.split('\n').slice(0, 3).join(' | ')}`);
      if (r.out) console.log(`   stdout tail: ${r.out.split('\n').slice(-3).join(' | ')}`);
      fail++;
    }
  }

  console.log(`\nDone: ${ok} classified, ${fail} failed`);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
