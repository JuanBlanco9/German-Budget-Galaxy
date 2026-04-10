/**
 * build_uk_devolved_trees.js
 * Parses HM Treasury PESA Chapter 9 tables to extract identifiable
 * expenditure by country (England, Scotland, Wales, NI) and COFOG function.
 *
 * Source: PESA 2024, Tables 9.5-9.14
 * Outputs: data/uk/devolved/uk_devolved_tree_{year}.json
 *
 * Values in PESA are £ millions — multiply by 1e6.
 */
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const PESA_FILE = path.join(__dirname, '..', 'data', 'uk', 'pesa', 'pesa2024_chapter9.xlsx');
const OUT_DIR = path.join(__dirname, '..', 'data', 'uk', 'devolved');

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

// Sheet → COFOG function mapping
const COFOG_SHEETS = {
  '9.5':  'General Public Services',
  '9.6':  'Defence',
  '9.7':  'Public Order & Safety',
  '9.8':  'Economic Affairs',
  '9.9':  'Environmental Protection',
  '9.10': 'Housing & Community',
  '9.11': 'Health',
  '9.12': 'Recreation, Culture & Religion',
  '9.13': 'Education',
  '9.14': 'Social Protection',
};

const COUNTRIES = ['England', 'Scotland', 'Wales', 'Northern Ireland'];
const COUNTRY_IDS = { 'England': 'uk_eng', 'Scotland': 'uk_sco', 'Wales': 'uk_wal', 'Northern Ireland': 'uk_ni' };

const wb = XLSX.readFile(PESA_FILE);

// Find available fiscal years from the TOTAL columns only (cols 1-5, before "of which: current")
const sampleWs = wb.Sheets['9.5'];
const yearCols = {};
// Only scan cols 1-5 (total expenditure). Cols 6-10 are "of which: current", 11-15 "of which: capital"
for (let c = 1; c <= 5; c++) {
  const cell = sampleWs[XLSX.utils.encode_cell({ r: 4, c })];
  if (cell) {
    const m = String(cell.v).match(/(\d{4})-(\d{2})/);
    if (m) {
      const fy = parseInt(m[1]) + 1; // fiscal year 2022-23 → we call it 2023
      yearCols[fy] = c;
    }
  }
}
console.log('Fiscal years found:', Object.keys(yearCols).join(', '));

// Extract data: year → country → function → value
const data = {};
Object.entries(COFOG_SHEETS).forEach(([sheetName, funcName]) => {
  const ws = wb.Sheets[sheetName];
  if (!ws) { console.warn('Sheet not found:', sheetName); return; }

  Object.entries(yearCols).forEach(([year, col]) => {
    if (!data[year]) data[year] = {};
    for (let r = 5; r < 31; r++) {
      const nameCell = ws[XLSX.utils.encode_cell({ r, c: 0 })];
      if (!nameCell) continue;
      const name = String(nameCell.v).trim();
      if (!COUNTRIES.includes(name)) continue;

      const valCell = ws[XLSX.utils.encode_cell({ r, c: col })];
      let val = valCell ? Number(valCell.v) : 0;
      if (isNaN(val)) val = 0;
      val = Math.round(val * 1e6); // £ millions → £

      if (!data[year][name]) data[year][name] = {};
      data[year][name][funcName] = val;
    }
  });
});

// Build trees per year
Object.entries(data).forEach(([year, countries]) => {
  const nationNodes = [];
  let rootTotal = 0;

  COUNTRIES.forEach(country => {
    const funcs = countries[country];
    if (!funcs) return;

    const children = Object.entries(funcs)
      .filter(([, v]) => v > 0)
      .map(([fname, val]) => ({ name: fname, value: val }))
      .sort((a, b) => b.value - a.value);

    const total = children.reduce((s, c) => s + c.value, 0);
    rootTotal += total;

    nationNodes.push({
      id: COUNTRY_IDS[country],
      name: country,
      value: total,
      children,
    });
  });

  const tree = {
    name: `UK Devolved Spending ${year}`,
    id: 'uk_devolved',
    value: rootTotal,
    year: parseInt(year),
    source: 'HM Treasury PESA 2024, Tables 9.5-9.14 (identifiable expenditure on services by country and function)',
    note: 'Identifiable expenditure allocated to each UK nation by COFOG function. Includes both central and devolved government spending attributed to each nation.',
    children: nationNodes,
  };

  const outPath = path.join(OUT_DIR, `uk_devolved_tree_${year}.json`);
  fs.writeFileSync(outPath, JSON.stringify(tree, null, 2));
  console.log(`${year}: £${(rootTotal / 1e9).toFixed(1)}B across ${nationNodes.length} nations`);
  nationNodes.forEach(n => console.log(`  ${n.name}: £${(n.value / 1e9).toFixed(1)}B (${n.children.length} functions)`));
});

console.log('\nDone!');
