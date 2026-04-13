#!/usr/bin/env node
/**
 * inject_population.js
 *
 * Attaches ONS mid-year population estimates to UK council nodes in the
 * tree. Uses a pre-built name→GSS lookup to resolve tree council names
 * to ONS GSS codes, then looks up population from the ONS extract.
 *
 * What gets population:
 *   - 19 real council nodes (Shire Counties, Unitary Authorities,
 *     Metropolitan Districts, London Boroughs) whose children have
 *     _top_suppliers metadata
 *
 * What does NOT get population (by design):
 *   - Police and Crime Commissioner entities (E23xxx)
 *   - Combined Fire and Rescue Authority entities (E31xxx)
 *   These are service areas, not geographic local authorities, and are
 *   not in the ONS LA population file. The lens system in a future
 *   session will render these as "no data" when per-capita is active.
 *
 * Tree value preservation: this script adds METADATA only. It does NOT
 * modify any existing `value` field. The tree integrity walker must
 * still report exactly 25 pre-existing drifts after running.
 *
 * Idempotency: skips nodes that already have `population` unless --force
 * is passed.
 *
 * Usage: node scripts/inject_population.js [--force] [--year 2024]
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const FORCE = args.includes('--force');
const YEAR = args.find(a => a.match(/^\d{4}$/)) || '2024';

const REPO = path.join(__dirname, '..');
const TREE_PATH = path.join(REPO, 'data', 'uk', `uk_budget_tree_${YEAR}.json`);
const POP_PATH = path.join(REPO, 'data', 'uk', 'ons', 'gss_population_mid2023.json');
const GSS_LOOKUP_PATH = path.join(REPO, 'data', 'uk', 'ons', 'gss_name_lookup.json');

function main() {
  const tree = JSON.parse(fs.readFileSync(TREE_PATH, 'utf8'));
  const popData = JSON.parse(fs.readFileSync(POP_PATH, 'utf8'));
  const gssLookup = JSON.parse(fs.readFileSync(GSS_LOOKUP_PATH, 'utf8'));

  const populations = popData.populations;         // { gssCode: {name, population} }
  const nameToGss = gssLookup.name_to_gss;         // { treeName: gssCode }

  // Identify council nodes: parents of nodes with _top_suppliers metadata.
  // Walk the tree tracking parent, collect unique parent names, skip the
  // tree root itself (which gets _top_suppliers bubbled up from DHSC L5).
  const councilNodes = new Map();  // name → node reference
  function walk(n, parent) {
    if (n._top_suppliers && parent && parent.name !== tree.name) {
      if (!councilNodes.has(parent.name)) {
        councilNodes.set(parent.name, parent);
      }
    }
    (n.children || []).forEach(c => walk(c, n));
  }
  walk(tree, null);

  console.log(`Council nodes found: ${councilNodes.size}`);

  let attached = 0;
  let skippedExisting = 0;
  let skippedSpillover = 0;
  const attachedList = [];
  const skippedList = [];
  const unmatched = [];

  for (const [name, node] of councilNodes) {
    // Idempotency check
    if (node.population !== undefined && !FORCE) {
      skippedExisting++;
      attachedList.push({name, population: node.population, status: 'existing'});
      continue;
    }

    // Resolve to GSS code
    const gss = nameToGss[name];
    if (!gss) {
      unmatched.push({name, reason: 'no GSS code in name lookup'});
      continue;
    }

    // Look up population (may be absent for police/fire)
    const popEntry = populations[gss];
    if (!popEntry) {
      // This is expected for E23xxx (police) and E31xxx (fire) —
      // they're not in the ONS LA file by design
      skippedSpillover++;
      skippedList.push({name, gss, reason: gss.startsWith('E23') ? 'police entity (not an LA)'
                                        : gss.startsWith('E31') ? 'fire entity (not an LA)'
                                        : 'not in ONS LA file'});
      continue;
    }

    // Attach population
    node.population = popEntry.population;
    attached++;
    attachedList.push({name, gss, population: popEntry.population, status: 'attached'});
  }

  // Add tree-root _population_meta (always overwrite this — it's derived metadata)
  tree._population_meta = popData._meta;

  // Write back with 2-space indent (matching existing convention)
  fs.writeFileSync(TREE_PATH, JSON.stringify(tree, null, 2));

  // Summary
  console.log();
  console.log(`Councils with population attached this run: ${attached}`);
  console.log(`Councils already had population (skipped): ${skippedExisting}`);
  console.log(`Spillover entities skipped (police/fire): ${skippedSpillover}`);
  console.log(`Unmatched councils: ${unmatched.length}`);
  console.log();

  if (attachedList.length > 0) {
    console.log('=== Councils WITH population ===');
    attachedList.forEach(c => {
      const popStr = c.population.toLocaleString();
      console.log(`  ${c.name.padEnd(50)} ${popStr.padStart(12)} ${c.status}`);
    });
  }

  if (skippedList.length > 0) {
    console.log();
    console.log('=== Councils WITHOUT population (by design) ===');
    skippedList.forEach(c => {
      console.log(`  ${c.name.padEnd(55)} (${c.reason})`);
    });
  }

  if (unmatched.length > 0) {
    console.log();
    console.log('=== UNMATCHED (this is a problem) ===');
    unmatched.forEach(c => console.log(`  ${c.name}: ${c.reason}`));
    process.exit(1);
  }

  console.log();
  console.log(`_population_meta written to tree root:`);
  console.log(`  source: ${tree._population_meta.source}`);
  console.log(`  edition: ${tree._population_meta.edition}`);
  console.log(`  sheet_used: ${tree._population_meta.sheet_used}`);
  console.log(`  column_used: ${tree._population_meta.column_used}`);
  console.log();
  console.log(`✓ Written: data/uk/uk_budget_tree_${YEAR}.json`);
}

main();
