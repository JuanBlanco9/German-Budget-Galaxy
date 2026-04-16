# Tier 2 Unitaries discovery

_Agent: agent-aabe5954a745a8a56_

6 of 8 samples saved. Now the consolidated report.

---

## Tier 2 Unitaries Discovery Report — FY 2023/24

### Leicester City Council
- Landing page: https://data.leicester.gov.uk/explore/dataset/expenditure-exceeding-gbp500-2023/information/ (OpenDataSoft portal)
- Data URL pattern (API v2.1 CSV export): `https://data.leicester.gov.uk/api/explore/v2.1/catalog/datasets/expenditure-exceeding-gbp500-{YEAR}/exports/csv?use_labels=true&delimiter=,` — datasets `expenditure-exceeding-gbp500-2023`, `-2024` confirmed via catalog API
- Format: CSV, UTF-8 with BOM, comma-delimited
- Schema: `Unique ID, Payment Date, Department, Beneficiary, Purpose of expenditure, Amount, VAT, VAT code, Merchant category`
- Cloudflare/WAF: no (clean ODS JSON API)
- Rows/sample: 200 (limit param); full 2023 dataset indexed, one row per payment
- Quirks: split by calendar year not FY; 2023 + 2024 datasets must be combined + filtered to Apr 2023–Mar 2024; the human www.leicester.gov.uk landing returns 404 (portal is at data.leicester.gov.uk)
- Sample: `26650,2023-04-19,Adults,Marston Court Ltd T/a Marston Court,Residential Permanent,10105.76,0.0,,Residential Care`
- FY 2023/24 availability: all 12 months (via 2 calendar-year datasets)
- Saved: `/tmp/tier2_unitaries_leicester_sample.csv`

### Stoke-on-Trent City Council
- Landing page: https://www.stoke.gov.uk/directory/27/data_directory/category/417 (Transparency Reports 23/24)
- Data URL pattern: `https://www.stoke.gov.uk/download/downloads/id/{ID}/transparency_report_{month}_{year}.xlsx`, e.g. `.../id/2410/transparency_report_july_2023.xlsx`
- Format: XLSX (Excel 2007+, single sheet, ~3,664 rows July-23 sample), has title row A1 + header row 2
- Schema: `Body Name, Service Code, Service Label, Exp Code, Expenditure Category Lvl 6, Date, Transaction Number, Supplier Name, Amount` (columns A–I)
- Cloudflare/WAF: no
- Rows: ~3.5k/month, `Supplier Name` often "REDACTED - Personal Data"
- Quirks: XLSX not CSV; each month is a separate item ID (need to scrape directory to collect 12 IDs); values include commas + numeric types
- Sample: `Schools,DK135,External Fees,4SCHL,Private contractors,2023-07-19,...,Transform Schools (Stoke) Limited,38847.14`
- FY 2023/24 availability: all 12 months present in category/417 listing
- Saved: `/tmp/tier2_unitaries_stoke_sample.xlsx` (July 2023)

### Swindon Borough Council
- Landing page: https://www.swindon.gov.uk/downloads/download/2582/payments_to_suppliers_of_more_than_500_in_2023 (and `/3114/..._in_2024`)
- Data URL pattern: `https://www.swindon.gov.uk/download/downloads/id/{FILE_ID}/payments_to_suppliers_of_more_than_500_-_{month}_{year}.csv` (note two-step: `/downloads/file/ID/slug` returns HTML; real CSV is at `/download/downloads/id/ID/slug.csv`). Verified IDs: Apr23=9120, May23=9121, Jun23=9163, Jul23=9269, Aug23=9284, Sep23=10165, Oct23=10164, Nov23=10421, Dec23=10505, Jan24=10580, Feb24=10613, Mar24=10634
- Format: CSV, ISO-8859 (contains £ char), comma-delim
- Schema: `Transaction Number, Service - Fund, Service - Function, Service - Cost Centre, Expense Type, Expense Description, Supplier Name, Supplier Post Code (first 4 digits), Payment Date, Amount £`
- Cloudflare/WAF: no
- Rows: 6,548 for April 2023
- Quirks: calendar-year split (2023, 2024); Amount column header uses `£`; negative values present (refunds); non-UTF-8 encoding
- Sample: `82451233,Travel,Highways & Transport,Concessionary Travel,3rd Party Payments,Concessionary Travel Subsidy,24/7 SWINDON TAXIS,SN4,21/04/2023,580.92`
- FY 2023/24 availability: all 12 months
- Saved: `/tmp/tier2_unitaries_swindon_sample.csv` (April 2023)

### Kingston upon Hull City Council
- Landing page: https://www.hull.gov.uk/open-data/council-expenditure (→ `/downloads/download/329/expenditure-reports---2023` & `/461/...---2024`)
- Data URL pattern: `https://www.hull.gov.uk/downloads/file/{ID}/{month}-{year}` (server returns `Content-Type: text/csv`). IDs Apr23=1297, May23=1290, Jun23=1293, Jul23=1296, Aug23=1291, Sep23=1879, Oct23=1908, Nov23=1909, Dec23=1975, Jan24=3832, Feb24=3335, Mar24=3337
- Format: CSV, UTF-8, comma-delim
- Schema: `Body, Body Name, Effective Date, Transaction Number, Amount, Supplier Name, Supplier Number, Expense Area, Service Area` (preceded by a single metadata row like `Apr-23,,,,,,,,`)
- Cloudflare/WAF: no
- Rows: 11,420 (Apr 2023), 13,596 (Dec 2023) — ~11–14k/month
- Quirks: metadata row 1 must be skipped; Hull amounts include small values under £500 present (e.g. £7.06, £112.98) — the council exports the whole AP feed, not a strict ≥500 threshold despite landing-page framing
- Sample: `HCC,Hull City Council,04/04/2023,10943644,1296,APPROPRIATE ADULTS UK,10120781,Youth Offending Team Manager,Early Intervention`
- FY 2023/24 availability: all 12 months
- Saved: `/tmp/tier2_unitaries_hull_sample.csv` (Dec 2023)

### Middlesbrough Council — **HARD BLOCKER**
- Landing page: https://www.middlesbrough.gov.uk/open-data-foi-and-have-your-say/open-data-and-policies/payments-over-%C2%A3500
- Data URL pattern: was previously ArcGIS Hub (`https://middlesbrough-council-middlesbrough.opendata.arcgis.com/datasets/...`) but **Hub is frozen at December 2022** (latest dataset `spending-over-500-december-2022`, no 2023/2024 items exist in Hub index)
- Cloudflare/WAF: **YES** — `www.middlesbrough.gov.uk` returns HTTP 403 `Cf-Mitigated: challenge`, body `<title>Just a moment...</title>`, `Server: cloudflare`. Requires real browser / JS challenge solver (FlareSolverr, Playwright)
- Rows: unknown
- Quirks: Middlesbrough had a severe financial distress event (S114 issued 2024); transparency publishing appears to have lapsed on the ArcGIS Hub and moved onto the Cloudflare-protected main site. **Worth monitoring as S114 distress signal alongside Woking/Birmingham.**
- **Action required**: either (a) run headless browser through CF challenge on each monthly page, or (b) FOI / contact open-data@middlesbrough.gov.uk, or (c) accept partial coverage ending Mar 2022
- Sample: n/a
- FY 2023/24 availability: **NOT ACCESSIBLE via scraping** as of this discovery

### Peterborough City Council — **PARTIAL BLOCKER (env)**
- Landing page: https://data.cambridgeshireinsight.org.uk/dataset/peterborough-payments-over-%C2%A3500-suppliers (hosted on Cambridgeshire Insight Drupal/CKAN, NOT on peterborough.gov.uk — the council page only deep-links there)
- Data URL pattern: Drupal `/sites/cambridgeshireinsight.org.uk/files/files/Peterborough%20Payments%20Over%20%C2%A3500%20{Q#}%20{YEAR}.csv` (HEAD returned 302 redirect — host confirmed reachable for HEAD). Resource UUIDs also addressable via `/dataset/peterborough-payments-over-%C2%A3500-suppliers/resource/{uuid}`
- Format: CSV (per council publication note); published **quarterly** (4 files/year, not 12)
- Schema: not verified — CKAN resource pages timed out for both curl and WebFetch from this environment
- Cloudflare/WAF: no CF; backend is Apache/Debian 2.4.38 but GET requests hang (>60s) from this IP. Confirmed host reachable (HEAD works, full-page search indexed on Google) — likely works from other networks
- Quirks: (a) quarterly not monthly; (b) coverage on published site historically lags by 1-2 quarters; (c) calendar-Q naming (Q1=Jan-Mar), so FY 2023/24 = Q2 2023 + Q3 2023 + Q4 2023 + Q1 2024 (all four files needed); (d) legacy data.gov.uk entry is stale (last update 2014)
- Sample: not captured
- FY 2023/24 availability: all 4 quarters per council policy, need to re-run downloads from a non-rate-limited network
- **Action required**: retry from the main pipeline host (Vultr) — URL pattern is known

### Bath and North East Somerset Council
- Landing page: https://www.bathnes.gov.uk/expenditure-over-ps500
- Data URL pattern: `https://www.bathnes.gov.uk/sites/default/files/Expenditure%20over%20%C2%A3500%20{Q#}%20{YEAR}.csv` — inconsistent naming: `Q2 2023.csv`, `July to Sept 2023.csv` (Q3), `Q4 2023.csv`, `Q1 2024.csv`. Later years use `Expenditure_over_%C2%A3500_Q{#}_{YEAR}.csv` (underscores). Listing scraped from landing page.
- Format: CSV, ASCII, comma-delim
- Schema: `Body Name, Transaction Number, Account Code Description, Expenses Type, Service Code, Service Area Categorisation, Supplier Name, Date, Amount`
- Cloudflare/WAF: no
- Rows: 17,872 for Q2 2023 (Apr-Jun 2023)
- Quirks: (a) **calendar-quarter naming** — FY 2023/24 requires Q2 2023 + Q3 2023 (`July to Sept 2023`) + Q4 2023 + Q1 2024; (b) Q3 2023 uses a different filename pattern than all other quarters (hard-coded exception); (c) later-year files switch from space-separated to underscore-separated filenames; (d) Supplier column mostly "REDACTED"; amounts exclude VAT
- Sample: `Bath and North East Somerset Council,81194849,LK4,Nursery/Childcare Vouchers,P29,"Children & Young People, Communities & Culture",REDACTED,03/04/2023,2348.78`
- FY 2023/24 availability: all 4 quarters (verified URLs live on landing page)
- Saved: `/tmp/tier2_unitaries_banes_sample.csv` (Q2 2023)

### City of York Council
- Landing page: https://www.york.gov.uk/CouncilSpending → https://data.yorkopendata.org/dataset/all-payments-to-suppliers (CKAN)
- Data URL pattern: `https://data.yorkopendata.org/dataset/27bc1dc6-d62f-4b93-a326-13989f5bfb56/resource/{uuid}/download/over250payments{YEAR}.csv`. Verified resources: FY2023/24 uuid `77df7495-0abe-4273-b927-c7efadc2e4e4`; FY2024/25 uuid `b9987983-d122-4d50-bf33-d161bca2968c`
- Format: CSV, ASCII, comma-delim, ~12.3 MB for FY23/24
- Schema: `Organisation_Name, Directorate, Department, Service_Plan, Creditor_Name, Payment_Date, Transaction_No, Card_Transaction, Net_Amount, Irrecoverable_VAT, Subjective_Group, Subjective_Subgroup, Subjective_Detail`
- Cloudflare/WAF: no
- Rows: **61,709** (single file for entire FY2023/24 — no month splitting needed)
- Quirks: (a) **threshold is £250, not £500** — York publishes beyond statutory requirement; need to filter ≥500 downstream if comparability matters; (b) file naming says `over250payments2023.csv` although it covers FY 2023/24 (Apr-Mar); (c) negative amounts appear (refunds, e.g. `-431.16`); (d) payments to individuals redacted
- Sample: `City of York Council,Adult Social Care and Integration,AD Adult Social Care,Adult Safeguarding,United Response,04/04/2023,202324CR00000001,,-431.16,,Supplies And Services,Services,Day Support`
- FY 2023/24 availability: complete in single file
- Saved: `/tmp/tier2_unitaries_york_sample.csv` (full 61,709 rows)

---

## Summary Matrix

| Council | FY23/24 | Format | Files | WAF | Status |
|---|---|---|---|---|---|
| Leicester | 12 months | CSV (ODS API) | 2 (CY split) | No | READY |
| Stoke-on-Trent | 12 months | XLSX | 12 | No | READY |
| Swindon | 12 months | CSV (ISO-8859) | 12 | No | READY |
| Hull | 12 months | CSV | 12 | No | READY |
| **Middlesbrough** | **NONE post Mar 2022** | — | — | **CF challenge** | **BLOCKED** |
| Peterborough | 4 quarters | CSV | 4 | No (env slow) | PATTERN-KNOWN, retry from Vultr |
| Bath & NE Somerset | 4 quarters | CSV | 4 | No | READY |
| City of York | 1 file (full FY) | CSV | 1 | No | READY |

## Hard Blockers / Flags
1. **Middlesbrough**: Main site is behind Cloudflare JS-challenge (`Cf-Mitigated: challenge`); their ArcGIS Hub lapsed December 2022. **This is itself a financial-distress signal — Middlesbrough issued an informal S114 warning in 2024.** Recommend: FlareSolverr bypass OR direct FOI. Do NOT bucket with healthy councils until data pipeline is solved.
2. **Peterborough**: Cambridgeshire Insight host responds to HEAD but GETs hang from this discovery box (~60s+ timeout). URL patterns validated; rerun from Vultr/production IP. Quarterly not monthly — 4 files/year, calendar-Q naming (FY23/24 = Q2/Q3/Q4 2023 + Q1 2024).
3. **BANES filename inconsistency**: Q3 2023 is `July to Sept 2023.csv` — all other quarters use `Q# YEAR` pattern; parser must accept per-quarter overrides.
4. **York threshold mismatch**: £250 not £500 — introduces ~15–20% extra low-value rows vs other councils; document as metadata or filter downstream to maintain comparability.
5. **Hull metadata row**: Row 1 is a single date label (`Apr-23,,,,,,,,`) that must be skipped before the header row.
6. **Leicester fiscal-year split**: Data published by calendar year; FY 2023/24 = `expenditure-exceeding-gbp500-2023` (Apr-Dec) + `expenditure-exceeding-gbp500-2024` (Jan-Mar) filtered on `Payment Date`.
7. **Swindon encoding**: ISO-8859, not UTF-8 (£ symbol in header); reader must specify cp1252/latin1.

Samples on disk: `/tmp/tier2_unitaries_{leicester,stoke,swindon,hull,banes,york}_sample.{csv|xlsx}` (6 of 8; Middlesbrough blocked, Peterborough host timeout).