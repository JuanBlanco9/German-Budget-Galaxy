/**
 * deduce_intergovernmental_de.js
 * Scans bundeshaushalt_tree_{year}.json for Bund→SV transfer Titel,
 * sums them, and writes data/de/intergovernmental_de_{year}.json.
 *
 * These transfers appear in both the Bundeshaushalt AND the SV branches,
 * causing double-counting when summed in the combined tree.
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const OUT_DIR = path.join(DATA_DIR, 'de');

// Known Bund→SV transfer Titel ID prefixes (stable across 2015-2025)
// Format: {idPrefix, description}
const SV_TRANSFER_PATTERNS = [
  // EPL 11 Kap 1102 — Rentenversicherung (GRV)
  { prefix: '110263681', desc: 'Allgemeiner Bundeszuschuss GRV' },
  { prefix: '110263683', desc: 'Zusätzlicher Bundeszuschuss GRV' },
  { prefix: '110263684', desc: 'Beitragszahlungen Kindererziehungszeiten GRV' },
  { prefix: '110263682', desc: 'Bundeszuschuss GRV Beitrittsgebiet' },
  { prefix: '110263201', desc: 'Grundsicherung im Alter und bei Erwerbsminderung' },
  { prefix: '110263616', desc: 'Beteiligung knappschaftliche RV' },
  { prefix: '110263612', desc: 'Erstattung Überführung Zusatzversorgungssysteme RV' },
  { prefix: '110263685', desc: 'Zuschüsse RV-Beiträge Werkstätten/Inklusionsbetriebe' },
  { prefix: '110263614', desc: 'Erstattung Invalidenrenten Beitrittsgebiet' },
  { prefix: '110263617', desc: 'Beteiligung hüttenknappschaftliche Zusatzversicherung' },
  // EPL 15 Kap 1501 — GKV Gesundheitsfonds
  { prefix: '150163606', desc: 'Pauschale Abgeltung Gesundheitsfonds (GKV)' },
  { prefix: '150163608', desc: 'Ergänzender Bundeszuschuss Gesundheitsfonds' },
  { prefix: '150163603', desc: 'Leistungen Bund Gesundheitsfonds SARS-CoV-2' },
  // EPL 15 Kap 1502 — Pflegeversicherung
  { prefix: '150263603', desc: 'Pauschale Beteiligung Pflegeversicherung' },
  // EPL 10 — Landwirtschaftliche Sozialversicherung
  { prefix: '100163601', desc: 'Zuschüsse Alterssicherung Landwirte' },
  { prefix: '100163604', desc: 'Zuschüsse Krankenversicherung Landwirte' },
  { prefix: '100163602', desc: 'Zuschüsse landwirtschaftliche Unfallversicherung' },
  { prefix: '100163605', desc: 'Zuschüsse Zusatzaltersversorgung Landwirtschaft' },
  // EPL 60 — DDR-Renten Erstattungen an SV-Träger
  { prefix: '606763642', desc: 'Erstattung SV-Träger Renten ehem. NVA' },
  { prefix: '606763643', desc: 'Erstattung SV-Träger Renten ehem. Volkspolizei' },
  { prefix: '606763645', desc: 'Erstattung SV-Träger Renten ehem. MfS' },
  { prefix: '606763644', desc: 'Erstattung SV-Träger Renten ehem. Zollverwaltung' },
  // EPL 12 — Bundeseisenbahnvermögen → DRV KBS
  { prefix: '121663405', desc: 'Zuschuss DRV KBS Renten-Zusatzversicherung Bundesbahn' },
  // EPL 11 Kap 1104 — Künstlersozialkasse
  { prefix: '110463603', desc: 'Zuschuss Künstlersozialkasse' },
];

// Extract the Titel suffix (last 5 digits) from a pattern prefix
// e.g. '110263681' → '63681', '150163606' → '63606'
const SV_TITEL_SUFFIXES = {};
for (const pat of SV_TRANSFER_PATTERNS) {
  const suffix = pat.prefix.slice(-5);
  if (!SV_TITEL_SUFFIXES[suffix]) SV_TITEL_SUFFIXES[suffix] = [];
  SV_TITEL_SUFFIXES[suffix].push(pat);
}

function findTransfers(node, transfers) {
  const id = String(node.id || '');
  // Match by full ID prefix OR by Titel suffix (last 5 digits)
  // This handles both formats: '110263681' (2024) and '1163681' (2023)
  for (const pat of SV_TRANSFER_PATTERNS) {
    const suffix = pat.prefix.slice(-5);
    if (id === pat.prefix || id.startsWith(pat.prefix) || id.endsWith(suffix)) {
      // Verify it's a leaf-level node (Titel), not a Kapitel with same suffix
      if (!node.children || node.children.length === 0 || node.value < 1e9) {
        const value = node.value || 0;
        if (value > 0) {
          transfers.push({ id, name: node.name, value, desc: pat.desc });
        }
        return;
      }
    }
  }
  if (node.children) {
    for (const child of node.children) {
      findTransfers(child, transfers);
    }
  }
}

const years = [];
for (let y = 2015; y <= 2025; y++) years.push(y);

for (const year of years) {
  const treePath = path.join(DATA_DIR, `bundeshaushalt_tree_${year}.json`);
  if (!fs.existsSync(treePath)) { console.log(`${year}: no tree file`); continue; }

  const tree = JSON.parse(fs.readFileSync(treePath, 'utf8'));
  const transfers = [];
  findTransfers(tree, transfers);

  const total = transfers.reduce((s, t) => s + t.value, 0);
  const rootValue = tree.value || 0;
  const pct = rootValue > 0 ? (total / rootValue * 100) : 0;

  const result = {
    year,
    bund_to_sv_transfers: transfers.sort((a, b) => b.value - a.value),
    bund_to_sv_total: total,
    total_deduction: total,
    pct_of_root: Math.round(pct * 10) / 10,
    root_value: rootValue,
    note: 'Federal transfers to social insurance (GRV, GKV, BA, landwirtschaftliche SV) counted at both Bund and SV level. Deduct to avoid double counting.',
    source: 'bundeshaushalt.de Soll figures, Titel-level identification'
  };

  const outPath = path.join(OUT_DIR, `intergovernmental_de_${year}.json`);
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
  console.log(`${year}: €${(total / 1e9).toFixed(1)}B deduction (${pct.toFixed(1)}% of €${(rootValue / 1e9).toFixed(0)}B root)`);
}
