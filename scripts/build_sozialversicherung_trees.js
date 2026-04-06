/**
 * build_sozialversicherung_trees.js
 *
 * Parses GKV (Gesetzliche Krankenversicherung) and Pflege (Pflegeversicherung)
 * Excel files from the Bundesgesundheitsministerium and outputs structured JSON
 * for the Budget Galaxy visualization.
 *
 * Data sources:
 *   - GKV KJ1 2012-2017: Endgültige Rechnungsergebnisse (annual accounts)
 *   - GKV KV45 2024: Vorläufige Rechnungsergebnisse Q1-Q4 2024
 *   - GKV KV45 2025: Vorläufige Rechnungsergebnisse Q1-Q4 2025
 *   - Pflege 1995-2025: Finanzentwicklung der sozialen Pflegeversicherung
 *
 * All output values are integers in EUR.
 */

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const SV_DIR = path.join(__dirname, '..', 'data', 'de', 'sozialversicherung');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Round to integer EUR, handling floating-point noise */
function toEurInt(val) {
  if (val === null || val === undefined || val === '' || val === '---' || val === '-----') return null;
  const n = Number(val);
  if (isNaN(n)) return null;
  return Math.round(n);
}

/** Convert "Mrd EUR" float to integer EUR */
function mrdToEur(val) {
  if (val === null || val === undefined || val === '' || val === '---' || val === '-----') return null;
  const n = Number(val);
  if (isNaN(n)) return null;
  return Math.round(n * 1e9);
}

/** Sort children array by value descending */
function sortDesc(children) {
  return children.sort((a, b) => (b.value || 0) - (a.value || 0));
}

// ---------------------------------------------------------------------------
// GKV: Parse KJ1 (2012-2017) - Annual final accounts
// ---------------------------------------------------------------------------
// Structure: Each year is a separate sheet.
// Columns for 2015-2017: col1=name, col2=code, col3=type, col4=BVA, col5=BUND(nationwide)
// Key expenditure codes (using 'P' or 'b' suffix variants):
//   04099P/04099b = Ärztliche Behandlung
//   04299Z        = Zahnärztliche Behandlung insgesamt
//   04399b        = Arzneimittel
//   04499b        = Hilfsmittel
//   04599b        = Heilmittel
//   04699P        = Krankenhausbehandlung insgesamt
//   04799P/04799b = Krankengeld
//   05999         = Leistungsausgaben Insgesamt

function parseGkvKj1() {
  const filePath = path.join(SV_DIR, 'gkv_kj1_2012_2017.xlsx');
  if (!fs.existsSync(filePath)) {
    console.warn('GKV KJ1 file not found:', filePath);
    return {};
  }

  const wb = XLSX.readFile(filePath);
  const result = {};

  // We only process 2015-2017 (2012-2014 lack sub-category P/b codes in 2012-2013)
  // Actually 2014 has them too, but the task asks for 2015-2025
  const targetYears = ['2015', '2016', '2017'];

  for (const yearStr of targetYears) {
    if (!wb.SheetNames.includes(yearStr)) continue;

    const ws = wb.Sheets[yearStr];
    const range = XLSX.utils.decode_range(ws['!ref']);

    // Build a map of code -> BUND value
    const codeMap = {};
    // Also build a map of text pattern -> BUND value for "Summe" rows
    const nameMap = {};

    for (let r = range.s.r; r <= range.e.r; r++) {
      const nameCell = ws[XLSX.utils.encode_cell({ r, c: 0 })];
      const codeCell = ws[XLSX.utils.encode_cell({ r, c: 1 })];
      const bundCell = ws[XLSX.utils.encode_cell({ r, c: 4 })]; // col5 = BUND

      const name = nameCell ? String(nameCell.v || '').trim() : '';
      const code = codeCell ? String(codeCell.v || '').trim() : '';
      const bund = bundCell ? bundCell.v : null;

      if (code) {
        codeMap[code] = bund;
      }
      if (name) {
        nameMap[name.toLowerCase()] = bund;
      }
    }

    // Extract categories - try P variant first, then b variant
    const aerzte = toEurInt(codeMap['04099P'] ?? codeMap['04099b']);
    const zahn = toEurInt(codeMap['04299Z']);
    const arznei = toEurInt(codeMap['04399b'] ?? codeMap['04399P']);
    const hilfs = toEurInt(codeMap['04499b'] ?? codeMap['04499P']);
    const heil = toEurInt(codeMap['04599b'] ?? codeMap['04599P']);
    const kh = toEurInt(codeMap['04699P'] ?? codeMap['04699b']);
    const kg = toEurInt(codeMap['04799P'] ?? codeMap['04799b']);
    const total = toEurInt(codeMap['05999']);

    if (total === null) {
      console.warn(`GKV KJ1 ${yearStr}: no total found, skipping`);
      continue;
    }

    // Compute "Sonstige Leistungsausgaben" as residual
    const namedSum = (aerzte || 0) + (zahn || 0) + (arznei || 0) + (hilfs || 0) +
                     (heil || 0) + (kh || 0) + (kg || 0);
    const sonstige = total - namedSum;

    const year = parseInt(yearStr);
    result[year] = {
      total,
      categories: {
        sv_gkv_kh: { name: 'Krankenhausbehandlung', value: kh },
        sv_gkv_aerzte: { name: 'Ärztliche Behandlung', value: aerzte },
        sv_gkv_arznei: { name: 'Arzneimittel', value: arznei },
        sv_gkv_zahn: { name: 'Zahnärztliche Behandlung', value: zahn },
        sv_gkv_krankengeld: { name: 'Krankengeld', value: kg },
        sv_gkv_heilmittel: { name: 'Heilmittel', value: heil },
        sv_gkv_hilfsmittel: { name: 'Hilfsmittel', value: hilfs },
        sv_gkv_sonstige: { name: 'Sonstige Leistungsausgaben', value: sonstige }
      }
    };

    console.log(`GKV KJ1 ${yearStr}: total=${total.toLocaleString('de-DE')} EUR`);
  }

  return result;
}

// ---------------------------------------------------------------------------
// GKV: Parse KV45 (quarterly accounts) - 2024 and 2025
// ---------------------------------------------------------------------------
// Structure: col1=name, col2=code, col3=BAS, col4=BUND(nationwide)
// Uses "Summe ..." rows instead of P/b/Z codes

function parseGkvKv45(fileName, sheetName, year) {
  const filePath = path.join(SV_DIR, fileName);
  if (!fs.existsSync(filePath)) {
    console.warn(`GKV KV45 file not found: ${filePath}`);
    return null;
  }

  const wb = XLSX.readFile(filePath);
  if (!wb.SheetNames.includes(sheetName)) {
    // Try to find it
    const found = wb.SheetNames.find(s => s.includes(String(year)));
    if (!found) {
      console.warn(`Sheet "${sheetName}" not found in ${fileName}. Available: ${wb.SheetNames.join(', ')}`);
      return null;
    }
    sheetName = found;
  }

  const ws = wb.Sheets[sheetName];
  const range = XLSX.utils.decode_range(ws['!ref']);

  // Build maps
  const summeMap = {};  // lowercase name -> BUND value
  const codeMap = {};   // code -> BUND value

  for (let r = range.s.r; r <= range.e.r; r++) {
    const nameCell = ws[XLSX.utils.encode_cell({ r, c: 0 })];
    const codeCell = ws[XLSX.utils.encode_cell({ r, c: 1 })];
    const bundCell = ws[XLSX.utils.encode_cell({ r, c: 3 })]; // col4 = BUND

    const name = nameCell ? String(nameCell.v || '').trim() : '';
    const code = codeCell ? String(codeCell.v || '').trim() : '';
    const bund = bundCell ? bundCell.v : null;

    if (name) {
      summeMap[name.toLowerCase()] = bund;
    }
    if (code) {
      codeMap[code] = bund;
    }
  }

  // Find category totals by matching "Summe ..." row names
  const findSumme = (patterns) => {
    for (const p of patterns) {
      for (const [key, val] of Object.entries(summeMap)) {
        if (key.includes(p.toLowerCase())) {
          return toEurInt(val);
        }
      }
    }
    return null;
  };

  const aerzte = findSumme(['summe ärztliche behandlung', 'summe \xe4rztliche behandlung']);

  // For Zahnärztliche: prefer combined row, otherwise sum the two
  let zahn = findSumme(['summe zahnärzte und zahnersatz', 'summe zahn\xe4rzte und zahnersatz']);
  if (zahn === null) {
    const zahnBehandlung = findSumme(['summe zahnärztliche behandlung', 'summe zahn\xe4rztliche behandlung']);
    const zahnErsatz = findSumme(['summe zahnersatz']);
    if (zahnBehandlung !== null && zahnErsatz !== null) {
      zahn = zahnBehandlung + zahnErsatz;
    }
  }

  const arznei = findSumme(['summe arzneimittel']);
  const hilfs = findSumme(['summe hilfsmittel']);
  const heil = findSumme(['summe heilmittel', 'heilmittel insgesamt']);
  const kh = findSumme(['summe krankenhaus']);
  const kg = findSumme(['summe krankengeld', 'krankengeld insgesamt']);
  const total = toEurInt(codeMap['05999']);

  if (total === null) {
    console.warn(`GKV KV45 ${year}: no total (05999) found, skipping`);
    return null;
  }

  // Compute residual
  const namedSum = (aerzte || 0) + (zahn || 0) + (arznei || 0) + (hilfs || 0) +
                   (heil || 0) + (kh || 0) + (kg || 0);
  const sonstige = total - namedSum;

  console.log(`GKV KV45 ${year}: total=${total.toLocaleString('de-DE')} EUR`);

  return {
    total,
    categories: {
      sv_gkv_kh: { name: 'Krankenhausbehandlung', value: kh },
      sv_gkv_aerzte: { name: 'Ärztliche Behandlung', value: aerzte },
      sv_gkv_arznei: { name: 'Arzneimittel', value: arznei },
      sv_gkv_zahn: { name: 'Zahnärztliche Behandlung', value: zahn },
      sv_gkv_krankengeld: { name: 'Krankengeld', value: kg },
      sv_gkv_heilmittel: { name: 'Heilmittel', value: heil },
      sv_gkv_hilfsmittel: { name: 'Hilfsmittel', value: hilfs },
      sv_gkv_sonstige: { name: 'Sonstige Leistungsausgaben', value: sonstige }
    }
  };
}

// ---------------------------------------------------------------------------
// Pflege: Parse Finanzentwicklung Excel
// ---------------------------------------------------------------------------
// Sheet "2007-2021": row4 has year headers (col2=2007...col16=2021), values in Mrd EUR
// Sheet "2022-2025": row4 has year headers (col2=2022...col5=2025), values in Mrd EUR
// Key rows (by row index in the expenditure section):
//   row 23: Leistungsausgaben (total)
//   row 25: Geldleistung
//   row 26: Pflegesachleistung
//   row 27: Verhinderungspflege
//   row 28: Tages-/Nachtpflege
//   row 29: Zusätzliche ambulante Betreuungs- und Entlastungsleistungen
//   row 30: Kurzzeitpflege
//   row 31: Soziale Sicherung der Pflegepersonen
//   row 32: Hilfsmittel/Wohnumfeldverbesserung
//   row 33: Vollstationäre Pflege
//   row 34: Vollstationäre Pflege in Behindertenheimen
//   row 35: Stationäre Vergütungszuschläge
//   row 36: Vergütungszuschläge für zusätzl. Personal (only 2019+)
//   row 37: Pflegeberatung
//   row 38: Sonstige Leistungsausgaben

function parsePflege() {
  const filePath = path.join(SV_DIR, 'pflege_finanzentwicklung.xlsx');
  if (!fs.existsSync(filePath)) {
    console.warn('Pflege file not found:', filePath);
    return {};
  }

  const wb = XLSX.readFile(filePath);
  const result = {};

  // Helper: parse a Pflege sheet for given years
  function parseSheet(sheetName, yearStartCol, yearStart) {
    const ws = wb.Sheets[sheetName];
    if (!ws) {
      console.warn(`Sheet "${sheetName}" not found in Pflege file`);
      return;
    }

    const range = XLSX.utils.decode_range(ws['!ref']);

    // Read header row (row index 3 = row 4 in 1-based) to find year columns
    const yearCols = {};
    for (let c = 1; c <= range.e.c; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r: 3, c })];
      if (cell && cell.v) {
        const y = parseInt(String(cell.v));
        if (y >= 1995 && y <= 2030) {
          yearCols[y] = c;
        }
      }
    }

    // Build a name->row mapping by scanning column 0
    // We need to identify rows by their text content
    const rowData = {};
    for (let r = 0; r <= range.e.r; r++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c: 0 })];
      if (cell && cell.v) {
        const name = String(cell.v).trim();
        rowData[r] = name;
      }
    }

    // Find key rows by matching text patterns
    function findRow(patterns) {
      for (const [r, name] of Object.entries(rowData)) {
        const lower = name.toLowerCase().replace(/\s+/g, ' ').trim();
        for (const p of patterns) {
          if (lower.includes(p.toLowerCase())) {
            return parseInt(r);
          }
        }
      }
      return null;
    }

    const rowLeistung = findRow(['leistungsausgaben']);
    const rowGeld = findRow(['geldleistung']);
    const rowSachl = findRow(['pflegesachleistung']);
    const rowVerhinderung = findRow(['verhinderungspflege']);
    const rowTagNacht = findRow(['tages-/nachtpflege', 'tages-/ nachtpflege']);
    const rowZusaetzl = findRow(['zus\xe4tzliche ambulante betreuungs']);
    const rowKurz = findRow(['kurzzeitpflege']);
    const rowSicherung = findRow(['soziale sicherung der pflegepersone']);
    const rowHilfsmittel = findRow(['hilfsmittel/ wohnumfeldverbesserung', 'hilfsmittel/wohnumfeldverbesserung']);
    const rowVollstat = findRow(['vollstation\xe4re pflege']);
    const rowVollstatBeh = findRow(['vollstation\xe4re pflege in behinderte']);
    const rowStatZuschlag = findRow(['station\xe4re verg\xfctungszuschl\xe4ge']);
    const rowZusatzPersonal = findRow(['verg\xfctungszuschl\xe4ge f\xfcr zus\xe4tzl']);
    const rowEigenanteil = findRow(['vollstation\xe4re eigenanteilsbegrenzu']);
    const rowPflegeberatung = findRow(['pflegeberatung']);
    const rowSonstige = findRow(['sonstige leistungsausgaben']);

    function getVal(row, col) {
      if (row === null) return null;
      const cell = ws[XLSX.utils.encode_cell({ r: row, c: col })];
      return cell ? cell.v : null;
    }

    // Process each year we care about
    for (const [year, col] of Object.entries(yearCols)) {
      const y = parseInt(year);
      if (y < 2015 || y > 2025) continue;

      const leistung = mrdToEur(getVal(rowLeistung, col));
      if (leistung === null) {
        console.warn(`Pflege ${y}: no Leistungsausgaben total, skipping`);
        continue;
      }

      const geld = mrdToEur(getVal(rowGeld, col));
      const sachl = mrdToEur(getVal(rowSachl, col));
      const verhinderung = mrdToEur(getVal(rowVerhinderung, col));
      const tagNacht = mrdToEur(getVal(rowTagNacht, col));
      const zusaetzl = mrdToEur(getVal(rowZusaetzl, col));
      const kurz = mrdToEur(getVal(rowKurz, col));
      const sicherung = mrdToEur(getVal(rowSicherung, col));
      const hilfsmittelWohn = mrdToEur(getVal(rowHilfsmittel, col));

      // Vollstationäre Pflege = main + Behindertenheime + Vergütungszuschläge + Eigenanteil
      const vollstatMain = mrdToEur(getVal(rowVollstat, col));
      const vollstatBeh = mrdToEur(getVal(rowVollstatBeh, col));
      const statZuschlag = mrdToEur(getVal(rowStatZuschlag, col));
      const zusatzPersonal = mrdToEur(getVal(rowZusatzPersonal, col));
      const eigenanteil = mrdToEur(getVal(rowEigenanteil, col));
      const pflegeberatung = mrdToEur(getVal(rowPflegeberatung, col));
      const sonstigeRaw = mrdToEur(getVal(rowSonstige, col));

      // Combined vollstationär
      const vollstat = (vollstatMain || 0) + (vollstatBeh || 0) + (statZuschlag || 0) +
                       (zusatzPersonal || 0) + (eigenanteil || 0);

      // Sonstige = everything not in the 7 named categories
      // Named: Geld + Sachl + Verhinderung + TagNacht + Kurz + Sicherung + Vollstat(combined)
      const namedSum = (geld || 0) + (sachl || 0) + (verhinderung || 0) + (tagNacht || 0) +
                       (kurz || 0) + (sicherung || 0) + vollstat;
      const sonstige = leistung - namedSum;

      result[y] = {
        total: leistung,
        categories: {
          sv_pflege_geld: { name: 'Pflegegeld', value: geld },
          sv_pflege_vollstat: { name: 'Vollstationäre Pflege', value: vollstat },
          sv_pflege_sachl: { name: 'Pflegesachleistung', value: sachl },
          sv_pflege_sicherung: { name: 'Soziale Sicherung der Pflegepersonen', value: sicherung },
          sv_pflege_verhinderung: { name: 'Verhinderungspflege', value: verhinderung },
          sv_pflege_tagnacht: { name: 'Tages-/Nachtpflege', value: tagNacht },
          sv_pflege_kurz: { name: 'Kurzzeitpflege', value: kurz },
          sv_pflege_sonstige: { name: 'Sonstige Leistungen', value: sonstige }
        }
      };

      console.log(`Pflege ${y}: total=${leistung.toLocaleString('de-DE')} EUR`);
    }
  }

  // Parse both sheets
  parseSheet('2007-2021', 2, 2007);
  parseSheet('2022-2025', 2, 2022);

  return result;
}

// ---------------------------------------------------------------------------
// Build combined trees and save outputs
// ---------------------------------------------------------------------------

function buildSvBranch(year, gkvData, pflegeData) {
  const gkv = gkvData[year];
  const pflege = pflegeData[year];

  if (!gkv && !pflege) return null;

  const children = [];

  if (gkv) {
    const gkvChildren = Object.entries(gkv.categories)
      .filter(([, v]) => v.value !== null && v.value !== 0)
      .map(([id, v]) => ({
        id,
        name: v.name,
        value: v.value
      }));

    children.push({
      id: 'sv_gkv',
      name: 'Gesetzliche Krankenversicherung (GKV)',
      value: gkv.total,
      children: sortDesc(gkvChildren)
    });
  }

  if (pflege) {
    const pflegeChildren = Object.entries(pflege.categories)
      .filter(([, v]) => v.value !== null && v.value !== 0)
      .map(([id, v]) => ({
        id,
        name: v.name,
        value: v.value
      }));

    children.push({
      id: 'sv_pflege',
      name: 'Soziale Pflegeversicherung',
      value: pflege.total,
      children: sortDesc(pflegeChildren)
    });
  }

  const total = children.reduce((sum, c) => sum + c.value, 0);

  return {
    id: 'sv',
    name: 'Sozialversicherung',
    value: total,
    children: sortDesc(children)
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  console.log('Parsing GKV data...\n');

  // Parse GKV KJ1 (2015-2017)
  const gkvKj1 = parseGkvKj1();

  // Parse GKV KV45 2024
  const gkv2024 = parseGkvKv45('gkv_kv45_2024.xlsx', '1.-4. Quartal 2024', 2024);

  // Parse GKV KV45 2025
  const gkv2025 = parseGkvKv45('gkv_kv45_2025.xlsx', '1.-4. Quartal 2025', 2025);

  // Merge GKV data
  const gkvAll = { ...gkvKj1 };
  if (gkv2024) gkvAll[2024] = gkv2024;
  if (gkv2025) gkvAll[2025] = gkv2025;

  console.log('\nParsing Pflege data...\n');
  const pflegeAll = parsePflege();

  // Save intermediate JSONs
  const gkvParsed = {};
  for (const [year, data] of Object.entries(gkvAll)) {
    gkvParsed[year] = {
      total: data.total,
      categories: Object.fromEntries(
        Object.entries(data.categories).map(([id, v]) => [id, { name: v.name, value: v.value }])
      )
    };
  }

  const pflegeParsed = {};
  for (const [year, data] of Object.entries(pflegeAll)) {
    pflegeParsed[year] = {
      total: data.total,
      categories: Object.fromEntries(
        Object.entries(data.categories).map(([id, v]) => [id, { name: v.name, value: v.value }])
      )
    };
  }

  fs.writeFileSync(
    path.join(SV_DIR, 'gkv_parsed.json'),
    JSON.stringify(gkvParsed, null, 2),
    'utf8'
  );
  console.log(`\nSaved: ${path.join(SV_DIR, 'gkv_parsed.json')}`);

  fs.writeFileSync(
    path.join(SV_DIR, 'pflege_parsed.json'),
    JSON.stringify(pflegeParsed, null, 2),
    'utf8'
  );
  console.log(`Saved: ${path.join(SV_DIR, 'pflege_parsed.json')}`);

  // Build combined SV branch for each year
  console.log('\nBuilding Sozialversicherung branches...\n');

  const allYears = new Set([
    ...Object.keys(gkvAll).map(Number),
    ...Object.keys(pflegeAll).map(Number)
  ]);

  const svBranches = {};
  for (const year of [...allYears].sort()) {
    const branch = buildSvBranch(year, gkvAll, pflegeAll);
    if (branch) {
      svBranches[year] = branch;
      const gkvStatus = gkvAll[year] ? 'GKV OK' : 'GKV missing';
      const pflegeStatus = pflegeAll[year] ? 'Pflege OK' : 'Pflege missing';
      console.log(`  ${year}: SV total=${branch.value.toLocaleString('de-DE')} EUR (${gkvStatus}, ${pflegeStatus})`);
    }
  }

  fs.writeFileSync(
    path.join(SV_DIR, 'sv_branches.json'),
    JSON.stringify(svBranches, null, 2),
    'utf8'
  );
  console.log(`\nSaved: ${path.join(SV_DIR, 'sv_branches.json')}`);

  // Summary
  console.log('\n--- Summary ---');
  console.log(`GKV years available: ${Object.keys(gkvAll).sort().join(', ')}`);
  console.log(`Pflege years available: ${Object.keys(pflegeAll).sort().join(', ')}`);
  console.log(`SV branches generated: ${Object.keys(svBranches).sort().join(', ')}`);
}

main();
