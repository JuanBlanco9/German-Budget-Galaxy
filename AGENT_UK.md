# UK Data Expert -- Budget Galaxy

## Fuentes oficiales verificadas

### OSCAR (HM Treasury)
- **Source**: HM Treasury Online System for Central Accounting and Reporting
- **OSCAR II (2020-2024)**: BUD_*.xlsx files in `data/uk/`
  - Files: `BUD_20-21.xlsx` through `BUD_24-25.xlsx` (5 files)
  - Format: XLSX, 91 columns
- **OSCAR I (2015-2019)**: Annual Release CSVs (pipe-delimited, VERSION_CODE R13)
  - Source ZIPs: `2019_OSCAR_Extract_2014_15.zip` through `2020_OSCAR_Extract_2019_20.zip`
  - URL: https://www.gov.uk/government/publications/oscar-annual-release-november-2019 (2015-2018)
  - URL: https://www.gov.uk/government/publications/oscar-annual-release-november-2020 (2019)

**Key columns**:
- COL_DEPT = 6: DEPARTMENT_GROUP_LONG_NAME
- COL_ORG = 8: ORGANISATION_LONG_NAME
- COL_SUBFUNC = 48: SUB_FUNCTION_LONG_NAME
- COL_QUARTER = 2: QUARTER_SHORT_NAME
- COL_VERSION = 84: VERSION_CODE (use R13 = final outturn)
- COL_AMOUNT = 89: AMOUNT (in thousands, multiply by 1000)

**Period filtering**: Include periods 1-13 (months + final adjustments). Skip period 0 (plans).

- **Parser (OSCAR II)**: `scripts/build_uk_trees_all.py`
- **Parser (OSCAR I)**: `scripts/build_uk_trees_historical.py`
- **Output**: `data/uk/uk_budget_tree_YYYY.json`

### PESA (Public Expenditure Statistical Analyses)
- **Source**: HM Treasury, Tables 9.5-9.14 (identifiable expenditure by country and function)
- **File**: `data/uk/devolved/pesa2024_chapter9.xlsx`
- **10 COFOG sheets**: 9.5 (General Public Services) through 9.14 (Social Protection)
- **4 nations**: England, Scotland, Wales, Northern Ireland
- **Anos**: 2019-2023 (2024 pending next PESA publication)
- **Values in**: GBP millions

**EL BUG CRITICO: las columnas de anos se repiten 3 veces**:
- Columns 1-5: **TOTAL** expenditure (USE THESE)
- Columns 6-10: "of which: current" (DO NOT USE)
- Columns 11-15: "of which: capital" (DO NOT USE)
- **The bug**: reading the wrong column block makes you get "capital" instead of "total"
- **Fix**: Script only scans columns 1-5 (first occurrence of year headers)

- **Parser**: `scripts/build_uk_devolved_trees.js`
- **Output**: `data/uk/devolved/uk_devolved_tree_YYYY.json` (2019-2023)

### MHCLG Revenue Outturn (Local Authorities England)
- **URL**: https://assets.publishing.service.gov.uk/media/6937fe05e447374889cd8f4b/Revenue_Outturn_time_series_data_v3.1.csv
- **Coverage**: 2017-2025 (fiscal years mapped: 201803=2018, 202503=2025)
- **13 service areas**: Education, Highways, Children's Social Care, Adult Social Care, Public Health, Housing, Cultural, Environmental, Planning, Police, Fire, Central, Other
- **Total column**: RS_totsx_net_exp
- **6 LA types**: London Boroughs, Metropolitan Districts, Unitary Authorities, Shire Counties, Shire Districts, Other
- **Valor 2024**: GBP 123.8B
- **Parser**: `scripts/build_uk_la_trees.py`
- **Output**: `data/uk/local_authorities/uk_la_tree_YYYY.json`

### NHS England Allocations
- **URL**: https://www.england.nhs.uk/publication/allocation-of-resources-2023-24-to-2024-25/
- **Files**: `data/recipients/uk/nhs_allocations_2023_2025.xlsx`, `nhs_allocations_2025_26.xlsx`
- **Covers**: 42 ICBs (Integrated Care Boards) across 4 funding streams: Core, PMC, Other Primary Care, Running Costs
- **Total ICB allocations 2024-25**: GBP 124.4B (58.1% of DHSC dept total)
- **Top ICB**: NHS North East and North Cumbria (GBP 7.13B)

### Spend Over GBP 25,000
- **URL base**: https://www.gov.uk/government/collections/spending-over-25-000
- **5 departments covered**: DWP, DHSC, DfE, MoD, HMT (12 monthly files each for 2024)
- **Formats**: DWP=CSV, DHSC=CSV, DfE=CSV, MoD=ODS, HMT=CSV+XLSX (mixed mid-year)
- **DWP column change mid-2024**: Jan-Apr has 5 cols, May+ has 6 cols (added Transaction Number)
- **Parser**: `scripts/build_uk_recipients.js`
- **Output**: `data/recipients/uk/recipients_uk_{deptId}_2024.json`

## Scripts existentes y que hacen

| Script | Funcion |
|--------|---------|
| `scripts/build_uk_trees_all.py` | Parsea OSCAR II XLSX (2020-2024) a tree JSON |
| `scripts/build_uk_trees_historical.py` | Parsea OSCAR Annual Release CSVs (2015-2019) |
| `scripts/build_uk_la_trees.py` | Parsea MHCLG Revenue Outturn a LA trees |
| `scripts/build_uk_devolved_trees.js` | Parsea PESA Chapter 9 a devolved nation trees |
| `scripts/restructure_uk_nations.js` | Separa devolved govts de Central, remove OSCAR LG nodes, integra PESA |
| `scripts/deduce_intergovernmental_uk.js` | Calcula Barnett block grants, genera intergovernmental_uk_YYYY.json |
| `scripts/build_uk_recipients.js` | Agrega NHS Allocations + Spend >25k a top 100 recipients |

## Restructuracion de naciones devueltas

### Estructura ACTUAL del uk_budget_tree

After restructuring, the tree has this layout:
```
Root (UK Public Spending YYYY)
+-- Central Gov departments (OSCAR depts, sueltos)
+-- Scotland (OSCAR value + PESA COFOG children)
+-- Wales (OSCAR value + PESA COFOG children)
+-- Northern Ireland (OSCAR value + PESA COFOG children)
```

### Por que Scotland/Wales/NI Offices QUEDAN en Central
- Scotland Office, Wales Office, NI Office are the **senders** of the Barnett block grant
- They stay in Central because their budget IS the transfer (not the devolved spending)
- The devolved govts (Scottish Government, Welsh Assembly, NI Executive) are the **receivers**

### Por que Scottish Gov/Welsh Assembly/NI Executive fueron sacados a nivel raiz
- They represent the devolved governments' own spending
- `_loadUKCombinedTree()` pattern-matches on name:
  - `n.includes('scottish government')` -> Scotland
  - `n.includes('welsh assembly') || n.includes('welsh government')` -> Wales
  - `n.includes('northern ireland executive')` -> Northern Ireland
- OSCAR II LOCAL GOVERNMENT nodes are also removed: `/^LOCAL GOVERNMENT (SCOTLAND|WALES|NORTHERN IRELAND)$/i`

### Frontend implementation
`_loadUKCombinedTree(year)` in `index.html`:
1. Fetches raw tree from API
2. Separates devolved govts from central departments
3. Removes OSCAR LG overlap nodes
4. Clamps negative values to 0
5. Returns restructured tree in memory (never modifies files on disk)

## Consolidacion fiscal -- RESUELTA

### Barnett block grants por ano

| Ano | Scotland Office | Wales Office | NI Office | TOTAL | % Root |
|-----|----------------|-------------|-----------|-------|--------|
| 2015 | GBP 28.1B | GBP 13.4B | GBP 13.9B | GBP 55.3B | 5.8% |
| 2016 | GBP 28.0B | GBP 13.5B | GBP 14.1B | GBP 55.6B | 6.9% |
| 2017 | GBP 28.3B | GBP 14.1B | GBP 15.7B | GBP 58.1B | 6.1% |
| 2018 | GBP 30.0B | GBP 14.7B | GBP 15.7B | GBP 60.3B | 7.2% |
| 2019 | GBP 30.9B | GBP 15.1B | GBP 0B* | GBP 46.0B | 4.4% |
| 2020 | GBP 39.8B | GBP 21.7B | GBP 20.2B | GBP 81.8B | 5.1% |
| 2021 | GBP 43.1B | GBP 19.9B | GBP 21.5B | GBP 84.5B | 5.0% |
| 2022 | GBP 47.8B | GBP 19.6B | GBP 19.8B | GBP 87.2B | 6.3% |
| 2023 | GBP 45.3B | GBP 21.6B | GBP 21.0B | GBP 87.8B | 5.4% |
| 2024 | GBP 48.6B | GBP 20.5B | GBP 25.5B | GBP 94.6B | 6.8% |

*2019 NI Office absent from OSCAR that year

## Gotchas y errores conocidos -- NO REPETIR

### 1. EL BUG DE LA COLUMNA CAPITAL en PESA 9.5-9.14
- Tables have 3 blocks of year columns: total (1-5), current (6-10), capital (11-15)
- Reading wrong block gives you capital spending instead of total
- **Fix**: Only read columns 1-5 (first occurrence of year headers)

### 2. LOCAL GOVERNMENT ENGLAND existe en OSCAR II 2020-2023 pero NO en 2024
- 2020-2023: OSCAR II includes LOCAL GOVERNMENT SCOTLAND/WALES/NI nodes (GBP 17-20B each)
- These completely overlap with devolved government nodes -> must be removed
- 2024: These nodes DISAPPEARED from OSCAR (structural change in OSCAR II reporting)
- **Fix**: `_loadUKCombinedTree()` regex `/^LOCAL GOVERNMENT (SCOTLAND|WALES|NORTHERN IRELAND)$/i` removes them only when present

### 3. PESA vs OSCAR: same money, different angles -- NOT additive
- **OSCAR**: by department (who spends it)
- **PESA**: by territory (where it's spent)
- They describe the SAME expenditure from different perspectives
- NEVER add PESA totals to OSCAR totals

### 4. OSCAR negative values crash d3.pack()
- Some departments have negative accounting entries (e.g., -GBP 37B Export Credits)
- Clamping to 0 creates zero-value parent nodes with children
- d3.pack() cannot handle zero-value parents -> produces NaN radii -> black screen
- **Fix**: Handle in memory only (clamp + remove zero-value leaves). Never modify source files.

### 5. OSCAR I vs OSCAR II scope difference
- OSCAR I (2015-2019): Totals GBP 750-960B
- OSCAR II (2020+): Totals GBP 1,200-1,700B
- OSCAR II includes additional migration/adjustment types not in OSCAR I
- This is NOT a spending increase -- it's a reporting scope change

### 6. DWP Spend >25k column change mid-2024
- Jan-Apr: 5 columns (Date, Cost Centre, Account, Supplier, Amount)
- May+: 6 columns (added Transaction Number before Amount)
- **Fix**: `build_uk_recipients.js` uses header-aware parsing (finds "Supplier" and "Amount" by name)

### 7. MoD publishes in ODS format, not CSV
- Requires xlsx library with ODS support
- All other departments use CSV or XLSX

### 8. Spend >25k only covers transactions >GBP 25k
- DWP's budget is 99% direct benefit payments (pensions, UC) -- not captured in Spend >25k
- Health dept's Spend >25k is minimal -- use NHS Allocations instead for meaningful coverage
- Coverage varies: DWP 1% of dept, DfE 41%, MoD 14%, HMT 0.3%

## Estructura de datos en data/

```
data/uk/
  uk_budget_tree_{2015..2024}.json          # 10 main trees
  intergovernmental_uk_{2015..2024}.json     # 10 deduction files
  program_enrichment.json                    # 779 entries
  backups_pre_nations/                       # Pre-restructure originals
  BUD_20-21.xlsx through BUD_24-25.xlsx     # OSCAR II source
  2019_OSCAR_Extract_*.zip (6 files)         # OSCAR I source
  devolved/
    uk_devolved_tree_{2019..2023}.json       # 5 PESA trees
    pesa2024_chapter9.xlsx                   # PESA source
  local_authorities/
    uk_la_tree_{2018..2025}.json             # 8 LA trees
    revenue_outturn_timeseries.csv           # MHCLG source
data/recipients/uk/
  recipients_uk_health_2024.json             # 42 ICBs
  recipients_uk_dwp_2024.json                # Top 100 suppliers
  recipients_uk_dfe_2024.json                # Top 100 suppliers
  recipients_uk_mod_2024.json                # Top 100 suppliers
  recipients_uk_hmt_2024.json                # Top 100 suppliers
  nhs_allocations_*.xlsx                     # NHS source
  spend25k/                                  # 60 monthly files (5 depts x 12 months)
```

## Estado actual de cobertura

| Fuente | 2015 | 2016 | 2017 | 2018 | 2019 | 2020 | 2021 | 2022 | 2023 | 2024 |
|--------|------|------|------|------|------|------|------|------|------|------|
| OSCAR | I | I | I | I | I | II | II | II | II | II |
| PESA devolved | -- | -- | -- | -- | OK | OK | OK | OK | OK | -- |
| LA England | -- | -- | -- | OK | OK | OK | OK | OK | OK | OK |
| Intergovernmental | OK | OK | OK | OK | OK | OK | OK | OK | OK | OK |
| Recipients | -- | -- | -- | -- | -- | -- | -- | -- | -- | OK |

## Proximas fuentes a explorar

- **PESA 2025**: Expected mid-2025. Will add 2024 devolved data.
- **OSCAR II 2025**: Expected ~Q2 2026 (BUD_25-26.xlsx)
- **NHS Workforce by Trust**: Blocked by Cloudflare on digital.nhs.uk -- requires manual browser download
- **LA 2026**: MHCLG updates timeseries annually

## Reglas criticas para este pais

1. OSCAR tree is restructured IN MEMORY by `_loadUKCombinedTree()` -- never modify files on disk
2. Scotland Office/Wales Office/NI Office stay in Central (they're the grant senders)
3. Scottish Government/Welsh Assembly/NI Executive are extracted as top-level siblings
4. LOCAL GOVERNMENT OSCAR II nodes are removed (2020-2023 only, absent in 2024)
5. PESA columns: always use the FIRST block (total), never current/capital blocks
6. Negative OSCAR values: clamp to 0 + remove zero-value leaves (in memory only)
7. Health recipients come from NHS Allocations (not Spend >25k)
8. DWP Spend >25k is only 1% of dept total -- appropriate disclaimer needed

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
