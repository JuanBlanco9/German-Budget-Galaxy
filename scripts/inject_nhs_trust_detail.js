#!/usr/bin/env node
/**
 * inject_nhs_trust_detail.js
 *
 * Injects 4-category expenditure breakdown + ICB metadata as children
 * of each NHS trust leaf node under nhs_provider_sector.
 *
 * Pre-conditions:
 *   - data/uk/uk_budget_tree_2024.json has nhs_provider_sector top-level
 *     node (created by inject_nhs_trusts.js)
 *   - data/uk/nhs_trust_breakdown_2024.json exists (created by
 *     build_nhs_trust_breakdown.js)
 *
 * Post-conditions:
 *   - Each trust node now has 4 children (Staff, Supplies, Premises, Other)
 *     where children sum exactly to parent value
 *   - Each trust node has _source, _sector, _icb metadata
 *   - Trust value (= EXP0390 total) UNCHANGED
 *   - Sector and Provider Sector values UNCHANGED
 *   - Root value UNCHANGED
 *   - Idempotent: detects existing children and skips
 *
 * Name matching strategy:
 *   1. Exact match on name field
 *   2. Normalized match (uppercase, strip "NHS", "Foundation Trust", "Trust",
 *      "&", apostrophes, normalize whitespace)
 *
 * Usage: node scripts/inject_nhs_trust_detail.js [--dry-run] [--year 2024]
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const UK_DIR = path.join(DATA_DIR, 'uk');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const YEAR = args.find(a => a.match(/^\d{4}$/)) || '2024';

// ─── Helpers ──────────────────────────────────────────

function readJSON(fp) { return JSON.parse(fs.readFileSync(fp, 'utf8')); }

function writeJSON(fp, data) {
  if (DRY_RUN) { console.log(`  [DRY RUN] Would write ${fp}`); return; }
  fs.writeFileSync(fp, JSON.stringify(data, null, 2), 'utf8');
}

function backup(fp) {
  if (!fs.existsSync(fp) || DRY_RUN) return;
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const stamp = new Date().toISOString().slice(0, 10);
  const dest = path.join(BACKUP_DIR, path.basename(fp).replace('.json', `.pre_v13_${stamp}.json`));
  if (!fs.existsSync(dest)) {
    fs.copyFileSync(fp, dest);
    console.log(`  Backed up → ${path.relative(DATA_DIR, dest)}`);
  }
}

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function normalizeName(name) {
  return String(name)
    .toUpperCase()
    .replace(/['\u2019\u2018\u02bc`]/g, '')   // strip all apostrophe variants
    .replace(/&/g, 'AND')                      // & → AND
    .replace(/\s+NHS\s+/g, ' ')                // strip NHS
    .replace(/\s+FOUNDATION\s+TRUST$/g, '')
    .replace(/\s+TRUST$/g, '')
    .replace(/\s+FT$/g, '')
    .replace(/[^A-Z0-9]+/g, ' ')               // collapse non-alphanum to space
    .trim();
}

// ─── Main ─────────────────────────────────────────────

console.log('NHS Trust Detail Injection');
console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
console.log(`Year: ${YEAR}\n`);

const treePath = path.join(UK_DIR, `uk_budget_tree_${YEAR}.json`);
const breakdownPath = path.join(UK_DIR, `nhs_trust_breakdown_${YEAR}.json`);

const tree = readJSON(treePath);
const breakdown = readJSON(breakdownPath);

// Build normalized lookup
const breakdownByName = breakdown;
const breakdownByNormalized = {};
for (const [name, data] of Object.entries(breakdown)) {
  breakdownByNormalized[normalizeName(name)] = { name, data };
}
console.log(`Loaded ${Object.keys(breakdown).length} trust breakdowns\n`);

const nhsRoot = tree.children.find(c => c.id === 'nhs_provider_sector');
if (!nhsRoot) { console.error('nhs_provider_sector not found'); process.exit(1); }

// Walk all sectors → trusts and inject detail
let matched = 0;
let unmatched = [];
let alreadyInjected = 0;
let totalTrusts = 0;

for (const sector of nhsRoot.children) {
  for (const trust of sector.children) {
    totalTrusts++;

    // Idempotency: skip if already has _source field starting with "NHS TAC"
    if (trust._source && String(trust._source).startsWith('NHS TAC')) {
      alreadyInjected++;
      continue;
    }

    // Try exact name match first
    let bd = breakdownByName[trust.name];
    if (!bd) {
      // Try normalized
      const norm = normalizeName(trust.name);
      const hit = breakdownByNormalized[norm];
      if (hit) bd = hit.data;
    }

    if (!bd) {
      unmatched.push({ sector: sector.name, name: trust.name, value: trust.value });
      trust._note = 'Breakdown unavailable';
      continue;
    }

    // Sanity check: trust value should match breakdown total
    if (Math.abs(trust.value - bd.total) > 1) {
      console.warn(`  WARN: ${trust.name} value mismatch — tree £${(trust.value/1e6).toFixed(2)}M vs breakdown £${(bd.total/1e6).toFixed(2)}M`);
    }

    // Build the 4 children. Use breakdown total as truth.
    const baseId = trust.id;
    const children = [
      { id: baseId + '__staff', name: 'Staff Costs', value: bd.staff_costs },
      { id: baseId + '__supplies', name: 'Clinical Supplies & Drugs', value: bd.supplies },
      { id: baseId + '__premises', name: 'Premises & Infrastructure', value: bd.premises },
      { id: baseId + '__other', name: 'Other Operating Costs', value: bd.other }
    ].filter(c => c.value > 0);

    // Verify reconciliation
    const childSum = children.reduce((s, c) => s + c.value, 0);
    if (childSum !== trust.value) {
      const drift = trust.value - childSum;
      // Push drift into the largest child (always staff for NHS trusts)
      const largest = children.reduce((max, c) => c.value > max.value ? c : max);
      largest.value += drift;
    }

    // Sort children desc
    children.sort((a, b) => b.value - a.value);

    // Inject children + metadata
    trust.children = children;
    // FY label: tree year 2024 = fiscal 2023/24
    const fyEnd = parseInt(YEAR);
    const fyStart = fyEnd - 1;
    trust._source = `NHS TAC ${fyStart}/${String(fyEnd).slice(2)}`;
    trust._sector = bd.sector;
    if (bd.icb_code && bd.icb_name) {
      trust._icb = {
        code: bd.icb_code,
        name: bd.icb_name
      };
    } else {
      trust._icb = null;
    }
    if (bd.region) trust._region = bd.region;

    matched++;
  }
}

console.log(`Total trust leaves: ${totalTrusts}`);
console.log(`  Matched + injected: ${matched}`);
console.log(`  Already injected (skipped): ${alreadyInjected}`);
console.log(`  Unmatched: ${unmatched.length}`);
if (unmatched.length > 0) {
  console.log('\nUnmatched trusts (first 10):');
  unmatched.slice(0, 10).forEach(u => {
    console.log(`  [${u.sector}] ${u.name} £${(u.value/1e6).toFixed(2)}M`);
  });
}

// Final tree integrity check
function verifyTree(node, depth = 0) {
  if (node.children && node.children.length > 0) {
    const sum = node.children.reduce((s, c) => s + (c.value || 0), 0);
    if (Math.abs(sum - node.value) > 1) {
      console.error(`  TREE INTEGRITY ERROR: ${node.name} value=${node.value} but children sum=${sum} (drift=${node.value - sum})`);
      return false;
    }
    return node.children.every(c => verifyTree(c, depth + 1));
  }
  return true;
}

console.log('\nTree integrity check:');
const ok = verifyTree(nhsRoot);
console.log(`  NHS Provider Sector subtree: ${ok ? '✓ all parent values match children sums' : '✗ FAILED'}`);

// Spot check Barts
const acuteSector = nhsRoot.children.find(s => s.name.includes('Acute'));
const barts = (acuteSector?.children || []).find(t => t.name.includes('Barts'));
if (barts) {
  console.log('\nBarts Health spot check:');
  console.log(`  Total: £${(barts.value/1e9).toFixed(2)}B`);
  console.log(`  Sector: ${barts._sector}`);
  console.log(`  ICB: ${barts._icb?.name || 'none'}`);
  console.log(`  Children:`);
  (barts.children || []).forEach(c => {
    const pct = (c.value / barts.value * 100).toFixed(0);
    console.log(`    ${c.name.padEnd(30)} £${(c.value/1e6).toFixed(0)}M  (${pct}%)`);
  });
}

backup(treePath);
writeJSON(treePath, tree);
console.log(`\n${DRY_RUN ? '[DRY RUN]' : '✓'} Written to ${path.basename(treePath)}`);
