#!/usr/bin/env node
/**
 * add_source_urls.js
 *
 * Adds clickable `source_url` fields to each council entry in
 * council_spend_lookup_2024.json. The inject_council_spend_metadata.js
 * picks these up and propagates them to every service node's
 * _top_suppliers metadata, so the frontend can render a clickable link.
 *
 * For GLA subsystem where each service maps to a different publisher
 * (LFB, TfL, GLA core, MPS), we also write per-service source_url
 * entries under services[name].source_url so each service node gets the
 * correct link.
 */

const fs = require('fs');
const path = require('path');

const LOOKUP = path.join(__dirname, '..', 'data', 'uk', 'local_authorities', 'spend', 'council_spend_lookup_2024.json');

// Council-level source URLs. Keys match the lookup JSON keys.
const COUNCIL_URLS = {
  // Pre-session councils
  'Camden': 'https://opendata.camden.gov.uk/Finance/Camden-Payments-to-Suppliers/nzbs-6v3d',
  'Rochdale': 'https://www.rochdale.gov.uk/council/council-spending/Pages/payments-to-suppliers.aspx',
  'Manchester': 'https://www.manchester.gov.uk/info/200031/council_expenditure_and_performance/7665/payments_to_suppliers',
  'Leeds': 'https://datamillnorth.org/dataset/leeds-city-council-transactions-over-500',
  'Bristol': 'https://www.bristol.gov.uk/council-and-mayor/council-finance/spending-over-500',
  'Sheffield': 'https://www.sheffield.gov.uk/your-city-council/spending-and-performance/payments-suppliers-over-250',
  'Dudley': 'https://www.dudley.gov.uk/council-community/about-the-council/information-performance/transparency/payments-over-500/',
  'Nottinghamshire': 'https://www.nottinghamshire.gov.uk/council-and-democracy/council-spending/payments-to-suppliers',
  'Lambeth': 'https://www.lambeth.gov.uk/finance-and-performance/council-finances/payments-over-500',
  'Merton': 'https://www.merton.gov.uk/council/council-expenditure',
  'South Gloucestershire': 'https://www.southglos.gov.uk/council-and-democracy/council-budgets-and-spending/payments-to-suppliers/',
  'East Sussex': 'https://www.eastsussex.gov.uk/your-council/about/transparency/finance/spending-over-500',
  'Norfolk': 'https://www.norfolk.gov.uk/what-we-do-and-how-we-work/transparency/spending-over-500',
  'Kent': 'https://www.kent.gov.uk/about-the-council/information-and-data/open-data/invoices-paid-over-250',
  'Cornwall': 'https://www.cornwall.gov.uk/council-and-democracy/council-information-and-accounts/finance-information-for-cornwall-council/payments-to-suppliers/',
  'Southwark': 'https://www.southwark.gov.uk/council-and-democracy/transparency/how-we-spend-our-money/payments-to-suppliers',
  'Hertfordshire': 'https://www.hertfordshire.gov.uk/about-the-council/freedom-of-information-and-council-data/data-and-statistics/payments-to-suppliers/payments-to-suppliers.aspx',
  'Buckinghamshire': 'https://www.buckinghamshire.gov.uk/your-council/access-to-information-and-data/open-data/payments-to-suppliers/',
  'North Yorkshire': 'https://datanorthyorkshire.org/dataset/payments-to-suppliers',
  'Bradford': 'https://datahub.bradford.gov.uk/ebase/datahub/dataset/get.do?datasetId=9',
  'Liverpool': 'https://liverpool.gov.uk/council/transparency-and-performance/payments-to-suppliers/',
  'Croydon': 'https://www.croydon.gov.uk/council/transparency-and-performance/open-data/council-spending-over-ps500',
  'Coventry': 'https://www.coventry.gov.uk/council-spending/expenditure-exceeding-500',
  'Birmingham': 'https://cityobservatory.birmingham.gov.uk/explore/dataset/expenditure-over-ps500-2024-25/',

  // Session 2026-04-14 additions
  'Essex': 'https://data.essex.gov.uk/dataset/day-to-day-spending',
  'West Sussex': 'https://www.westsussex.gov.uk/about-the-council/how-the-council-works/council-spending/',
  'Lancashire': 'https://transparency.lancashire.gov.uk/',
  'Devon': 'https://www.devon.gov.uk/factsandfigures/dataset/spending-over-500/',
  'Staffordshire': 'https://www.staffordshire.gov.uk/council-and-democracy/transparency/expenditure-exceeding-ps500/20232024',
  'Lincolnshire': 'https://lcc.portaljs.com/dataset/lincolnshire-county-council-spending',
  'Hampshire': 'https://www.hants.gov.uk/aboutthecouncil/informationandstats/opendata/opendatasearch/supplierpayments',
  'Surrey': 'https://www.surreyi.gov.uk/dataset/council-spending',

  // GLA: council-level fallback. Per-service URLs set below override this.
  'Greater London Authority': 'https://data.london.gov.uk/dataset/gla-group-expenditure-over-250'
};

// GLA per-service source URLs — each service maps to a different
// publisher (Police → MPS, Transport → TfL, Fire & Rescue → LFB, all
// others → GLA core). These take precedence over the council-level URL.
const GLA_SERVICE_URLS = {
  'Police': 'https://www.met.police.uk/foi-ai/af/accessing-information/published-items/?q=mopac%20mps%20expenditure',
  'Transport': 'https://tfl.gov.uk/corporate/transparency/freedom-of-information/foi-request-detail?referenceId=FOI-1306-2223',
  'Fire & Rescue': 'https://www.london-fire.gov.uk/about-us/structure-governance-and-accountability/lfc-spending-over-250/',
  'Education': 'https://data.london.gov.uk/dataset/gla-group-expenditure-over-250',
  'Planning': 'https://data.london.gov.uk/dataset/gla-group-expenditure-over-250',
  'Central Services': 'https://data.london.gov.uk/dataset/gla-group-expenditure-over-250',
  'Environment': 'https://data.london.gov.uk/dataset/gla-group-expenditure-over-250',
  'Housing': 'https://data.london.gov.uk/dataset/gla-group-expenditure-over-250',
  'Culture': 'https://data.london.gov.uk/dataset/gla-group-expenditure-over-250',
  "Children's Social Care": 'https://data.london.gov.uk/dataset/gla-group-expenditure-over-250'
};

function main() {
  const lookup = JSON.parse(fs.readFileSync(LOOKUP, 'utf8'));
  let added = 0;
  let missing = [];

  for (const [name, entry] of Object.entries(lookup)) {
    const url = COUNCIL_URLS[name];
    if (url) {
      entry.source_url = url;
      added++;
    } else {
      missing.push(name);
    }

    // GLA: per-service URL override
    if (name === 'Greater London Authority' && entry.services) {
      for (const [svcName, svcData] of Object.entries(entry.services)) {
        const svcUrl = GLA_SERVICE_URLS[svcName];
        if (svcUrl) svcData.source_url = svcUrl;
      }
    }
  }

  fs.writeFileSync(LOOKUP, JSON.stringify(lookup, null, 2), 'utf8');
  console.log(`Added source_url to ${added} councils`);
  if (missing.length > 0) {
    console.log(`Missing URLs for: ${missing.join(', ')}`);
  }
}

main();
