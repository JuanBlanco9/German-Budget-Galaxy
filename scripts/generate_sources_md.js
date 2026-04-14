#!/usr/bin/env node
/**
 * generate_sources_md.js
 *
 * Generates data/uk/SOURCES.md — a per-council manifest of raw data
 * files, SHA256 hashes, and audit trail links. Called after the
 * lookup + tree pipelines have run.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SPEND_DIR = path.join(__dirname, '..', 'data', 'uk', 'local_authorities', 'spend');
const LOOKUP = path.join(SPEND_DIR, 'council_spend_lookup_2024.json');
const OUT = path.join(__dirname, '..', 'data', 'uk', 'SOURCES.md');

// Map lookup-key → directory name(s). Keys are the council names as they
// appear in council_spend_lookup_2024.json. Values are either a single
// directory name or an array for composite entities (GLA subsystem).
const DIR_MAP = {
  'Camden':                 ['camden_spend_2023_24.csv'],
  'Rochdale':               'rochdale',
  'Manchester':             'manchester',
  'Leeds':                  ['leeds_spend_2024.csv'],
  'Bristol':                'bristol',
  'Sheffield':              'sheffield',
  'Dudley':                 'dudley',
  'Nottinghamshire':        'nottinghamshire',
  'Lambeth':                'lambeth',
  'Merton':                 'merton',
  'South Gloucestershire':  'south_glos',
  'East Sussex':            'east_sussex',
  'Norfolk':                'norfolk',
  'Kent':                   'kent',
  'Cornwall':               'cornwall',
  'Southwark':              'southwark',
  'Hertfordshire':          'hertfordshire',
  'Buckinghamshire':        'buckinghamshire',
  'North Yorkshire':        'north_yorkshire',
  'Bradford':               'bradford',
  'Liverpool':              'liverpool',
  'Croydon':                'croydon',
  'Coventry':               'coventry',
  'Birmingham':             ['birmingham_spend_2024_25.csv'],
  'Essex':                  'essex',
  'West Sussex':            'west_sussex',
  'Lancashire':             'lancashire',
  'Devon':                  'devon',
  'Staffordshire':          'staffordshire',
  'Lincolnshire':           'lincolnshire',
  'Hampshire':              'hampshire'
  // GLA handled specially below — multiple subdirs
};

// GLA subsystem: each entity is its own subdir with its own source URL.
const GLA_SUBENTITIES = [
  {
    name: 'London Fire Brigade (LFB)',
    dir: 'lfb',
    service: 'Fire & Rescue',
    source_url: 'https://www.london-fire.gov.uk/about-us/structure-governance-and-accountability/lfc-spending-over-250/'
  },
  {
    name: 'Transport for London (TfL)',
    dir: 'tfl',
    service: 'Transport',
    source_url: 'https://tfl.gov.uk/corporate/transparency/freedom-of-information/foi-request-detail?referenceId=FOI-1306-2223'
  },
  {
    name: 'Greater London Authority core',
    dir: 'gla_core',
    service: 'Central Services / Education / Planning / Housing / Culture / Environment',
    source_url: 'https://data.london.gov.uk/dataset/gla-group-expenditure-over-250'
  },
  {
    name: 'Metropolitan Police Service (MPS)',
    dir: 'mps',
    service: 'Police',
    source_url: 'https://www.met.police.uk/foi-ai/af/accessing-information/published-items/?q=mopac%20mps%20expenditure'
  }
];

function sha256(filePath) {
  const h = crypto.createHash('sha256');
  h.update(fs.readFileSync(filePath));
  return h.digest('hex');
}

function fmtSize(bytes) {
  if (bytes < 1024) return bytes + 'B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + 'KB';
  return (bytes / (1024 * 1024)).toFixed(1) + 'MB';
}

function listFiles(spec) {
  // spec is either a directory name (walk it) or an array of explicit files
  const files = [];
  if (Array.isArray(spec)) {
    for (const rel of spec) {
      const fp = path.join(SPEND_DIR, rel);
      if (fs.existsSync(fp) && fs.statSync(fp).isFile()) {
        files.push({ path: fp, rel: rel, size: fs.statSync(fp).size });
      }
    }
  } else {
    const dir = path.join(SPEND_DIR, spec);
    if (!fs.existsSync(dir)) return [];
    for (const f of fs.readdirSync(dir).sort()) {
      const fp = path.join(dir, f);
      if (fs.statSync(fp).isFile()) {
        files.push({ path: fp, rel: `${spec}/${f}`, size: fs.statSync(fp).size });
      }
    }
  }
  return files;
}

function renderCouncilSection(name, entry) {
  const dirSpec = DIR_MAP[name];
  if (!dirSpec) return `### ${name}\n\n_No raw files tracked — data fetched via API at build time._\n\n`;

  const files = listFiles(dirSpec);
  let md = `### ${name}\n\n`;
  md += `**Live source**: [${entry.source_url || '(none)'}](${entry.source_url || '#'})  \n`;
  md += `**Wayback archive**: [${truncate(entry.archive_url || '(none)', 80)}](${entry.archive_url || '#'})  \n`;
  if (entry.captured_at) md += `**Audit link captured**: ${entry.captured_at}  \n`;
  if (entry.fy_label) md += `**Financial year**: ${entry.fy_label}  \n`;
  md += `**Publisher description**: ${entry.source || '(none)'}  \n\n`;

  if (files.length === 0) {
    md += `_No raw files found on disk — may have been processed in-memory from an API._\n\n`;
    return md;
  }

  md += `**Raw files** (${files.length}):\n\n`;
  md += `| File | Size | SHA256 (first 16) |\n`;
  md += `|---|---|---|\n`;
  let totalSize = 0;
  for (const f of files) {
    const hash = sha256(f.path);
    totalSize += f.size;
    md += `| \`${f.rel}\` | ${fmtSize(f.size)} | \`${hash.slice(0, 16)}…\` |\n`;
  }
  md += `\n**Total**: ${files.length} files, ${fmtSize(totalSize)}\n\n`;

  return md;
}

function renderGLASection(entry) {
  let md = `### Greater London Authority\n\n`;
  md += `The GLA subsystem is a synthetic entry that aggregates four independent publishers, each mapping to different service buckets under \`Other Authorities > Greater London Authority\` in the tree:\n\n`;

  for (const sub of GLA_SUBENTITIES) {
    md += `#### ${sub.name}\n\n`;
    md += `**Maps to**: Greater London Authority > ${sub.service}  \n`;
    // Find per-service metadata from GLA entry
    const svcData = entry.services && entry.services[sub.service.split(' / ')[0]];
    const svcUrl = (svcData && svcData.source_url) || sub.source_url;
    const svcArchive = svcData && svcData.archive_url;
    md += `**Live source**: [${svcUrl}](${svcUrl})  \n`;
    if (svcArchive) md += `**Wayback archive**: [${truncate(svcArchive, 80)}](${svcArchive})  \n`;

    const files = listFiles(sub.dir);
    if (files.length === 0) {
      md += `\n_No files in \`data/uk/local_authorities/spend/${sub.dir}/\`_\n\n`;
      continue;
    }
    md += `\n**Raw files** (${files.length}):\n\n`;
    md += `| File | Size | SHA256 (first 16) |\n`;
    md += `|---|---|---|\n`;
    let totalSize = 0;
    for (const f of files) {
      const hash = sha256(f.path);
      totalSize += f.size;
      md += `| \`${f.rel}\` | ${fmtSize(f.size)} | \`${hash.slice(0, 16)}…\` |\n`;
    }
    md += `\n**Total**: ${files.length} files, ${fmtSize(totalSize)}\n\n`;
  }
  return md;
}

function truncate(s, n) {
  if (!s) return s;
  return s.length > n ? s.slice(0, n) + '…' : s;
}

function main() {
  const lookup = JSON.parse(fs.readFileSync(LOOKUP, 'utf8'));

  let md = '';
  md += `# Budget Galaxy — UK Council Spend Sources Manifest\n\n`;
  md += `_Generated: ${new Date().toISOString()}_\n\n`;
  md += `This file lists every raw data source behind the supplier-level coverage on Budget Galaxy's UK Local Government tree, along with the audit trail that lets independent auditors verify that the figures shown on https://budgetgalaxy.com come from authentic government publications and were not modified after download.\n\n`;

  md += `## The three-layer audit trail\n\n`;
  md += `**Layer 1 — Live landing pages.** Each council has a \`Live source\` link to the publisher's official dataset page. These URLs may rot over time (government sites restructure, rolling windows purge old files).\n\n`;
  md += `**Layer 2 — Wayback Machine snapshots.** Each landing page has a \`Wayback archive\` link to an Internet Archive snapshot. Where the Save Page Now API accepted the request, the link points at a direct snapshot (\`web/YYYYMMDDHHMMSS/...\`). Where it returned rate-limit errors, the link falls back to Wayback's calendar view (\`web/*/...\`) which lets auditors browse any prior snapshots of that URL from earlier Internet Archive crawls.\n\n`;
  md += `**Layer 3 — Raw files committed to git with SHA256 hashes.** Every CSV/XLSX we downloaded is committed to the public repository at \`data/uk/local_authorities/spend/{council}/\`. The SHA256 hashes listed in each section below let auditors verify that a given file has not been modified since the commit in which it first appeared. Combined with the Wayback snapshot of the landing page, this provides third-party independent verification of authenticity at the time of capture.\n\n`;
  md += `**Known limitation.** Git proves integrity *after* commit, not authenticity *before* commit. For a fully sealed audit trail we would also need a Wayback snapshot of each individual raw file URL (so auditors can byte-compare our committed file against Wayback's copy), which is pending for a follow-up run using an authenticated Internet Archive S3 API key (the anonymous Save Page Now endpoint rate-limited us during the initial run). Cloudflare-protected sources (Hampshire, Surrey, MPS) will additionally be uploaded to an \`archive.org\` collection as \`Budget Galaxy — UK Councils\` for permanent public mirroring, since Wayback cannot fetch through Cloudflare's managed challenge.\n\n`;

  md += `## Councils with supplier-level metadata\n\n`;

  const councilOrder = Object.keys(lookup).filter(k => k !== 'Greater London Authority').sort();
  for (const name of councilOrder) {
    md += renderCouncilSection(name, lookup[name]);
  }

  // GLA last, with its subentity breakdown
  if (lookup['Greater London Authority']) {
    md += renderGLASection(lookup['Greater London Authority']);
  }

  md += `## Summary\n\n`;
  const totals = { councils: 0, files: 0, bytes: 0 };
  for (const [name, entry] of Object.entries(lookup)) {
    if (name === 'Greater London Authority') {
      for (const sub of GLA_SUBENTITIES) {
        const fs_ = listFiles(sub.dir);
        totals.files += fs_.length;
        totals.bytes += fs_.reduce((s, f) => s + f.size, 0);
      }
      totals.councils += 1;
    } else {
      const dirSpec = DIR_MAP[name];
      if (dirSpec) {
        const fs_ = listFiles(dirSpec);
        totals.files += fs_.length;
        totals.bytes += fs_.reduce((s, f) => s + f.size, 0);
      }
      totals.councils += 1;
    }
  }
  md += `- **Entities**: ${totals.councils} (${totals.councils - 1} councils + GLA subsystem)\n`;
  md += `- **Raw files**: ${totals.files}\n`;
  md += `- **Total size**: ${fmtSize(totals.bytes)}\n`;
  md += `- **Coverage**: 35.6% of UK Local Government England (£46.8B of £131.6B) as of 2026-04-14\n\n`;

  md += `---\n\n`;
  md += `_This manifest is regenerated by \`scripts/generate_sources_md.js\` after every council addition. To verify a file yourself:_\n\n`;
  md += "```bash\n";
  md += `git clone https://github.com/JuanBlanco9/Budget-Galaxy.git\n`;
  md += `cd Budget-Galaxy/data/uk/local_authorities/spend/hampshire\n`;
  md += `sha256sum jan_2024.xlsx\n`;
  md += "```\n";

  fs.writeFileSync(OUT, md, 'utf8');
  console.log(`Written: ${OUT} (${md.length} chars)`);
  console.log(`Summary: ${totals.councils} councils, ${totals.files} files, ${fmtSize(totals.bytes)}`);
}

main();
