#!/usr/bin/env node
/**
 * Fetch UK Contracts Finder OCDS data for 2024.
 * Downloads all published contract notices, extracts buyer/supplier/value,
 * and aggregates top suppliers per department.
 *
 * OCDS API: cursor-paginated, max 100 per page, no auth required.
 * Estimated: ~78,000 notices = ~780 pages, ~30 min at 2-3s per request.
 */
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const OUT_DIR = path.resolve(__dirname, '..', 'data', 'recipients', 'uk');
const CACHE_FILE = path.join(OUT_DIR, 'contracts_finder_2024_raw.json');

// Fetch with redirect following
function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    mod.get(url, { headers: { 'Accept': 'application/json' } }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchJSON(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('JSON parse error: ' + e.message)); }
      });
    }).on('error', reject);
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Decode HTML entities in org names
function decodeHTML(s) {
  if (!s) return '';
  return s.replace(/&#039;/g, "'").replace(/&amp;/g, '&').replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&quot;/g, '"');
}

async function fetchAllContracts() {
  // Check cache
  if (fs.existsSync(CACHE_FILE)) {
    console.log('Loading from cache:', CACHE_FILE);
    return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
  }

  const allRecords = [];
  // Fetch month by month to keep page counts manageable
  const months = [];
  for (let m = 1; m <= 12; m++) {
    const from = `2024-${String(m).padStart(2, '0')}-01T00:00:00Z`;
    const lastDay = new Date(2024, m, 0).getDate();
    const to = `2024-${String(m).padStart(2, '0')}-${lastDay}T23:59:59Z`;
    months.push({ m, from, to });
  }

  for (const { m, from, to } of months) {
    let url = `https://www.contractsfinder.service.gov.uk/Published/Notices/OCDS/Search?publishedFrom=${from}&publishedTo=${to}&limit=100`;
    let pageCount = 0;
    let monthRecords = 0;

    while (url) {
      try {
        const data = await fetchJSON(url);
        const releases = data.releases || [];
        for (const r of releases) {
          const buyer = decodeHTML((r.buyer || {}).name || '');
          const title = r.tender ? r.tender.title : '';
          const desc = r.tender ? (r.tender.description || '').slice(0, 200) : '';
          let value = 0;
          if (r.awards && r.awards.length > 0) {
            value = (r.awards[0].value || {}).amount || 0;
          } else if (r.tender && r.tender.value) {
            value = r.tender.value.amount || 0;
          }
          let supplier = '';
          if (r.awards && r.awards[0] && r.awards[0].suppliers && r.awards[0].suppliers[0]) {
            supplier = decodeHTML(r.awards[0].suppliers[0].name || '');
          }
          if (buyer) {
            allRecords.push({ buyer, supplier, value, title, desc });
            monthRecords++;
          }
        }
        pageCount++;
        // Follow pagination cursor
        url = (data.links && data.links.next) ? data.links.next : null;
        if (pageCount % 10 === 0) process.stdout.write('.');
        await sleep(1500); // Be respectful
      } catch (e) {
        console.error(`\n  Error page ${pageCount}: ${e.message}`);
        url = null; // Stop this month on error
      }
    }
    console.log(`\n  Month ${m}: ${pageCount} pages, ${monthRecords} records`);
  }

  console.log(`\nTotal records: ${allRecords.length}`);

  // Cache raw data
  fs.writeFileSync(CACHE_FILE, JSON.stringify(allRecords));
  console.log(`Cached to ${CACHE_FILE} (${(fs.statSync(CACHE_FILE).size / 1e6).toFixed(1)}MB)`);

  return allRecords;
}

// Map buyer names to OSCAR department slugs
function mapBuyerToDept(buyer) {
  const b = buyer.toUpperCase();
  if (b.includes('MINISTRY OF DEFENCE') || b.includes('MOD ')) return 'ministry_of_defence';
  if (b.includes('NHS') || b.includes('HEALTH')) return 'department_of_health';
  if (b.includes('TRANSPORT') || b.includes('NETWORK RAIL') || b.includes('HIGHWAYS')) return 'department_for_transport';
  if (b.includes('HOME OFFICE') || b.includes('BORDER')) return 'home_office';
  if (b.includes('JUSTICE') || b.includes('PRISON') || b.includes('COURT')) return 'ministry_of_justice';
  if (b.includes('EDUCATION') || b.includes('ESFA') || b.includes('OFSTED')) return 'department_for_education';
  if (b.includes('HMRC') || b.includes('REVENUE')) return 'hm_revenue_and_customs';
  if (b.includes('CABINET OFFICE')) return 'cabinet_office';
  if (b.includes('FOREIGN') || b.includes('FCDO') || b.includes('DEVELOPMENT')) return 'foreign_commonwealth_and_development_office';
  if (b.includes('ENVIRONMENT') || b.includes('DEFRA') || b.includes('RURAL')) return 'department_for_environment_food_and_rural_affairs';
  if (b.includes('ENERGY') || b.includes('NUCLEAR DECOM')) return 'department_for_energy_security_and_net_zero';
  if (b.includes('SCIENCE') || b.includes('DSIT') || b.includes('UKRI')) return 'department_for_science_innovation_and_technology';
  if (b.includes('CULTURE') || b.includes('DCMS') || b.includes('SPORT')) return 'department_for_culture_media_and_sport';
  if (b.includes('HOUSING') || b.includes('MHCLG') || b.includes('COMMUNITIES')) return 'ministry_of_housing_communities_and_local_government';
  if (b.includes('TREASURY') || b.includes('HM TREASURY')) return 'hm_treasury';
  if (b.includes('BUSINESS') || b.includes('TRADE')) return 'department_for_business_and_trade';
  if (b.includes('WORK AND PENSIONS') || b.includes('DWP')) return 'department_for_work_and_pensions';
  return null; // Unknown
}

async function main() {
  console.log('=== UK Contracts Finder 2024 ===\n');
  const records = await fetchAllContracts();

  // Aggregate by department > supplier
  const depts = {};
  let mapped = 0, unmapped = 0;
  for (const r of records) {
    const deptId = mapBuyerToDept(r.buyer);
    if (!deptId) { unmapped++; continue; }
    mapped++;
    if (!depts[deptId]) depts[deptId] = {};
    const sup = r.supplier || r.buyer;
    const key = sup.toUpperCase().replace(/\b(LIMITED|LTD|PLC|LLP)\b\.?/g, '').trim();
    if (!depts[deptId][key]) depts[deptId][key] = { name: sup, total: 0, count: 0, titles: [] };
    depts[deptId][key].total += r.value;
    depts[deptId][key].count++;
    if (depts[deptId][key].titles.length < 3 && r.title) depts[deptId][key].titles.push(r.title);
  }

  console.log(`\nMapped ${mapped} records to departments, ${unmapped} unmapped`);

  // Generate contract supplement files
  for (const [deptId, suppliers] of Object.entries(depts)) {
    const ranked = Object.values(suppliers)
      .filter(s => s.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 50);

    if (ranked.length === 0) continue;

    const outPath = path.join(OUT_DIR, `contracts_${deptId}_2024.json`);
    fs.writeFileSync(outPath, JSON.stringify({
      dept_id: deptId,
      year: 2024,
      source: 'UK Contracts Finder OCDS API (contractsfinder.service.gov.uk)',
      note: 'Contract awards (not payments). Values are contract totals, which may span multiple years.',
      total_contracts: Object.values(suppliers).reduce((s, v) => s + v.count, 0),
      total_value: Object.values(suppliers).reduce((s, v) => s + v.total, 0),
      top_suppliers: ranked.map((s, i) => ({
        rank: i + 1,
        name: s.name,
        contract_value: Math.round(s.total),
        contracts: s.count,
        sample_titles: s.titles,
      })),
      generated: new Date().toISOString().slice(0, 10)
    }, null, 2));
    console.log(`  ${deptId}: ${ranked.length} suppliers, ${Object.values(suppliers).reduce((s, v) => s + v.count, 0)} contracts`);
  }

  console.log('\nDone!');
}

main().catch(e => console.error('Fatal:', e));
