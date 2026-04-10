#!/usr/bin/env node
/**
 * classify_council_departments.js
 *
 * Uses Claude Haiku to automatically classify UK council department/purpose
 * combinations into the 13 standardized MHCLG service categories.
 *
 * Runs OFFLINE (once per council), produces a cached JSON mapping file.
 * The existing pipeline (build_council_spend_lookup.js) applies the mapping.
 * Zero LLM in production. Zero changes to the frontend.
 *
 * Usage:
 *   node scripts/classify_council_departments.js \
 *     --council Bristol \
 *     --file data/uk/local_authorities/spend/bristol_spend_2023_24.csv \
 *     --dept-col "Service" \
 *     --purpose-col "Expenditure Category" \
 *     --sep "," \
 *     --dry-run
 *
 * Arguments:
 *   --council      Short name used for output file slug
 *   --file         Path to the council spend CSV (can repeat for multiple files)
 *   --dept-col     Column name for department/service/OU
 *   --purpose-col  Column name for purpose/category (optional)
 *   --sep          CSV separator (default: ",")
 *   --encoding     File encoding (default: "utf8")
 *   --header-hint  String to auto-detect header row (optional)
 *   --dry-run      Show unique patterns without calling API
 *
 * Output:
 *   data/uk/local_authorities/spend/{council_slug}_dept_mapping.json
 */

const fs = require('fs');
const path = require('path');

const SPEND_DIR = path.join(__dirname, '..', 'data', 'uk', 'local_authorities', 'spend');

const VALID_CATEGORIES = [
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

const MODEL = 'claude-haiku-4-5-20251001';
const BATCH_SIZE = 30;
const DELAY_MS = 200;

// ─── Argument parsing ────────────────────────────────────

function parseArgs(argv) {
  const args = { files: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--council')      args.council = argv[++i];
    else if (a === '--file')    args.files.push(argv[++i]);
    else if (a === '--dept-col') args.deptCol = argv[++i];
    else if (a === '--purpose-col') args.purposeCol = argv[++i];
    else if (a === '--sep')     args.sep = argv[++i];
    else if (a === '--encoding') args.encoding = argv[++i];
    else if (a === '--header-hint') args.headerHint = argv[++i];
    else if (a === '--dry-run') args.dryRun = true;
  }
  if (!args.council) { console.error('Error: --council required'); process.exit(1); }
  if (args.files.length === 0) { console.error('Error: --file required (at least one)'); process.exit(1); }
  if (!args.deptCol) { console.error('Error: --dept-col required'); process.exit(1); }
  args.sep = args.sep || ',';
  args.encoding = args.encoding || 'utf8';
  return args;
}

// ─── CSV parser (same as build_council_spend_lookup.js) ──

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

function readCSVFile(filePath, sep, encoding, headerHint) {
  const buf = fs.readFileSync(filePath);
  const raw = buf.toString(encoding).replace(/^\uFEFF/, '');
  const lines = raw.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };

  // Auto-detect header row
  let headerRowIdx = 0;
  if (headerHint) {
    for (let k = 0; k < Math.min(8, lines.length); k++) {
      if (lines[k].includes(headerHint)) { headerRowIdx = k; break; }
    }
  }

  const headers = parseCSVLine(lines[headerRowIdx], sep).map(h => h.replace(/^"|"$/g, '').trim());
  const rows = [];
  for (let i = headerRowIdx + 1; i < lines.length; i++) {
    const ln = lines[i];
    if (!ln.replace(/[,\s]/g, '')) continue;
    const cols = parseCSVLine(ln, sep);
    const row = {};
    headers.forEach((h, j) => row[h] = (cols[j] || '').replace(/^"|"$/g, '').trim());
    rows.push(row);
  }
  return { headers, rows };
}

// ─── Extract unique patterns ─────────────────────────────

function extractPatterns(files, sep, encoding, headerHint, deptCol, purposeCol) {
  const patterns = new Set();
  let totalRows = 0;

  for (const fp of files) {
    if (!fs.existsSync(fp)) {
      console.log(`  Warning: file not found: ${fp}`);
      continue;
    }
    const { headers, rows } = readCSVFile(fp, sep, encoding, headerHint);

    // Validate columns exist
    if (!headers.includes(deptCol)) {
      // Try case-insensitive match
      const match = headers.find(h => h.toLowerCase() === deptCol.toLowerCase());
      if (match) {
        console.log(`  Note: using column "${match}" (matched --dept-col "${deptCol}")`);
        deptCol = match;
      } else {
        console.error(`  Error: column "${deptCol}" not found in ${path.basename(fp)}`);
        console.error(`  Available columns: ${headers.join(', ')}`);
        continue;
      }
    }

    for (const r of rows) {
      const dept = r[deptCol] || 'Unknown';
      const purpose = purposeCol ? (r[purposeCol] || '') : '';
      patterns.add(dept + '|' + purpose);
    }
    totalRows += rows.length;
    console.log(`  ${path.basename(fp)}: ${rows.length} rows`);
  }

  return { patterns: [...patterns], totalRows };
}

// ─── Claude Haiku classifier ─────────────────────────────

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function classifyBatch(client, batch) {
  const items = batch.map(key => {
    const [dept, purpose] = key.split('|');
    const obj = { dept };
    if (purpose) obj.purpose = purpose;
    return obj;
  });

  const systemPrompt = `You are classifying UK local council spending into standardized service categories. You will receive a list of department/purpose combinations and must assign each to exactly one of these 13 categories:

Education, Adult Social Care, Children's Social Care, Public Health, Housing, Transport, Environment, Culture, Planning, Police, Fire & Rescue, Central Services, Other Services

Rules:
- Respond ONLY with a JSON array of strings, one per input
- Each string must be exactly one of the 13 categories above
- If ambiguous, prefer the more specific category
- "Central Services" = admin, finance, IT, legal, HR, council tax, revenues
- "Other Services" = genuinely unclear or does not fit any category
- Never invent categories or add explanations`;

  const userPrompt = `Classify these council spending entries:\n${JSON.stringify(items, null, 2)}`;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }]
      });

      const text = response.content[0].text.trim();
      // Extract JSON array from response (handle markdown code blocks)
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        console.log(`    Retry ${attempt + 1}: no JSON array found in response`);
        continue;
      }

      const arr = JSON.parse(jsonMatch[0]);
      if (arr.length !== batch.length) {
        console.log(`    Retry ${attempt + 1}: expected ${batch.length} items, got ${arr.length}`);
        continue;
      }

      // Validate and fix invalid categories
      for (let i = 0; i < arr.length; i++) {
        if (!VALID_CATEGORIES.includes(arr[i])) {
          console.log(`    Invalid category "${arr[i]}" → "Other Services"`);
          arr[i] = 'Other Services';
        }
      }
      return arr;

    } catch (e) {
      if (e.status === 429) {
        console.log(`    Rate limited, waiting 2s...`);
        await sleep(2000);
      } else {
        console.log(`    API error (attempt ${attempt + 1}): ${e.message}`);
        await sleep(500);
      }
    }
  }

  // All retries failed — return Other Services for the whole batch
  console.log(`    All retries failed for batch, defaulting to "Other Services"`);
  return batch.map(() => 'Other Services');
}

async function classifyPatterns(newPatterns, existingMapping) {
  const Anthropic = require('@anthropic-ai/sdk');
  const client = new Anthropic();

  const mapping = { ...existingMapping };
  const batches = chunk(newPatterns, BATCH_SIZE);
  let classified = 0;

  console.log(`\nClassifying ${newPatterns.length} patterns in ${batches.length} batches (model: ${MODEL})...\n`);

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    process.stdout.write(`  Batch ${i + 1}/${batches.length} (${batch.length} patterns)...`);

    const results = await classifyBatch(client, batch);
    for (let j = 0; j < batch.length; j++) {
      mapping[batch[j]] = results[j];
    }
    classified += batch.length;
    console.log(` done`);

    if (i < batches.length - 1) await sleep(DELAY_MS);
  }

  console.log(`\nClassified ${classified} new patterns.`);
  return mapping;
}

// ─── Main ────────────────────────────────────────────────

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const slug = args.council.toLowerCase().replace(/[^a-z0-9]+/g, '_');
  const outputFile = path.join(SPEND_DIR, `${slug}_dept_mapping.json`);

  console.log(`\n=== Council Department Classifier ===`);
  console.log(`Council: ${args.council}`);
  console.log(`Files: ${args.files.length}`);
  console.log(`Dept column: "${args.deptCol}"`);
  if (args.purposeCol) console.log(`Purpose column: "${args.purposeCol}"`);
  console.log(`Output: ${outputFile}\n`);

  // Extract unique patterns from CSV(s)
  const { patterns, totalRows } = extractPatterns(
    args.files, args.sep, args.encoding, args.headerHint,
    args.deptCol, args.purposeCol
  );

  console.log(`\n${totalRows} total rows → ${patterns.length} unique patterns\n`);

  if (patterns.length === 0) {
    console.error('No patterns found. Check column names and file paths.');
    process.exit(1);
  }

  // Dry run: show patterns and exit
  if (args.dryRun) {
    console.log('── DRY RUN: Sample patterns (first 30) ──\n');
    patterns.slice(0, 30).forEach((p, i) => {
      const [dept, purpose] = p.split('|');
      console.log(`  ${String(i + 1).padStart(3)}. dept="${dept}"${purpose ? `, purpose="${purpose}"` : ''}`);
    });
    if (patterns.length > 30) {
      console.log(`  ... and ${patterns.length - 30} more`);
    }
    console.log(`\nRun without --dry-run to classify via Claude Haiku.`);
    return;
  }

  // Load existing cache if present (idempotency)
  let existingMapping = {};
  let existingMeta = null;
  if (fs.existsSync(outputFile)) {
    const cached = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
    existingMapping = cached.patterns || {};
    existingMeta = cached._meta;
    console.log(`Loaded existing cache: ${Object.keys(existingMapping).length} patterns already classified.`);
  }

  // Find patterns not yet classified
  const newPatterns = patterns.filter(p => !(p in existingMapping));
  console.log(`New patterns to classify: ${newPatterns.length}`);

  if (newPatterns.length === 0) {
    console.log('\nAll patterns already cached. Nothing to do.');
    reportStats(existingMapping, patterns);
    return;
  }

  // Classify new patterns via Haiku
  const fullMapping = await classifyPatterns(newPatterns, existingMapping);

  // Build output
  const otherCount = patterns.filter(p => fullMapping[p] === 'Other Services').length;
  const meta = {
    council: args.council,
    generated: new Date().toISOString(),
    model: MODEL,
    unique_patterns: patterns.length,
    other_services_count: otherCount,
    other_services_pct: parseFloat((otherCount / patterns.length * 100).toFixed(1)),
    note: 'Patterns classified as Other Services may need manual review'
  };

  const output = {
    _meta: meta,
    patterns: fullMapping
  };

  fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));
  console.log(`\n✓ Written: ${outputFile}`);

  reportStats(fullMapping, patterns);
}

function reportStats(mapping, allPatterns) {
  // Category distribution
  const dist = {};
  for (const p of allPatterns) {
    const cat = mapping[p] || 'Other Services';
    dist[cat] = (dist[cat] || 0) + 1;
  }

  console.log('\n── Classification Distribution ──\n');
  const sorted = Object.entries(dist).sort((a, b) => b[1] - a[1]);
  for (const [cat, count] of sorted) {
    const pct = (count / allPatterns.length * 100).toFixed(1);
    console.log(`  ${cat.padEnd(25)} ${String(count).padStart(5)} patterns (${pct}%)`);
  }

  // Show "Other Services" patterns for review
  const others = allPatterns.filter(p => mapping[p] === 'Other Services');
  if (others.length > 0) {
    console.log(`\n── Patterns classified as "Other Services" (review candidates) ──\n`);
    others.slice(0, 20).forEach(p => {
      const [dept, purpose] = p.split('|');
      console.log(`  dept="${dept}"${purpose ? `, purpose="${purpose}"` : ''}`);
    });
    if (others.length > 20) console.log(`  ... and ${others.length - 20} more`);
  }
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
