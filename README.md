<h1 align="center">Budget Galaxy</h1>

<p align="center">
  <i>Explore how nations spend. Every ministry, every department, every dollar, euro and pound — visualized.</i>
</p>

<p align="center">
  <a href="https://budgetgalaxy.com"><img src="https://img.shields.io/badge/%F0%9F%8C%90_LIVE-budgetgalaxy.com-4fc3f7?style=for-the-badge" /></a>
</p>

<p align="center">
  <a href="https://github.com/JuanBlanco9/Budget-Galaxy">GitHub</a> · MIT License · Open Source
</p>

<p align="center">
  <img src="images/gbg_banner_budget_galaxy.jpg" alt="Budget Galaxy" width="900"/>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/D3.js-7.9-F9A03C?style=flat-square&logo=d3.js&logoColor=white" />
  <img src="https://img.shields.io/badge/Chart.js-4-FF6384?style=flat-square&logo=chartdotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/FastAPI-0.115-009688?style=flat-square&logo=fastapi&logoColor=white" />
  <img src="https://img.shields.io/badge/Python-3.12-3776AB?style=flat-square&logo=python&logoColor=white" />
  <img src="https://img.shields.io/badge/Vanilla_JS-ES6+-F7DF1E?style=flat-square&logo=javascript&logoColor=black" />
  <img src="https://img.shields.io/badge/nginx-reverse_proxy-009639?style=flat-square&logo=nginx&logoColor=white" />
  <img src="https://img.shields.io/badge/Let's_Encrypt-SSL-003A70?style=flat-square&logo=letsencrypt&logoColor=white" />
  <img src="https://img.shields.io/badge/4_countries-13,400+_items-4fc3f7?style=flat-square" />
  <img src="https://img.shields.io/badge/4,035-enrichments-ff7043?style=flat-square" />
</p>

---

## What is Budget Galaxy?

Budget Galaxy turns government budgets into an explorable universe. Navigate from a country's total spending down to individual line items in three clicks. Compare four countries side by side. See how spending evolved through COVID-19, the Zeitenwende, and the energy crisis.

Every sphere represents real public money. The size is proportional to the amount. Click to explore.

---

## Countries

| Country | Years | Ministries | Budget | Enrichments |
|---------|-------|------------|--------|-------------|
| :de: Germany | 2015-2025 | 25 Einzelplane | EUR 502B | 75 |
| :us: United States | 2017-2025 | 111 agencies | $9.5T | 2,410 |
| :fr: France | 2020-2025 | 20 missions | EUR 823B | 974 |
| :gb: United Kingdom | 2020-2024 | 22 departments | GBP 1,130B | 651 |

> More countries coming soon: Brazil, Israel, Canada, Japan

---

## Features

### Budget Galaxy
Zoomable circle-packing visualization. Each ministry is a sphere containing its departments and budget items. Click any sphere to zoom in. Scroll to zoom. Drag to pan. Side panel with enriched descriptions, beneficiary data, and spending breakdowns.

<p align="center">
  <img src="images/Budget Galaxy 2.jpg" alt="Budget Galaxy" width="800"/>
</p>

<p align="center">
  <img src="images/Budget Galaxy Zoom.jpg" alt="Budget Galaxy Zoom" width="800"/>
</p>

### Multiverse
All four countries in one comparable canvas, normalized to USD. See at a glance how Germany's defense budget compares to France's education spending.

<p align="center">
  <img src="images/Multiverse.jpg" alt="Multiverse" width="800"/>
</p>

### Budget Explorer
Navigate the budget hierarchy with breadcrumb navigation. Each level shows breakdowns with percentages and enriched context — beneficiary counts, legal basis, international comparisons.

<p align="center">
  <img src="images/Budget Explorer 1.jpg" alt="Budget Explorer" width="800"/>
</p>

### Budget Evolution
10+ years of historical data in a customizable line chart. Toggle between absolute amounts and % of total. Annotated with key events: COVID-19, Zeitenwende, CARES Act, Brexit.

### Enriched Data
4,035 programme-level enrichments across US, FR, and UK — each investigated with creation year, description, and beneficiaries. Plus 33 ministry-level enrichments with key figures, spending breakdowns, and notable facts.

---

## Data

All budget data is sourced from official government portals:

### Germany (2015-2025)
- **Source**: [bundeshaushalt.de](https://www.bundeshaushalt.de) — official federal budget portal
- **Format**: CSV, 11 annual files
- **Coverage**: ~5,900 items/year (Einzelplan > Kapitel > Titel)
- **Enrichments**: 75 nodes curated from [DRV](https://www.deutsche-rentenversicherung.de), [Bundesagentur](https://statistik.arbeitsagentur.de), [Destatis](https://www.destatis.de), [OECD](https://data.oecd.org), [NATO](https://www.nato.int), [GKV](https://www.gkv-spitzenverband.de)
- **Note**: Federal budget only (~EUR 480B). Total public spending incl. states and municipalities is ~EUR 2.1T

### United States (2017-2025)
- **Source**: [USAspending.gov](https://www.usaspending.gov) — official federal spending API
- **Format**: API (JSON), 9 annual snapshots
- **Coverage**: ~5,500 federal accounts/year across 24 agencies
- **Enrichments**: 2,410 programmes + spending type breakdown for 14 agencies

### France (2020-2025)
- **Source**: [data.gouv.fr](https://www.data.gouv.fr) — Projet de Loi de Finances (PLF)
- **Format**: CSV, 6 annual files
- **Coverage**: ~1,200 programmes/year across 30+ missions
- **Enrichments**: 974 programme-level descriptions

### United Kingdom (2020-2024)
- **Source**: [HM Treasury OSCAR](https://www.gov.uk/government/collections/oscar-publishing-data)
- **Format**: XLSX, 5 annual files
- **Coverage**: ~800 items/year across 20+ departments
- **Enrichments**: 651 programme-level descriptions

**Data integrity:** 25/25 German Einzelplane internally consistent. Percentages sum to 100.000000%. 4,388 Titel verified against bundeshaushalt.de. 4,035 programme enrichments fact-checked.

**Limitation:** Shows planned budget (Soll), not actual spending (Ist). Off-budget items (Sondervermogen) not included.

---

## Architecture

```
Frontend (0.45MB HTML)        Backend (FastAPI)
┌──────────────────────┐     ┌──────────────────────┐
│  D3.js Circle Pack   │◄───►│  /budget/tree         │
│  Chart.js Evolution  │◄───►│  /budget/country/{id} │
│  Budget Explorer     │◄───►│  /budget/history      │
│  Multiverse SVG      │     └──────────────────────┘
└──────────────────────┘            │
                              Static JSON trees
                              per country (no DB)
```

**Stack:** D3.js v7 · Chart.js 4 · Vanilla JS · FastAPI · Python 3.12 · Uvicorn · nginx · Let's Encrypt

---

## Quick Start

```bash
git clone https://github.com/JuanBlanco9/Budget-Galaxy.git
cd Budget-Galaxy
pip install -r requirements.txt
uvicorn api.main:app --host 0.0.0.0 --port 8088
open http://localhost:8088
```

---

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/budget/tree?year=YYYY` | German budget tree |
| GET | `/budget/country/{id}?year=YYYY` | US/FR/UK budget tree |
| GET | `/budget/country/{id}/history` | Historical data for country |
| GET | `/budget/history` | German 11-year history |
| GET | `/sitemap.xml` | SEO sitemap |
| GET | `/health` | Health check |

---

## Roadmap

- [ ] IMF GFS data — ~130 countries at Level 1
- [ ] Revenue/taxation data as counterpart to spending
- [ ] Geographic Multiverse layout (continents)
- [ ] Canada, Spain, Italy, Brazil, Mexico, Japan
- [ ] Public API with rate limiting

---

## Support

Budget Galaxy is free and open source. If you find it useful:

[![GitHub Sponsors](https://img.shields.io/github/sponsors/JuanBlanco9?style=social)](https://github.com/sponsors/JuanBlanco9)

Your support helps add more countries, keep the data updated, and improve the platform.

---

## License

MIT · Open Source · Open Data

*Every euro collected from citizens should be understandable to those citizens.*

**Juan Blanco** · [@JuanBlanco9](https://github.com/JuanBlanco9)
