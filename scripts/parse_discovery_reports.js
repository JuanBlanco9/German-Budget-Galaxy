#!/usr/bin/env node
/**
 * parse_discovery_reports.js
 *
 * Reads each markdown discovery report in
 * data/uk/local_authorities/discovery_reports/*.md and sends it to
 * Claude Sonnet for structured extraction. The LLM is the parser —
 * it handles the formatting inconsistency across 35 reports (which
 * came from different agents using different markdown conventions)
 * far more robustly than a regex pipeline.
 *
 * Output: data/uk/local_authorities/council_discovery_manifest.json
 *   [ { name, code, tier, base_url, download_urls[], url_pattern,
 *       file_format, blocker_severity, fy_coverage, schema{},
 *       complications[], needs_playwright, report_source }, ... ]
 *
 * Usage:
 *   ANTHROPIC_API_KEY=... node scripts/parse_discovery_reports.js [--limit 5]
 */

const fs = require('fs');
const path = require('path');

// Haiku 4.5 handles structured JSON extraction from these reports well
// enough (they're semi-structured markdown, not complex prose), at ~3x
// lower cost than Sonnet. Stay on Haiku unless a run shows systematic
// extraction quality regressions.
const MODEL = 'claude-haiku-4-5-20251001';
const MAX_TOKENS = 8192;

const REPORTS_DIR = path.join(__dirname, '..', 'data', 'uk', 'local_authorities', 'discovery_reports');
const OUT_PATH = path.join(__dirname, '..', 'data', 'uk', 'local_authorities', 'council_discovery_manifest.json');

const args = process.argv.slice(2);
const LIMIT = args.includes('--limit') ? parseInt(args[args.indexOf('--limit') + 1], 10) : 0;
const VERBOSE = args.includes('--verbose');
// --only foo.md,bar.md — process only the listed report filenames, merge into existing manifest
const ONLY = args.includes('--only') ? args[args.indexOf('--only') + 1].split(',').map(s => s.trim()) : null;
const MERGE = args.includes('--merge');

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('ANTHROPIC_API_KEY env var required');
  process.exit(1);
}

const SYSTEM_PROMPT = `You are a structured data extractor. You receive UK local council transparency discovery reports (free-form markdown) and return a JSON array describing each council covered in the report.

Your ONLY output is a valid JSON array. No markdown code fences, no prose, no preamble. The output MUST parse as JSON.

Schema for each council object:
{
  "name": "string — official council name (e.g. 'Devon County Council', 'West Midlands Police')",
  "code": "string or null — GSS code like E10000008 if mentioned, else null",
  "tier": "shire_county|unitary|metropolitan_district|london_borough|pcc|combined_authority|devolved|other",
  "base_url": "string or null — the council's transparency/dataset landing page",
  "download_urls": ["full http(s) URLs to data files. Empty array if only a pattern is given."],
  "url_pattern": "string or null — template expression like 'DCCSpendingOver500_{YYYYMM}.csv' or 'Q{N} 2023-2024.xlsx'",
  "file_format": "csv|xlsx|xls|ods|pdf|mixed|unknown",
  "blocker_severity": "green|yellow|red|unknown",
  "fy_coverage": "string — one short phrase describing FY 2023/24 coverage completeness (e.g. '12/12 verified', '8/12 XLSX + 4 PDF only', 'Q3+Q4 only, Q1/Q2 URLs missing')",
  "schema": {
    "supplier_col": "string or null — column name for beneficiary/supplier",
    "dept_col": "string or null — column name for department/directorate/service area",
    "purpose_col": "string or null — column name for purpose/expense type",
    "amount_col": "string or null — column name for net amount",
    "date_col": "string or null — column name for payment date",
    "encoding": "utf8|utf8-bom|latin1|cp1252|unknown",
    "sep": "comma|semicolon|tab|unknown"
  },
  "complications": ["array of short strings describing quirks, blockers, encoding issues, partial coverage, etc"],
  "needs_playwright": boolean,
  "report_source": "the filename of the report that provided this info — fill in verbatim as given in the user prompt"
}

Rules:
- Include EVERY council mentioned in the report, even if only a name-drop. For skeleton entries, use nulls and "blocker_severity": "unknown".
- Welsh/Scottish/NI councils → tier="devolved", add "devolved nation - out of scope" to complications.
- If multiple councils are covered, return all of them in the array.
- If the report is a download/recovery report (not a discovery report), you may still extract whatever useful URL/schema info is present.
- Pattern vs explicit URLs: if the report lists 12 explicit URLs, put them all in download_urls. If it gives a template, put the template in url_pattern and leave download_urls empty (or partial if some are explicit and others are patterned).
- needs_playwright=true if the report mentions Cloudflare, Imperva, JS walls, 403 from curl, or "browser-only" access.

CRITICAL JSON ESCAPING RULES — violating these causes JSON.parse() to fail and the extraction is lost:
- Every string value must be a valid JSON string. Literal newlines inside strings MUST be escaped as \\n. Never emit a raw line break inside a string.
- Double quotes inside strings MUST be escaped as \\". Backslashes as \\\\.
- Tab characters as \\t. No other control characters allowed.
- When extracting text from the report that contains quotes, newlines, or backslashes, rewrite to escaped form before emitting.
- Keep "complications" strings short (one line each). If a complication spans multiple lines in the source, collapse to a single line with spaces.
- Do NOT copy raw markdown formatting (backticks, asterisks, quotes) into strings verbatim — strip or escape them.

Output ONLY the JSON array. Start with "[" and end with "]". Nothing else.`;

async function parseOne(reportFile, content) {
  const Anthropic = require('@anthropic-ai/sdk');
  const client = new Anthropic();

  const userPrompt = `Discovery report filename: ${reportFile}\n\nReport content:\n\n${content}`;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }]
      });
      let text = response.content[0].text.trim();
      // Strip optional code fences if the model added them despite instructions
      text = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
      // Find the JSON array boundaries
      const firstBracket = text.indexOf('[');
      const lastBracket = text.lastIndexOf(']');
      if (firstBracket < 0 || lastBracket < 0) {
        console.log(`    attempt ${attempt + 1}: no JSON array in response`);
        continue;
      }
      const json = text.slice(firstBracket, lastBracket + 1);
      const arr = JSON.parse(json);
      if (!Array.isArray(arr)) {
        console.log(`    attempt ${attempt + 1}: not an array`);
        continue;
      }
      // Stamp report_source on every item (LLM sometimes forgets)
      for (const item of arr) item.report_source = reportFile;
      return arr;
    } catch (e) {
      if (e.status === 429) {
        console.log(`    rate limited, waiting 3s...`);
        await new Promise(r => setTimeout(r, 3000));
      } else {
        console.log(`    error attempt ${attempt + 1}: ${e.message}`);
        await new Promise(r => setTimeout(r, 800));
      }
    }
  }
  console.log(`    FAILED after 3 attempts for ${reportFile}`);
  return [];
}

async function main() {
  const allFiles = fs.readdirSync(REPORTS_DIR)
    .filter(f => f.endsWith('.md') && f !== 'INDEX.md')
    .sort();
  let files;
  if (ONLY) {
    files = allFiles.filter(f => ONLY.includes(f));
    if (files.length !== ONLY.length) {
      console.error('Some --only files not found. Requested:', ONLY, 'matched:', files);
    }
  } else if (LIMIT > 0) {
    files = allFiles.slice(0, LIMIT);
  } else {
    files = allFiles;
  }

  console.log(`Parsing ${files.length} discovery reports with ${MODEL}...\n`);

  const manifest = [];
  for (let i = 0; i < files.length; i++) {
    const fn = files[i];
    const content = fs.readFileSync(path.join(REPORTS_DIR, fn), 'utf8');
    process.stdout.write(`  [${i + 1}/${files.length}] ${fn} (${content.length} chars)... `);
    const entries = await parseOne(fn, content);
    manifest.push(...entries);
    console.log(`${entries.length} councils`);
    if (VERBOSE) {
      for (const e of entries) console.log(`      - ${e.name} [${e.blocker_severity}] ${e.download_urls?.length || 0} urls`);
    }
    // Gentle pacing between calls
    if (i < files.length - 1) await new Promise(r => setTimeout(r, 300));
  }

  console.log(`\nExtracted ${manifest.length} council entries across ${files.length} reports`);

  // Group by blocker severity for summary
  const bySev = {};
  for (const e of manifest) {
    const s = e.blocker_severity || 'unknown';
    bySev[s] = (bySev[s] || 0) + 1;
  }
  console.log('\nBlocker severity distribution:');
  for (const [s, n] of Object.entries(bySev)) console.log(`  ${s}: ${n}`);

  const byTier = {};
  for (const e of manifest) {
    const t = e.tier || 'unknown';
    byTier[t] = (byTier[t] || 0) + 1;
  }
  console.log('\nTier distribution:');
  for (const [t, n] of Object.entries(byTier)) console.log(`  ${t}: ${n}`);

  // Write manifest — optionally merge with existing (when re-running failed files)
  let finalManifest = manifest;
  if (MERGE && fs.existsSync(OUT_PATH)) {
    const existing = JSON.parse(fs.readFileSync(OUT_PATH, 'utf8'));
    // Drop existing entries from the reports we just re-processed
    const reprocessed = new Set(files);
    const kept = existing.filter(e => !reprocessed.has(e.report_source));
    finalManifest = [...kept, ...manifest];
    console.log(`\nMerge: kept ${kept.length} existing + ${manifest.length} new = ${finalManifest.length} total`);
  }
  fs.writeFileSync(OUT_PATH, JSON.stringify(finalManifest, null, 2), 'utf8');
  console.log(`\n✓ Written: ${OUT_PATH}`);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
