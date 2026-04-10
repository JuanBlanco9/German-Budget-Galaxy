/**
 * restructure_uk_nations.js
 * Restructures uk_budget_tree_{year}.json to separate devolved nations
 * from the Central Government departments list.
 *
 * Before: flat list of ~60 departments (OSCAR) including Scottish Gov, Welsh Assembly, NI Executive
 * After:  Central Government (container) + Scotland + Wales + Northern Ireland as siblings
 *
 * Also adds PESA COFOG functional breakdown as children of devolved nations.
 * Also removes OSCAR II LOCAL GOVERNMENT SCOTLAND/WALES/NI nodes (2020-2023) to avoid
 * double-counting with the devolved government nodes.
 *
 * Run: node scripts/restructure_uk_nations.js [--dry-run]
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data', 'uk');
const DEVOLVED_DIR = path.join(DATA_DIR, 'devolved');
const BACKUP_DIR = path.join(DATA_DIR, 'backups_pre_nations');
const dryRun = process.argv.includes('--dry-run');

if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

// Patterns to identify devolved government nodes (the RECIPIENTS of block grants)
const DEVOLVED_PATTERNS = [
  { id: 'uk_scotland', nameTest: n => n.includes('scottish government'), label: 'Scotland' },
  { id: 'uk_wales',    nameTest: n => n.includes('welsh assembly') || n.includes('welsh government'), label: 'Wales' },
  { id: 'uk_ni',       nameTest: n => n.includes('northern ireland executive'), label: 'Northern Ireland' },
];

// Patterns for OSCAR II LOCAL GOVERNMENT nodes (2020-2023) that overlap with devolved
const OSCAR_LG_PATTERN = /^LOCAL GOVERNMENT (SCOTLAND|WALES|NORTHERN IRELAND)$/i;

// Patterns for the Office nodes (block grant SENDERS — stay in Central)
// Scotland Office, Wales Office, NI Office → these STAY in Central Government

// Sanitize tree: clamp negative values to 0, remove empty children
function sanitize(node) {
  if (node.value < 0) node.value = 0;
  if (node.children) {
    node.children.forEach(c => sanitize(c));
    // Remove children with value <= 0
    node.children = node.children.filter(c => c.value > 0);
    if (node.children.length === 0) delete node.children;
  }
}

const years = [];
for (let y = 2015; y <= 2024; y++) years.push(y);

for (const year of years) {
  const treePath = path.join(DATA_DIR, `uk_budget_tree_${year}.json`);
  if (!fs.existsSync(treePath)) { console.log(`${year}: no tree`); continue; }

  const tree = JSON.parse(fs.readFileSync(treePath, 'utf8'));
  const origChildren = tree.children || [];

  // Separate devolved governments from central departments
  const devolved = [];
  const central = [];
  const removedLG = [];

  origChildren.forEach(c => {
    const nameLower = (c.name || '').toLowerCase().trim();

    // Check if this is a devolved government
    const devolvedMatch = DEVOLVED_PATTERNS.find(p => p.nameTest(nameLower));
    if (devolvedMatch) {
      devolved.push({ ...c, id: devolvedMatch.id, _origName: c.name, _label: devolvedMatch.label });
      return;
    }

    // Check if this is an OSCAR II LOCAL GOVERNMENT node for devolved nations
    if (OSCAR_LG_PATTERN.test((c.name || '').trim())) {
      removedLG.push({ name: c.name, value: c.value });
      return; // remove from tree — overlaps with devolved governments
    }

    // Everything else stays in Central Government
    central.push(c);
  });

  // Load PESA functional breakdown for this year's devolved nations
  const pesaPath = path.join(DEVOLVED_DIR, `uk_devolved_tree_${year}.json`);
  let pesaData = null;
  if (fs.existsSync(pesaPath)) {
    pesaData = JSON.parse(fs.readFileSync(pesaPath, 'utf8'));
  }

  // Build devolved nation nodes with PESA children
  const nationNodes = devolved.map(d => {
    const pesaNation = pesaData?.children?.find(p =>
      p.name.toLowerCase() === d._label.toLowerCase() ||
      p.id === d.id
    );
    const node = {
      id: d.id,
      name: d._label,
      value: d.value,
      _oscar_name: d._origName,
    };
    if (pesaNation && pesaNation.children) {
      // Use PESA COFOG functions as children (better functional breakdown)
      node.children = pesaNation.children;
      node._pesa_value = pesaNation.value;
      node._note = 'OSCAR value used for sizing. PESA COFOG functions show functional breakdown.';
    } else if (d.children) {
      node.children = d.children;
    }
    return node;
  });

  // Quantify block grants (Office values = approximate Barnett grants)
  const scotOffice = central.find(c => (c.name || '').toLowerCase().includes('scotland office'));
  const walesOffice = central.find(c => (c.name || '').toLowerCase().includes('wales office'));
  const niOffice = central.find(c => (c.name || '').toLowerCase().includes('northern ireland office'));
  const barnettTotal = (scotOffice?.value || 0) + (walesOffice?.value || 0) + (niOffice?.value || 0);

  // Build Central Government container
  const centralValue = central.reduce((s, c) => s + c.value, 0);
  const centralNode = {
    id: 'uk_central',
    name: 'Central Government',
    value: centralValue,
    children: central,
  };

  // Build new root
  const nationsValue = nationNodes.reduce((s, n) => s + n.value, 0);
  const newRoot = {
    name: tree.name,
    id: tree.id,
    value: centralValue + nationsValue,
    year: tree.year || year,
    source: tree.source,
    _structure: 'Central Government + Devolved Nations',
    _barnett_block_grants: barnettTotal,
    _barnett_note: `Central Government includes ~£${(barnettTotal/1e9).toFixed(0)}B in Barnett Formula block grants (via Scotland Office, Wales Office, NI Office) also counted in devolved government budgets.`,
    _removed_oscar_lg: removedLG,
    children: [centralNode, ...nationNodes],
  };

  // Sanitize: clamp negatives, remove empty nodes
  sanitize(newRoot);
  // Recalculate root value after sanitize
  newRoot.value = newRoot.children.reduce((s, c) => s + c.value, 0);

  console.log(`${year}: Central £${(centralValue/1e9).toFixed(0)}B (${central.length} depts) | Scotland £${(nationNodes.find(n=>n.id==='uk_scotland')?.value/1e9||0).toFixed(1)}B | Wales £${(nationNodes.find(n=>n.id==='uk_wales')?.value/1e9||0).toFixed(1)}B | NI £${(nationNodes.find(n=>n.id==='uk_ni')?.value/1e9||0).toFixed(1)}B | Barnett ~£${(barnettTotal/1e9).toFixed(0)}B | Removed LG: ${removedLG.length}`);

  if (!dryRun) {
    // Backup original
    const backupPath = path.join(BACKUP_DIR, `uk_budget_tree_${year}.json`);
    if (!fs.existsSync(backupPath)) {
      fs.copyFileSync(treePath, backupPath);
    }
    // Write restructured tree
    fs.writeFileSync(treePath, JSON.stringify(newRoot, null, 2));
  }
}

console.log(dryRun ? '\n[DRY RUN] No files modified.' : '\nDone! Originals backed up to ' + BACKUP_DIR);
