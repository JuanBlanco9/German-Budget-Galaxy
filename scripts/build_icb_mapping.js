#!/usr/bin/env node
/**
 * build_icb_mapping.js
 *
 * Builds nhs_icb_trust_mapping.json by querying the NHS Spine ODS REST API
 * for every trust referenced in the TAC files. For each trust, finds the
 * active ICB commissioning relationship (Rel id=RE5, target PrimaryRoleId=RO261).
 *
 * Why API instead of zip download:
 *   The NHS Digital ODS zip files (erelate.zip, etr.zip) are CDN-blocked
 *   for non-UK / scripted requests (CloudFront 403). The Spine REST API at
 *   https://directory.spineservices.nhs.uk/ORD/2-0-0/ is publicly accessible
 *   and returns the same data per-trust.
 *
 * Strategy:
 *   1. Read trust names + NHS codes from List of Providers in BOTH TAC files
 *   2. For each trust with an NHS code: GET /organisations/{code}
 *   3. Find active Rel where id=RE5 (or RE8) AND target PrimaryRoleId=RO261
 *   4. Use the trust's "List of Providers" Region/Sector as fallback metadata
 *   5. Cache ICB names (each ICB only fetched once)
 *   6. Save mapping JSON
 *
 * Output: data/uk/nhs_icb_trust_mapping.json
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const XLSX = require('xlsx');

const DATA_DIR = path.join(__dirname, '..', 'data');
const UK_DIR = path.join(DATA_DIR, 'uk');
const OUTPUT = path.join(UK_DIR, 'nhs_icb_trust_mapping.json');
const SPINE_BASE = 'https://directory.spineservices.nhs.uk/ORD/2-0-0/organisations/';

// ─── HTTP helper ──────────────────────────────────────

function httpGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { timeout: 15000 }, (res) => {
      if (res.statusCode === 404) { resolve(null); return; }
      if (res.statusCode !== 200) { reject(new Error(`HTTP ${res.statusCode} ${url}`)); return; }
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { reject(e); } });
    }).on('error', reject).on('timeout', () => reject(new Error('timeout')));
  });
}

// ─── Read trusts from TAC files ───────────────────────

function readProviders(filePath) {
  const wb = XLSX.readFile(filePath);
  const sheet = wb.Sheets['List of Providers'];
  const rows = XLSX.utils.sheet_to_json(sheet);
  return rows
    .filter(r => r['Full name of Provider'] && r['NHS code'])
    .map(r => ({
      name: r['Full name of Provider'].trim(),
      nhs_code: r['NHS code'].trim(),
      region: (r['Region'] || '').trim(),
      sector: (r['Sector'] || '').trim()
    }));
}

// ─── Main ─────────────────────────────────────────────

async function main() {
  console.log('Building NHS ICB → Trust mapping via Spine ODS API\n');

  const trusts = [
    ...readProviders(path.join(UK_DIR, 'nhs_tac_trusts_2024.xlsx')),
    ...readProviders(path.join(UK_DIR, 'nhs_tac_ft_2024.xlsx'))
  ];
  console.log(`Loaded ${trusts.length} trusts from TAC files`);

  const icbCache = {};
  const mapping = {};
  let icbMatched = 0;
  let apiErrors = 0;

  for (let i = 0; i < trusts.length; i++) {
    const t = trusts[i];
    process.stdout.write(`\r[${i+1}/${trusts.length}] ${t.nhs_code} ${t.name.slice(0, 40).padEnd(40)}`);

    let icbCode = null;
    let icbName = null;

    try {
      const data = await httpGet(SPINE_BASE + t.nhs_code);
      if (data && data.Organisation && data.Organisation.Rels && data.Organisation.Rels.Rel) {
        const rels = data.Organisation.Rels.Rel;
        // Find active Rel pointing to ICB (PrimaryRoleId.id=RO261)
        // Prefer RE5 (commissioning), fallback to RE8 (partnership)
        const activeIcbRels = rels.filter(r =>
          r.Status === 'Active' &&
          r.Target &&
          r.Target.PrimaryRoleId &&
          r.Target.PrimaryRoleId.id === 'RO261'
        );
        const re5 = activeIcbRels.find(r => r.id === 'RE5');
        const re8 = activeIcbRels.find(r => r.id === 'RE8');
        const chosen = re5 || re8;
        if (chosen) {
          icbCode = chosen.Target.OrgId.extension;
          // Look up ICB name (cache it)
          if (icbCache[icbCode]) {
            icbName = icbCache[icbCode];
          } else {
            try {
              const icbData = await httpGet(SPINE_BASE + icbCode);
              if (icbData && icbData.Organisation) {
                icbName = icbData.Organisation.Name;
                icbCache[icbCode] = icbName;
              }
            } catch(e) { /* ignore */ }
          }
          icbMatched++;
        }
      }
    } catch (e) {
      apiErrors++;
    }

    mapping[t.nhs_code] = {
      trust_name: t.name,
      nhs_code: t.nhs_code,
      region: t.region,
      sector: t.sector,
      icb_code: icbCode,
      icb_name: icbName
    };

    // Be polite to NHS API: small delay
    await new Promise(r => setTimeout(r, 80));
  }

  process.stdout.write('\n');
  console.log(`\nResults:`);
  console.log(`  Trusts processed:      ${trusts.length}`);
  console.log(`  ICB matched:           ${icbMatched}`);
  console.log(`  No ICB / API errors:   ${trusts.length - icbMatched}  (${apiErrors} HTTP errors)`);
  console.log(`  Unique ICBs found:     ${Object.keys(icbCache).length}`);

  fs.writeFileSync(OUTPUT, JSON.stringify(mapping, null, 2));
  console.log(`\n  ✓ Written: ${path.relative(DATA_DIR, OUTPUT)}`);
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
