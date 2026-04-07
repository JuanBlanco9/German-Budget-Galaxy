const fs = require('fs');
const path = require('path');
const DATA_DIR = path.join(__dirname, '..', 'data', 'fr');

/**
 * Build French budget trees for 2015-2019 from PLF open data CSVs.
 *
 * Sources:
 *   2015: PLF 2015 BG-Msn-Dest from data.economie.gouv.fr (PLF 2015 dataset)
 *   2016: PLF 2016 BG-Msn-Dest from data.economie.gouv.fr (PLF 2016 dataset)
 *   2017: LFI 2017 extracted from PLF 2018 BG-Msn-Dest (col "CPLF 2017")
 *         (The PLF 2017 source file is truncated to 6 missions on both portals)
 *   2018: PLF 2018 BG-Msn-Dest from data.economie.gouv.fr (PLF 2018 dataset)
 *   2019: PLF 2019 BG-Msn-Dest from data.gouv.fr (PLF 2019 dataset)
 *
 * Format 2015-2018 ("old" format, starts at line 4 after 3 metadata rows):
 *   Mission;Programme;Action;Libelle action;Sous-action;Libelle SSA;
 *     AE_LF_prev;AE_PLF;[AE_AMT;AE_LF;]CP_LF_prev;CP_PLF;[CP_AMT;CP_LF]
 *   CP PLF column index varies: col 9 for 10-col, col 11 for 14-col
 *
 * Format 2019 ("new" format, starts at line 1 after header):
 *   Phase;Type de mission;Mission;Code Programme;Programme;Code Action;Action;
 *     Code Sous-Action;Sous-Action;AE PLF 2019;CP PLF 2019;Code Ministere;Ministere
 *
 * Output: Mission > Programme > Action > Sous-action tree (no Ministry level,
 *   since 2015-2018 files lack Ministry codes).
 */

// ============================================================
// Year configs
// ============================================================
const years = [
  {
    year: 2015,
    file: 'plf_2015_bg_msn_dest.csv',
    format: 'old',
    skipLines: 3,     // 3 metadata rows before header
    cpColName: 'CPPLF',
    label: 'PLF',
  },
  {
    year: 2016,
    file: 'plf_2016_bg_msn_dest.csv',
    format: 'old',
    skipLines: 3,
    cpColName: 'CPPLF',
    label: 'PLF',
  },
  {
    year: 2017,
    // PLF 2017 source is truncated; use LFI 2017 from PLF 2018 file
    file: 'plf_2018_bg_msn_dest.csv',
    format: 'old',
    skipLines: 3,
    cpColName: 'CPLF 2017',  // The enacted (LFI) column for 2017
    label: 'LFI',
  },
  {
    year: 2018,
    file: 'plf_2018_bg_msn_dest.csv',
    format: 'old',
    skipLines: 3,
    cpColName: 'CPPLF',
    label: 'PLF',
  },
  {
    year: 2019,
    file: 'plf_2019_bg_msn_dest.csv',
    format: 'new',
    skipLines: 0,     // Just 1 header row
    cpColIdx: 10,     // CP PLF 2019 is column 10
    label: 'PLF',
  },
];

// ============================================================
// Parse old format (2015-2018)
// ============================================================
function parseOldFormat(cfg) {
  const filepath = path.join(DATA_DIR, cfg.file);
  const raw = fs.readFileSync(filepath, 'latin1').replace(/^\uFEFF/, '');
  const allLines = raw.trim().split('\n');

  // Skip metadata rows, then read header
  const headerLine = allLines[cfg.skipLines];
  const header = headerLine.split(';').map(h => h.trim().toLowerCase().replace(/\s+/g, ' '));

  // Find CP column by name
  const targetName = cfg.cpColName.toLowerCase().replace(/\s+/g, ' ');
  const cpIdx = header.findIndex(h => h === targetName);
  if (cpIdx < 0) {
    console.error(`  ERROR: Cannot find CP column "${cfg.cpColName}" in [${header.join(' | ')}]`);
    return null;
  }

  const dataLines = allLines.slice(cfg.skipLines + 1);
  const missions = new Map();
  let parsed = 0;

  for (const line of dataLines) {
    const c = line.split(';');
    const missionName = (c[0] || '').trim();
    const progCode = (c[1] || '').trim();
    const actCode = (c[2] || '').trim();
    const actLabel = (c[3] || '').trim();
    const saCode = (c[4] || '').trim();
    const saLabel = (c[5] || '').trim();

    const cpStr = (c[cpIdx] || '0').replace(/\s/g, '').replace(',', '.');
    const cp = parseFloat(cpStr) || 0;

    if (cp <= 0 || !missionName) continue;
    parsed++;

    // Mission level
    if (!missions.has(missionName)) {
      missions.set(missionName, { name: missionName, value: 0, progs: new Map() });
    }
    const mis = missions.get(missionName);
    mis.value += cp;

    // Programme level
    if (progCode) {
      if (!mis.progs.has(progCode)) {
        mis.progs.set(progCode, { code: progCode, name: `Programme ${progCode}`, value: 0, actions: new Map() });
      }
      const prog = mis.progs.get(progCode);
      prog.value += cp;

      // Action level
      if (actCode) {
        const actKey = `${progCode}-${actCode}`;
        if (!prog.actions.has(actKey)) {
          prog.actions.set(actKey, { code: actCode, name: actLabel || `Action ${actCode}`, value: 0, sousActions: new Map() });
        }
        const act = prog.actions.get(actKey);
        act.value += cp;

        // Sous-action level
        if (saCode && saCode !== '0') {
          const saKey = `${actKey}-${saCode}`;
          if (!act.sousActions.has(saKey)) {
            act.sousActions.set(saKey, { code: saCode, name: saLabel || `Sous-action ${saCode}`, value: 0 });
          }
          act.sousActions.get(saKey).value += cp;
        }
      }
    }
  }

  return { missions, parsed };
}

// ============================================================
// Parse new format (2019)
// ============================================================
function parseNewFormat(cfg) {
  const filepath = path.join(DATA_DIR, cfg.file);
  const raw = fs.readFileSync(filepath, 'latin1').replace(/^\uFEFF/, '');
  const allLines = raw.trim().split('\n');

  const dataLines = allLines.slice(1); // skip header
  const missions = new Map();
  let parsed = 0;

  for (const line of dataLines) {
    const c = line.split(';');
    const missionName = (c[2] || '').trim();
    const progCode = (c[3] || '').trim();
    const progName = (c[4] || '').trim();
    const actCode = (c[5] || '').trim();
    const actName = (c[6] || '').trim();
    const saCode = (c[7] || '').trim();
    const saName = (c[8] || '').trim();

    const cpStr = (c[cfg.cpColIdx] || '0').replace(/\s/g, '').replace(',', '.');
    const cp = parseFloat(cpStr) || 0;

    if (cp <= 0 || !missionName) continue;
    parsed++;

    // Mission level
    if (!missions.has(missionName)) {
      missions.set(missionName, { name: missionName, value: 0, progs: new Map() });
    }
    const mis = missions.get(missionName);
    mis.value += cp;

    // Programme level
    if (progCode) {
      if (!mis.progs.has(progCode)) {
        mis.progs.set(progCode, { code: progCode, name: progName || `Programme ${progCode}`, value: 0, actions: new Map() });
      }
      const prog = mis.progs.get(progCode);
      prog.value += cp;

      // Action level
      if (actCode) {
        const actKey = `${progCode}-${actCode}`;
        if (!prog.actions.has(actKey)) {
          prog.actions.set(actKey, { code: actCode, name: actName || `Action ${actCode}`, value: 0, sousActions: new Map() });
        }
        const act = prog.actions.get(actKey);
        act.value += cp;

        // Sous-action level
        if (saCode) {
          const saKey = `${actKey}-${saCode}`;
          if (!act.sousActions.has(saKey)) {
            act.sousActions.set(saKey, { code: saCode, name: saName || `Sous-action ${saCode}`, value: 0 });
          }
          act.sousActions.get(saKey).value += cp;
        }
      }
    }
  }

  return { missions, parsed };
}

// ============================================================
// Enrich programme labels using 2019 data (which has labels)
// ============================================================
function buildProgLabelDict() {
  const dict = {};
  const filepath = path.join(DATA_DIR, 'plf_2019_bg_msn_dest.csv');
  if (!fs.existsSync(filepath)) return dict;
  const raw = fs.readFileSync(filepath, 'latin1').replace(/^\uFEFF/, '');
  raw.trim().split('\n').slice(1).forEach(line => {
    const c = line.split(';');
    const code = (c[3] || '').trim();
    const name = (c[4] || '').trim();
    if (code && name) dict[code] = name;
  });
  return dict;
}

const progLabels = buildProgLabelDict();

// ============================================================
// Build tree and write JSON
// ============================================================
function buildAndWrite(cfg) {
  const outPath = path.join(DATA_DIR, `fr_budget_tree_${cfg.year}.json`);

  console.log(`\n=== ${cfg.year} (${cfg.label}) from ${cfg.file} ===`);

  let result;
  if (cfg.format === 'old') {
    result = parseOldFormat(cfg);
  } else {
    result = parseNewFormat(cfg);
  }

  if (!result) {
    console.log(`  FAILED - skipping`);
    return;
  }

  const { missions, parsed } = result;

  // Enrich programme labels for old format (which only has codes)
  if (cfg.format === 'old') {
    for (const [, mis] of missions) {
      for (const [, prog] of mis.progs) {
        if (progLabels[prog.code]) {
          prog.name = progLabels[prog.code];
        }
      }
    }
  }

  // Build JSON tree
  const children = [];
  for (const [, mis] of missions) {
    const misNode = {
      id: mis.name.slice(0, 4).toLowerCase().replace(/[^a-z]/g, ''),
      name: mis.name,
      value: Math.round(mis.value),
      children: [],
    };

    for (const [, prog] of mis.progs) {
      const progNode = {
        id: prog.code,
        name: prog.name,
        value: Math.round(prog.value),
      };

      if (prog.actions.size > 0) {
        progNode.children = [];
        for (const [, act] of prog.actions) {
          const actNode = {
            id: act.code,
            name: act.name,
            value: Math.round(act.value),
          };

          if (act.sousActions.size > 0) {
            actNode.children = [];
            for (const [, sa] of act.sousActions) {
              actNode.children.push({
                id: sa.code,
                name: sa.name,
                value: Math.round(sa.value),
              });
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
    children.push(misNode);
  }
  children.sort((a, b) => b.value - a.value);

  const total = children.reduce((s, c) => s + c.value, 0);
  const rootLabel = cfg.label === 'LFI' ? 'LFI' : 'PLF';
  const tree = {
    name: `Budget de l'Etat ${cfg.year} (${rootLabel})`,
    value: total,
    children,
  };

  // Stats
  let nodeCount = 0;
  function count(n) { nodeCount++; (n.children || []).forEach(count); }
  count(tree);

  console.log(`  EUR ${(total / 1e9).toFixed(1)}B | ${children.length} missions | ${nodeCount} nodes | ${parsed} rows parsed`);
  fs.writeFileSync(outPath, JSON.stringify(tree), 'utf-8');
  console.log(`  -> ${outPath} (${(fs.statSync(outPath).size / 1024).toFixed(0)}KB)`);
}

// ============================================================
// Run all years
// ============================================================
for (const cfg of years) {
  buildAndWrite(cfg);
}

console.log('\nDone!');
