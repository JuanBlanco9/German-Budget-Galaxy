const fs = require('fs');
const path = require('path');
const DATA_DIR = path.join(__dirname, '..', 'data', 'fr');

// Step 1: Build label dictionary from 2025 (richest labels) and 2024
function buildLabelDict() {
  const dict = { ministere: {}, mission: {}, programme: {}, action: {} };

  // From 2025
  const raw25 = fs.readFileSync(path.join(DATA_DIR, 'plf_2025_depenses.csv'), 'utf-8').replace(/^\uFEFF/, '');
  raw25.trim().split('\n').slice(1).forEach(line => {
    const c = line.split(';');
    if (c[3]) dict.ministere[c[3].trim()] = c[4]?.trim() || '';
    if (c[5]) dict.mission[c[5].trim()] = c[6]?.trim() || '';
    if (c[7]) dict.programme[c[7].trim()] = c[8]?.trim() || '';
    if (c[9]) dict.action[c[9].trim()] = c[10]?.trim() || '';
  });

  // From 2024 (different format: col 15=Ministère, col 1=Mission, col 3=Programme, col 4=Libellé Programme)
  const raw24 = fs.readFileSync(path.join(DATA_DIR, 'plf_2024_depenses.csv'), 'utf-8').replace(/^\uFEFF/, '');
  raw24.trim().split('\n').slice(1).forEach(line => {
    const c = line.split(';');
    const minCode = (c[15] || '').trim().replace(/\r/, '');
    if (minCode) dict.ministere[minCode] = minCode; // 2024 has name as code
    if (c[2]) dict.mission[c[2].trim()] = c[1]?.trim() || '';
    const prog = (c[3] || '').replace('.0', '').trim();
    if (prog) dict.programme[prog] = c[4]?.trim() || '';
    if (c[5]) dict.action[`${prog}-${(c[5]||'').trim()}`] = c[6]?.trim() || '';
  });

  console.log(`Label dict: ${Object.keys(dict.ministere).length} ministeres, ${Object.keys(dict.mission).length} missions, ${Object.keys(dict.programme).length} programmes`);
  return dict;
}

const labels = buildLabelDict();

// Step 2: Parse each year
const years = [
  { year: 2021, file: 'plf_2021_depenses.csv', cpCol: 'CP PLF', format: 'old' },
  { year: 2022, file: 'plf_2022_depenses.csv', cpCol: 'cp', format: 'old' },
  { year: 2023, file: 'plf_2023_depenses.csv', cpCol: 'cp', format: 'old' },
];

function parseOldFormat(year, filename, cpColName) {
  const outPath = path.join(DATA_DIR, `fr_budget_tree_${year}.json`);
  if (fs.existsSync(outPath) && fs.statSync(outPath).size > 10000) {
    console.log(`=== ${year}: SKIP (exists) ===`);
    return;
  }

  const raw = fs.readFileSync(path.join(DATA_DIR, filename), 'utf-8').replace(/^\uFEFF/, '');
  const lines = raw.trim().split('\n');
  const header = lines[0].split(';').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
  const cpIdx = header.findIndex(h => h === cpColName.toLowerCase().replace(/\s+/g, '_'));

  if (cpIdx < 0) {
    console.log(`=== ${year}: ERROR - can't find CP column "${cpColName}" in [${header.join(', ')}] ===`);
    return;
  }

  console.log(`=== ${year}: Parsing ${filename} (CP at col ${cpIdx}) ===`);

  const ministeres = new Map();
  let parsed = 0;

  lines.slice(1).forEach(line => {
    const c = line.split(';');
    const minCode = (c[3] || '').replace('.0', '').trim();
    const misCode = (c[4] || '').trim();
    const progCode = (c[5] || '').replace('.0', '').trim();
    const actCode = (c[6] || '').trim();
    const saCode = (c[7] || '').trim();
    let cpStr = (c[cpIdx] || '0').replace(/\s/g, '').replace(',', '.');
    const cp = parseFloat(cpStr) || 0;

    if (cp <= 0 || !minCode) return;
    parsed++;

    const minName = labels.ministere[minCode] || `Ministere ${minCode}`;
    const misName = labels.mission[misCode] || `Mission ${misCode}`;
    const progName = labels.programme[progCode] || `Programme ${progCode}`;
    const actKey = `${progCode}-${actCode}`;
    const actName = labels.action[actKey] || labels.action[actCode] || (actCode ? `Action ${actCode}` : '');

    if (!ministeres.has(minCode)) ministeres.set(minCode, { name: minName, value: 0, missions: new Map() });
    const min = ministeres.get(minCode);
    min.value += cp;

    if (!min.missions.has(misCode)) min.missions.set(misCode, { name: misName, value: 0, progs: new Map() });
    const mis = min.missions.get(misCode);
    mis.value += cp;

    if (progCode) {
      if (!mis.progs.has(progCode)) mis.progs.set(progCode, { name: progName, value: 0, actions: new Map() });
      const prog = mis.progs.get(progCode);
      prog.value += cp;

      if (actCode) {
        if (!prog.actions.has(actKey)) prog.actions.set(actKey, { name: actName, value: 0 });
        prog.actions.get(actKey).value += cp;
      }
    }
  });

  // Build tree
  const children = [];
  for (const [, m] of ministeres) {
    const minNode = { id: m.name.slice(0, 3).toLowerCase(), name: m.name, value: Math.round(m.value), children: [] };
    for (const [, mis] of m.missions) {
      const misNode = { id: mis.name.slice(0, 4), name: mis.name, value: Math.round(mis.value), children: [] };
      for (const [pid, prog] of mis.progs) {
        const progNode = { id: pid, name: prog.name, value: Math.round(prog.value) };
        if (prog.actions.size > 0) {
          progNode.children = [...prog.actions.values()]
            .map(a => ({ id: a.name.slice(0, 6), name: a.name, value: Math.round(a.value) }))
            .sort((a, b) => b.value - a.value);
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
  const tree = { name: `Budget de l'Etat ${year} (PLF)`, value: total, children };

  let nc = 0;
  function count(n) { nc++; (n.children || []).forEach(count); }
  count(tree);

  console.log(`  EUR${(total / 1e9).toFixed(1)}B | ${children.length} ministeres | ${nc} nodes | ${parsed} rows`);
  fs.writeFileSync(outPath, JSON.stringify(tree), 'utf-8');
  console.log(`  -> ${outPath} (${(fs.statSync(outPath).size / 1024).toFixed(0)}KB)\n`);
}

years.forEach(y => parseOldFormat(y.year, y.file, y.cpCol));
console.log('Done!');
