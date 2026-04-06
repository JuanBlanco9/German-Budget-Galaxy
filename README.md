<p align="center">
  <h1 align="center">Budget Galaxy</h1>
</p>

<p align="center">
  <img src="images/gbg_banner_budget_galaxy.jpg" alt="Budget Galaxy" width="900"/>
</p>

<p align="center">
  <i>Interactive visualization of government budgets for Germany, USA, France, and the UK</i>
</p>

<p align="center">
  <a href="https://budgetgalaxy.com"><img src="https://img.shields.io/badge/Live-budgetgalaxy.com-4fc3f7?style=flat-square" /></a>
  <img src="https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white" />
  <img src="https://img.shields.io/badge/D3.js-F9A03C?style=flat-square&logo=d3.js&logoColor=white" />
  <img src="https://img.shields.io/badge/Chart.js-FF6384?style=flat-square&logo=chartdotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/Python-3776AB?style=flat-square&logo=python&logoColor=white" />
</p>

---

## Overview

**Budget Galaxy** transforms government budgets into explorable universes. Navigate budget data across **4 countries and up to 11 years** — every sphere represents a real budget allocation, sized proportionally. Click to explore, zoom to see details, compare countries side by side.

| Country | Years | Items/year | Enrichments | Source |
|---------|-------|-----------|-------------|--------|
| Germany | 2015-2025 | ~5,900 | 75 | bundeshaushalt.de |
| USA | 2017-2025 | ~5,500 | 2,410 | USAspending.gov |
| France | 2020-2025 | ~1,200 | 974 | data.gouv.fr |
| UK | 2020-2024 | ~800 | 651 | HM Treasury OSCAR |

## Live

**[budgetgalaxy.com](https://budgetgalaxy.com)**

## Features

### Multiverse
All 4 countries in one zoomable SVG. Proportional sizing normalized to USD. Click any bubble to drill down, compare spending across nations.

<p align="center">
  <img src="images/Multiverse.jpg" alt="Multiverse" width="800"/>
</p>

### Budget Galaxy
D3.js circle packing with sphere gradients and starfield background. Semantic zoom — click a node to expand its children. Hover for tooltips with amount and percentage. Side panel with enriched descriptions, beneficiary data, and spending breakdowns.

<p align="center">
  <img src="images/Budget Galaxy 2.jpg" alt="Budget Galaxy" width="800"/>
</p>

<p align="center">
  <img src="images/Budget Galaxy Zoom.jpg" alt="Budget Galaxy Zoom" width="800"/>
</p>

### Budget Explorer
Breadcrumb navigation through the full budget hierarchy. Accordion expansion with enrichment data — creation year, description, beneficiaries for 4,035 programmes.

<p align="center">
  <img src="images/Budget Explorer 1.jpg" alt="Budget Explorer" width="800"/>
</p>

### Budget Evolution
Chart.js multi-year line charts. Germany supports By Category and By Ministry modes. Toggle between absolute values and % of total. Country-specific event annotations (COVID, Zeitenwende, CARES Act, Brexit).

### Enriched Data
4,035 programme-level enrichments across US, FR, and UK — each investigated with creation year, description, and beneficiaries. Plus 33 ministry-level enrichments with key figures, spending breakdowns, and notable facts.

## Architecture

```
Frontend (Single HTML, ~450KB)      Backend (FastAPI)
┌──────────────────────┐           ┌─────────────────────────┐
│  D3.js Circle Pack   │◄─────────►│  /budget/tree            │
│  Chart.js Evolution  │◄─────────►│  /budget/country/{id}    │
│  Budget Explorer     │◄─────────►│  /budget/country/{id}/   │
│  Multiverse View     │           │    years | history       │
│  Enrichment Panels   │◄─────────►│  /data/{cc}/enrichment   │
└──────────────────────┘           └─────────────────────────┘
                                          │
                                   Static JSON tree files
                                   (no database needed)
```

## Data Sources

### Germany (2015-2025)
- **Source**: [bundeshaushalt.de](https://www.bundeshaushalt.de) — official federal budget portal
- **Format**: CSV, 11 annual files
- **Coverage**: ~5,900 items/year across 25 ministries (Einzelplan > Kapitel > Titel)
- **Enrichments**: 75 nodes with beneficiary counts, OECD/NATO comparisons, legal basis (curated from [DRV](https://www.deutsche-rentenversicherung.de), [Bundesagentur](https://statistik.arbeitsagentur.de), [Destatis](https://www.destatis.de), [OECD](https://data.oecd.org), [NATO](https://www.nato.int), [GKV](https://www.gkv-spitzenverband.de))
- **Note**: Federal budget only (~EUR 480B). Total German public spending including states, municipalities, and social insurance is ~EUR 2.1T

### United States (2017-2025)
- **Source**: [USAspending.gov](https://www.usaspending.gov) — official federal spending API
- **Format**: API (JSON), 9 annual snapshots
- **Coverage**: ~5,500 federal accounts/year across 24 agencies
- **Enrichments**: 2,410 programme-level descriptions with creation year, purpose, and beneficiaries
- **Extras**: Spending type breakdown for 14 agencies (Personnel, Contracts, Grants, R&D, etc.)

### France (2020-2025)
- **Source**: [data.gouv.fr](https://www.data.gouv.fr) — Projet de Loi de Finances (PLF)
- **Format**: CSV, 6 annual files (PLF depenses)
- **Coverage**: ~1,200 programmes/year across 30+ missions
- **Enrichments**: 974 programme-level descriptions with creation year, purpose, and beneficiaries

### United Kingdom (2020-2024)
- **Source**: [HM Treasury OSCAR](https://www.gov.uk/government/collections/oscar-publishing-data) — Online System for Central Accounting and Reporting
- **Format**: XLSX, 5 annual files
- **Coverage**: ~800 items/year across 20+ departments
- **Enrichments**: 651 programme-level descriptions with creation year, purpose, and beneficiaries

## Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | Single HTML file, D3.js v7, Chart.js 4, Vanilla JS |
| Backend | FastAPI, Python 3.12 |
| Data | Static JSON trees (no database) |
| Server | Ubuntu 24.04, Uvicorn, nginx, Let's Encrypt |
| Enrichments | 4,035 programmes loaded on-demand per country |

## Quick Start

```bash
# Clone
git clone https://github.com/JuanBlanco9/German-Budget-Galaxy.git
cd German-Budget-Galaxy

# Install
pip install -r requirements.txt

# Run
uvicorn api.main:app --host 0.0.0.0 --port 8088

# Open
open http://localhost:8088
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Main application |
| GET | `/budget/tree?year=YYYY` | German budget tree |
| GET | `/budget/years` | Available German years |
| GET | `/budget/country/{id}?year=YYYY` | US/FR/UK budget tree |
| GET | `/budget/country/{id}/years` | Available years for country |
| GET | `/budget/country/{id}/history` | Historical data for country |
| GET | `/budget/history` | German EPL history |
| GET | `/budget/history/kategorien` | German category history |
| GET | `/sitemap.xml` | SEO sitemap |
| GET | `/health` | Health check |

## Support

Budget Galaxy is free and open source. If you find it useful, consider supporting its development:

[![GitHub Sponsors](https://img.shields.io/github/sponsors/JuanBlanco9?style=social)](https://github.com/sponsors/JuanBlanco9)

Your support helps add more countries, keep the data updated, and improve the platform.

## License

MIT

## Author

**Juan Blanco** — [@JuanBlanco9](https://github.com/JuanBlanco9)

---

<p align="center">
  <i>Every dollar, euro, pound, collected from citizens should be understandable to those citizens.</i>
</p>
