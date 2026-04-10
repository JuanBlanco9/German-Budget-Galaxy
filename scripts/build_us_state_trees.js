/**
 * build_us_state_trees.js
 * Parses US Census Bureau "Annual Survey of State & Local Government Finances"
 * Excel files into Budget Galaxy tree JSONs.
 *
 * Source: https://www2.census.gov/programs-surveys/gov-finances/tables/
 * Files: data/us/states_research/YYslsstab1.xlsx (2017-2022)
 *        data/us/states_research/YYslsstab1a.xlsx + YYslsstab1b.xlsx (2012-2016)
 *
 * Values in source are in THOUSANDS USD — we multiply by 1000.
 *
 * Usage: node scripts/build_us_state_trees.js [--dry-run] [year]
 */

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const RESEARCH_DIR = path.join(__dirname, '..', 'data', 'us', 'states_research');
const OUTPUT_DIR = path.join(__dirname, '..', 'data', 'us', 'states');

// State name → abbreviation
const STATE_ABBR = {
  'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR',
  'California': 'CA', 'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE',
  'District of Columbia': 'DC', 'Florida': 'FL', 'Georgia': 'GA', 'Hawaii': 'HI',
  'Idaho': 'ID', 'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA',
  'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME',
  'Maryland': 'MD', 'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN',
  'Mississippi': 'MS', 'Missouri': 'MO', 'Montana': 'MT', 'Nebraska': 'NE',
  'Nevada': 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM',
  'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH',
  'Oklahoma': 'OK', 'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI',
  'South Carolina': 'SC', 'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX',
  'Utah': 'UT', 'Vermont': 'VT', 'Virginia': 'VA', 'Washington': 'WA',
  'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY'
};

// Functional expenditure categories to extract, matched by trimmed description text.
// Structure: { key, match, children? }
// "match" is the trimmed text in column B (leading/trailing spaces stripped).
// We search for the FIRST occurrence in the expenditure section.
const EXPENDITURE_CATEGORIES = [
  {
    key: 'education', match: 'Education', section: 'Education services:',
    children: [
      { key: 'higher_ed', match: 'Higher education' },
      { key: 'elementary_secondary', match: 'Elementary & secondary' },
      { key: 'other_education', match: 'Other education' },
    ]
  },
  { key: 'libraries', match: 'Libraries' },
  {
    key: 'public_welfare', match: 'Public welfare', section: 'Social services and income maintenance:'
  },
  { key: 'hospitals', match: 'Hospitals' },
  { key: 'health', match: 'Health' },
  { key: 'employment_security', match: 'Employment security administration' },
  { key: 'veterans_services', match: "Veterans' services" },
  {
    key: 'highways', match: 'Highways', section: 'Transportation:'
  },
  { key: 'air_transportation', match: 'Air transportation (airports)' },
  { key: 'parking', match: 'Parking facilities' },
  { key: 'sea_inland_port', match: 'Sea and inland port facilities' },
  {
    key: 'police', match: 'Police protection', section: 'Public safety:'
  },
  { key: 'fire', match: 'Fire protection' },
  { key: 'correction', match: 'Correction' },
  { key: 'protective_inspection', match: 'Protective inspection and regulation' },
  {
    key: 'natural_resources', match: 'Natural resources', section: 'Environment and housing:'
  },
  { key: 'parks_recreation', match: 'Parks and recreation' },
  { key: 'housing_community', match: 'Housing and community development' },
  { key: 'sewerage', match: 'Sewerage' },
  { key: 'solid_waste', match: 'Solid waste management' },
  {
    key: 'financial_admin', match: 'Financial administration', section: 'Governmental administration:'
  },
  { key: 'judicial_legal', match: 'Judicial and legal' },
  { key: 'general_buildings', match: 'General public buildings' },
  { key: 'other_admin', match: 'Other governmental administration' },
  { key: 'interest_debt', match: 'Interest on general debt' },
  { key: 'misc_commercial', match: 'Miscellaneous commercial activities' },
  { key: 'other_unallocable', match: 'Other and unallocable' },
  {
    key: 'utility', match: 'Utility expenditure',
    children: [
      { key: 'water_supply', match: 'Water supply' },
      { key: 'electric_power', match: 'Electric power' },
      { key: 'gas_supply', match: 'Gas supply' },
      { key: 'transit', match: 'Transit' },
    ]
  },
  { key: 'liquor_stores', match: 'Liquor store expenditure' },
  {
    key: 'insurance_trust', match: 'Insurance trust expenditure',
    children: [
      { key: 'unemployment_comp', match: 'Unemployment compensation' },
      { key: 'employee_retirement', match: 'Employee retirement' },
      { key: 'workers_comp', match: "Workers' compensation" },
      { key: 'other_insurance', match: 'Other insurance trust' },
    ]
  },
];

// Nice display names
const DISPLAY_NAMES = {
  'education': 'Education',
  'higher_ed': 'Higher Education',
  'elementary_secondary': 'Elementary & Secondary Education',
  'other_education': 'Other Education',
  'libraries': 'Libraries',
  'public_welfare': 'Public Welfare',
  'hospitals': 'Hospitals',
  'health': 'Health',
  'employment_security': 'Employment Security',
  'veterans_services': "Veterans' Services",
  'highways': 'Highways',
  'air_transportation': 'Air Transportation',
  'parking': 'Parking Facilities',
  'sea_inland_port': 'Sea & Inland Port Facilities',
  'police': 'Police Protection',
  'fire': 'Fire Protection',
  'correction': 'Correction',
  'protective_inspection': 'Protective Inspection & Regulation',
  'natural_resources': 'Natural Resources',
  'parks_recreation': 'Parks & Recreation',
  'housing_community': 'Housing & Community Development',
  'sewerage': 'Sewerage',
  'solid_waste': 'Solid Waste Management',
  'financial_admin': 'Financial Administration',
  'judicial_legal': 'Judicial & Legal',
  'general_buildings': 'General Public Buildings',
  'other_admin': 'Other Government Administration',
  'interest_debt': 'Interest on General Debt',
  'misc_commercial': 'Miscellaneous Commercial Activities',
  'other_unallocable': 'Other & Unallocable',
  'utility': 'Utility Expenditure',
  'water_supply': 'Water Supply',
  'electric_power': 'Electric Power',
  'gas_supply': 'Gas Supply',
  'transit': 'Transit',
  'liquor_stores': 'Liquor Store Expenditure',
  'insurance_trust': 'Insurance Trust Expenditure',
  'unemployment_comp': 'Unemployment Compensation',
  'employee_retirement': 'Employee Retirement',
  'workers_comp': "Workers' Compensation",
  'other_insurance': 'Other Insurance Trust',
};

/**
 * Read one or more Excel files for a year, return unified worksheet data.
 */
function readYear(year) {
  const yy = String(year).slice(-2);

  if (year >= 2017) {
    // Single file
    const filePath = path.join(RESEARCH_DIR, `${yy}slsstab1.xlsx`);
    if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`);
    const wb = XLSX.readFile(filePath);
    return [wb.Sheets[wb.SheetNames[0]]];
  } else {
    // Split a/b
    const fileA = path.join(RESEARCH_DIR, `${yy}slsstab1a.xlsx`);
    const fileB = path.join(RESEARCH_DIR, `${yy}slsstab1b.xlsx`);
    if (!fs.existsSync(fileA)) throw new Error(`File not found: ${fileA}`);
    if (!fs.existsSync(fileB)) throw new Error(`File not found: ${fileB}`);
    const wbA = XLSX.readFile(fileA);
    const wbB = XLSX.readFile(fileB);
    return [wbA.Sheets[wbA.SheetNames[0]], wbB.Sheets[wbB.SheetNames[0]]];
  }
}

/**
 * Find state columns in a worksheet. Returns [{name, col}] where col is the
 * index of the "State & local government amount" column (first value column).
 */
function findStateColumns(ws, year) {
  const range = XLSX.utils.decode_range(ws['!ref']);
  const colsPerState = (year === 2012) ? 3 : 5;

  // Find the header row with state names (row that has "Description" in col B and state names)
  let headerRow = -1;
  for (let r = 0; r <= 15; r++) {
    const cellB = ws[XLSX.utils.encode_cell({ r, c: 1 })];
    if (cellB && String(cellB.v).trim() === 'Description') {
      // Check if there's a state-like name in subsequent columns
      const cellC = ws[XLSX.utils.encode_cell({ r, c: 2 })];
      if (cellC && String(cellC.v).includes('United States')) {
        headerRow = r;
        break;
      }
      // For split files, first state col might not be US Total
      for (let c = 2; c <= 20; c++) {
        const cell = ws[XLSX.utils.encode_cell({ r, c })];
        if (cell && STATE_ABBR[String(cell.v).trim()]) {
          headerRow = r;
          break;
        }
      }
      if (headerRow >= 0) break;
    }
  }

  if (headerRow < 0) throw new Error('Could not find header row');

  const states = [];
  for (let c = 2; c <= range.e.c; c++) {
    const cell = ws[XLSX.utils.encode_cell({ r: headerRow, c })];
    if (!cell) continue;
    const name = String(cell.v).trim();
    if (name === 'United States Total') {
      states.push({ name: 'United States Total', col: c });
      c += colsPerState - 1; // skip remaining columns for this entity
    } else if (STATE_ABBR[name]) {
      states.push({ name, col: c });
      c += colsPerState - 1;
    }
  }

  return states;
}

/**
 * Build a description → row mapping for the expenditure section.
 * We search column B for matching description strings.
 */
function buildRowMap(ws) {
  const range = XLSX.utils.decode_range(ws['!ref']);
  const map = {};

  // Find expenditure section start
  let expStart = -1;
  for (let r = 0; r <= range.e.r; r++) {
    const cellB = ws[XLSX.utils.encode_cell({ r, c: 1 })];
    if (cellB && String(cellB.v).trim().match(/^Expenditure/)) {
      expStart = r;
      break;
    }
  }
  if (expStart < 0) throw new Error('Could not find Expenditure section');

  // Map description text → row number (first occurrence after expStart)
  // We track indent levels to disambiguate (e.g., "Hospitals" in revenue vs expenditure)
  for (let r = expStart; r <= range.e.r; r++) {
    const cellB = ws[XLSX.utils.encode_cell({ r, c: 1 })];
    if (!cellB) continue;
    const raw = String(cellB.v);
    const trimmed = raw.trim();
    if (!trimmed) continue;

    // Store first occurrence only (expenditure section)
    if (!map[trimmed]) {
      map[trimmed] = r;
    }
  }

  map['_expenditure_row'] = expStart;
  return map;
}

/**
 * Get a cell value as number (thousands → actual USD).
 */
function getCellValue(ws, row, col) {
  const cell = ws[XLSX.utils.encode_cell({ r: row, c: col })];
  if (!cell) return 0;
  const v = cell.v;
  if (typeof v === 'number') return Math.round(v * 1000);
  if (typeof v === 'string') {
    const cleaned = v.replace(/,/g, '').trim();
    if (cleaned === '' || cleaned === '-' || cleaned === '(X)' || cleaned === 'X') return 0;
    const n = parseFloat(cleaned);
    return isNaN(n) ? 0 : Math.round(n * 1000);
  }
  return 0;
}

/**
 * Extract expenditure data for one state from one worksheet.
 */
function extractStateData(ws, rowMap, stateCol) {
  const result = {};

  function extractCategory(cat) {
    const row = rowMap[cat.match];
    if (row === undefined) {
      console.warn(`  WARNING: Could not find row for "${cat.match}"`);
      return null;
    }

    const value = getCellValue(ws, row, stateCol);
    const node = {
      id: cat.key,
      name: DISPLAY_NAMES[cat.key] || cat.match,
      value: Math.abs(value), // some values can be negative (insurance trust)
    };

    if (cat.children) {
      node.children = [];
      let childSum = 0;
      for (const child of cat.children) {
        const childRow = rowMap[child.match];
        if (childRow === undefined) {
          console.warn(`  WARNING: Could not find row for child "${child.match}"`);
          continue;
        }
        const childValue = Math.abs(getCellValue(ws, childRow, stateCol));
        if (childValue > 0) {
          node.children.push({
            id: child.key,
            name: DISPLAY_NAMES[child.key] || child.match,
            value: childValue,
          });
          childSum += childValue;
        }
      }
      // If children don't sum to parent, there's a residual
      if (node.children.length === 0) {
        delete node.children;
      }
    }

    return node;
  }

  const categories = [];
  for (const cat of EXPENDITURE_CATEGORIES) {
    const node = extractCategory(cat);
    if (node && node.value > 0) {
      categories.push(node);
    }
  }

  // Total expenditure
  const totalRow = rowMap['_expenditure_row'];
  const totalValue = getCellValue(ws, totalRow, stateCol);

  return { total: Math.abs(totalValue), categories };
}

/**
 * Build tree for one year.
 */
function buildYearTree(year) {
  console.log(`\n=== Processing year ${year} ===`);
  const sheets = readYear(year);

  // Collect all states from all sheets
  const allStates = [];

  for (const ws of sheets) {
    const states = findStateColumns(ws, year);
    const rowMap = buildRowMap(ws);

    for (const state of states) {
      if (state.name === 'United States Total') continue; // skip aggregate

      const abbr = STATE_ABBR[state.name];
      if (!abbr) {
        console.warn(`  Unknown state: ${state.name}`);
        continue;
      }

      console.log(`  Parsing ${state.name} (${abbr})...`);
      const data = extractStateData(ws, rowMap, state.col);

      allStates.push({
        id: `us_${abbr.toLowerCase()}`,
        name: state.name,
        abbr,
        value: data.total,
        children: data.categories.map(c => ({
          ...c,
          id: `us_${abbr.toLowerCase()}_${c.id}`,
          ...(c.children ? {
            children: c.children.map(gc => ({
              ...gc,
              id: `us_${abbr.toLowerCase()}_${gc.id}`,
            }))
          } : {})
        })),
      });
    }
  }

  // Sort states by value descending
  allStates.sort((a, b) => b.value - a.value);

  const totalValue = allStates.reduce((sum, s) => sum + s.value, 0);

  const tree = {
    name: `US State & Local Government Spending ${year}`,
    id: 'us_states_root',
    value: totalValue,
    year,
    source: 'US Census Bureau, Annual Survey of State & Local Government Finances',
    note: 'State & Local combined expenditure. Values from Census Bureau summary tables.',
    children: allStates,
  };

  console.log(`  Total: $${(totalValue / 1e9).toFixed(1)}B across ${allStates.length} states`);
  return tree;
}

// --- Main ---
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const yearArg = args.find(a => /^\d{4}$/.test(a));

const years = yearArg ? [parseInt(yearArg)] : [2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022];

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

for (const year of years) {
  try {
    const tree = buildYearTree(year);

    if (dryRun) {
      console.log(`[DRY RUN] Would write ${tree.children.length} states for ${year}`);
      // Print top 5 states
      tree.children.slice(0, 5).forEach(s => {
        console.log(`  ${s.name}: $${(s.value / 1e9).toFixed(1)}B (${s.children.length} categories)`);
      });
    } else {
      const outPath = path.join(OUTPUT_DIR, `us_states_tree_${year}.json`);
      fs.writeFileSync(outPath, JSON.stringify(tree, null, 2));
      console.log(`  Written to ${outPath}`);
    }
  } catch (err) {
    console.error(`ERROR processing ${year}: ${err.message}`);
  }
}

console.log('\nDone!');
