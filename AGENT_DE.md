# Germany Data Expert -- Budget Galaxy

## Fuentes oficiales verificadas

### Bundeshaushalt (Federal Budget)
- **URL**: https://www.bundeshaushalt.de (CSV downloads per year)
- **Formato**: CSV, 3-level hierarchy: Einzelplan (EPL) > Kapitel > Titel
- **Anos**: 2015-2025 (complete)
- **Campo**: Soll (appropriation) column in CSV
- **Valor 2024**: EUR 476B
- **Parser**: `scripts/build_yearly_trees.js`
- **Output**: `data/bundeshaushalt_tree_YYYY.json`

### Sozialversicherung (5 ramas)

| Rama | Valor 2024 | Fuente | Formato | Anos |
|------|-----------|--------|---------|------|
| GRV (Pensiones) | EUR 402.8B | DRV "Rentenversicherung in Zeitreihen" | PDF p.240-241 | 2015-2025 |
| GKV (Salud) | EUR 311.7B | BMG KJ1 + KV45 | Excel/PDF | 2015-2025 |
| BA (Empleo) | EUR 81.5B | BA Jahresrechnungen | PDF | 2015-2024 (2025 ~Q3 2026) |
| Pflege (Cuidados) | EUR 63.3B | BMG Finanzentwicklung | Excel | 2015-2025 |
| DGUV (Accidentes) | EUR 17.0B | DGUV Statistiken | PDF | 2015-2024 (2025 ~mid-2026) |

- **Parser**: `scripts/build_sozialversicherung_trees.js`
- **Data files**: `data/de/sozialversicherung/{gkv_parsed,rente_data,ba_data,pflege_parsed,dguv_data}.json`
- **Source files**: `data/de/sozialversicherung/*.xlsx` and `*.pdf`

### Lander (16 Federal States)

**2017-2021 (DETAILED, 19 functional categories)**:
- Source: Destatis Rechnungsergebnis Excel (Table 71711-12)
- Unit: 1000 EUR
- Files: `data/de/laender/laender_parsed_2017.json` through `2021.json`
- Parser: `scripts/build_laender_trees.py`

**2015-2016 & 2022-2024 (EUROSTAT COFOG, 9 categories)**:
- Source: Eurostat gov_10a_exp API, sector S1312
- Unit: MIO_EUR
- Files: `data/de/laender/laender_eurostat_2015.json` through `2024.json`

**2022-2025 (Kassenergebnis, TOTALS ONLY, no functional breakdown)**:
- Source: Destatis Kassenergebnis (Table 71511-09)
- Unit: 1000 EUR
- Files: `data/de/laender/laender_parsed_2022.json` through `2025.json`
- WARNING: 2022+ have per-state totals but NO functional breakdown
- WARNING: 2025 is partial (Q1-Q3 only)
- WARNING: Kassenergebnis = cash basis, Eurostat = accrual basis -- totals may differ

**Valor 2024**: EUR 561.6B (top: NRW 94.8B, Bayern 85.2B, BaWu 74.3B)

### Kommunen (Municipalities)
- **Source**: Eurostat gov_10a_exp API, sector S1313
- **Unit**: MIO_EUR
- **Anos**: 2015-2024 (2024 provisional)
- **Categories**: 9 COFOG functions
- **Valor 2024**: EUR 410B
- **Files**: `data/de/laender/kommunen_parsed_YYYY.json`

## Scripts existentes y que hacen

| Script | Funcion |
|--------|---------|
| `scripts/build_yearly_trees.js` | Parsea Bundeshaushalt CSVs a tree JSON |
| `scripts/build_sozialversicherung_trees.js` | Parsea GKV/Pflege Excel, GRV/BA/DGUV data a SV trees |
| `scripts/build_laender_trees.py` | Parsea Destatis Rechnungsergebnis/Kassenergebnis + Eurostat a Lander/Kommunen trees |
| `scripts/deduce_intergovernmental_de.js` | Calcula transferencias Bund->SV por Titel ID, genera intergovernmental_de_YYYY.json |
| `scripts/integrate_all_branches.js` | Combina Bund + SV + Lander + Kommunen en tree final |

## Estructura de datos en data/

```
data/de/
  intergovernmental_de_{2015..2025}.json   # 11 files, deduction data
  sozialversicherung_enrichment.json       # 70 entries
  laender_enrichment.json                  # 48 entries
  translations_new_branches.json           # 306 DE->EN translations
  DATA_LIMITATIONS.json                    # Disclaimers for 2022+ Lander
  sozialversicherung/
    sv_branches.json                       # Master SV structure
    gkv_parsed.json, rente_data.json, ba_data.json, pflege_parsed.json, dguv_data.json
    gkv_kj1_2012_2017.xlsx, gkv_kv45_2024.xlsx, gkv_kv45_2025.xlsx
    pflege_finanzentwicklung.xlsx
    ba_jahresrechnung_{2015..2024}.pdf     # 10 source PDFs
    KJ1_{2018..2023}.pdf                   # 6 source PDFs
  laender/
    laender_parsed_{2017..2025}.json       # 9 files (Destatis)
    laender_eurostat_{2015..2024}.json     # 10 files (Eurostat S1312)
    kommunen_parsed_{2015..2025}.json      # 11 files (Eurostat S1313)
    rechnungsergebnis_{2017..2021}.xlsx    # Source Excel
    kassenergebnis_{2022..2025}.xlsx       # Source Excel
data/bundeshaushalt_tree_{2015..2025}.json # 11 final integrated trees
```

## Consolidacion fiscal -- RESUELTA

### Problema
Bund->SV transfers appear in both the Bundeshaushalt AND Sozialversicherung branches, inflating the total by EUR 110-180B (6-8%).

### Montos exactos por ano

| Ano | Bund->SV | % of Root | Root |
|-----|---------|-----------|------|
| 2015 | EUR 109.5B | 7.3% | EUR 1,499.6B |
| 2016 | EUR 115.4B | 7.3% | EUR 1,576.9B |
| 2017 | EUR 121.0B | 7.6% | EUR 1,584.0B |
| 2018 | EUR 123.0B | 7.4% | EUR 1,652.8B |
| 2019 | EUR 128.3B | 7.4% | EUR 1,727.1B |
| 2020 | EUR 133.0B | 7.1% | EUR 1,865.9B |
| 2021 | EUR 151.1B | 7.3% | EUR 2,062.3B |
| 2022 | EUR 178.7B | 8.5% | EUR 2,105.3B (PEAK: +30B SARS-CoV-2) |
| 2023 | EUR 152.1B | 6.1% | EUR 2,502.2B |
| 2024 | EUR 152.9B | 6.7% | EUR 2,287.1B |
| 2025 | EUR 160.2B | 7.6% | EUR 2,105.2B |

### Principales transferencias

**GRV (EUR 117-125B/yr)**:
- 110263681: Allgemeiner Bundeszuschuss GRV (EUR 31-48B)
- 110263683: Zusatzlicher Bundeszuschuss GRV (EUR 22-32B)
- 110263684: Kindererziehungszeiten (EUR 12-19B)
- 110263682: Bundeszuschuss GRV Beitrittsgebiet (EUR 8.7-12.9B)

**GKV (EUR 14.5-30B/yr)**:
- 150163606: Pauschale Abgeltung Gesundheitsfonds (EUR 11.5-14.5B)
- 150163603: SARS-CoV-2 Gesundheitsfonds (EUR 0.1-30B, peaked 2022)

### Metodo
`scripts/deduce_intergovernmental_de.js` scans Bundeshaushalt trees for transfer Titel by ID suffix match, sums them. Handles both old format (7-digit IDs <=2023) and new format (9-digit IDs >=2024).

## Gotchas y errores conocidos -- NO REPETIR

### 1. Titel ID format change (2023->2024)
- **Old**: "1163681" (7 digits) -- **New**: "110263681" (9 digits, fully qualified)
- **Fix**: deduce_intergovernmental_de.js matches by suffix (last 5 digits stable)

### 2. 2023 Bundeshaushalt appears inflated (EUR 2.5T vs EUR 2.3T in 2024)
- **Reason**: 2023 includes one-time crisis stabilization funds + extraordinary defense spending
- **Status**: Disclaimer shown in UI

### 3. Lander data 3-4 year lag
- Destatis Rechnungsergebnis (detailed) only available through 2021
- 2022+ only have cash-basis totals without functional breakdown
- **Status**: Documented in UI disclaimers for Lander 2022+

### 4. DGUV 2016-2019 Verwaltung interpolated
- Administration costs not published for these years
- Linearly interpolated between 2015 and 2020 anchor points
- Impact: minimal (+-2-3% of admin category)

### 5. GKV source transitions
- 2012-2017: BMG KJ1 Excel files
- 2018-2023: BMG KJ1 PDFs (manual extraction)
- 2024-2025: BMG KV45 vorlaufige Excel
- Parser handles all three formats

### 6. BA 2020 COVID spike is real data, not a bug
- Kurzarbeitergeld: EUR 0.67B (2019) -> EUR 22.63B (2020)

### 7. "Grundsicherung" Titel name reuse across EPLs
- Match by full ID prefix ("110263201"), not substring, to avoid false positives

### 8. Kassenergebnis vs Rechnungsergebnis use different accounting bases
- Kasse = cash, Rechnung = accrual (closer to Eurostat ESA2010)
- Totals can differ 1-3%

## Estado actual de cobertura

| Fuente | 2015 | 2016 | 2017 | 2018 | 2019 | 2020 | 2021 | 2022 | 2023 | 2024 | 2025 |
|--------|------|------|------|------|------|------|------|------|------|------|------|
| Bundeshaushalt | OK | OK | OK | OK | OK | OK | OK | OK | OK | OK | OK |
| GRV | OK | OK | OK | OK | OK | OK | OK | OK | OK | OK | OK |
| GKV | OK | OK | OK | OK | OK | OK | OK | OK | OK | OK | OK |
| BA | OK | OK | OK | OK | OK | OK | OK | OK | OK | OK | -- |
| Pflege | OK | OK | OK | OK | OK | OK | OK | OK | OK | OK | OK |
| DGUV | OK | OK | OK | OK | OK | OK | OK | OK | OK | OK | -- |
| Lander (detailed) | EU | EU | DE | DE | DE | DE | DE | KE | KE | KE | KE* |
| Kommunen | OK | OK | OK | OK | OK | OK | OK | OK | OK | OK(p) | -- |

Legend: OK=complete, EU=Eurostat only, DE=Destatis detailed, KE=Kassenergebnis totals only, (p)=provisional, *=partial Q1-Q3

## Proximas fuentes a explorar

- Destatis Rechnungsergebnis 2022 (expected ~2025-2026) -- will unlock detailed Lander breakdown
- DGUV 2025 data (expected ~mid-2026)
- BA 2025 data (expected ~Q3 2026)
- KfW Sondervermogen (special infrastructure fund) -- may need integration

## Reglas criticas para este pais

1. Tree root always has 4 main branches: Bundeshaushalt EPLs (sueltos) + Sozialversicherung + Lander + Kommunen
2. SV branch has exactly 5 sub-branches: GRV, GKV, BA, Pflege, DGUV
3. Lander branch has 16 state nodes (never aggregate to single number)
4. Kommunen branch has 9 COFOG nodes (national aggregate only, no per-municipality)
5. Intergovernmental deductions documented by Titel ID -- never manually estimate
6. The integration script (`integrate_all_branches.js`) must be run after any component change

## Infraestructura del proyecto

- **Server**: 96.30.199.112 (Vultr Atlanta)
- **Path**: /opt/germany-ngo-map/
- **SSH**: `ssh -i ~/.ssh/id_agro_intel root@96.30.199.112`
- **Deploy frontend**: `scp -i ~/.ssh/id_agro_intel "D:/germany-ngo-map/frontend/index.html" root@96.30.199.112:/opt/germany-ngo-map/frontend/`
- **Validate JS**: `node -e "const h=require('fs').readFileSync('D:/germany-ngo-map/frontend/index.html','utf8');const s=h.indexOf('<script>');const e=h.lastIndexOf('</script>');try{new Function(h.slice(s+8,e));console.log('OK')}catch(e){console.log('ERR:'+e.message)}"`
- **Restart API**: `ssh -i ~/.ssh/id_agro_intel root@96.30.199.112 "pkill -f uvicorn; sleep 1; cd /opt/germany-ngo-map; nohup /opt/germany-ngo-map/venv/bin/uvicorn api.main:app --host 0.0.0.0 --port 8088 --workers 2 > /var/log/budgetgalaxy.log 2>&1 &"`

## Reglas de datos (INVIOLABLES)

1. NUNCA agregar datos sin fuente verificada y descargada
2. NUNCA usar aproximaciones del training data del LLM
3. SIEMPRE documentar URL + fecha de descarga en campo "source"
4. SIEMPRE crear intergovernmental_{cc}_{year}.json al combinar multiples niveles de gobierno
5. SIEMPRE validar JS antes de deployar
6. SIEMPRE hacer backup antes de modificar trees (`data/backups/`)
