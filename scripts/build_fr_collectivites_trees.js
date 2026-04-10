/**
 * build_fr_collectivites_trees.js
 * Parses Eurostat S1313 (local government) COFOG data for France.
 *
 * Source: Eurostat gov_10a_exp, sector S1313, geo FR, unit MIO_EUR
 * Outputs: data/fr/collectivites/fr_collectivites_tree_{year}.json
 *
 * Values in Eurostat are € millions — multiply by 1e6.
 */
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data', 'fr', 'collectivites', 'eurostat_s1313_fr.json');
const OUT_DIR = path.join(__dirname, '..', 'data', 'fr', 'collectivites');

const raw = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));

// Parse Eurostat JSON-stat format
const cofogDim = raw.dimension.cofog99;
const timeDim = raw.dimension.time;
const cofogKeys = Object.keys(cofogDim.category.index);
const cofogLabels = cofogDim.category.label;
const timeKeys = Object.keys(timeDim.category.index);
const values = raw.value;

// Nice French labels
const COFOG_NAMES = {
  'TOTAL': 'Total',
  'GF01': 'Services généraux des administrations publiques',
  'GF02': 'Défense',
  'GF03': 'Ordre et sécurité publics',
  'GF04': 'Affaires économiques',
  'GF05': 'Protection de l\'environnement',
  'GF06': 'Logement et équipements collectifs',
  'GF07': 'Santé',
  'GF08': 'Loisirs, culture et culte',
  'GF09': 'Enseignement',
  'GF10': 'Protection sociale',
};

const COFOG_EN = {
  'GF01': 'General Public Services',
  'GF02': 'Defence',
  'GF03': 'Public Order & Safety',
  'GF04': 'Economic Affairs',
  'GF05': 'Environmental Protection',
  'GF06': 'Housing & Community',
  'GF07': 'Health',
  'GF08': 'Recreation, Culture & Religion',
  'GF09': 'Education',
  'GF10': 'Social Protection',
};

timeKeys.forEach((year, yi) => {
  const children = [];
  let total = 0;

  cofogKeys.forEach((ck, ci) => {
    if (ck === 'TOTAL') return;
    const idx = ci * timeKeys.length + yi;
    let val = values[idx];
    if (val === undefined || val === null) return;
    val = Math.round(val * 1e6); // € millions → €
    if (val <= 0) return;
    total += val;
    children.push({
      id: `fr_ct_${ck.toLowerCase()}`,
      name: COFOG_EN[ck] || cofogLabels[ck],
      name_fr: COFOG_NAMES[ck] || cofogLabels[ck],
      value: val,
    });
  });

  children.sort((a, b) => b.value - a.value);

  const tree = {
    name: `France Collectivités Territoriales ${year}`,
    id: 'fr_collectivites',
    value: total,
    year: parseInt(year),
    source: 'Eurostat gov_10a_exp, sector S1313 (Local government), France, COFOG classification',
    note: 'Total expenditure by French local governments (régions, départements, communes, EPCI). Eurostat ESA2010 accrual basis. Not consolidated against central government.',
    children,
  };

  const outPath = path.join(OUT_DIR, `fr_collectivites_tree_${year}.json`);
  fs.writeFileSync(outPath, JSON.stringify(tree, null, 2));
  console.log(`${year}: €${(total / 1e9).toFixed(1)}B (${children.length} COFOG functions)`);
  children.forEach(c => console.log(`  ${c.name}: €${(c.value / 1e9).toFixed(1)}B`));
});

console.log('\nDone!');
