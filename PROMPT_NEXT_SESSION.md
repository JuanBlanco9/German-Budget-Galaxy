# Budget Galaxy — Next Session

Contexto completo del proyecto: D:\germany-ngo-map\CONTEXT_FOR_CLAUDE.txt
Repo: https://github.com/JuanBlanco9/Budget-Galaxy
Live: https://budgetgalaxy.com
Server: 96.30.199.112 (Vultr Atlanta)

## REGLA CRÍTICA DE DATOS

NUNCA agregar datos a ningún tree sin una fuente oficial verificada, descargada y parseable.
Cada número debe ser trazable a un dataset específico. NO usar cifras aproximadas de memoria.
Si no existe fuente machine-readable, decirlo y no fabricar datos.

## ESTADO ACTUAL

Todo integrado y deployado:
- DE: €2.3T total (Bund + SV + Länder + Kommunen), 2015-2025
- US: $6.7T federal, 2017-2025
- FR: €1.7T (PLF + Protection Sociale), 2020-2025
- UK: £1.4T (OSCAR + Local Auth), 2020-2024

## TAREAS PENDIENTES

### 1. FR presupuesto estatal 2015-2019
Los CSVs del PLF (Projet de Loi de Finances) para 2015-2019 deberían existir en data.gouv.fr.
Ya tenemos FR Sécurité Sociale desde 2000 (DREES). Si conseguimos el PLF, podemos tener FR completo 2015-2025.

Fuentes a probar:
- data.gouv.fr → buscar "PLF 2019 depenses CSV", "LFI depenses"
- budget.gouv.fr → datos abiertos
- data.economie.gouv.fr
- Eurostat COFOG como fallback (10 categorías)

### 2. UK presupuesto central 2015-2019
OSCAR XLSX podría existir para años anteriores. PESA tables seguro existen.
UK Local Authorities ya disponible desde 2017.

Fuentes a probar:
- gov.uk → OSCAR publishing collections
- gov.uk → PESA tables (departmental spending)
- ONS → government expenditure datasets
- Eurostat COFOG (UK hasta 2019 pre-Brexit)

### 3. 🇺🇸 USA Tab — 50 States Visualization (MAJOR FEATURE)

Nueva pestaña con la misma mecánica de esferas/zoom del Multiverse, mostrando los 50 estados de USA con desglose funcional.

**Data source: US Census Bureau Annual Survey of State & Local Government Finances**
- Ya descargado en: `data/us/states_research/`
- Archivos: `YYslsstab1.xlsx` (2017-2022, single file) y `YYslsstab1a/b.xlsx` (2012-2016, split)
- Documentación completa: `data/us/states_research/STATE_DATA_SOURCES_RESEARCH.md`
- 50 estados + DC, ~30 categorías funcionales (Education, Medicaid/Welfare, Hospitals, Highways, Police, Corrections, Parks, etc.)
- Valores en miles USD (multiplicar por 1000)
- 3 niveles por estado: State & Local combined, State-only, Local-only

**Arquitectura de la pestaña:**
```
Tabs: 🌐 Multiverse | 🇺🇸 USA | ⚖️ Compare | 📋 Explorer | 📈 Evolution | ℹ️ About
```

**Tree structure:**
```json
{
  "name": "US Total Public Spending 2022",
  "value": TOTAL,
  "children": [
    {
      "id": "us_ca",
      "name": "California",
      "value": TOTAL_CA,
      "children": [
        {"id": "us_ca_edu", "name": "Education", "value": ...},
        {"id": "us_ca_welfare", "name": "Public Welfare", "value": ...},
        {"id": "us_ca_hospitals", "name": "Hospitals", "value": ...},
        {"id": "us_ca_highways", "name": "Highways", "value": ...},
        ...
      ]
    },
    {"id": "us_ny", "name": "New York", ...},
    {"id": "us_tx", "name": "Texas", ...},
    ... (50 states + DC)
  ]
}
```

**Steps:**
1. Write parser: `scripts/build_us_state_trees.js` (Node.js + xlsx package)
   - Read Excel files, extract State & Local combined totals per state
   - Build hierarchical tree with ~30 functional categories per state
   - Handle format differences: 2017-2022 (single file) vs 2012-2016 (split a/b)
   - Row matching by description text (not hardcoded positions -- they shift between years)
2. Generate trees: `data/us/states/us_states_tree_YYYY.json` (2012-2022)
3. Create enrichment: descriptions for 50 states + 30 functional categories
4. Add new tab in frontend: reuse Multiverse/Galaxy circle packing engine
5. Add API endpoint: `/budget/us-states?year=YYYY`
6. Color scheme: could use state political colors, regional grouping, or population-based

**Parser notes from research:**
- 2017-2022: 262 columns, 5 per state (S&L total, S&L CV, State-only, Local-only, Local CV)
- 2012-2016: split into a (US-Mississippi) and b (Missouri-Wyoming), same structure
- Functional categories start with "Total expenditure" and include ~30 line items
- Values in THOUSANDS USD
- 2023 summary table not yet published

### 4. Budget Comparator (nuevo tab, reemplaza Galaxy)
El tab "Budget Galaxy" (single country) es redundante con el Multiverse (que ya permite zoom en un país).
Plan: fusionar Galaxy → Multiverse (agregar search box + sidebar + lang toggle al Multiverse cuando se hace zoom en un país), y reemplazar el tab Galaxy con un **Comparator**:

**Modo 1: Mismo país, distintos años** (ej: "DE 2017 vs DE 2024")
- Dos columnas lado a lado, mismas categorías
- Cada fila: valor izq | nombre | valor der | % cambio | barra color (verde/rojo)
- Click para expandir sub-categorías
- Ejemplo killer: Pflege €35B → €63B (+80%)

**Modo 2: Distintos países, mismo año** (ej: "DE 2024 vs FR 2024")  
- Normalización: moneda común, per cápita, o % del total
- Categorías equivalentes alineadas

**Modo 3: Libre** (cualquier combo)

UI: dos dropdowns [País ▼ Año ▼] ←→ [País ▼ Año ▼] + toggle normalización
Tabs: 🌐 Multiverse | ⚖️ Compare | 📋 Explorer | 📈 Evolution | ℹ️ About

### 5. Nuevos países (en orden de prioridad)

| # | País | Total est. | Federalismo | Fuente principal | Dificultad |
|---|------|-----------|-------------|-----------------|------------|
| 1 | 🇯🇵 Japón | ~¥115T ($750B) | Unitario + 47 prefecturas | MOF budget data, e-Stat API (stat.go.jp) | Media |
| 2 | 🇨🇦 Canadá | ~C$500B federal + provincias | 10 provincias + 3 territorios | Open Canada (open.canada.ca), StatCan | Fácil |
| 3 | 🇦🇺 Australia | ~A$700B | 6 estados + 2 territorios | budget.gov.au CSV, ABS | Fácil |
| 4 | 🇧🇷 Brasil | ~R$5T (~$1T) | 27 estados federales | Portal da Transparência, SIOP | Media |
| 5 | 🇰🇷 Corea del Sur | ~₩600T (~$450B) | Unitario + provincias | KOSIS, Open Fiscal Data (openfiscaldata.go.kr) | Media |
| 6 | 🇸🇪🇳🇴 Nórdicos | Swe ~SEK 1.2T, Nor ~NOK 1.8T | Unitario + municipios | SCB (Sweden), SSB (Norway) | Fácil |

Approach: un país por sesión. Cada uno requiere:
1. Investigar fuentes de datos (agente de research)
2. Descargar + parsear → tree JSONs
3. Enrichment (50-100 entries mínimo)
4. Traducciones al inglés si no está en inglés
5. Agregar al frontend (country switcher, colores, etc.)
6. Deploy

Japón es el más impactante: contraste envejecimiento DE vs JP, 47 prefecturas como los Länder.
Canadá es el más fácil: open data excelente, inglés/francés, federalismo comparable a DE/US.

### 6. Otras mejoras
- Mobile testing en dispositivos reales
- Budget Comparator tab (lado a lado entre años/países)
- Fusionar Galaxy tab → Multiverse (search + sidebar + lang toggle)
- Canvas 2D para mejor performance del Multiverse con 11 países

## APPROACH RECOMENDADO

Hacer UN país/fuente por sesión para no gastar tokens.
- Sesión 1: "Descargá los PLF franceses 2015-2019 e integralos"
- Sesión 2: "Descargá OSCAR/PESA UK 2015-2019 e integralo"
