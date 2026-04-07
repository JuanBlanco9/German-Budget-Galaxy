#!/usr/bin/env node
/**
 * integrate_all_branches.js
 *
 * Merges all new data branches into the existing country budget trees.
 *
 * For Germany: Adds Sozialversicherung (5 sub-branches), Länder, Kommunen
 *   to the existing Bundeshaushalt trees.
 * For UK: Adds Local Authorities to the existing OSCAR trees.
 * For France: Adds Sécurité Sociale (when available) to existing PLF trees.
 *
 * Output: Overwrites the existing tree files with the expanded versions.
 *         Backs up originals to data/backups/ first.
 *
 * Usage: node scripts/integrate_all_branches.js [--dry-run] [--country de|uk|fr|all]
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const COUNTRY = (args.find(a => a !== '--dry-run') || 'all').replace('--country=', '').replace('--country', '');

// ─── Helpers ──────────────────────────────────────────

function readJSON(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJSON(filePath, data) {
  if (DRY_RUN) {
    console.log(`  [DRY RUN] Would write ${filePath}`);
    return;
  }
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function backup(filePath) {
  if (!fs.existsSync(filePath) || DRY_RUN) return;
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const dest = path.join(BACKUP_DIR, path.basename(filePath));
  if (!fs.existsSync(dest)) { // don't overwrite existing backup
    fs.copyFileSync(filePath, dest);
    console.log(`  Backed up → ${path.relative(DATA_DIR, dest)}`);
  }
}

function sortChildrenDesc(node) {
  if (node.children && node.children.length > 0) {
    node.children.sort((a, b) => b.value - a.value);
    node.children.forEach(sortChildrenDesc);
  }
  return node;
}

function sumChildren(children) {
  return children.reduce((s, c) => s + (c.value || 0), 0);
}

// ─── Load Limitations ─────────────────────────────────

const LIMITATIONS = readJSON(path.join(DATA_DIR, 'de', 'DATA_LIMITATIONS.json')) || {};

function getDisclaimer(key) {
  if (LIMITATIONS[key] && LIMITATIONS[key].note_en) {
    return LIMITATIONS[key].note_en;
  }
  return null;
}

// ─── Germany Integration ──────────────────────────────

function integrateGermany() {
  console.log('\n═══ GERMANY ═══');

  // Load all data sources
  const svBranches = readJSON(path.join(DATA_DIR, 'de', 'sozialversicherung', 'sv_branches.json'));
  const renteData = readJSON(path.join(DATA_DIR, 'de', 'sozialversicherung', 'rente_data.json'));
  const baData = readJSON(path.join(DATA_DIR, 'de', 'sozialversicherung', 'ba_data.json'));
  const dguvData = readJSON(path.join(DATA_DIR, 'de', 'sozialversicherung', 'dguv_data.json'));
  const gkvParsed = readJSON(path.join(DATA_DIR, 'de', 'sozialversicherung', 'gkv_parsed.json'));
  const pflegeParsed = readJSON(path.join(DATA_DIR, 'de', 'sozialversicherung', 'pflege_parsed.json'));

  // Find all bundeshaushalt tree years
  const treeFiles = fs.readdirSync(DATA_DIR)
    .filter(f => f.match(/^bundeshaushalt_tree_\d+\.json$/));

  for (const treeFile of treeFiles) {
    const year = treeFile.match(/(\d+)/)[1];
    const treePath = path.join(DATA_DIR, treeFile);
    console.log(`\n── ${year} ──`);

    // Backup original
    backup(treePath);

    const tree = readJSON(treePath);
    if (!tree) { console.log(`  SKIP: no tree file`); continue; }

    // Check if already integrated (has Sozialversicherung branch)
    const existingSV = tree.children.find(c => c.id === 'sv');
    if (existingSV) {
      console.log(`  SKIP: already integrated (has Sozialversicherung branch)`);
      continue;
    }

    const newBranches = [];

    // ── 1. Build Sozialversicherung branch ──
    const svChildren = [];

    // GKV + Pflege from sv_branches
    if (svBranches && svBranches[year]) {
      const svYear = svBranches[year];
      if (svYear.children) {
        svYear.children.forEach(c => svChildren.push({ ...c }));
      }
    }

    // Rente
    if (renteData && renteData[year]) {
      svChildren.push({ ...renteData[year] });
    }

    // BA
    if (baData && baData[year]) {
      svChildren.push({ ...baData[year] });
    }

    // DGUV
    if (dguvData && dguvData[year]) {
      svChildren.push({ ...dguvData[year] });
    }

    if (svChildren.length > 0) {
      // Clean metadata fields from children
      svChildren.forEach(c => {
        delete c._revenue;
        delete c._note;
        delete c._detail;
        if (c.children) c.children.forEach(gc => {
          delete gc._detail;
          delete gc._note;
        });
      });

      const svBranch = {
        id: 'sv',
        name: 'Sozialversicherung (Social Insurance)',
        value: sumChildren(svChildren),
        children: svChildren.sort((a, b) => b.value - a.value)
      };

      // Add disclaimer about which sub-branches are available
      const availableBranches = svChildren.map(c => c.name.split('(')[0].trim());
      if (availableBranches.length < 5) {
        svBranch._disclaimer = `Data available for ${year}: ${availableBranches.join(', ')}. Some branches may not have data for this year.`;
      }

      newBranches.push(svBranch);
      console.log(`  + Sozialversicherung: ${(svBranch.value / 1e9).toFixed(1)} Mrd EUR (${svChildren.length} sub-branches)`);
    }

    // ── 2. Länder branch ──
    // Try detailed first, then Eurostat fallback, then Kassenergebnis
    let laenderTree = readJSON(path.join(DATA_DIR, 'de', 'laender', `laender_parsed_${year}.json`));
    let laenderSource = 'Destatis';

    if (!laenderTree) {
      laenderTree = readJSON(path.join(DATA_DIR, 'de', 'laender', `laender_eurostat_${year}.json`));
      laenderSource = 'Eurostat COFOG';
    }

    if (laenderTree && laenderTree.children && laenderTree.children.length > 0) {
      const laenderBranch = {
        id: 'laender',
        name: 'Länder (Federal States)',
        value: laenderTree.value,
        children: laenderTree.children
      };

      // Add disclaimer for limited data years
      if (year === '2024') {
        laenderBranch._disclaimer = getDisclaimer('laender_2024');
      } else if (year === '2025') {
        laenderBranch._disclaimer = getDisclaimer('laender_2025');
      } else if (year === '2022') {
        laenderBranch._disclaimer = getDisclaimer('laender_2022');
      } else if (year === '2023') {
        laenderBranch._disclaimer = getDisclaimer('laender_2023');
      } else if (laenderSource === 'Eurostat COFOG') {
        laenderBranch._disclaimer = 'National aggregate by COFOG function (Eurostat). Per-state breakdown available for 2019-2021.';
      }

      sortChildrenDesc(laenderBranch);
      newBranches.push(laenderBranch);
      console.log(`  + Länder: ${(laenderBranch.value / 1e9).toFixed(1)} Mrd EUR (${laenderBranch.children.length} children, source: ${laenderSource})`);
    }

    // ── 3. Kommunen branch ──
    let kommunenTree = readJSON(path.join(DATA_DIR, 'de', 'laender', `kommunen_parsed_${year}.json`));

    if (kommunenTree && kommunenTree.value > 0) {
      const kommunenBranch = {
        id: 'kommunen',
        name: 'Kommunen (Municipalities)',
        value: kommunenTree.value,
        children: kommunenTree.children || []
      };

      if (year === '2025') {
        kommunenBranch._disclaimer = getDisclaimer('kommunen_2025');
      }

      sortChildrenDesc(kommunenBranch);
      newBranches.push(kommunenBranch);
      console.log(`  + Kommunen: ${(kommunenBranch.value / 1e9).toFixed(1)} Mrd EUR (${(kommunenBranch.children || []).length} children)`);
    }

    // ── Add new branches to tree ──
    if (newBranches.length > 0) {
      tree.children.push(...newBranches);

      // Update root value to include new branches
      const oldValue = tree.value;
      tree.value = sumChildren(tree.children);

      // Update root name to reflect expanded scope
      if (!tree.name.includes('Public Spending')) {
        tree.name = `Germany Public Spending ${year}`;
      }

      // Sort all children by value descending
      sortChildrenDesc(tree);

      console.log(`  Root: ${(oldValue / 1e9).toFixed(1)} → ${(tree.value / 1e9).toFixed(1)} Mrd EUR (+${newBranches.length} branches)`);

      writeJSON(treePath, tree);
      console.log(`  ✓ Written`);
    } else {
      console.log(`  No new branches to add for ${year}`);
    }
  }
}

// ─── UK Integration ───────────────────────────────────

function integrateUK() {
  console.log('\n═══ UK ═══');

  const ukDir = path.join(DATA_DIR, 'uk');
  const laDir = path.join(ukDir, 'local_authorities');

  // Map fiscal years to calendar years (2024-25 → 2024 in UK tree naming)
  // UK LA trees use ending year: uk_la_tree_2025.json = fiscal 2024-25
  // UK OSCAR trees use: uk_budget_tree_2024.json = fiscal 2024-25
  // So LA 2025 matches OSCAR 2024... need to check

  const oscarFiles = fs.readdirSync(ukDir)
    .filter(f => f.match(/^uk_budget_tree_\d+\.json$/));

  for (const oscarFile of oscarFiles) {
    const year = oscarFile.match(/(\d+)/)[1];
    const yearInt = parseInt(year);
    const treePath = path.join(ukDir, oscarFile);
    console.log(`\n── UK ${year} ──`);

    backup(treePath);

    const tree = readJSON(treePath);
    if (!tree) { console.log(`  SKIP: no tree`); continue; }

    // Check if already integrated
    if (tree.children.find(c => c.id === 'uk_la')) {
      console.log(`  SKIP: already integrated`);
      continue;
    }

    // LA tree uses ending fiscal year, so try matching:
    // OSCAR 2024 = fiscal 2024-25 = LA tree 2025
    // OSCAR 2023 = fiscal 2023-24 = LA tree 2024
    // OSCAR 2022 = fiscal 2022-23 = LA tree 2023
    const laYear = yearInt + 1;
    const laTree = readJSON(path.join(laDir, `uk_la_tree_${laYear}.json`));

    if (!laTree) {
      // Also try same year
      const laTreeSame = readJSON(path.join(laDir, `uk_la_tree_${year}.json`));
      if (laTreeSame) {
        console.log(`  Note: Using LA year ${year} (may not match fiscal year exactly)`);
      } else {
        console.log(`  SKIP: no LA data for year ${laYear} or ${year}`);
        continue;
      }
    }

    const laData = laTree || readJSON(path.join(laDir, `uk_la_tree_${year}.json`));
    if (!laData) continue;

    const laBranch = {
      id: 'uk_la',
      name: 'Local Authorities (England)',
      value: laData.value,
      children: laData.children || [],
      _disclaimer: 'Covers England only. Scotland, Wales, and Northern Ireland have separate devolved administrations.'
    };

    sortChildrenDesc(laBranch);
    tree.children.push(laBranch);

    const oldValue = tree.value;
    tree.value = sumChildren(tree.children);

    if (!tree.name.includes('Public Spending')) {
      tree.name = `UK Public Spending ${year}`;
    }

    sortChildrenDesc(tree);

    console.log(`  + Local Authorities: ${(laBranch.value / 1e9).toFixed(1)} B GBP (${laBranch.children.length} services)`);
    console.log(`  Root: ${(oldValue / 1e9).toFixed(1)} → ${(tree.value / 1e9).toFixed(1)} B GBP`);

    writeJSON(treePath, tree);
    console.log(`  ✓ Written`);
  }
}

// ─── France Integration ───────────────────────────────

function integrateFrance() {
  console.log('\n═══ FRANCE ═══');

  const frDir = path.join(DATA_DIR, 'fr');
  const plfssDir = path.join(frDir, 'securite_sociale');

  if (!fs.existsSync(plfssDir)) {
    console.log('  No Sécurité Sociale data directory found. Skipping France integration.');
    console.log('  (Will be integrated when PLFSS agent completes)');
    return;
  }

  const plfssFiles = fs.readdirSync(plfssDir)
    .filter(f => f.match(/^fr_ss_tree_\d+\.json$/));

  if (plfssFiles.length === 0) {
    console.log('  No PLFSS tree files found. Skipping.');
    return;
  }

  const frTreeFiles = fs.readdirSync(frDir)
    .filter(f => f.match(/^fr_budget_tree_\d+\.json$/));

  for (const frFile of frTreeFiles) {
    const year = frFile.match(/(\d+)/)[1];
    const treePath = path.join(frDir, frFile);
    console.log(`\n── FR ${year} ──`);

    backup(treePath);

    const tree = readJSON(treePath);
    if (!tree) continue;

    if (tree.children.find(c => c.id === 'fr_ss')) {
      console.log(`  SKIP: already integrated`);
      continue;
    }

    const ssTree = readJSON(path.join(plfssDir, `fr_ss_tree_${year}.json`));
    if (!ssTree) {
      console.log(`  SKIP: no SS data for ${year}`);
      continue;
    }

    const ssBranch = {
      id: 'fr_ss',
      name: 'Sécurité Sociale (Social Security)',
      value: ssTree.value,
      children: ssTree.children || []
    };

    sortChildrenDesc(ssBranch);
    tree.children.push(ssBranch);

    const oldValue = tree.value;
    tree.value = sumChildren(tree.children);

    if (!tree.name.includes('Public Spending')) {
      tree.name = `France Public Spending ${year}`;
    }

    sortChildrenDesc(tree);

    console.log(`  + Sécurité Sociale: ${(ssBranch.value / 1e9).toFixed(1)} Mrd EUR`);
    console.log(`  Root: ${(oldValue / 1e9).toFixed(1)} → ${(tree.value / 1e9).toFixed(1)} Mrd EUR`);

    writeJSON(treePath, tree);
    console.log(`  ✓ Written`);
  }
}

// ─── Main ─────────────────────────────────────────────

console.log(`Budget Galaxy — Branch Integration Script`);
console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
console.log(`Country: ${COUNTRY}`);

if (COUNTRY === 'all' || COUNTRY === 'de') integrateGermany();
if (COUNTRY === 'all' || COUNTRY === 'uk') integrateUK();
if (COUNTRY === 'all' || COUNTRY === 'fr') integrateFrance();

console.log('\n═══ DONE ═══');

// Summary
if (!DRY_RUN) {
  console.log('\nNext steps:');
  console.log('1. Run locally: uvicorn api.main:app --reload --port 8088');
  console.log('2. Test: http://localhost:8088/app?country=de');
  console.log('3. Verify new branches appear in Galaxy view');
  console.log('4. Check enrichment loads for new nodes');
  console.log('5. Deploy: upload updated tree files to server');
}
