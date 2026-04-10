/**
 * deduce_intergovernmental_fr.js
 * Scans fr_budget_tree_{year}.json for PLF programs that overlap
 * with DREES Protection Sociale coverage.
 *
 * Overlapping programs:
 * 1. CAS Pensions (civil servant pensions) — also in DREES Vieillesse
 * 2. Solidarité, insertion et égalité des chances — also in DREES Pauvreté
 * 3. Travail et emploi — also in DREES Emploi
 * 4. Cohésion des territoires / Égalité des territoires — also in DREES Logement
 * 5. Régimes sociaux et de retraite — also in DREES Vieillesse
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data', 'fr');

// Patterns to match (case-insensitive). A node matches if its name includes the pattern.
// We only count nodes that are NOT part of the Sécurité Sociale branch (id starting with fr_ss).
const OVERLAP_PROGRAMS = [
  { key: 'cas_pensions', patterns: [], exactNames: ['pensions','pensions civiles','cas - pensions'], label: 'CAS Pensions (civil servant pensions)', drees: 'Vieillesse-Survie' },
  { key: 'solidarite_insertion', patterns: ['solidarit', 'insertion et egalite', 'insertion et égalité'], label: 'Solidarité, insertion et égalité des chances', drees: 'Pauvreté-Exclusion' },
  { key: 'travail_emploi', patterns: ['travail et emploi', 'travail, emploi'], label: 'Travail et emploi', drees: 'Emploi' },
  { key: 'cohesion_territoires', patterns: ['cohesion des territoires', 'cohésion des territoires', 'egalite des territoires', 'égalité des territoires'], label: 'Cohésion des territoires / APL', drees: 'Logement' },
  { key: 'regimes_speciaux', patterns: ['regimes sociaux', 'régimes sociaux'], label: 'Régimes sociaux et de retraite', drees: 'Vieillesse' },
];

function isSSBranch(node) {
  const id = (node.id || '').toLowerCase();
  return id.startsWith('fr_ss') || id === 'secu';
}

function findOverlaps(node, results, inSS) {
  if (isSSBranch(node)) inSS = true;

  if (!inSS) {
    const nameLower = (node.name || '').toLowerCase().trim();
    for (const prog of OVERLAP_PROGRAMS) {
      let matched = false;
      // Exact name match (for CAS Pensions — avoid false positives from sub-nodes)
      if (prog.exactNames) {
        matched = prog.exactNames.some(en => nameLower === en.toLowerCase());
      }
      // Substring match (for other programs)
      if (!matched && prog.patterns.length > 0) {
        matched = prog.patterns.some(pat => nameLower.includes(pat.toLowerCase()));
      }
      if (matched) {
        const value = node.value || 0;
        if (value > 0) {
          if (!results[prog.key]) results[prog.key] = { items: [], total: 0 };
          results[prog.key].items.push({ name: node.name, value });
          results[prog.key].total += value;
        }
        return;
      }
    }
  }

  if (node.children) {
    for (const child of node.children) {
      findOverlaps(child, results, inSS);
    }
  }
}

function findSSValue(node) {
  if (isSSBranch(node) && node.children) return node.value || 0;
  if (node.children) {
    for (const child of node.children) {
      const v = findSSValue(child);
      if (v > 0) return v;
    }
  }
  return 0;
}

const years = [];
for (let y = 2015; y <= 2025; y++) years.push(y);

for (const year of years) {
  const treePath = path.join(DATA_DIR, `fr_budget_tree_${year}.json`);
  if (!fs.existsSync(treePath)) { console.log(`${year}: no tree file`); continue; }

  const tree = JSON.parse(fs.readFileSync(treePath, 'utf8'));
  const results = {};
  findOverlaps(tree, results, false);

  const ssValue = findSSValue(tree);
  const rootValue = tree.value || 0;

  // Skip years without SS branch — no overlap possible
  if (ssValue === 0) {
    console.log(`${year}: no SS branch — skipping (PLF-only year)`);
    continue;
  }

  // Build output
  const output = { year };
  let totalOverlap = 0;

  for (const prog of OVERLAP_PROGRAMS) {
    const r = results[prog.key];
    const val = r ? r.total : 0;
    output[prog.key] = val;
    totalOverlap += val;
  }

  output.total_overlap = totalOverlap;
  output.pct_of_root = rootValue > 0 ? Math.round(totalOverlap / rootValue * 1000) / 10 : 0;
  output.root_value = rootValue;
  output.ss_branch_value = ssValue;
  output.plf_value = rootValue - ssValue;

  // Details
  output.details = {};
  for (const prog of OVERLAP_PROGRAMS) {
    const r = results[prog.key];
    output.details[prog.key] = {
      label: prog.label,
      drees_risk: prog.drees,
      items: r ? r.items : [],
      total: r ? r.total : 0
    };
  }

  output.note = 'PLF programs that overlap with DREES Protection Sociale coverage. CAS Pensions and Régimes sociaux are exact (full program is overlap). Solidarité, Travail, and Cohésion use PLF totals as ceiling — actual overlap may be lower.';
  output.source = 'PLF programme-level identification cross-referenced with DREES CPS risk categories';

  const outPath = path.join(DATA_DIR, `intergovernmental_fr_${year}.json`);
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));

  console.log(`${year}: €${(totalOverlap / 1e9).toFixed(1)}B overlap (${output.pct_of_root}% of €${(rootValue / 1e9).toFixed(0)}B) | SS: €${(ssValue / 1e9).toFixed(0)}B | PLF: €${((rootValue - ssValue) / 1e9).toFixed(0)}B`);
}
