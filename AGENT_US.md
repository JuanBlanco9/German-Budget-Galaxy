# US Data Expert -- Budget Galaxy

## Fuentes oficiales verificadas

### USAspending.gov (Federal Budget)
- **API**: https://api.usaspending.gov/api/v2/
- **Coverage**: 2017-2025 (9 years of federal agency trees)
- **Structure**: Agency > Federal Account > Sub-Account
- **Unit**: USD (obligated amounts)
- **RIESGO POLITICO**: Site went down during 2019 government shutdown
- **RIESGO DOGE**: Data may be modified by agencies under political pressure
- **POLITICA DEL PROYECTO**: NO usar como API en runtime. Download annually, serve from Vultr as static JSON.
- **Parser**: `scripts/build_us_trees_all.py`
- **Output**: `data/us/us_budget_tree_YYYY.json` (2017-2025, 737KB-874KB each)
- **Note**: 2015-2016 NO existen en USAspending format

### Census Bureau Annual Survey of State & Local Government Finances
- **URL pattern (2017-2022)**: `https://www2.census.gov/programs-surveys/gov-finances/tables/{YEAR}/{YY}slsstab1.xlsx`
- **URL pattern (2012-2016)**: `https://www2.census.gov/programs-surveys/gov-finances/tables/{YEAR}/summary-tables/{YY}slsstab1a.xlsx` (and `b`)
- **Directory index**: https://www2.census.gov/programs-surveys/gov-finances/tables/
- **Coverage**: 50 states + DC, 2012-2022 (11 years)
- **Format**: Excel (.xlsx)
  - 2012: 3 columns per state (S&L total, State-only, Local-only), no CV
  - 2013-2016: 5 columns per state (S&L total, S&L CV, State-only, Local-only, Local CV), split across 2 files (a=AL-MS, b=MO-WY)
  - 2017-2022: 5 columns per state, single file
- **Values**: Dollar amounts in THOUSANDS (multiply by 1000)
- **Key field**: "Expenditure1" for gross total; "Direct expenditure" for functional categories
- **Federal grants field**: "From Federal Government" row -- used to calculate _net_value
- **Source files**: `data/us/states_research/{YY}slsstab1.xlsx` (or a/b for 2012-2016)
- **Parser**: `scripts/build_us_state_trees.js`
- **Output**: `data/us/states/us_states_tree_YYYY.json` (gross values)
- **2023+ NOT AVAILABLE**: Census Bureau has ~2 year lag for full state finance data

### State Trees (Gross vs Net)
- **Gross trees**: `data/us/states/us_states_tree_YYYY.json` -- full state & local spending
- **Net trees**: `data/us/states/us_states_tree_YYYY_net.json` -- with `_net_value` and `_federal_grants` fields
- **_net_value** = gross - federal grants (avoids double-counting with federal budget)
- **SIEMPRE usar _net_value cuando se combina con el arbol federal en el Multiverse**
- **Deduction script**: `scripts/deduce_intergovernmental_us.js`

## Scripts existentes y que hacen

| Script | Funcion |
|--------|---------|
| `scripts/build_us_trees_all.py` | Descarga USAspending API v2, genera federal trees 2017-2025 |
| `scripts/build_us_state_trees.js` | Parsea Census Bureau Excel a state trees 2012-2022 |
| `scripts/deduce_intergovernmental_us.js` | Extrae "From Federal Government", genera net trees + intergovernmental JSONs |

## Estructura de datos en data/

```
data/us/
  us_budget_tree_{2017..2025}.json          # 9 federal trees
  intergovernmental_us_{2012..2022}.json     # 11 deduction files
  program_enrichment.json                    # 2,467 federal program descriptions
  agencies_2024.json                         # Agency list
  enrichment_top50.json                      # Top 50 program descriptions
  states/
    us_states_tree_{2012..2022}.json         # 11 gross state trees
    us_states_tree_{2012..2022}_net.json     # 11 net state trees
    us_states_enrichment.json                # 92 entries (51 states + 41 categories)
  states_research/
    {12..22}slsstab1.xlsx (or a/b)           # Census Bureau source files
    STATE_DATA_SOURCES_RESEARCH.md           # Source documentation
```

## Consolidacion fiscal -- RESUELTA

### Federal grants a estados por ano

| Ano | Gross Total | Federal Grants | Net Total | % Deduccion |
|-----|------------|----------------|-----------|-------------|
| 2012 | $1,341.3B | $248.3B | $1,093.0B | 18.5% |
| 2013 | $3,191.2B | $583.3B | $2,607.9B | 18.3% |
| 2014 | $3,290.1B | $602.2B | $2,687.9B | 18.3% |
| 2015 | $3,405.4B | $658.0B | $2,747.4B | 19.3% |
| 2016 | $3,532.8B | $694.0B | $2,838.8B | 19.6% |
| 2017 | $3,676.5B | $711.8B | $2,964.7B | 19.4% |
| 2018 | $3,823.4B | $741.5B | $3,081.8B | 19.4% |
| 2019 | $3,987.8B | $762.9B | $3,224.9B | 19.1% |
| 2020 | $4,250.3B | $912.1B | $3,338.2B | 21.5% |
| 2021 | $4,509.1B | $1,120.2B | $3,388.9B | 24.8% |
| 2022 | $4,300.0B | $1,257.9B | $3,042.2B | 29.3% |

**Note**: 2012 has lower gross total ($1.3T vs $3.2T for 2013+) due to Census methodology change.

**Major federal grant categories**: Medicaid (~$600B), Education (~$100B), Highways (~$50B), disaster relief (variable).

**Example California 2022**: $691.6B gross -> $161.7B federal grants -> $529.9B net

## Estructura en el Multiverse

### Combined tree layout
```
United States YYYY
+-- Federal agencies (sueltos, directly from USAspending)
+-- 50 States (container sphere, id: us_50states, color: #1a5a9e)
    +-- California (using _net_value)
    +-- Texas (using _net_value)
    +-- ... (50 states + DC)
```

### _loadUSCombinedTree() implementation
1. Fetches federal tree from API (`/budget/country/us?year=YYYY`)
2. Fetches states net tree from `/data/us/states/us_states_tree_YYYY_net.json`
3. Uses `_net_value` (not `value`) for each state
4. Federal agencies stay as direct children of root
5. "50 States" sphere groups all states as one container
6. Fallback: returns federal only if states file missing (2023+)

### State regional colors
```
Northeast (ne): #1a3d7a -- CT ME MA NH NJ NY PA RI VT (9)
South (s):      #a01c1c -- AL AR DC DE FL GA KY LA MD MS NC OK SC TN TX VA WV (17+DC)
Midwest (mw):   #c06010 -- IL IN IA KS MI MN MO NE ND OH SD WI (12)
West (w):       #1e6a35 -- AK AZ CA CO HI ID MT NV NM OR UT WA WY (13)
```

## 29 Functional Categories (Census Bureau)

1. Education (parent: Higher Ed, Elementary & Secondary, Other Ed)
2. Libraries
3. Public Welfare (includes Medicaid)
4. Hospitals
5. Health
6. Employment Security Administration
7. Veterans' Services
8. Highways
9. Air Transportation
10. Parking Facilities
11. Sea & Inland Port Facilities
12. Police Protection
13. Fire Protection
14. Correction
15. Protective Inspection & Regulation
16. Natural Resources
17. Parks & Recreation
18. Housing & Community Development
19. Sewerage
20. Solid Waste Management
21. Financial Administration
22. Judicial & Legal
23. General Public Buildings
24. Other Government Administration
25. Interest on General Debt
26. Miscellaneous Commercial Activities
27. Other & Unallocable
28. Utility Expenditure (parent: Water, Electric, Gas, Transit)
29. Insurance Trust Expenditure (parent: Unemployment, Retirement, Workers' Comp)

## Gotchas y errores conocidos -- NO REPETIR

### 1. 2012 Census data has different scope
- $1.3T vs $3.2T for 2013+ -- Census methodology changed between 2012 and 2013
- Not a bug, but may confuse time series comparisons

### 2. Federal grants peaked in 2022 at 29.3%
- Driven by COVID relief, Medicaid expansion, infrastructure spending
- The _net_value deduction is largest in 2022 ($1.258T)

### 3. Census Bureau Excel format changes
- 2012: 3 cols/state, no CV column
- 2013-2016: Split across 2 files (a/b), 5 cols/state
- 2017-2022: Single file, 5 cols/state
- Parser handles all three formats

### 4. State trees only go through 2022
- Census Bureau has ~2 year publication lag
- 2023 data: only quarterly review available (23statenlocaltqrr.xlsx, limited)
- Multiverse shows "50 States" only for years 2017-2022

### 5. USAspending.gov availability risk
- Went down during 2019 shutdown
- DOGE may modify data at agency level
- **Policy**: Download annually, serve static. NEVER call USAspending API at runtime.

### 6. "From Federal Government" row in Census
- This is the KEY row for calculating intergovernmental deductions
- It appears as a revenue source in the state finance tables
- The amount represents federal grants received by each state
- ALWAYS use this to compute _net_value

## Estado actual de cobertura

| Fuente | 2012 | 2013-16 | 2017 | 2018 | 2019 | 2020 | 2021 | 2022 | 2023 | 2024 | 2025 |
|--------|------|---------|------|------|------|------|------|------|------|------|------|
| Federal | -- | -- | OK | OK | OK | OK | OK | OK | OK | OK | OK |
| States (gross) | OK | OK | OK | OK | OK | OK | OK | OK | -- | -- | -- |
| States (net) | OK | OK | OK | OK | OK | OK | OK | OK | -- | -- | -- |
| Intergovernmental | OK | OK | OK | OK | OK | OK | OK | OK | -- | -- | -- |
| Multiverse combined | -- | -- | OK | OK | OK | OK | OK | OK | -- | -- | -- |

## Proximas fuentes a explorar

- **Census 2023 State Finances**: Expected ~2025. Will extend states to 2023.
- **USAspending Awards API**: For Level 4 (recipient) granularity. Download offline, never runtime.
  - URL: `https://api.usaspending.gov/api/v2/search/spending_by_award/`
  - Can get individual contractors, grants, loans per agency
- **BEA (Bureau of Economic Analysis)**: State GDP for normalization
- **CBO Budget Projections**: For forward-looking estimates (2026+)

## Reglas criticas para este pais

1. SIEMPRE usar `_net_value` (not `value`) for state nodes when combining with federal
2. Census amounts are in THOUSANDS -- multiply by 1000
3. Federal trees: 2017-2025 only (2015-2016 don't exist in USAspending)
4. State trees: 2012-2022 only (Census ~2 year lag)
5. Multiverse combined: 2017-2022 only (overlap of federal + state coverage)
6. USAspending: download annually, serve static. NEVER use as runtime API.
7. "50 States" sphere uses id `us_50states` and color `#1a5a9e`

## Infraestructura del proyecto

- **Server**: 96.30.199.112 (Vultr Atlanta)
- **Path**: /opt/germany-ngo-map/
- **SSH**: `ssh -i ~/.ssh/id_agro_intel root@96.30.199.112`
- **Deploy frontend**: `scp -i ~/.ssh/id_agro_intel "D:/germany-ngo-map/frontend/index.html" root@96.30.199.112:/opt/germany-ngo-map/frontend/`
- **Deploy data**: `scp -i ~/.ssh/id_agro_intel D:/germany-ngo-map/data/us/*.json root@96.30.199.112:/opt/germany-ngo-map/data/us/`
- **Validate JS**: `node -e "const h=require('fs').readFileSync('D:/germany-ngo-map/frontend/index.html','utf8');const s=h.indexOf('<script>');const e=h.lastIndexOf('</script>');try{new Function(h.slice(s+8,e));console.log('OK')}catch(e){console.log('ERR:'+e.message)}"`
- **Restart API**: `ssh -i ~/.ssh/id_agro_intel root@96.30.199.112 "pkill -f uvicorn; sleep 1; cd /opt/germany-ngo-map; nohup /opt/germany-ngo-map/venv/bin/uvicorn api.main:app --host 0.0.0.0 --port 8088 --workers 2 > /var/log/budgetgalaxy.log 2>&1 &"`

## Reglas de datos (INVIOLABLES)

1. NUNCA agregar datos sin fuente verificada y descargada
2. NUNCA usar aproximaciones del training data del LLM
3. SIEMPRE documentar URL + fecha de descarga en campo "source"
4. SIEMPRE crear intergovernmental_{cc}_{year}.json al combinar multiples niveles de gobierno
5. SIEMPRE validar JS antes de deployar
6. SIEMPRE hacer backup antes de modificar trees (`data/backups/`)
