#!/usr/bin/env node
/**
 * inject_nhs_trusts.js
 *
 * Parses NHS TAC data (Trusts + Foundation Trusts) and injects an
 * "NHS Provider Sector" top-level node into the UK budget tree.
 *
 * Source: NHS England Trust Accounts Consolidation (TAC) 2023/24
 * Files:  data/uk/nhs_tac_trusts_2024.xlsx (66 trusts)
 *         data/uk/nhs_tac_ft_2024.xlsx (143 foundation trusts)
 *
 * CRITICAL: Injected as a NEW top-level sibling of existing departments,
 *           NEVER as a child of DHSC (would create ~£130B double-counting).
 *
 * Usage: node scripts/inject_nhs_trusts.js [--dry-run]
 */

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const DATA_DIR = path.join(__dirname, '..', 'data');
const UK_DIR = path.join(DATA_DIR, 'uk');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const YEAR = args.find(a => a.match(/^\d{4}$/)) || '2024';

// ─── Helpers ──────────────────────────────────────────

function readJSON(fp) {
  if (!fs.existsSync(fp)) return null;
  return JSON.parse(fs.readFileSync(fp, 'utf8'));
}

function writeJSON(fp, data) {
  if (DRY_RUN) { console.log(`  [DRY RUN] Would write ${fp}`); return; }
  fs.writeFileSync(fp, JSON.stringify(data, null, 2), 'utf8');
}

function backup(fp) {
  if (!fs.existsSync(fp) || DRY_RUN) return;
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const dest = path.join(BACKUP_DIR, path.basename(fp));
  if (!fs.existsSync(dest)) {
    fs.copyFileSync(fp, dest);
    console.log(`  Backed up → ${path.relative(DATA_DIR, dest)}`);
  }
}

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function sumChildren(children) {
  return children.reduce((s, c) => s + (c.value || 0), 0);
}

function sortChildrenDesc(node) {
  if (node.children && node.children.length > 0) {
    node.children.sort((a, b) => b.value - a.value);
    node.children.forEach(sortChildrenDesc);
  }
  return node;
}

// ─── Parse TAC xlsx ───────────────────────────────────
//
// TAC files have inconsistent capitalization across years and even across
// the trusts/FT files within the same year:
//   - Sheet name: "All data" or "All Data"
//   - Column headers may or may not have surrounding spaces
//   - " Total " (with spaces) vs "Total"
//   - " OrganisationName " vs "OrganisationName", etc.
//
// normalizeRow strips whitespace from all keys so callers can use clean names.

function normalizeRow(row) {
  const out = {};
  for (const k of Object.keys(row)) out[k.trim()] = row[k];
  return out;
}

function findSheet(wb, targetLower) {
  return wb.SheetNames.find(n => n.toLowerCase() === targetLower);
}

// Normalize trust names for fuzzy matching across files with capitalization
// and unicode apostrophe variants. Same logic as inject_nhs_trust_detail.js.
function normalizeName(name) {
  return String(name)
    .toUpperCase()
    // Strip all apostrophe variants: straight, curly left/right, modifier letter, backtick
    .replace(/['\u2019\u2018\u02bc`]/g, '')
    .replace(/&/g, 'AND')
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim();
}

// Token set for subset matching, with common stopwords removed.
// Used when normalizeName fails (typically due to trust renames adding words
// like "Teaching" or "University" between fiscal years).
const TRUST_STOPWORDS = new Set(['NHS', 'TRUST', 'FOUNDATION', 'FT', 'THE']);
function tokenSet(name) {
  return new Set(normalizeName(name).split(' ').filter(t => t && !TRUST_STOPWORDS.has(t)));
}
function isSubsetMatch(expTokens, provTokens) {
  // Provider tokens must all be in EXP set, AND at least 2 distinctive tokens
  if (provTokens.size < 2) return false;
  for (const t of provTokens) if (!expTokens.has(t)) return false;
  return true;
}

function parseTACFile(filePath) {
  console.log(`  Parsing ${path.basename(filePath)}...`);
  const wb = XLSX.readFile(filePath);

  // 1. Read "List of Providers" for classification
  const provSheetName = findSheet(wb, 'list of providers');
  const provRows = XLSX.utils.sheet_to_json(wb.Sheets[provSheetName]).map(normalizeRow);
  const classMap = {};
  const classMapNorm = {};
  const classMapTokens = []; // [{tokens, entry}]
  for (const row of provRows) {
    const name = row['Full name of Provider'] || '';
    const sector = row['Sector'] || '';
    const region = row['Region'] || '';
    if (name && sector) {
      const cleanName = String(name).trim();
      const entry = { sector: String(sector).trim(), region: String(region).trim() };
      classMap[cleanName] = entry;
      classMapNorm[normalizeName(cleanName)] = entry;
      classMapTokens.push({ tokens: tokenSet(cleanName), entry, originalName: cleanName });
    }
  }

  // 2. Read "All data" for expenditure (case-insensitive sheet match)
  const dataSheetName = findSheet(wb, 'all data');
  if (!dataSheetName) throw new Error(`No 'All data' sheet in ${filePath}`);
  const dataRows = XLSX.utils.sheet_to_json(wb.Sheets[dataSheetName]).map(normalizeRow);

  // Filter: SubCode=EXP0390 (total operating expenditure), MainCode contains 'CY'
  const trusts = [];
  let fuzzyMatched = 0;
  let subsetMatched = 0;
  for (const row of dataRows) {
    if (row.SubCode === 'EXP0390' && row.MainCode && String(row.MainCode).includes('CY')) {
      const name = String(row.OrganisationName || '').trim();
      const valueThousands = parseFloat(row.Total) || 0;
      const valueFull = valueThousands * 1000;
      let classification = classMap[name];
      if (!classification) {
        classification = classMapNorm[normalizeName(name)];
        if (classification) fuzzyMatched++;
      }
      if (!classification) {
        // Subset match: provider tokens ⊆ EXP tokens (handles renames that ADD words)
        const expTokens = tokenSet(name);
        for (const candidate of classMapTokens) {
          if (isSubsetMatch(expTokens, candidate.tokens)) {
            classification = candidate.entry;
            subsetMatched++;
            break;
          }
        }
      }
      classification = classification || {};
      trusts.push({
        name,
        value: valueFull,
        sector: classification.sector || 'Unknown',
        region: classification.region || 'Unknown'
      });
    }
  }

  const matchInfo = [];
  if (fuzzyMatched > 0) matchInfo.push(`${fuzzyMatched} normalized`);
  if (subsetMatched > 0) matchInfo.push(`${subsetMatched} token-subset`);
  console.log(`    Found ${trusts.length} trusts (EXP0390 CY)${matchInfo.length ? ` [${matchInfo.join(', ')}]` : ''}`);
  console.log(`    Classified: ${Object.keys(classMap).length} entries in List of Providers`);
  return trusts;
}

// ─── Build tree ───────────────────────────────────────

function buildNHSTree(allTrusts) {
  // Group by sector
  const bySector = {};
  for (const t of allTrusts) {
    if (!bySector[t.sector]) bySector[t.sector] = [];
    bySector[t.sector].push(t);
  }

  const sectorChildren = [];
  for (const [sector, trusts] of Object.entries(bySector)) {
    const trustNodes = trusts
      .filter(t => t.value > 0)
      .map(t => ({
        id: slugify(t.name),
        name: t.name,
        value: t.value
      }))
      .sort((a, b) => b.value - a.value);

    if (trustNodes.length === 0) continue;

    sectorChildren.push({
      id: 'nhs_' + slugify(sector),
      name: `NHS ${sector} Trusts`,
      value: sumChildren(trustNodes),
      children: trustNodes
    });
  }

  sectorChildren.sort((a, b) => b.value - a.value);

  const totalValue = sumChildren(sectorChildren);

  // Build year labels: tree year 2024 = fiscal 2023/24
  const fyEnd = parseInt(YEAR);
  const fyStart = fyEnd - 1;
  const fyLabel = `${fyStart}/${String(fyEnd).slice(2)}`;

  return {
    id: 'nhs_provider_sector',
    name: 'NHS Provider Sector',
    value: totalValue,
    children: sectorChildren,
    _disclaimer: `NHS Trust Accounts Consolidation (TAC) ${fyLabel}. Total operating expenditure (EXP0390). This is provider-side spending and overlaps significantly with DHSC commissioning budgets shown above.`,
    _source: `NHS England TAC ${fyLabel}`
  };
}

// ─── Main ─────────────────────────────────────────────

console.log('Budget Galaxy — NHS Provider Sector Injection');
console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
console.log(`Year: ${YEAR}\n`);

// Parse both TAC files
const trustsFile = path.join(UK_DIR, `nhs_tac_trusts_${YEAR}.xlsx`);
const ftFile = path.join(UK_DIR, `nhs_tac_ft_${YEAR}.xlsx`);

if (!fs.existsSync(trustsFile)) { console.error('Missing:', trustsFile); process.exit(1); }
if (!fs.existsSync(ftFile)) { console.error('Missing:', ftFile); process.exit(1); }

const trusts = parseTACFile(trustsFile);
const fts = parseTACFile(ftFile);
const allTrusts = [...trusts, ...fts];

console.log(`\n  Total: ${allTrusts.length} trusts/FTs`);
console.log(`  Total value: £${(sumChildren(allTrusts.map(t => ({ value: t.value }))) / 1e9).toFixed(1)}B`);

// Build the NHS tree node
const nhsBranch = buildNHSTree(allTrusts);
console.log(`\n  NHS Provider Sector: £${(nhsBranch.value / 1e9).toFixed(1)}B`);
nhsBranch.children.forEach(s => {
  console.log(`    ${s.name}: £${(s.value / 1e9).toFixed(1)}B (${s.children.length} trusts)`);
});

// Inject into UK tree
const treePath = path.join(UK_DIR, `uk_budget_tree_${YEAR}.json`);
const tree = readJSON(treePath);
if (!tree) { console.error('Missing UK tree:', treePath); process.exit(1); }

if (tree.children.find(c => c.id === 'nhs_provider_sector')) {
  console.log('\n  SKIP: nhs_provider_sector already exists in tree');
  process.exit(0);
}

backup(treePath);

tree.children.push(nhsBranch);
const oldValue = tree.value;
tree.value = sumChildren(tree.children);

if (!tree.name.includes('Public Spending')) {
  tree.name = `UK Public Spending ${YEAR}`;
}

sortChildrenDesc(tree);

console.log(`\n  Root: £${(oldValue / 1e9).toFixed(1)}B → £${(tree.value / 1e9).toFixed(1)}B`);

writeJSON(treePath, tree);
console.log(`  ${DRY_RUN ? '[DRY RUN]' : '✓'} Written to ${path.basename(treePath)}`);
