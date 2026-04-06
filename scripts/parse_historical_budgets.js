// Parse all 10 Bundeshaushalt CSVs (2015-2024) into JSON summaries
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const YEARS = [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];

const KATEGORIEN = {
  'Soziales': ['11', '15', '17'],
  'Sicherheit': ['14', '06'],
  'Infrastruktur': ['12', '25'],
  'Bildung': ['30'],
  'Wirtschaft': ['09', '10'],
  'International': ['05', '23'],
  'Finanzen': ['32', '60', '08'],
  'Institutionen': ['04', '02', '07', '20', '01', '16', '19', '03', '21', '22'],
};

function parseCSV(year) {
  const file = path.join(DATA_DIR, `bundeshaushalt_${year}.csv`);
  let raw = fs.readFileSync(file, 'utf8');
  // Strip BOM and normalize line endings
  if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);
  const lines = raw.replace(/\r/g, '').split('\n').filter(l => l.trim());

  // Normalize header (handle typo einahmen vs einnahmen, quoted vs unquoted)
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

  const eplTotals = {};  // epl_id -> {name, value}
  const kapTotals = {};  // kap_id -> {name, epl, value}

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].replace(/"/g, '').split(';');
    const ea = (cols[eaIdx] || '').trim().toUpperCase();
    if (ea !== 'A') continue; // Only Ausgaben

    const epl = (cols[eplIdx] || '').trim();
    const eplText = (cols[eplTextIdx] || '').trim();
    const kap = (cols[kapIdx] || '').trim();
    const kapText = (cols[kapTextIdx] || '').trim();
    const soll = parseInt((cols[sollIdx] || '0').trim()) || 0;

    if (!epl) continue;

    // EPL aggregation
    if (!eplTotals[epl]) eplTotals[epl] = { name: eplText, value: 0 };
    eplTotals[epl].value += soll;

    // KAP aggregation
    if (kap) {
      if (!kapTotals[kap]) kapTotals[kap] = { name: kapText, epl, value: 0 };
      kapTotals[kap].value += soll;
    }
  }

  return { eplTotals, kapTotals };
}

// Parse all years
console.log('Parsing 10 years of Bundeshaushalt data...');
const allYears = {};
YEARS.forEach(year => {
  const { eplTotals, kapTotals } = parseCSV(year);
  allYears[year] = { eplTotals, kapTotals };
  const total = Object.values(eplTotals).reduce((s, e) => s + e.value, 0);
  console.log(`  ${year}: ${Object.keys(eplTotals).length} EPL, total EUR ${(total / 1e6).toFixed(1)}B (in Tsd EUR: ${total})`);
});

// Build EPL history JSON
const eplHistory = {};
const allEplIds = new Set();
YEARS.forEach(year => {
  Object.keys(allYears[year].eplTotals).forEach(id => allEplIds.add(id));
});

allEplIds.forEach(eplId => {
  const history = YEARS.map(year => {
    const data = allYears[year].eplTotals[eplId];
    return { year, value: data ? data.value * 1000 : 0 }; // Convert Tsd EUR to EUR
  });
  // Use the most recent name
  let name = '';
  for (let y = YEARS.length - 1; y >= 0; y--) {
    const d = allYears[YEARS[y]].eplTotals[eplId];
    if (d && d.name) { name = d.name; break; }
  }
  eplHistory[eplId] = { name, history };
});

// Build KAP history JSON
const kapHistory = {};
const allKapIds = new Set();
YEARS.forEach(year => {
  Object.keys(allYears[year].kapTotals).forEach(id => allKapIds.add(id));
});

allKapIds.forEach(kapId => {
  const history = YEARS.map(year => {
    const data = allYears[year].kapTotals[kapId];
    return { year, value: data ? data.value * 1000 : 0 };
  });
  let name = '', epl = '';
  for (let y = YEARS.length - 1; y >= 0; y--) {
    const d = allYears[YEARS[y]].kapTotals[kapId];
    if (d && d.name) { name = d.name; epl = d.epl; break; }
  }
  kapHistory[kapId] = { name, epl, history };
});

// Build Kategorien history
const katHistory = {};
Object.entries(KATEGORIEN).forEach(([kat, eplIds]) => {
  const history = YEARS.map(year => {
    let total = 0;
    eplIds.forEach(eplId => {
      const d = allYears[year].eplTotals[eplId];
      if (d) total += d.value;
    });
    return { year, value: total * 1000 }; // Convert to EUR
  });
  katHistory[kat] = { epls: eplIds, history };
});

// Write outputs
const eplOut = path.join(DATA_DIR, 'budget_history.json');
fs.writeFileSync(eplOut, JSON.stringify(eplHistory, null, 2));
console.log(`\nWrote ${eplOut} (${Object.keys(eplHistory).length} EPL)`);

const kapOut = path.join(DATA_DIR, 'budget_history_kapitel.json');
fs.writeFileSync(kapOut, JSON.stringify(kapHistory, null, 2));
console.log(`Wrote ${kapOut} (${Object.keys(kapHistory).length} KAP)`);

const katOut = path.join(DATA_DIR, 'budget_history_kategorien.json');
fs.writeFileSync(katOut, JSON.stringify(katHistory, null, 2));
console.log(`Wrote ${katOut} (${Object.keys(katHistory).length} categories)`);

// Quick validation
console.log('\n=== VALIDATION: Sicherheit (EPL 14 + 06) ===');
katHistory['Sicherheit'].history.forEach(h => {
  console.log(`  ${h.year}: EUR ${(h.value / 1e9).toFixed(1)}B`);
});

console.log('\n=== VALIDATION: EPL 14 Verteidigung ===');
eplHistory['14'].history.forEach(h => {
  console.log(`  ${h.year}: EUR ${(h.value / 1e9).toFixed(1)}B`);
});

console.log('\n=== VALIDATION: Total budget per year ===');
YEARS.forEach(year => {
  const total = Object.values(allYears[year].eplTotals).reduce((s, e) => s + e.value, 0);
  console.log(`  ${year}: EUR ${(total * 1000 / 1e9).toFixed(1)}B`);
});
