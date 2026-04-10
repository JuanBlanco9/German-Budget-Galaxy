/**
 * deduce_intergovernmental_us.js
 * Extracts federal grants received by each state from Census Bureau Excel files.
 * Produces:
 *   data/us/intergovernmental_us_{year}.json — deduction amounts per state
 *   data/us/states/us_states_tree_{year}_net.json — trees with _net_value fields
 *
 * The Census "From Federal Government" row in the revenue section gives the exact
 * amount of federal grants received by each state. This amount is double-counted
 * if we combine federal + state spending in the Multiverse.
 */
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const RESEARCH_DIR = path.join(__dirname, '..', 'data', 'us', 'states_research');
const STATES_DIR = path.join(__dirname, '..', 'data', 'us', 'states');
const US_DIR = path.join(__dirname, '..', 'data', 'us');

const STATE_ABBR = {
  'Alabama':'AL','Alaska':'AK','Arizona':'AZ','Arkansas':'AR','California':'CA',
  'Colorado':'CO','Connecticut':'CT','Delaware':'DE','District of Columbia':'DC',
  'Florida':'FL','Georgia':'GA','Hawaii':'HI','Idaho':'ID','Illinois':'IL',
  'Indiana':'IN','Iowa':'IA','Kansas':'KS','Kentucky':'KY','Louisiana':'LA',
  'Maine':'ME','Maryland':'MD','Massachusetts':'MA','Michigan':'MI','Minnesota':'MN',
  'Mississippi':'MS','Missouri':'MO','Montana':'MT','Nebraska':'NE','Nevada':'NV',
  'New Hampshire':'NH','New Jersey':'NJ','New Mexico':'NM','New York':'NY',
  'North Carolina':'NC','North Dakota':'ND','Ohio':'OH','Oklahoma':'OK','Oregon':'OR',
  'Pennsylvania':'PA','Rhode Island':'RI','South Carolina':'SC','South Dakota':'SD',
  'Tennessee':'TN','Texas':'TX','Utah':'UT','Vermont':'VT','Virginia':'VA',
  'Washington':'WA','West Virginia':'WV','Wisconsin':'WI','Wyoming':'WY'
};

function readSheets(year) {
  const yy = String(year).slice(-2);
  if (year >= 2017) {
    const fp = path.join(RESEARCH_DIR, `${yy}slsstab1.xlsx`);
    if (!fs.existsSync(fp)) return [];
    return [XLSX.readFile(fp).Sheets[XLSX.readFile(fp).SheetNames[0]]];
  } else {
    const fA = path.join(RESEARCH_DIR, `${yy}slsstab1a.xlsx`);
    const fB = path.join(RESEARCH_DIR, `${yy}slsstab1b.xlsx`);
    if (!fs.existsSync(fA)) return [];
    const sheets = [XLSX.readFile(fA).Sheets[XLSX.readFile(fA).SheetNames[0]]];
    if (fs.existsSync(fB)) sheets.push(XLSX.readFile(fB).Sheets[XLSX.readFile(fB).SheetNames[0]]);
    return sheets;
  }
}

function findStateColumns(ws) {
  const range = XLSX.utils.decode_range(ws['!ref']);
  let headerRow = -1;
  for (let r = 0; r <= 15; r++) {
    const cellB = ws[XLSX.utils.encode_cell({r, c: 1})];
    if (cellB && String(cellB.v).trim() === 'Description') {
      headerRow = r;
      break;
    }
  }
  if (headerRow < 0) return [];
  const states = [];
  for (let c = 2; c <= range.e.c; c++) {
    const cell = ws[XLSX.utils.encode_cell({r: headerRow, c})];
    if (!cell) continue;
    const name = String(cell.v).trim();
    if (name === 'United States Total' || STATE_ABBR[name]) {
      states.push({name, col: c});
      // Skip remaining cols for this entity (3 or 5 per state)
      const nextStateOffset = name === 'United States Total' ? 4 : 4;
      c += nextStateOffset;
    }
  }
  return states;
}

function findRow(ws, searchText) {
  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let r = 0; r <= range.e.r; r++) {
    const cell = ws[XLSX.utils.encode_cell({r, c: 1})];
    if (cell && String(cell.v).trim() === searchText) return r;
  }
  return -1;
}

function getCellVal(ws, row, col) {
  if (row < 0) return 0;
  const cell = ws[XLSX.utils.encode_cell({r: row, c: col})];
  if (!cell) return 0;
  const v = cell.v;
  if (typeof v === 'number') return Math.round(v * 1000);
  if (typeof v === 'string') {
    const n = parseFloat(v.replace(/,/g, ''));
    return isNaN(n) ? 0 : Math.round(n * 1000);
  }
  return 0;
}

const years = [];
for (let y = 2012; y <= 2022; y++) years.push(y);

for (const year of years) {
  console.log(`\n=== ${year} ===`);
  const sheets = readSheets(year);
  if (sheets.length === 0) { console.log('No data'); continue; }

  const byState = {};
  let totalGross = 0, totalFedGrants = 0, totalDirect = 0;

  for (const ws of sheets) {
    const states = findStateColumns(ws);
    const fedRevRow = findRow(ws, 'From Federal Government');
    const expRow = findRow(ws, 'Expenditure1');
    const directRow = findRow(ws, 'Direct expenditure');

    if (fedRevRow < 0) { console.warn('  Could not find "From Federal Government" row'); continue; }

    for (const st of states) {
      if (st.name === 'United States Total') continue;
      const abbr = STATE_ABBR[st.name];
      if (!abbr) continue;

      const gross = Math.abs(getCellVal(ws, expRow, st.col));
      const fedGrants = Math.abs(getCellVal(ws, fedRevRow, st.col));
      const direct = Math.abs(getCellVal(ws, directRow, st.col));

      byState[st.name] = { abbr, gross, federal_grants: fedGrants, direct, net: gross - fedGrants };
      totalGross += gross;
      totalFedGrants += fedGrants;
      totalDirect += direct;
    }
  }

  const stateCount = Object.keys(byState).length;
  const pctDeduction = totalGross > 0 ? (totalFedGrants / totalGross * 100) : 0;

  console.log(`  States: ${stateCount} | Gross: $${(totalGross/1e12).toFixed(3)}T | Fed grants: $${(totalFedGrants/1e12).toFixed(3)}T (${pctDeduction.toFixed(1)}%) | Direct: $${(totalDirect/1e12).toFixed(3)}T`);

  // Write intergovernmental deduction JSON
  const deduction = {
    year,
    total_states_gross: totalGross,
    federal_grants_to_states: totalFedGrants,
    total_states_direct: totalDirect,
    total_states_net: totalGross - totalFedGrants,
    pct_deduction: Math.round(pctDeduction * 10) / 10,
    by_state: byState,
    source: 'US Census Bureau, Annual Survey of State & Local Government Finances - "From Federal Government" intergovernmental revenue',
    note: 'Net figures exclude federal intergovernmental revenue to avoid double counting with federal budget. Use net figures when combining with federal tree in Multiverse.'
  };
  fs.writeFileSync(path.join(US_DIR, `intergovernmental_us_${year}.json`), JSON.stringify(deduction, null, 2));

  // Create _net version of the states tree
  const treePath = path.join(STATES_DIR, `us_states_tree_${year}.json`);
  if (fs.existsSync(treePath)) {
    const tree = JSON.parse(fs.readFileSync(treePath, 'utf8'));
    let netTotal = 0;
    for (const child of (tree.children || [])) {
      const st = byState[child.name];
      if (st) {
        child._net_value = st.net;
        child._federal_grants = st.federal_grants;
        netTotal += st.net;
      } else {
        child._net_value = child.value;
        child._federal_grants = 0;
        netTotal += child.value;
      }
    }
    tree._net_value = netTotal;
    tree._federal_grants_total = totalFedGrants;
    tree._note = 'Use _net_value when combining with federal tree to avoid double-counting ~$1T+ in federal grants.';

    const netPath = path.join(STATES_DIR, `us_states_tree_${year}_net.json`);
    fs.writeFileSync(netPath, JSON.stringify(tree, null, 2));
    console.log(`  Written: ${netPath}`);
  }
}

console.log('\nDone!');
