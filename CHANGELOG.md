# Changelog

All notable changes to Budget Galaxy are documented here.

## [Unreleased] - 2026-04-16 — UK supplier metadata to 65.2% MHCLG

### Added
- 23 new councils with supplier-level `_top_suppliers` metadata
  - Wave 1 (Met Districts): Kirklees, Knowsley, Oldham, St Helens, Wigan, Sefton, Rotherham, Bolton, Stockport, Wolverhampton, Wirral, Sandwell, Walsall, Sunderland, S Tyneside, Salford (16 councils, commits 986383f → 81cc14f)
  - Wave 2 (ad-hoc): North Tyneside via legacy subdomain (9/12 months, commit 1e9c7eb)
  - Wave 3: Wakefield, Bury (Wayback), North Somerset (commit bef4bf9)
  - Wave 4 (Unitaries): N Northants, Worcestershire, Cheshire West, W Berkshire, Bracknell Forest, Isles of Scilly (commit 06a7036)
- `£100M sanity cap` in build_council_spend_lookup.js — rejects pair-reversal entries that otherwise inflate totals (negative-drop + positive-keep asymmetry)
- `MBC` and `METROPOLITAN DISTRICT COUNCIL` strip rules in inject_council_spend_metadata.js normalizer
- Wakefield alias in NAME_ALIASES

### Changed
- Coverage: 19.7% → 46.7% → 56.5% → **65.2% MHCLG** (£85.8B / £131.6B)
- Lookup entries: 28 → 87 → **110**
- Service nodes with metadata: 920 → **986**
- Bury MBC CSVs hand-normalized via sed (10 months had 5 variants of Dept column name)

### Known issues (next session)
- Worcestershire CC £873M in only 2 services (under-classified — 46 patterns insufficient)
- Cheshire West £430M in only 6 services (same issue — 6 patterns)
- Bolton MBC £16M vs £613M MHCLG node (wrong source file or missing data)
- Westmorland & Furness dropped `blocker=red` — needs 4-stream preprocessor for legacy councils

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
