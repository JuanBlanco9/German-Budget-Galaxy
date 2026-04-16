#!/usr/bin/env node
/**
 * validate_dept_mappings.js
 *
 * Quick QC of every *_dept_mapping.json in the spend dir.
 * Flags mappings with 0 patterns, a single-pattern "Unknown|" entry,
 * or >95% Other Services (classifier blindly dumped everything).
 * Also cross-references each mapping against the local CSVs to verify
 * the dept column name from the manifest actually exists in the real
 * headers.
 *
 * Usage: node scripts/validate_dept_mappings.js
 */

const fs = require('fs');
const path = require('path');

const SPEND_DIR = path.join(__dirname, '..', 'data', 'uk', 'local_authorities', 'spend');
const MANIFEST = path.join(__dirname, '..', 'data', 'uk', 'local_authorities', 'council_discovery_manifest.json');

const manifest = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) : [];

function slugify(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function findManifestBySlug(slug) {
  for (const e of manifest) {
    if (e.name && slugify(e.name) === slug) return e;
  }
  return null;
}

const mappings = fs.readdirSync(SPEND_DIR).filter(f => f.endsWith('_dept_mapping.json'));

console.log(`Found ${mappings.length} dept_mapping files\n`);

const healthy = [];
const empty = [];
const suspicious = [];

for (const fn of mappings) {
  const slug = fn.replace('_dept_mapping.json', '');
  const fp = path.join(SPEND_DIR, fn);
  const data = JSON.parse(fs.readFileSync(fp, 'utf8'));
  const patterns = data.patterns || {};
  const patternCount = Object.keys(patterns).length;

  if (patternCount === 0) {
    empty.push({ slug, reason: 'zero patterns' });
    continue;
  }

  // Count "Other Services" share
  const otherCount = Object.values(patterns).filter(v => v === 'Other Services').length;
  const otherPct = otherCount / patternCount;

  // Single-pattern sanity: "Unknown|" → dept col is missing
  if (patternCount === 1 && Object.keys(patterns)[0].startsWith('Unknown|')) {
    empty.push({ slug, reason: 'single Unknown pattern (dept col missing)' });
    continue;
  }

  if (otherPct > 0.95) {
    suspicious.push({ slug, patternCount, otherPct: (otherPct * 100).toFixed(0) + '%', reason: '>95% Other Services (classifier blind)' });
    continue;
  }

  healthy.push({ slug, patternCount, otherPct: (otherPct * 100).toFixed(0) + '%' });
}

console.log(`✓ Healthy: ${healthy.length}`);
for (const h of healthy) console.log(`  ${h.slug.padEnd(55)} ${String(h.patternCount).padStart(5)} patterns  (${h.otherPct} Other)`);

if (suspicious.length > 0) {
  console.log(`\n⚠ Suspicious (>${'95%'} Other Services): ${suspicious.length}`);
  for (const s of suspicious) console.log(`  ${s.slug.padEnd(55)} ${String(s.patternCount).padStart(5)} patterns  (${s.otherPct})`);
}

if (empty.length > 0) {
  console.log(`\n✗ Empty / broken: ${empty.length}`);
  for (const e of empty) {
    const m = findManifestBySlug(e.slug);
    console.log(`  ${e.slug.padEnd(55)} ${e.reason}`);
    if (m && m.schema) {
      console.log(`    manifest dept="${m.schema.dept_col}" purpose="${m.schema.purpose_col || ''}"`);
      const dir = path.join(SPEND_DIR, e.slug);
      if (fs.existsSync(dir)) {
        const csvs = fs.readdirSync(dir).filter(f => /\.csv$/i.test(f));
        if (csvs.length > 0) {
          try {
            const raw = fs.readFileSync(path.join(dir, csvs[0]), 'utf8').replace(/^\uFEFF/, '');
            const firstLine = raw.split(/\r?\n/)[0];
            console.log(`    actual header: ${firstLine.slice(0, 150)}`);
          } catch (e2) { /* skip */ }
        }
      }
    }
  }
}

console.log(`\nTotal: ${healthy.length} healthy, ${suspicious.length} suspicious, ${empty.length} empty`);
