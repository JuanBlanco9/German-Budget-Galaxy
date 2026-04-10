/**
 * deduce_intergovernmental_uk.js
 * After restructure_uk_nations.js, the UK tree has:
 *   Central Government (contains all OSCAR depts including Scotland/Wales/NI Office)
 *   Scotland, Wales, Northern Ireland (devolved governments)
 *
 * Double-counting: Barnett block grants flow via Scotland/Wales/NI Office (in Central)
 * TO the devolved governments. The Office values are the grants.
 *
 * Also: MHCLG "Local Government" grants within Central overlap with LA (England) branch.
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data', 'uk');

function findInTree(node, testFn) {
  if (testFn(node)) return node;
  for (const c of (node.children || [])) {
    const found = findInTree(c, testFn);
    if (found) return found;
  }
  return null;
}

const years = [];
for (let y = 2015; y <= 2024; y++) years.push(y);

for (const year of years) {
  const treePath = path.join(DATA_DIR, `uk_budget_tree_${year}.json`);
  if (!fs.existsSync(treePath)) continue;
  const tree = JSON.parse(fs.readFileSync(treePath, 'utf8'));

  // Find Office nodes inside Central Government
  const scotOffice = findInTree(tree, n => (n.name || '').toLowerCase().includes('scotland office'));
  const walesOffice = findInTree(tree, n => (n.name || '').toLowerCase().includes('wales office'));
  const niOffice = findInTree(tree, n => (n.name || '').toLowerCase().includes('northern ireland office'));

  const scotGrant = scotOffice?.value || 0;
  const walesGrant = walesOffice?.value || 0;
  const niGrant = niOffice?.value || 0;
  const barnettTotal = scotGrant + walesGrant + niGrant;

  // Find MHCLG Local Government grants (inside Central)
  const mhclgLg = findInTree(tree, n => {
    const nm = (n.name || '').toLowerCase();
    return (nm.includes('mhclg local government') || nm.includes('dclg local government')) ||
      (nm === 'local government' && n.parent && (n.parent.name || '').toLowerCase().includes('housing'));
  });

  // Find LA branch
  const laBranch = findInTree(tree, n => (n.id || '') === 'uk_la');

  // Find devolved nation nodes
  const scotland = tree.children?.find(c => c.id === 'uk_scotland');
  const wales = tree.children?.find(c => c.id === 'uk_wales');
  const ni = tree.children?.find(c => c.id === 'uk_ni');

  const rootValue = tree.value || 0;
  const pct = rootValue > 0 ? (barnettTotal / rootValue * 100) : 0;

  const result = {
    year,
    barnett_grants: {
      scotland_office: { name: scotOffice?.name || 'Scotland Office', value: scotGrant },
      wales_office: { name: walesOffice?.name || 'Wales Office', value: walesGrant },
      ni_office: { name: niOffice?.name || 'NI Office', value: niGrant },
      total: barnettTotal,
    },
    devolved_governments: {
      scotland: scotland?.value || 0,
      wales: wales?.value || 0,
      ni: ni?.value || 0,
    },
    mhclg_local_gov_grants: mhclgLg?.value || 0,
    la_branch_value: laBranch?.value || 0,
    total_deduction: barnettTotal,
    pct_of_root: Math.round(pct * 10) / 10,
    root_value: rootValue,
    note: `Barnett Formula block grants (£${(barnettTotal/1e9).toFixed(0)}B via Scotland/Wales/NI Office) appear in both Central Government and devolved government budgets. MHCLG Local Government grants (£${((mhclgLg?.value||0)/1e9).toFixed(0)}B) overlap with LA England branch.`,
    source: 'HM Treasury OSCAR/OSCAR II, restructured with devolved nations separated'
  };

  fs.writeFileSync(path.join(DATA_DIR, `intergovernmental_uk_${year}.json`), JSON.stringify(result, null, 2));
  console.log(`${year}: Barnett £${(barnettTotal/1e9).toFixed(0)}B (${pct.toFixed(1)}%) | ScotOff £${(scotGrant/1e9).toFixed(0)}B | WalesOff £${(walesGrant/1e9).toFixed(0)}B | NI_Off £${(niGrant/1e9).toFixed(0)}B`);
}
