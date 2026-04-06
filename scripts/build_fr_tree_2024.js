const fs = require('fs');
const path = require('path');

const CSV_PATH = path.join(__dirname, '..', 'data', 'fr', 'plf_2024_depenses.csv');
const OUT_PATH = path.join(__dirname, '..', 'data', 'fr', 'fr_budget_tree_2024.json');

const raw = fs.readFileSync(CSV_PATH, 'utf-8').replace(/^\uFEFF/, '');
const lines = raw.trim().split('\n');
const header = lines[0].split(';');
console.log('Columns:', header);

// Columns: Type Mission;Mission;Code Mission;Programme;Libelle Programme;Action;Libelle Action;
//          Sous Action;Libelle SousAction;Categorie;Code Titre;AE PLF;CP PLF;AE Prev FDC/ADP;CP Prev FDC/ADP;Ministere
const rows = lines.slice(1).map(line => {
  const cols = line.split(';');
  return {
    ministere: (cols[15] || '').trim(),       // Ministere (last column)
    mission: (cols[1] || '').trim(),           // Mission name
    code_mission: (cols[2] || '').trim(),       // Code Mission
    programme: (cols[3] || '').replace('.0', '').trim(),  // Programme number
    libelle_programme: (cols[4] || '').trim(),
    action: (cols[5] || '').trim(),
    libelle_action: (cols[6] || '').trim(),
    sous_action: (cols[7] || '').trim(),
    libelle_sous_action: (cols[8] || '').trim(),
    cp: parseFloat((cols[12] || '0').replace(/\s/g, '')) || 0,  // CP PLF
  };
}).filter(r => r.cp > 0 && r.ministere);

console.log(`Parsed ${rows.length} rows with positive CP`);

// Build hierarchy: Ministere -> Mission -> Programme -> Action -> Sous-action
const ministeres = new Map();

for (const r of rows) {
  if (!ministeres.has(r.ministere)) {
    ministeres.set(r.ministere, { value: 0, _missions: new Map() });
  }
  const min = ministeres.get(r.ministere);
  min.value += r.cp;

  const misKey = r.mission || r.code_mission;
  if (!min._missions.has(misKey)) {
    min._missions.set(misKey, { name: r.mission, value: 0, _programmes: new Map() });
  }
  const mis = min._missions.get(misKey);
  mis.value += r.cp;

  const progKey = r.programme;
  if (progKey && !mis._programmes.has(progKey)) {
    mis._programmes.set(progKey, { name: r.libelle_programme || `Programme ${progKey}`, value: 0, _actions: new Map() });
  }
  if (progKey) {
    const prog = mis._programmes.get(progKey);
    prog.value += r.cp;

    if (r.action) {
      const actKey = `${progKey}-${r.action}`;
      if (!prog._actions.has(actKey)) {
        prog._actions.set(actKey, { name: r.libelle_action || `Action ${r.action}`, value: 0, _sous: new Map() });
      }
      const act = prog._actions.get(actKey);
      act.value += r.cp;

      if (r.sous_action) {
        const saKey = `${actKey}-${r.sous_action}`;
        if (!act._sous.has(saKey)) {
          act._sous.set(saKey, { name: r.libelle_sous_action || `Sous-action ${r.sous_action}`, value: 0 });
        }
        act._sous.get(saKey).value += r.cp;
      }
    }
  }
}

// Convert to JSON
function buildTree() {
  const children = [];
  for (const [mName, mData] of ministeres) {
    const minNode = { id: mName.slice(0, 3).toLowerCase(), name: mName, value: Math.round(mData.value), children: [] };
    for (const [, mis] of mData._missions) {
      const misNode = { id: mis.name.slice(0, 4), name: mis.name, value: Math.round(mis.value), children: [] };
      for (const [pid, prog] of mis._programmes) {
        const progNode = { id: pid, name: prog.name, value: Math.round(prog.value) };
        if (prog._actions.size > 0) {
          progNode.children = [];
          for (const [, act] of prog._actions) {
            const actNode = { id: act.name.slice(0, 6), name: act.name, value: Math.round(act.value) };
            if (act._sous.size > 0) {
              actNode.children = [];
              for (const [, sa] of act._sous) {
                actNode.children.push({ id: sa.name.slice(0, 6), name: sa.name, value: Math.round(sa.value) });
              }
              actNode.children.sort((a, b) => b.value - a.value);
            }
            progNode.children.push(actNode);
          }
          progNode.children.sort((a, b) => b.value - a.value);
        }
        misNode.children.push(progNode);
      }
      misNode.children.sort((a, b) => b.value - a.value);
      minNode.children.push(misNode);
    }
    minNode.children.sort((a, b) => b.value - a.value);
    children.push(minNode);
  }
  children.sort((a, b) => b.value - a.value);
  const total = children.reduce((s, c) => s + c.value, 0);
  return { name: "Budget de l'Etat 2024 (PLF)", value: total, children };
}

const tree = buildTree();

let nodeCount = 0, leafCount = 0, maxD = 0;
function count(node, d) {
  nodeCount++;
  if (d > maxD) maxD = d;
  if (!node.children || !node.children.length) { leafCount++; return; }
  for (const c of node.children) count(c, d + 1);
}
count(tree, 0);

console.log(`Total: EUR${(tree.value / 1e9).toFixed(1)}B`);
console.log(`Nodes: ${nodeCount} (${leafCount} leaves)`);
console.log(`Max depth: ${maxD} levels`);
console.log(`Ministeres: ${tree.children.length}`);

fs.writeFileSync(OUT_PATH, JSON.stringify(tree), 'utf-8');
console.log(`Written to ${OUT_PATH} (${(fs.statSync(OUT_PATH).size / 1024).toFixed(0)}KB)`);
