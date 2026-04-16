# NE + Lincolnshire Unitaries

_Agent: agent-a1bb2b4fd5fd1f748_

All 7 samples successfully downloaded (Stockton blocked). Here's the discovery report.

---

# Budget Galaxy Discovery — North East + Lincolnshire Cluster (FY 2023/24)

7 of 8 councils yielded direct downloadable FY23/24 files. **Stockton-on-Tees is a hard blocker** (Cloudflare 403 on curl for asset CSVs). All samples saved to `/tmp/ne_lincs/`.

### Halton Borough Council
- Landing page: https://www3.halton.gov.uk/Pages/councildemocracy/opendata/Payments-over-500.aspx
- Data URL pattern: `https://www3.halton.gov.uk/Documents/council%20and%20democracy/Finance/spenddata/2023-2024/Payments%20Over%20%C2%A3500%20{Q1|Q2|Q3|Q4}%20202324.csv`
- Format: CSV (quarterly, served as `application/octet-stream`)
- Schema: dept=`Department`, purpose=`Purpose of Expenditure` + `Merchant Categories`, supplier=`Beneficiary`, amount=`Net Amount £`
- Cloudflare/WAF: no (plain IIS, curl works)
- Rows: Q4 sample = 23,252 rows (~7.7k/month)
- Quirks: pound sign in header (`Net Amount £`); quarterly only
- Sample row: `03/01/2024, Swansea Bay University Health Board, Universities, Adult Social Care, Contracted Services, 515846, 375.00`
- FY 2023/24 availability: **all 4 quarters (12 months complete)**

### Hartlepool Borough Council
- Landing page: https://www.hartlepool.gov.uk/downloads/download/262/council_expenditure
- Data URL pattern: `https://www.hartlepool.gov.uk/downloads/file/{51,52,56,50}/q{1-4}-2023-2024` (XLSX)
- Format: XLSX (quarterly)
- Schema: dept=`Service Label` + `Organisation Unit`, purpose=`Expenditure Category` + `Proclass Description`, supplier=`Supplier`, amount=`Net Value`
- Cloudflare/WAF: no (301 from https to http then normal)
- Rows: Q1 2023/24 = ~8,900 rows (~3k/month)
- Quirks: **6 metadata rows before header** (title, "QUARTER 1 - 2023/2024" etc.); header on row 6; also has `0080020624`-style transaction numbers as text
- Sample row: `Hartlepool BC, 0080020624, Adult & Community Based Services, Cultural Services, Professional Artists Fees, 2023-06-20, 1763.05, 0, Revenue, 2 B Scene S L, N, 291000, Arts & Leisure Services - Events`
- FY 2023/24 availability: **all 4 quarters**

### Stockton-on-Tees Borough Council  **[BLOCKER]**
- Landing page: https://www.stockton.gov.uk/payments-to-suppliers
- Data URL pattern: `https://www.stockton.gov.uk/media/{4149,4193,...}/Payments-to-suppliers-{Month}-2023/excel/Payments_to_suppliers_-_{Month}_2023.csv`
- Format: CSV (monthly, despite `/excel/` path; ~1–3 MB/month)
- Schema: unknown — cannot retrieve
- Cloudflare/WAF: **YES — Cloudflare** (`Server: cloudflare`, `CF-RAY`, `__cf_bm` cookie, 403 with basic UA + WebFetch also 403)
- Rows/month: unknown
- Quirks: **Cloudflare bot challenge blocks curl and WebFetch**; probably need headless browser (Playwright) or cookie session from landing page
- FY 2023/24 availability: URLs for Apr/May/Jul/Aug/Oct/Nov/Dec 2023 confirmed via search; Jun/Sep/Jan–Mar 2024 must be checked on the page itself
- **Action required**: use Playwright/Selenium with real browser headers, or build curl session that first fetches landing page to acquire `__cf_bm` cookie

### Redcar and Cleveland Borough Council
- Landing page: https://www.redcar-cleveland.gov.uk/about-the-council/budget-and-accounts/invoices-over-500/financial-year-2023-2024
- Data URL pattern: `https://www.redcar-cleveland.gov.uk/sites/default/files/{YYYY-MM}/Over%20%C2%A3500%20Spend%20{Month}%202023.xlsx` (+ companion `Credits` files)
- Format: XLSX (monthly, paired Spend + Credits)
- Schema: dept=`Directorate` + `Service(T)`, purpose=`Expenditure Category` + `Cost Centre(T)`, supplier=`Supplier`, amount=`Posted amount`
- Cloudflare/WAF: no
- Rows/month: ~1,900 (April sample)
- Quirks: Two files per month (Spend vs Credits — must combine); filename casing inconsistent (`Credit` vs `Credits`, `%C2%A3` URL-encoded £)
- Sample row: `Redcar & Cleveland BC, 1st Coverall Co Ltd, General Supplies & Services, Adults & Communities, Residential, 10375, Jervaulx RCBC LD Residential Home, Revenue, 40651219, 591.36, 2023-04-26`
- FY 2023/24 availability: **all 12 months**

### Darlington Borough Council
- Landing page: https://www.darlington.gov.uk/your-council/council-information/statistics/open-data.aspx
- Data URL pattern: `https://www.darlington.gov.uk/media/{hash}/transactions-over-500-{month}-2023.csv` — **hashed slugs**, e.g. `3c1dzhzz/transactions-over-500-april-2023.csv`, `c0hn1xco/transactions_over_-500_-_june_2023.csv`
- Format: CSV (monthly)
- Schema: dept=`text servdesc` (Service), purpose=`accdesc` (Account) + `text bal`, supplier=`apar_name`, amount=`amount`
- Cloudflare/WAF: no
- Rows/month: ~1,670 (April sample)
- Quirks: **5 metadata rows before header** (titles + a "columns" technical-name row + a human-readable header row on row 7); underscores-and-dashes filename style differs between months; inconsistent capitalization (`Directotate` typo in header)
- Sample row: `INSERTED DETAIL,, Balance Sheet, Balance Sheet, BISHOPTON PARISH COUNCIL, 11156352, 03/04/2023, "10,633.00", Parish Precepts, NON-BUDGETED, NON BUDGETED`
- FY 2023/24 availability: Apr–Dec 2023 CSVs confirmed via search; Jan–Mar 2024 filenames need landing-page scrape (hashed slugs require resolution)

### Telford & Wrekin Council
- Landing page: https://www.telford.gov.uk/info/20110/budgets_and_spending/55/expenditure_over_100
- Data URL pattern: `https://www.telford.gov.uk/media/{hash}/expenditure_over_100_{month}_{year}.csv`
- Format: CSV (monthly)
- Schema: dept=`Service Delivery Area(T)` + `Service Delivery Team(T)`, purpose=`ExpenditureGroup(T)` + `Account(T)`, supplier=`Supplier Name(T)`, amount=`Amount`
- Cloudflare/WAF: no
- Rows/month: ~2,300 (April sample)
- Quirks: **threshold is £100 not £500** (Telford publishes at £100) — must filter ≥500 downstream for consistency; amounts integer-ish (no pence in sample); `(T)` suffix on text columns
- Sample row: `Adult Social Care, ASC Directorate, Supplies & Services, Mobile Phones, EE LTD EQUIPMENT, 27/04/2023, 142`
- FY 2023/24 availability: **all 12 months**

### North Lincolnshire Council
- Landing page: https://www.northlincs.gov.uk/your-council/supplier-payments/
- Data URL pattern: `https://www.northlincs.gov.uk/wp-content/uploads/{YYYY}/{MM}/Supplier-payments-{Month}-2023-b.csv` (inconsistent: Jun/Mar also surface as `Supplier-Payments-...` capital-P, and Mar 2024 is `Supplier-Payments-March-2024-new.csv`)
- Format: CSV (monthly)
- Schema: dept=`Service Heads (T)`, purpose=`Account (T)`, supplier=`Supplier Name`, amount=`Amount` (includes `Transaction number`, `Transaction Date`)
- Cloudflare/WAF: no
- Rows/month: ~1,625 (April sample)
- Quirks: **encoding: CP1252 / Windows-1252** — `£` renders as `�` in raw bytes (must decode as cp1252 or iso-8859-1, not utf-8); upload-path month subdirectory differs from transaction month (e.g. April 2023 data is in `/2024/02/`); filename capitalization drift (`payments`/`Payments`) + trailing `-b` vs `-new`
- Sample row: `30103511, Adult Care Sector, Direct Payments, 30/03/2023, £750.00, Halfords Limited`
- FY 2023/24 availability: **all 12 months** confirmed (URLs listed above)

### North East Lincolnshire Council (NELC)
- Landing page: https://www.nelincs.gov.uk/your-council/finances-spending-and-contracts/council-spending/published-spending-data/
- Data URL: `https://www.nelincs.gov.uk/assets/uploads/2025/10/Local-Spending-Data-2023-24.csv` (also `.xlsx` and `.pdf` alongside)
- Format: **Consolidated single annual CSV, 6.2 MB, 26,565 rows**
- Schema: dept=`Service Heads (T)` + `Director (T)` + `Service Managers (T)`, purpose=`Account (T)` (with `Cost centre (T)`), supplier=`Supplier Name`, amount=`Amount`; also `Body Name`, `Financial Year`, `Period`, `Transaction Date`, `Customer/supplier ID`
- Cloudflare/WAF: no
- Rows: 26,564 data rows for full FY23/24 (~2,200/month)
- Quirks: **transaction dates frequently predate the financial year** (e.g. 2019, 2022 dates appear in the 23/24 file — these are late/back-dated postings); `Period` column (1–12) is authoritative for monthly slicing, not `Transaction Date`; "there may be multiple lines per transaction number" (split across cost centres)
- Sample row: `NELC, 2023/24, 1, AD Regulated Provision, Revenue Budgets, Childrens Services, CS Commissioning Service, A0492, Agency Fostercare, A56000, Other Establishments, 30100614, 31/10/2022, "4,122.14", 1005733, Regional Fostering Services Ltd`
- FY 2023/24 availability: **full year, single file, published Oct 2025**

---

## Summary

| Council | Format | Freq | FY23/24 | WAF | Row/mo |
|---|---|---|---|---|---|
| Halton | CSV | Quarterly | Complete | No | ~7.7k |
| Hartlepool | XLSX | Quarterly | Complete | No | ~3k |
| Stockton | CSV | Monthly | **BLOCKED** | **Cloudflare** | ? |
| Redcar & Cleveland | XLSX (×2) | Monthly | Complete | No | ~1.9k |
| Darlington | CSV | Monthly | Apr–Dec confirmed | No | ~1.7k |
| Telford & Wrekin | CSV | Monthly | Complete | No | ~2.3k |
| North Lincs | CSV | Monthly | Complete | No | ~1.6k |
| NE Lincs | CSV | Annual | Complete | No | ~2.2k |

## Hard blockers / flags
1. **Stockton**: Cloudflare `__cf_bm` challenge blocks curl + WebFetch — needs Playwright or session-cookie handshake from `/payments-to-suppliers` landing page before fetching `/media/...` asset URLs.
2. **Darlington hashed slugs** + **5-row metadata preamble** — each monthly URL has a random slug (`3c1dzhzz/`, `c0hn1xco/`) so you cannot construct URLs programmatically; must scrape the open-data landing page. Filenames also toggle between `transactions-over-500-{month}-2023.csv` and `transactions_over_-500_-_{month}_2023.csv` (underscores). Jan–Mar 2024 hashes not yet obtained.
3. **Hartlepool 6-row preamble** — header on row 6, data from row 7; openpyxl/pandas need `skiprows=6` (or `header=5`).
4. **North Lincs encoding** = Windows-1252 not UTF-8 (£ → 0xA3, renders as replacement char if read as UTF-8). Filename casing drift — need fallback logic.
5. **Telford threshold is £100**, not £500 — filter `Amount >= 500` post-load for cluster consistency.
6. **Redcar 2 files per month** (Spend + Credits) — must concat; credits are negative/refund rows.
7. **NELC transaction dates leak prior years** — trust the `Period` column for month assignment, not `Transaction Date`.
8. **Schema heterogeneity** — no two councils share a column header; supplier column is variously `Beneficiary`, `Supplier`, `Supplier Name`, `Supplier Name(T)`, `apar_name`. Amount column: `Net Amount £`, `Net Value`, `Posted amount`, `amount`, `Amount`. Will need a per-council column-mapping config.

## Samples on disk (/tmp/ne_lincs/)
- `ne_lincs_halton_sample.csv` — 3.0 MB, 23,252 rows (Q4 2023/24)
- `ne_lincs_hartlepool_sample.xlsx` — 648 KB, ~8,900 rows (Q1 2023/24)
- `ne_lincs_redcar_sample.xlsx` — 133 KB, 1,925 rows (April 2023 Spend)
- `ne_lincs_darlington_sample.csv` — 296 KB, 1,676 rows (April 2023)
- `ne_lincs_telford_sample.csv` — 290 KB, 2,317 rows (April 2023)
- `ne_lincs_nlincs_sample.csv` — 155 KB, 1,625 rows (April 2023)
- `ne_lincs_nelincs_sample.csv` — 6.2 MB, 26,565 rows (full FY23/24)
- `ne_lincs_stockton_sample.csv` — 13 bytes (Cloudflare 403 body; **not usable**)

Sources:
- [Halton open data / spend](https://www3.halton.gov.uk/Pages/councildemocracy/opendata/Payments-over-500.aspx)
- [Hartlepool expenditure](https://www.hartlepool.gov.uk/downloads/download/262/council_expenditure)
- [Stockton payments to suppliers](https://www.stockton.gov.uk/payments-to-suppliers)
- [Redcar & Cleveland FY23/24 invoices](https://www.redcar-cleveland.gov.uk/about-the-council/budget-and-accounts/invoices-over-500/financial-year-2023-2024)
- [Darlington open data](https://www.darlington.gov.uk/your-council/council-information/statistics/open-data.aspx)
- [Telford & Wrekin expenditure over £100](https://www.telford.gov.uk/info/20110/budgets_and_spending/55/expenditure_over_100)
- [North Lincolnshire supplier payments](https://www.northlincs.gov.uk/your-council/supplier-payments/)
- [NE Lincs published spending data](https://www.nelincs.gov.uk/your-council/finances-spending-and-contracts/council-spending/published-spending-data/)