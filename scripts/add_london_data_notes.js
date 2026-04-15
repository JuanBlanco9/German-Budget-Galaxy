#!/usr/bin/env node
/**
 * Adds _data_notes to the London borough tree nodes where we have known
 * coverage gaps documented, so the frontend (and auditors) can see why
 * a specific borough's supplier total is less than its MHCLG value.
 */
const fs = require('fs');
const path = require('path');

const TREE = path.join(__dirname, '..', 'data', 'uk', 'uk_budget_tree_2024.json');

const NOTES = {
  'Ealing': 'FY 2023/24 supplier data covers 10/12 months — May and June 2023 files from the council\'s open-data portal are SQL query dumps with non-standard headers that the classifier pipeline cannot parse. Ealing also publishes at £250 threshold so the volume in the other 10 months is larger than a strict £500 disclosure.',
  'Hammersmith and Fulham': 'FY 2023/24 supplier data covers 3/4 quarters — Q3 Oct-Dec 2023 was never crawled by the Wayback Machine and is not accessible via any mirror. Q1 and Q2 were recovered from the live origin after a User-Agent override (the files were unlinked from the public page but still served). Q4 is the only quarter still publicly listed.',
  'Hackney': 'FY 2023/24 supplier data covers 11/12 months — the Google Drive file listed under the "May 2023" heading on hackney.gov.uk is actually a tenders register (SME / VCSO / PO Reference schema), not the spend transaction file. The correct May 2023 spend file ID was not identified during discovery. Hackney publishes at £250 threshold.',
  'Lewisham': 'FY 2023/24 supplier data covers 10/12 months — April and June 2023 .ashx redirects return 404 on the live Lewisham site (the legacy Sitecore paths broke in a CMS migration). Lewisham publishes at £250 threshold.',
  'Sutton': 'FY 2023/24 supplier data covers 11/12 months — September 2023 is missing from the Liferay DMS listing at sutton.gov.uk (earlier Septembers 2018-2022 exist but not 2023). All other months present.',
  'Waltham Forest': 'FY 2023/24 supplier data covers 7/12 months — April through August 2023 files were purged by the council\'s rolling window. September 2023 through March 2024 remain published.',
  'Kingston Upon Thames': 'FY 2023/24 supplier data: 12/12 months recovered. Earlier discovery suggested Kingston stopped publishing in 2013, but a follow-up alternate-source search found the full FY 2023/24 dataset at kingston.gov.uk/your-council/privacy-and-data/local-government-transparency-code/finance (latin-1 encoded CSVs).',
  'Enfield': 'FY 2023/24 supplier data: 12/12 months recovered. Enfield uses Cloudflare bot management on their council portal; downloads required a Playwright persistent Chrome profile with a cf_clearance cookie. Published at £250 threshold.'
};

const tree = JSON.parse(fs.readFileSync(TREE, 'utf8'));
let added = 0;
function walk(n) {
  const name = n.get ? n.get('name') : n.name;
  if (NOTES[name]) {
    n._data_notes = NOTES[name];
    added++;
  }
  if (n.children) n.children.forEach(walk);
}
walk(tree);
fs.writeFileSync(TREE, JSON.stringify(tree, null, 2));
console.log(`Added _data_notes to ${added} London borough nodes`);
