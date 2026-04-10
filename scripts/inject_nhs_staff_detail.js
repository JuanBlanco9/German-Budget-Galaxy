#!/usr/bin/env node
/**
 * inject_nhs_staff_detail.js
 *
 * Injects cost-by-type breakdown as Level 7 children of each NHS trust's
 * "Staff Costs" leaf node, plus workforce composition metadata.
 *
 * Pre-conditions:
 *   - data/uk/uk_budget_tree_{year}.json has nhs_provider_sector with trusts
 *     that already have v13 4-category breakdown (Staff/Supplies/Premises/Other)
 *   - data/uk/nhs_staff_breakdown_{year}.json built by build_nhs_staff_breakdown.js
 *
 * Post-conditions:
 *   - Each "Staff Costs" leaf becomes a branch with 4-6 cost type children
 *     (Salaries, Pensions, Social sec, Agency, Termination, Other & adjustments)
 *   - Children sum exactly to parent value (already normalized in build script)
 *   - Each Staff Costs node also gains _workforce metadata (WTE by group)
 *     used by the frontend panel for the workforce composition view
 *   - Sector / trust / Provider Sector / Root values UNCHANGED
 *
 * Idempotency: skips if Staff Costs node already has children with _sta_codes
 *
 * Usage: node scripts/inject_nhs_staff_detail.js [--dry-run] [--year 2024]
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const UK_DIR = path.join(DATA_DIR, 'uk');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const YEAR = args.find(a => a.match(/^\d{4}$/)) || '2024';

function readJSON(fp) { return JSON.parse(fs.readFileSync(fp, 'utf8')); }

function writeJSON(fp, data) {
  if (DRY_RUN) { console.log(`  [DRY RUN] Would write ${fp}`); return; }
  fs.writeFileSync(fp, JSON.stringify(data, null, 2), 'utf8');
}

function backup(fp) {
  if (!fs.existsSync(fp) || DRY_RUN) return;
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const stamp = new Date().toISOString().slice(0, 10);
  const dest = path.join(BACKUP_DIR, path.basename(fp).replace('.json', `.pre_v16_${stamp}.json`));
  if (!fs.existsSync(dest)) {
    fs.copyFileSync(fp, dest);
    console.log(`  Backed up → ${path.relative(DATA_DIR, dest)}`);
  }
}

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function sortChildrenDesc(node) {
  if (node.children && node.children.length > 0) {
    node.children.sort((a, b) => (b.value || 0) - (a.value || 0));
    node.children.forEach(sortChildrenDesc);
  }
  return node;
}

// ─── Main ─────────────────────────────────────────────

console.log('NHS Staff Detail Injection (Level 7)');
console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
console.log(`Year: ${YEAR}\n`);

const treePath = path.join(UK_DIR, `uk_budget_tree_${YEAR}.json`);
const staffPath = path.join(UK_DIR, `nhs_staff_breakdown_${YEAR}.json`);

const tree = readJSON(treePath);
const staffData = readJSON(staffPath);
console.log(`Loaded ${Object.keys(staffData).length} staff breakdowns\n`);

const nhsRoot = tree.children.find(c => c.id === 'nhs_provider_sector');
if (!nhsRoot) { console.error('nhs_provider_sector not found'); process.exit(1); }

let matched = 0, unmatched = 0, alreadyInjected = 0, totalTrusts = 0;
const unmatchedNames = [];
let integrityIssues = 0;

for (const sector of nhsRoot.children) {
  for (const trust of sector.children) {
    totalTrusts++;

    // Find the Staff Costs child
    const staffNode = (trust.children || []).find(c => c.name === 'Staff Costs');
    if (!staffNode) {
      unmatched++;
      unmatchedNames.push({ trust: trust.name, reason: 'no Staff Costs node' });
      continue;
    }

    // Idempotency: skip if already has cost type children
    if (staffNode.children && staffNode.children.length > 0 && staffNode.children[0]._sta_codes) {
      alreadyInjected++;
      continue;
    }

    const sb = staffData[trust.name];
    if (!sb) {
      unmatched++;
      unmatchedNames.push({ trust: trust.name, reason: 'not in staff breakdown' });
      continue;
    }

    // Sanity check: tree parent value must match breakdown total
    if (Math.abs(staffNode.value - sb.total_staff_costs) > 1) {
      console.warn(`  WARN: ${trust.name} Staff Costs value mismatch — tree £${(staffNode.value/1e6).toFixed(2)}M vs breakdown £${(sb.total_staff_costs/1e6).toFixed(2)}M`);
    }

    // Build cost type children
    const baseId = staffNode.id;
    const children = sb.cost_groups.map(g => ({
      id: baseId + '__' + slugify(g.name),
      name: g.name,
      value: g.value,
      _sta_codes: g.sta_codes
    }));

    // Verify reconciliation
    const childSum = children.reduce((s, c) => s + c.value, 0);
    if (childSum !== staffNode.value) {
      const drift = staffNode.value - childSum;
      // Push drift into the largest child
      const largest = children.reduce((max, c) => c.value > max.value ? c : max);
      largest.value += drift;
    }

    // Sort children desc
    children.sort((a, b) => b.value - a.value);

    // Inject
    staffNode.children = children;
    staffNode._source = 'NHS TAC09 ' + (parseInt(YEAR) - 1) + '/' + String(YEAR).slice(2);
    staffNode._workforce = {
      total_wte: sb.workforce_total_wte,
      groups: sb.workforce_groups // [{name, fte, sta_code}]
    };

    matched++;
  }
}

console.log(`Total trust leaves: ${totalTrusts}`);
console.log(`  Matched + injected: ${matched}`);
console.log(`  Already injected (skipped): ${alreadyInjected}`);
console.log(`  Unmatched: ${unmatched}`);
if (unmatched > 0) {
  console.log('  First 5 unmatched:');
  unmatchedNames.slice(0, 5).forEach(u => console.log(`    ${u.trust} — ${u.reason}`));
}

// Tree integrity check
function verifyTree(node) {
  if (node.children && node.children.length > 0) {
    const sum = node.children.reduce((s, c) => s + (c.value || 0), 0);
    if (Math.abs(sum - node.value) > 0) {
      integrityIssues++;
      if (integrityIssues <= 3) console.error(`  TREE INTEGRITY: ${node.name} value=${node.value} sum=${sum} drift=${node.value - sum}`);
      return false;
    }
    return node.children.every(verifyTree);
  }
  return true;
}
console.log('\nTree integrity check (full tree):');
verifyTree(tree);
console.log(`  ${integrityIssues === 0 ? '✓ all parent values match children sums' : '✗ ' + integrityIssues + ' integrity issues'}`);

// Spot check
const acuteSector = nhsRoot.children.find(s => s.name.includes('Acute'));
const guys = (acuteSector?.children || []).find(t => /guy.*thomas/i.test(t.name));
if (guys) {
  const staff = (guys.children || []).find(c => c.name === 'Staff Costs');
  if (staff && staff.children) {
    console.log(`\nSpot check — ${guys.name} > Staff Costs:`);
    console.log(`  Total: £${(staff.value/1e9).toFixed(2)}B`);
    console.log(`  Workforce: ${staff._workforce?.total_wte?.toLocaleString() || '?'} WTE`);
    staff.children.forEach(c => {
      const pct = (c.value / staff.value * 100).toFixed(0);
      console.log(`    £${(c.value/1e6).toFixed(0).padStart(5)}M  ${pct.padStart(3)}%  ${c.name}`);
    });
    if (staff._workforce && staff._workforce.groups) {
      console.log(`  Top 3 workforce groups by WTE:`);
      staff._workforce.groups.slice(0, 3).forEach(w => {
        console.log(`    ${Math.round(w.fte).toString().padStart(6)} WTE  ${w.name}`);
      });
    }
  }
}

backup(treePath);
writeJSON(treePath, tree);
console.log(`\n${DRY_RUN ? '[DRY RUN]' : '✓'} Written to ${path.basename(treePath)}`);
