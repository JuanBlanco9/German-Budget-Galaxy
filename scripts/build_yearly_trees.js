// Build budget tree JSON for each year (same schema as 2024)
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const YEARS = [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];

function buildTree(year) {
  const file = path.join(DATA_DIR, `bundeshaushalt_${year}.csv`);
  let raw = fs.readFileSync(file, 'utf8');
  if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);
  const lines = raw.replace(/\r/g, '').split('\n').filter(l => l.trim());

  const header = lines[0].replace(/"/g, '').split(';')
    .map(h => h.trim().toLowerCase().replace('einahmen', 'einnahmen'));

  const eplIdx = header.indexOf('einzelplan');
  const eplTextIdx = header.indexOf('einzelplan-text');
  const eaIdx = header.indexOf('einnahmen-ausgaben');
  const kapIdx = header.indexOf('kapitel');
  const kapTextIdx = header.indexOf('kapitel-text');
  const sollIdx = header.findIndex(h => h.startsWith('soll'));
  const titelIdx = header.indexOf('titel');
  const titelTextIdx = header.indexOf('titel-text');

  // Build hierarchy: EPL → KAP → Titel
  const eplMap = {};

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].replace(/"/g, '').split(';');
    const ea = (cols[eaIdx] || '').trim().toUpperCase();
    if (ea !== 'A') continue;

    const epl = (cols[eplIdx] || '').trim();
    const eplText = (cols[eplTextIdx] || '').trim();
    const kap = (cols[kapIdx] || '').trim();
    const kapText = (cols[kapTextIdx] || '').trim();
    const titel = (cols[titelIdx] || '').trim();
    const titelText = (cols[titelTextIdx] || '').trim();
    const soll = (parseInt((cols[sollIdx] || '0').trim()) || 0) * 1000; // Tsd EUR → EUR

    if (!epl) continue;

    if (!eplMap[epl]) eplMap[epl] = { id: epl, name: epl + ' ' + eplText, value: 0, kapMap: {} };

    if (kap) {
      if (!eplMap[epl].kapMap[kap]) eplMap[epl].kapMap[kap] = { id: kap, name: kap + ' ' + kapText, value: 0, children: [] };

      const titelId = epl + kap.slice(2) + titel;
      eplMap[epl].kapMap[kap].children.push({
        id: titelId,
        name: kap + ' ' + titel + ' ' + titelText,
        value: soll
      });
      eplMap[epl].kapMap[kap].value += soll;
    }

    eplMap[epl].value += soll;
  }

  // Convert to tree
  const children = Object.values(eplMap).map(epl => ({
    id: epl.id,
    name: epl.name,
    value: epl.value,
    children: Object.values(epl.kapMap).map(kap => ({
      id: kap.id,
      name: kap.name,
      value: kap.value,
      children: kap.children
    }))
  }));

  const total = children.reduce((s, c) => s + c.value, 0);

  return {
    name: `Bundeshaushalt ${year}`,
    value: total,
    children
  };
}

// Build all years
const allTrees = {};
YEARS.forEach(year => {
  try {
    const tree = buildTree(year);
    allTrees[year] = tree;
    console.log(`${year}: ${tree.children.length} EPL, EUR ${(tree.value / 1e9).toFixed(1)}B`);
  } catch (e) {
    console.log(`${year}: FAILED — ${e.message}`);
  }
});

// Save as single JSON
const outPath = path.join(DATA_DIR, 'bundeshaushalt_trees_all.json');
fs.writeFileSync(outPath, JSON.stringify(allTrees));
console.log(`\nSaved ${Object.keys(allTrees).length} trees to ${outPath} (${(fs.statSync(outPath).size / 1e6).toFixed(1)}MB)`);
