const fs = require('fs');
const path = require('path');

const CSV_PATH = path.join(__dirname, '..', 'data', 'fr', 'plf_2025_depenses.csv');
const OUT_PATH = path.join(__dirname, '..', 'data', 'fr', 'fr_budget_tree_2025.json');

// Read CSV
const raw = fs.readFileSync(CSV_PATH, 'utf-8').replace(/^\uFEFF/, ''); // strip BOM
const lines = raw.trim().split('\n');
const header = lines[0].split(';');
const rows = lines.slice(1).map(line => {
  const cols = line.split(';');
  return {
    ministere: cols[3],
    libelle_ministere: cols[4],
    mission: cols[5],
    libelle_mission: cols[6],
    programme: cols[7],
    libelle_programme: cols[8],
    action: cols[9],
    libelle_action: cols[10],
    sous_action: cols[11],
    libelle_sous_action: cols[12],
    credit_de_paiement: parseFloat(cols[16]) || 0,
  };
});

console.log(`Parsed ${rows.length} rows`);

// Build hierarchy: Ministère → Mission → Programme → Action → Sous-action
const ministeres = new Map();

for (const r of rows) {
  // Level 1: Ministère
  if (!ministeres.has(r.ministere)) {
    ministeres.set(r.ministere, {
      id: r.ministere,
      name: r.libelle_ministere,
      value: 0,
      _missions: new Map(),
    });
  }
  const min = ministeres.get(r.ministere);
  min.value += r.credit_de_paiement;

  // Level 2: Mission
  if (!min._missions.has(r.mission)) {
    min._missions.set(r.mission, {
      id: r.mission,
      name: r.libelle_mission,
      value: 0,
      _programmes: new Map(),
    });
  }
  const mis = min._missions.get(r.mission);
  mis.value += r.credit_de_paiement;

  // Level 3: Programme
  if (!mis._programmes.has(r.programme)) {
    mis._programmes.set(r.programme, {
      id: r.programme,
      name: r.libelle_programme,
      value: 0,
      _actions: new Map(),
    });
  }
  const prog = mis._programmes.get(r.programme);
  prog.value += r.credit_de_paiement;

  // Level 4: Action
  if (r.action) {
    if (!prog._actions.has(r.action)) {
      prog._actions.set(r.action, {
        id: r.action,
        name: r.libelle_action,
        value: 0,
        _sous_actions: new Map(),
      });
    }
    const act = prog._actions.get(r.action);
    act.value += r.credit_de_paiement;

    // Level 5: Sous-action
    if (r.sous_action) {
      if (!act._sous_actions.has(r.sous_action)) {
        act._sous_actions.set(r.sous_action, {
          id: r.sous_action,
          name: r.libelle_sous_action,
          value: 0,
        });
      }
      const sa = act._sous_actions.get(r.sous_action);
      sa.value += r.credit_de_paiement;
    }
  }
}

// Convert to clean JSON tree
function buildTree() {
  const children = [];
  for (const min of ministeres.values()) {
    const minNode = { id: min.id, name: min.name, value: Math.round(min.value), children: [] };
    for (const mis of min._missions.values()) {
      const misNode = { id: mis.id, name: mis.name, value: Math.round(mis.value), children: [] };
      for (const prog of mis._programmes.values()) {
        const progNode = { id: prog.id, name: prog.name, value: Math.round(prog.value) };
        if (prog._actions.size > 0) {
          progNode.children = [];
          for (const act of prog._actions.values()) {
            const actNode = { id: act.id, name: act.name, value: Math.round(act.value) };
            if (act._sous_actions.size > 0) {
              actNode.children = [];
              for (const sa of act._sous_actions.values()) {
                actNode.children.push({ id: sa.id, name: sa.name, value: Math.round(sa.value) });
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
  return { name: "Budget de l'État 2025 (PLF)", value: total, children };
}

const tree = buildTree();

// Stats
let nodeCount = 0;
let leafCount = 0;
let maxDepth = 0;
function countNodes(node, depth) {
  nodeCount++;
  if (depth > maxDepth) maxDepth = depth;
  if (!node.children || node.children.length === 0) { leafCount++; return; }
  for (const c of node.children) countNodes(c, depth + 1);
}
countNodes(tree, 0);

console.log(`Total: €${(tree.value / 1e9).toFixed(1)}B`);
console.log(`Nodes: ${nodeCount} (${leafCount} leaves)`);
console.log(`Max depth: ${maxDepth} levels`);
console.log(`Ministères: ${tree.children.length}`);

fs.writeFileSync(OUT_PATH, JSON.stringify(tree), 'utf-8');
console.log(`Written to ${OUT_PATH} (${(fs.statSync(OUT_PATH).size / 1024).toFixed(0)}KB)`);
