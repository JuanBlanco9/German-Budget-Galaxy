#!/usr/bin/env node
/**
 * filter_fy2324_files.js
 *
 * For each council directory that was populated by the manifest-based
 * download_from_manifest.js, identify files that do NOT correspond to
 * FY 2023/24 (April 2023 → March 2024) and move them to a local
 * archive/ subdirectory. This prevents the Haiku classifier from
 * building dept mappings contaminated with patterns from prior years
 * (council org structures change annually) and keeps the build_council_spend_lookup
 * total honest at "FY 2023/24".
 *
 * Safety rules:
 * - Only touches council directories under data/uk/local_authorities/spend/
 *   whose names match councils in council_discovery_manifest.json.
 *   Never touches existing wave-1 directories (camden, rochdale, etc).
 * - Files are MOVED to archive/, never deleted. Reversible.
 * - Files without a parseable date in the filename are inspected: the
 *   first line is read, and a date/month token extracted. If still
 *   unclear, the file is KEPT (never false-positive delete).
 *
 * Usage:
 *   node scripts/filter_fy2324_files.js [--dry-run]
 */

const fs = require('fs');
const path = require('path');

const SPEND_DIR = path.join(__dirname, '..', 'data', 'uk', 'local_authorities', 'spend');
const MANIFEST = path.join(__dirname, '..', 'data', 'uk', 'local_authorities', 'council_discovery_manifest.json');

const DRY_RUN = process.argv.includes('--dry-run');

// FY 2023/24 = April 2023 (202304) through March 2024 (202403) inclusive
const FY_YEAR_MONTHS = [
  '202304','202305','202306','202307','202308','202309',
  '202310','202311','202312','202401','202402','202403'
];

function slugify(name) {
  return String(name).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

// Try to extract a YYYYMM from a filename. Returns "YYYYMM" or null.
// Handles many naming conventions used by English councils:
//   YYYY_MM / YYYY-MM / YYYYMM / {month}-{YYYY} / {Month}{YYYY} / Q{N}.?23.?24
//   FY periods (e.g. 23_P01 = April 2023 in 13-period councils)
//   quarter-{N} spelled out + year range 2023-24
function extractYearMonth(filename) {
  const f = filename.toLowerCase();
  const MONTHS_LONG = ['january','february','march','april','may','june','july','august','september','october','november','december'];
  const MONTHS_SHORT = ['jan','feb','mar','apr','may','jun','jul','aug','sep','sept','oct','nov','dec'];
  const MONTH_NUM = {
    january:'01',february:'02',march:'03',april:'04',may:'05',june:'06',
    july:'07',august:'08',september:'09',october:'10',november:'11',december:'12',
    jan:'01',feb:'02',mar:'03',apr:'04',jun:'06',jul:'07',aug:'08',sep:'09',
    sept:'09',oct:'10',nov:'11',dec:'12'
  };

  // 1. Financial-period conventions first (more specific than plain year).
  //    "23_P01" / "23-P01" / "fy23_p01" etc. West Berkshire, Reading, etc.
  //    Period 1 = April of the fiscal year starting in that calendar year.
  let m = f.match(/(?:^|[^0-9])(\d{2})[\s._\-]*p\s*0?([1-9]|1[0-2])(?![0-9])/);
  if (m) {
    const fyStart = '20' + m[1];
    const period = parseInt(m[2], 10);
    // Period 1 = April, Period 12 = March of following year
    const monthNum = ((period + 2) % 12) + 1; // p1→4, p12→3
    const year = period <= 9 ? fyStart : String(parseInt(fyStart, 10) + (period >= 10 ? 1 : 0));
    return year + String(monthNum).padStart(2, '0');
  }

  // 2. Year range + quarter in EITHER order. Allow arbitrary text between:
  //    "2023-24 quarter 1", "2023-24-500gbp-spend-quarter-1",
  //    "Purchase-Card-Transactions-Quarter-1-2023-24", "23-24 Q1"
  function yearRangeQuarterToYm(y1raw, y2raw, qraw) {
    const y1 = parseInt('20' + y1raw, 10);
    const y2 = parseInt('20' + y2raw, 10);
    if (y2 !== y1 + 1) return null;
    const q = parseInt(qraw, 10);
    const monthMap = { 1: '05', 2: '08', 3: '11', 4: '02' };
    const monthNum = monthMap[q];
    const year = q === 4 ? String(y1 + 1) : String(y1);
    return year + monthNum;
  }
  // Year-range before quarter
  m = f.match(/(?:20)?(\d{2})[\s._\-]+(?:20)?(\d{2})\b.*?(?:q|quarter)[\s._\-]*([1-4])/);
  if (m) {
    const ym = yearRangeQuarterToYm(m[1], m[2], m[3]);
    if (ym) return ym;
  }
  // Quarter before year-range
  m = f.match(/(?:q|quarter)[\s._\-]*([1-4]).*?(?:20)?(\d{2})[\s._\-]+(?:20)?(\d{2})\b/);
  if (m) {
    const ym = yearRangeQuarterToYm(m[2], m[3], m[1]);
    if (ym) return ym;
  }

  // 3. Q{N} 2023-2024 or 23-24 or 23.24 — treat as the quarter's MIDDLE month
  m = f.match(/q\s*([1-4])[\s._\-]*(?:20)?23[._\-]*(?:20)?24/);
  if (m) {
    const q = parseInt(m[1], 10);
    return ['202305','202308','202311','202402'][q-1];
  }
  // Q{N} 2023 alone
  m = f.match(/q\s*([1-4])[\s._\-]*(20)?23(?![\d])/);
  if (m) {
    const q = parseInt(m[1], 10);
    return ['202305','202308','202311','202402'][q-1];
  }
  // Q{N} 2024 alone
  m = f.match(/q\s*([1-4])[\s._\-]*(20)?24(?![\d])/);
  if (m) {
    const q = parseInt(m[1], 10);
    return ['202405','202408','202411','202502'][q-1];
  }

  // 4. YYYY{sep}MM{sep}DD or YYYYMM — e.g. 2023_04, 2023-04-30, 202304
  m = f.match(/(20\d{2})[\s._\-]?(0[1-9]|1[0-2])(?:[\s._\-]\d{1,2})?(?![\d])/);
  if (m) return m[1] + m[2];

  // 5. MM-YYYY or MM_YYYY — e.g. 04_2023, 03-2024
  m = f.match(/(?<![\d])(0[1-9]|1[0-2])[\s._\-](20\d{2})/);
  if (m) return m[2] + m[1];

  // 6. DD-MM-YYYY — e.g. 30-04-2023, 31-03-2024
  m = f.match(/(?<![\d])(0?[1-9]|[12]\d|3[01])[\s._\-](0[1-9]|1[0-2])[\s._\-](20\d{2})/);
  if (m) return m[3] + m[2].padStart(2, '0');

  // 7. {month name}{year} with NO separator (e.g. ExpenditureApril2023,
  //    payments-to-suppliers-april2023v2). Long month names first to avoid
  //    matching "jun" inside "june". Drop the left-boundary check; a month
  //    name followed by a 4-digit year is reliable enough.
  const allMonths = [...MONTHS_LONG, ...MONTHS_SHORT].sort((a, b) => b.length - a.length);
  for (const name of allMonths) {
    const num = MONTH_NUM[name];
    // YYYY form (month followed by 20xx, optional separator)
    const r1 = new RegExp(name + '[\\s._\\-]*(20\\d{2})(?![\\d])');
    const mm = f.match(r1);
    if (mm) return mm[1] + num;
    // YY form (month followed by space/dash/underscore then 2 digits only —
    // require separator to avoid false-positive on random letters-plus-digits)
    const r2 = new RegExp('(?:^|[^a-z])' + name + '[\\s._\\-]+(\\d{2})(?![\\d])');
    const mm2 = f.match(r2);
    if (mm2) return '20' + mm2[1] + num;
    // Year before month: 2023_april / 2023april
    const r3 = new RegExp('(20\\d{2})[\\s._\\-]*' + name + '(?![a-z])');
    const mm3 = f.match(r3);
    if (mm3) return mm3[1] + num;
  }

  return null;
}

function isFY2324(ym) {
  return FY_YEAR_MONTHS.includes(ym);
}

function inspectFirstLine(fp) {
  try {
    const buf = Buffer.alloc(8192);
    const fd = fs.openSync(fp, 'r');
    const n = fs.readSync(fd, buf, 0, 8192, 0);
    fs.closeSync(fd);
    if (n === 0) return null;
    // XLSX / ZIP magic — skip inspection (can't parse without a library)
    if (buf[0] === 0x50 && buf[1] === 0x4b) return null;
    // OLE2 (legacy .xls)
    if (buf[0] === 0xd0 && buf[1] === 0xcf) return null;
    const text = buf.slice(0, n).toString('utf8', 0, n).replace(/^\uFEFF/, '');
    const firstLines = text.split(/\r?\n/).slice(0, 5).join(' ');
    return extractYearMonth(firstLines);
  } catch (e) { return null; }
}

function main() {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));

  // Only touch dirs that correspond to councils in the manifest (i.e. the
  // ones we just downloaded). Never touch wave-1 council dirs.
  const targetSlugs = new Set();
  for (const e of manifest) {
    if (!e.name) continue;
    targetSlugs.add(slugify(e.name));
  }
  // Also add a few short aliases we used internally as fallback
  console.log(`Manifest target slugs: ${targetSlugs.size}`);

  const allDirs = fs.readdirSync(SPEND_DIR).filter(f =>
    fs.statSync(path.join(SPEND_DIR, f)).isDirectory()
  );
  const toProcess = allDirs.filter(d => targetSlugs.has(d));
  console.log(`Council dirs to process: ${toProcess.length} (of ${allDirs.length} total)`);

  let totalKept = 0, totalArchived = 0, totalUnknown = 0;
  const perDir = [];

  for (const dirName of toProcess) {
    const dir = path.join(SPEND_DIR, dirName);
    const archiveDir = path.join(dir, 'archive');
    const files = fs.readdirSync(dir).filter(f => {
      const fp = path.join(dir, f);
      return fs.statSync(fp).isFile() && /\.(csv|xlsx|xls|ods|pdf|zip|bin)$/i.test(f);
    });
    if (files.length === 0) continue;

    let kept = 0, archived = 0, unknown = 0;
    for (const f of files) {
      const src = path.join(dir, f);
      let ym = extractYearMonth(f);
      if (!ym) ym = inspectFirstLine(src);
      if (!ym) {
        unknown++;
        continue;
      }
      if (isFY2324(ym)) {
        kept++;
      } else {
        if (!DRY_RUN) {
          if (!fs.existsSync(archiveDir)) fs.mkdirSync(archiveDir);
          fs.renameSync(src, path.join(archiveDir, f));
        }
        archived++;
      }
    }
    if (archived > 0 || unknown > 0) {
      perDir.push({ dir: dirName, kept, archived, unknown, total: files.length });
    }
    totalKept += kept;
    totalArchived += archived;
    totalUnknown += unknown;
  }

  console.log(`\nPer-dir report (only dirs with archived/unknown):`);
  for (const r of perDir.sort((a,b) => b.archived - a.archived)) {
    console.log(`  ${r.dir.padEnd(55)} kept=${r.kept} archived=${r.archived} unknown=${r.unknown} total=${r.total}`);
  }

  console.log(`\nTotals across ${toProcess.length} processed dirs:`);
  console.log(`  FY 23/24 kept:  ${totalKept}`);
  console.log(`  Archived:       ${totalArchived}`);
  console.log(`  Unknown (kept): ${totalUnknown}`);
  if (DRY_RUN) console.log(`  (DRY RUN — no files moved)`);
}

main();
