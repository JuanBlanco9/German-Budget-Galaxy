# Changelog

All notable changes to Budget Galaxy are documented here.

## [2.1.0] - 2026-04-06

### Added
- Mobile responsive layout (3 breakpoints: 900px, 768px, 480px)
- Touch support: pinch-to-zoom and drag pan for Galaxy and Multiverse
- Touch-friendly tap targets for all interactive elements
- SEO: meta tags, Open Graph, Twitter cards, JSON-LD structured data
- SEO: `/sitemap.xml` and `/robots.txt` endpoints
- Dynamic page title updates on country switch
- GitHub Sponsors integration (FUNDING.yml)

### Changed
- Externalized programme enrichments to per-country JSON files (HTML: 1.85MB -> 0.45MB)
- Enrichments now load on-demand via fetch() when switching countries
- API serves `/data/` directory as static files for enrichment JSONs

## [2.0.0] - 2026-04-05

### Added
- Multiverse: all 4 countries in one zoomable SVG, normalized to USD
- United States budget data (2017-2025, ~5,500 accounts/year)
- France budget data (2020-2025, ~1,200 programmes/year)
- United Kingdom budget data (2020-2024, ~800 items/year)
- 4,035 programme-level enrichments (US: 2,410, FR: 974, UK: 651)
- 33 ministry-level enrichments with key figures and notable facts
- Country switcher in header (Globe ALL, DE, US, FR, UK)
- Spending type breakdown for 14 US agencies
- Multi-country Budget Evolution with country-specific event annotations
- Year picker for Budget Explorer across all countries

### Changed
- Renamed project from "German Budget Galaxy" to "Budget Galaxy"
- Architecture: removed PostgreSQL, now uses static JSON tree files
- API: added `/budget/country/{id}` endpoints for multi-country support

## [1.0.0] - 2026-03-15

### Added
- Budget Galaxy: D3.js circle packing with semantic zoom
- Budget Explorer: hierarchical navigation with breadcrumbs
- Budget Evolution: Chart.js multi-year line charts (2015-2025)
- 75 enriched German budget nodes with beneficiary data, OECD/NATO comparisons
- Bilingual DE/EN support with 300+ translations
- Landing page with galaxy background
- Share button with URL state encoding
- Galaxy sidebar with tree navigation
- Search functionality within Galaxy view
