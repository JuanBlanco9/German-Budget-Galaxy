#!/usr/bin/env node
/**
 * Build UK Level 5+6 segmented recipient data.
 * Groups spending by Expense Area (or Entity/Cost Centre) as segments,
 * then shows top suppliers within each segment.
 *
 * Output: l5_{dept_slug}_{year}.json with "segments" array
 */
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const YEAR = 2024;
const BASE = path.resolve(__dirname, '..', 'data', 'recipients', 'uk');
const OUT_DIR = BASE;

const DEPT_TOTALS = {
  department_for_work_and_pensions: 297400000000,
  department_of_health: 214200000000,
  department_for_education: 140300000000,
  ministry_of_defence: 71900000000,
  hm_treasury: 63500000000,
  ministry_of_housing_communities_and_local_government: 46100000000,
  department_for_transport: 41200000000,
  hm_revenue_and_customs: 34300000000,
  department_for_energy_security_and_net_zero: 22100000000,
  home_office: 17400000000,
  cabinet_office: 15800000000,
  ministry_of_justice: 14300000000,
  department_for_science_innovation_and_technology: 14200000000,
  department_for_culture_media_and_sport: 13200000000,
  foreign_commonwealth_and_development_office: 12500000000,
  department_for_environment_food_and_rural_affairs: 8900000000,
  department_for_business_and_trade: 2700000000,
};

// Which column to segment by for each department
// 'expense_area' | 'entity' | 'cost_centre' | 'expense_type'
const DEPT_CONFIGS = {
  department_for_work_and_pensions: { name: 'Department for Work and Pensions', segBy: 'cost_centre', files: Array.from({length:12},(_,i)=>'dwp_'+String(i+1).padStart(2,'0')+'.csv'), dir: 'spend25k' },
  department_of_health: { name: 'Department of Health and Social Care', segBy: 'expense_area', files: Array.from({length:12},(_,i)=>'dhsc_'+String(i+1).padStart(2,'0')+'.csv'), dir: 'spend25k' },
  department_for_education: { name: 'Department for Education', segBy: 'expense_area', files: Array.from({length:12},(_,i)=>'dfe_'+String(i+1).padStart(2,'0')+'.csv'), dir: 'spend25k' },
  ministry_of_defence: { name: 'Ministry of Defence', segBy: 'expense_area', files: Array.from({length:12},(_,i)=>'mod_'+String(i+1).padStart(2,'0')+'.ods'), dir: 'spend25k' },
  hm_treasury: { name: 'HM Treasury', segBy: 'expense_area', files: [...Array.from({length:3},(_,i)=>'hmt_'+String(i+1).padStart(2,'0')+'.csv'),...Array.from({length:9},(_,i)=>'hmt_'+String(i+4).padStart(2,'0')+'.xlsx')], dir: 'spend25k' },
  department_for_transport: { name: 'Department for Transport', segBy: 'entity', files: Array.from({length:12},(_,i)=>'dft_'+String(i+1).padStart(2,'0')+'.csv'), dir: 'spend25k' },
  hm_revenue_and_customs: { name: 'HM Revenue and Customs', segBy: 'expense_area', files: Array.from({length:12},(_,i)=>'hmrc_'+String(i+1).padStart(2,'0')+'.csv'), dir: 'spend25k' },
  home_office: { name: 'Home Office', segBy: 'expense_area', files: Array.from({length:12},(_,i)=>'ho_'+String(i+1).padStart(2,'0')+'.csv'), dir: 'spend25k' },
  cabinet_office: { name: 'Cabinet Office', segBy: 'entity', files: Array.from({length:12},(_,i)=>'cab_'+String(i+1).padStart(2,'0')+'.csv'), dir: 'spend25k' },
  ministry_of_justice: { name: 'Ministry of Justice', segBy: 'expense_area', files: Array.from({length:12},(_,i)=>'moj_'+String(i+1).padStart(2,'0')+'.csv'), dir: 'spend25k' },
  department_for_science_innovation_and_technology: { name: 'DSIT', segBy: 'expense_area', files: Array.from({length:12},(_,i)=>'dsit_'+String(i+1).padStart(2,'0')+'.csv'), dir: 'spend25k' },
  department_for_culture_media_and_sport: { name: 'DCMS', segBy: 'expense_area', files: Array.from({length:12},(_,i)=>'dcms_'+String(i+1).padStart(2,'0')+'.ods'), dir: 'spend25k' },
  foreign_commonwealth_and_development_office: { name: 'FCDO', segBy: 'entity', files: Array.from({length:12},(_,i)=>'fcdo_'+String(i+1).padStart(2,'0')+'.csv'), dir: 'spend25k' },
  department_for_environment_food_and_rural_affairs: { name: 'Defra', segBy: 'entity', files: Array.from({length:12},(_,i)=>'defra_'+String(i+1).padStart(2,'0')+'.csv'), dir: 'spend25k' },
  ministry_of_housing_communities_and_local_government: { name: 'MHCLG', segBy: 'expense_area', files: Array.from({length:12},(_,i)=>'mhclg_'+String(i+1).padStart(2,'0')+'.csv'), dir: 'spend25k' },
};

// ─── DWP: map cost centre codes to benefit categories ───────
function mapDwpCostCentre(cc) {
  const u = (cc || '').toUpperCase().trim();
  if (!u) return 'Admin & Operations';
  if (/STATE PENSION|^SP |PENSION CREDIT|PENSIONER|RETIREMENT/.test(u)) return 'State Pension & Pension Credit';
  if (/UNIVERSAL CREDIT| UC |UC-|UC_/.test(u)) return 'Universal Credit';
  if (/\bPIP\b|PERSONAL INDEPENDENCE/.test(u)) return 'Personal Independence Payment';
  if (/\bESA\b|EMPLOYMENT SUPPORT|EMPLOYMENT AND SUPPORT/.test(u)) return 'Employment & Support Allowance';
  if (/HOUSING BENEFIT|\bHB\b|\bDHP\b|DISCRETIONARY HOUSING/.test(u)) return 'Housing Benefit';
  if (/CHILD|FAMILY|\bCTC\b|\bWTC\b|WORKING TAX|CHILD TAX/.test(u)) return 'Child & Family Benefits';
  if (/CARER/.test(u)) return "Carer's Allowance";
  if (/JOBSEEK|\bJSA\b|JOBCENTRE/.test(u)) return "Jobseeker's Allowance";
  if (/\bEP\b|RESTART|WHP|WORK PROGRAMME|WORK HEALTH|EMPLOYMENT PROG|CEP /.test(u)) return 'Employment Programmes (Restart/WHP)';
  if (/\bATW\b|ACCESS TO WORK/.test(u)) return 'Access to Work';
  if (/DLA|DISABILITY LIVING/.test(u)) return 'Disability Living Allowance';
  if (/ATTEND|INDUSTRIAL|INCAPACITY|SEVERE DISABLE/.test(u)) return 'Other Disability Benefits';
  if (/MONEY AND PENSIONS|FAS |FINANCIAL ASSIST/.test(u)) return 'Financial Assistance & Pensions Services';
  if (/^DIG |DIGITAL|WORKPLACE COMPUTING|CYBER|EDW |DATA WAREHOUSE/.test(u)) return 'Digital & Technology';
  if (/^OPS |OPERATIONS|^CFC /.test(u)) return 'Operations';
  if (/^FG |FINANCE GROUP|STRATEGY|^STR /.test(u)) return 'Finance & Governance';
  if (/^CHG |CHANGE|SYNERGY|GYSP/.test(u)) return 'Change Programmes';
  if (/^P&C |PEOPLE|LEARNING/.test(u)) return 'People & Change';
  if (/ADMIN|STAFF|\bHR\b|CORPORATE|LEGAL|ESTATE|FACILITIES|COMMERCIAL|PROCUREMENT|COMMS/.test(u)) return 'Admin & Operations';
  return 'Other Programmes';
}

// ─── DHSC: build from ICB allocations + non-NHS spend ───────
function buildDhscL5() {
  const BASE_DIR = path.resolve(__dirname, '..', 'data', 'recipients', 'uk');

  // Source A: NHS ICB allocations grouped by region
  const icbPath = path.join(BASE_DIR, 'recipients_uk_health_2024.json');
  let icbSegments = [];
  if (fs.existsSync(icbPath)) {
    const icb = JSON.parse(fs.readFileSync(icbPath));
    // Group ICBs by region (from their location field)
    const regions = {};
    icb.recipients.forEach(r => {
      const region = (r.location || '').replace(', England', '').trim() || 'Unknown Region';
      if (!regions[region]) regions[region] = { total: 0, icbs: [] };
      regions[region].total += r.amount;
      regions[region].icbs.push(r);
    });
    icbSegments = Object.entries(regions)
      .map(([name, d]) => ({
        segment: 'NHS ' + name,
        total: d.total,
        transactions: d.icbs.length,
        top_recipients: d.icbs.sort((a, b) => b.amount - a.amount).slice(0, 20).map((r, i) => ({
          rank: i + 1,
          name: r.name,
          type: 'Integrated Care Board',
          amount: r.amount,
          pct_of_segment: parseFloat((r.amount / d.total * 100).toFixed(2)),
        }))
      }))
      .sort((a, b) => b.total - a.total);
  }

  // Source B: Non-NHS spend from DHSC spend25k (excluding Default Group)
  const spendDir = path.join(BASE_DIR, 'spend25k');
  const dhscFiles = Array.from({length: 12}, (_, i) => `dhsc_${String(i + 1).padStart(2, '0')}.csv`);
  const nonNhsSegs = {};
  for (const f of dhscFiles) {
    const fp = path.join(spendDir, f);
    if (!fs.existsSync(fp)) continue;
    const rows = parseFileSegmented(fp, 'expense_area');
    rows.forEach(r => {
      const seg = r.segment;
      if (seg === 'Default Group' || !seg || seg === 'Other') return; // skip the problematic bucket
      if (!nonNhsSegs[seg]) nonNhsSegs[seg] = {};
      const norm = normalizeSupplier(r.supplier);
      if (!norm) return;
      if (!nonNhsSegs[seg][norm]) nonNhsSegs[seg][norm] = { originalName: r.supplier.trim(), total: 0, count: 0 };
      nonNhsSegs[seg][norm].total += r.amount;
      nonNhsSegs[seg][norm].count++;
    });
  }

  const nonNhsSegments = Object.entries(nonNhsSegs)
    .map(([segName, suppliers]) => {
      const ranked = Object.values(suppliers)
        .map(s => ({ name: s.originalName, amount: Math.round(s.total), transactions: s.count, type: classifySupplier(s.originalName) }))
        .filter(s => s.amount > 0)
        .sort((a, b) => b.amount - a.amount);
      const total = ranked.reduce((s, x) => s + x.amount, 0);
      return {
        segment: segName,
        total,
        transactions: ranked.reduce((s, x) => s + x.transactions, 0),
        top_recipients: ranked.slice(0, 20).map((r, i) => ({
          rank: i + 1, name: r.name, type: r.type, amount: r.amount,
          pct_of_segment: parseFloat((r.amount / total * 100).toFixed(2)),
        }))
      };
    })
    .filter(s => s.total > 0)
    .sort((a, b) => b.total - a.total);

  // Combine: ICB regions + non-NHS areas
  const allSegments = [...icbSegments, ...nonNhsSegments];
  const totalSpend = allSegments.reduce((s, x) => s + x.total, 0);

  return {
    dept: 'Department of Health and Social Care',
    dept_id: 'department_of_health',
    year: YEAR,
    currency: 'GBP',
    total_dept: DEPT_TOTALS.department_of_health,
    total_spend25k: totalSpend,
    partial: false,
    months_covered: 12,
    segments: allSegments,
    source: 'NHS England ICB Allocations 2024-25 + DHSC Spending Over £25,000 (non-NHS areas)',
    note: 'NHS regions show ICB commissioning allocations. Other segments show DHSC departmental spend from Spend >£25k.',
    generated: new Date().toISOString().slice(0, 10)
  };
}

// ─── MoJ: map 206 expense areas to ~12 categories ──────────
function mapMoJSegment(seg) {
  const u = (seg || '').toUpperCase();
  if (/PRISON|HMPPS|IN-CELL|OFFENDER/.test(u)) return 'Prisons & Probation';
  if (/PROBATION/.test(u)) return 'Prisons & Probation';
  if (/COURT|TRIBUNAL|HMCTS|JUDICIAL|JUDICIARY/.test(u)) return 'Courts & Tribunals';
  if (/LEGAL AID|\bLAA\b/.test(u)) return 'Legal Aid';
  if (/YOUTH|YJB|TURNAROUND/.test(u)) return 'Youth Justice';
  if (/VICTIM|WITNESS|CJS DELIVERY/.test(u)) return 'Victim & Witness Support';
  if (/FFM|FACILITIES|ESTATE|PROPERTY|WELLINGTON|BUILDING|CLEANING/.test(u)) return 'Estates & Facilities';
  if (/DIGITAL|TECHNOLOG|INFRASTRUCTURE SERVICE|SOFTWARE|NETWORK|VOICE|VIDEO|PRINT|EUCS|TECH DEBT/.test(u)) return 'Digital & Technology';
  if (/SSCL|SHARED SERVICE/.test(u)) return 'Shared Services (SSCL)';
  if (/\bHR\b|LEADERSHIP|TALENT|CAPABILITY|LEARNING|PEOPLE/.test(u)) return 'HR & People';
  if (/CORPORATE|HEADQUARTER|HEAD OFFICE|BUSINESS MANAGE|COMMERCIAL|FINANCE|GPC|BILLING/.test(u)) return 'Corporate & HQ';
  if (/POLICY|STRATEGY|RESEARCH|REFORM|DATA|ANALYTICAL/.test(u)) return 'Policy & Strategy';
  if (/GOVERNMENT LEGAL|GLD/.test(u)) return 'Government Legal Department';
  if (/ENGINEERING/.test(u)) return 'Engineering';
  return 'Other MoJ';
}

// ─── DCMS: map suppliers to cultural sector categories ──────
function mapDcmsSupplier(supplier) {
  const u = (supplier || '').toUpperCase();
  if (/BBC|BROADCASTING CORP/.test(u)) return 'BBC & Broadcasting';
  if (/CHANNEL 4|S4C/.test(u)) return 'BBC & Broadcasting';
  if (/ARTS COUNCIL/.test(u)) return 'Arts & Culture';
  if (/SPORT ENGLAND|UK SPORT|SPORTS COUNCIL/.test(u)) return 'Sport';
  if (/BRITISH MUSEUM|BRITISH LIBRARY|NATIONAL GALLERY|NATIONAL MUSEUM|V&A|VICTORIA AND ALBERT|TATE|NATURAL HISTORY|SCIENCE MUSEUM|IMPERIAL WAR|ROYAL ARMOURIES|NATIONAL PORTRAIT|HISTORIC ENGLAND|ENGLISH HERITAGE|WALLACE COLLECTION|GEFFRYE|HORNIMAN/.test(u)) return 'National Museums & Heritage';
  if (/LOTTERY|TNLCF|NATIONAL HERITAGE/.test(u)) return 'National Lottery & Heritage';
  if (/VISIT BRITAIN|VISIT ENGLAND|TOURISM/.test(u)) return 'Tourism';
  if (/RESEARCH|INNOVATION|UKRI/.test(u)) return 'Research & Innovation';
  if (/SOCIAL INVESTMENT|DORMANT/.test(u)) return 'Social Investment';
  if (/ROYAL PARK/.test(u)) return 'Royal Parks';
  if (/GAMBLING|OFCOM|INFORMATION COMMISSIONER/.test(u)) return 'Regulation';
  return 'Other DCMS';
}

// ─── FCDO: map suppliers to aid category ────────────────────
function mapFcdoSupplier(supplier) {
  const u = (supplier || '').toUpperCase();
  // Multilateral organisations
  if (/\bGAVI\b|WORLD BANK|WORLD HEALTH|WHO\b|UNICEF|UNHCR|UNDP|WFP|UNESCO|GLOBAL FUND|IDA\b|IBRD|IFC\b|GREEN CLIMATE|ASIAN DEVELOPMENT|AFRICAN DEVELOPMENT|INTER-AMERICAN|CGIAR|CEPI\b|UNITAID/.test(u)) return 'Multilateral Organisations';
  // Foreign governments
  if (/MINISTRY OF FINANCE|GOVERNMENT OF |REPUBLIC OF|KINGDOM OF|TREASURY OF|STATE OF/.test(u)) return 'Bilateral Government Aid';
  // UN agencies
  if (/\bUN\b|UNITED NATIONS/.test(u)) return 'UN Agencies';
  // International NGOs
  if (/OXFAM|SAVE THE CHILDREN|RED CROSS|MSF|CARE INTERNATIONAL|CONCERN|MERCY CORPS|IRC\b|INTERNATIONAL RESCUE|WORLD VISION|CHRISTIAN AID|ACTION AGAINST HUNGER|PLAN INTERNATIONAL|WATERAID|TEARFUND/.test(u)) return 'International NGOs';
  // UK development contractors
  if (/CROWN AGENTS|ADAM SMITH|DAI\b|PALLADIUM|MOTT MACDONALD|TETRA TECH|CARDNO|ICF\b|HTSPE|KPMG|DELOITTE|PWC|EY\b|ERNST|MCKINSEY/.test(u)) return 'Development Contractors';
  // British Council / Commonwealth
  if (/BRITISH COUNCIL|COMMONWEALTH/.test(u)) return 'British Council & Commonwealth';
  // UK operating costs
  if (/PROPERTY|ESTATE|FACILITIES|TRAVEL|DIPLOMATIC|FCO SERVICE|LOGISTICS/.test(u)) return 'FCDO Operating Costs';
  return 'Other Aid & Programmes';
}

// ─── Helpers ────────────────────────────────────────────────

function parseCSVLine(line) {
  const result = []; let current = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) { if (ch === '"') { if (i+1 < line.length && line[i+1] === '"') { current += '"'; i++; } else inQ = false; } else current += ch; }
    else { if (ch === '"') inQ = true; else if (ch === ',') { result.push(current.trim()); current = ''; } else current += ch; }
  }
  result.push(current.trim());
  return result;
}

function parseAmount(raw) {
  if (typeof raw === 'number') return raw;
  if (!raw) return 0;
  let s = String(raw).trim().replace(/[\ufeff\ufffd\u00a3£$€\s]/g, '').replace(/,/g, '');
  if (s.startsWith('(') && s.endsWith(')')) s = '-' + s.slice(1, -1);
  return parseFloat(s) || 0;
}

function normalizeSupplier(name) {
  if (!name) return '';
  let s = String(name).trim().toUpperCase();
  s = s.replace(/\b(LIMITED|LTD|PLC|LLP|INC|CORP|UK)\b\.?/g, '').trim();
  s = s.replace(/\s*-\s*[A-Z0-9]{2,5}$/g, '').trim();
  s = s.replace(/\s+/g, ' ').replace(/[.,;:\-]+$/, '').trim();
  return s;
}

function classifySupplier(name) {
  const u = (name || '').toUpperCase();
  if (/\bNHS\b/.test(u)) return 'NHS Body';
  if (/\bCOUNCIL\b|\bBOROUGH\b/.test(u)) return 'Local Authority';
  if (/\bUNIVERSIT/.test(u)) return 'University';
  if (/\bBAE\b|\bBOEING\b|\bAIRBUS\b|\bRolls.?Royce|\bTHALES\b|\bLEONARDO\b|\bMBDA\b|\bBABCOCK\b|\bQINETIQ\b/i.test(u)) return 'Defence Contractor';
  if (/\bDELOITTE\b|\bPWC\b|\bKPMG\b|\bMCKINSEY\b|\bACCENTURE\b|\bCAPGEMINI\b/i.test(u)) return 'Consultancy';
  if (/\bSERCO\b|\bCAPITA\b|\bATOS\b|\bG4S\b|\bFUJITSU\b/i.test(u)) return 'Outsourcing/IT';
  return 'Contractor';
}

// ─── Parse file with segment column ─────────────────────────

function parseFileSegmented(filePath, segBy) {
  const rows = [];
  const ext = path.extname(filePath).toLowerCase();

  // Column name patterns for each segBy type
  const SEG_PATTERNS = {
    expense_area: /expense.?area/i,
    expense_type: /expense.?type/i,
    entity: /^entity$/i,
    cost_centre: /cost.?cent|invoice.?cost/i,
  };

  if (ext === '.ods' || ext === '.xlsx') {
    try {
      const wb = XLSX.readFile(filePath);
      const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
      if (data.length < 2) return rows;
      const header = data[0].map(h => String(h || '').trim());
      const si = header.findIndex(h => /supplier/i.test(h));
      const ai = header.findIndex(h => /amount|^total$|^£$|\.amt$/i.test(h));
      const gi = header.findIndex(h => SEG_PATTERNS[segBy].test(h));
      if (si < 0 || ai < 0) return rows;
      for (let i = 1; i < data.length; i++) {
        const r = data[i];
        if (!r || !r[si]) continue;
        rows.push({
          supplier: String(r[si]),
          amount: parseAmount(r[ai]),
          segment: gi >= 0 ? String(r[gi] || 'Other').trim() : 'Other'
        });
      }
    } catch (e) { /* skip */ }
  } else {
    const raw = fs.readFileSync(filePath, 'latin1');
    const lines = raw.split('\n');
    if (lines.length < 2) return rows;
    const header = parseCSVLine(lines[0]).map(h => h.replace(/[\ufeff]/g, ''));
    const si = header.findIndex(h => /supplier/i.test(h));
    const ai = header.findIndex(h => /amount|^£$|^total$|\.amt$|value/i.test(h));
    const gi = header.findIndex(h => SEG_PATTERNS[segBy].test(h));
    if (si < 0 || ai < 0) return rows;
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const parts = parseCSVLine(line);
      if (parts.length <= Math.max(si, ai)) continue;
      rows.push({
        supplier: parts[si],
        amount: parseAmount(parts[ai]),
        segment: gi >= 0 ? (parts[gi] || 'Other').trim() : 'Other'
      });
    }
  }
  return rows;
}

// ─── Main ───────────────────────────────────────────────────

console.log('Building UK L5 segmented data for', YEAR, '\n');

// ── DHSC: special handler (ICB regions + non-NHS areas) ─────
console.log('=== Department of Health and Social Care (SPECIAL: ICB regions) ===');
const dhscL5 = buildDhscL5();
const dhscOut = path.join(OUT_DIR, `l5_department_of_health_${YEAR}.json`);
fs.writeFileSync(dhscOut, JSON.stringify(dhscL5, null, 2));
console.log(`  ${dhscL5.segments.length} segments (${dhscL5.segments.filter(s=>s.segment.startsWith('NHS ')).length} NHS regions + ${dhscL5.segments.filter(s=>!s.segment.startsWith('NHS ')).length} non-NHS areas)`);
console.log(`  #1: "${dhscL5.segments[0]?.segment}" £${(dhscL5.segments[0]?.total/1e6).toFixed(0)}M\n`);

// ── All other departments ───────────────────────────────────
for (const [deptSlug, config] of Object.entries(DEPT_CONFIGS)) {
  if (deptSlug === 'department_of_health') continue; // handled above

  const deptTotal = DEPT_TOTALS[deptSlug] || 1;
  console.log(`=== ${config.name} (seg by: ${config.segBy}) ===`);

  const allRows = [];
  let filesRead = 0;
  for (const f of config.files) {
    const fp = path.join(BASE, config.dir, f);
    if (!fs.existsSync(fp)) continue;
    const rows = parseFileSegmented(fp, config.segBy);
    if (rows.length > 0) { allRows.push(...rows); filesRead++; }
  }

  if (allRows.length === 0) { console.log('  No data\n'); continue; }

  // Group by segment -> supplier
  // Special remapping per department
  const isDwp = deptSlug === 'department_for_work_and_pensions';
  const isMoJ = deptSlug === 'ministry_of_justice';
  const isDcms = deptSlug === 'department_for_culture_media_and_sport';
  const isFcdo = deptSlug === 'foreign_commonwealth_and_development_office';
  const segMap = {};
  for (const r of allRows) {
    let seg;
    if (isDwp) seg = mapDwpCostCentre(r.segment);
    else if (isMoJ) seg = mapMoJSegment(r.segment);
    else if (isDcms) seg = mapDcmsSupplier(r.supplier);
    else if (isFcdo) seg = mapFcdoSupplier(r.supplier);
    else seg = r.segment || 'Other';
    if (!segMap[seg]) segMap[seg] = {};
    const norm = normalizeSupplier(r.supplier);
    if (!norm) continue;
    if (!segMap[seg][norm]) segMap[seg][norm] = { originalName: r.supplier.trim(), total: 0, count: 0 };
    segMap[seg][norm].total += r.amount;
    segMap[seg][norm].count++;
    if (r.supplier.trim().length > segMap[seg][norm].originalName.length) {
      segMap[seg][norm].originalName = r.supplier.trim();
    }
  }

  // Build segments array
  const segments = Object.entries(segMap)
    .map(([segName, suppliers]) => {
      const ranked = Object.values(suppliers)
        .map(s => ({ name: s.originalName, amount: Math.round(s.total), transactions: s.count, type: classifySupplier(s.originalName) }))
        .filter(s => s.amount > 0)
        .sort((a, b) => b.amount - a.amount);
      const total = ranked.reduce((s, x) => s + x.amount, 0);
      return {
        segment: segName,
        total,
        transactions: ranked.reduce((s, x) => s + x.transactions, 0),
        top_recipients: ranked.slice(0, 20).map((r, i) => ({
          rank: i + 1,
          name: r.name,
          type: r.type,
          amount: r.amount,
          pct_of_segment: parseFloat((r.amount / total * 100).toFixed(2)),
        }))
      };
    })
    .filter(s => s.total > 0)
    .sort((a, b) => b.total - a.total);

  const totalSpend = segments.reduce((s, x) => s + x.total, 0);

  const output = {
    dept: config.name,
    dept_id: deptSlug,
    year: YEAR,
    currency: 'GBP',
    total_dept: deptTotal,
    total_spend25k: totalSpend,
    partial: config.partial || false,
    months_covered: filesRead,
    segments,
    source: `UK Government Spending Over £25,000, ${config.name}, ${YEAR}` + (config.partial ? ' (partial)' : ''),
    note: 'Segmented by ' + config.segBy.replace('_', ' ') + '. Only covers transactions over £25,000.',
    generated: new Date().toISOString().slice(0, 10)
  };

  const outPath = path.join(OUT_DIR, `l5_${deptSlug}_${YEAR}.json`);
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  const topSeg = segments[0];
  console.log(`  ${filesRead} files, ${allRows.length} txns -> ${segments.length} segments`);
  if (topSeg) console.log(`  #1 segment: "${topSeg.segment}" £${(topSeg.total/1e6).toFixed(0)}M (${topSeg.top_recipients.length} suppliers, #1: ${topSeg.top_recipients[0]?.name})`);
  console.log();
}

// Also keep NHS ICB L5 (already generated by enrich_uk_nhs.js in tree)
console.log('=== DONE ===');
