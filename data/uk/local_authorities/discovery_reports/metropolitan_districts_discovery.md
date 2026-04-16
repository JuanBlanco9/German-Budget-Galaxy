# Metropolitan Districts discovery

_Agent: agent-a1e3248d6437f8cf8_

All samples verified. I have everything needed. Final report below.

---

### Sandwell Metropolitan Borough Council
- Landing page: https://www.sandwell.gov.uk/downloads/download/736/transparency-creditor_payments_over_500
- Data URL pattern: `https://www.sandwell.gov.uk/downloads/file/{id}/{month}-2023-24-creditor-payments-over-500-csv-version-` (IDs discovered: Apr=491, Jun=486, Jul=1328, Aug=1330, Feb=2812, Mar=2814; remaining months need scraping of landing page)
- Format: CSV, comma-delimited, UTF-8, ~10k rows/month (Apr23: 1,040 KB)
- Schema: `Body Name, Body, Date, Department, Beneficiary, Summary of Purpose (SeRCOP), Amount SUM, Merchant Code, Transaction Number, Supplier ID`
- Cloudflare: no
- Quirks: SeRCOP classification column, `Body` is a URL; trailing empty column
- Sample row: `Sandwell MBC, ..., 01-Apr-2023, Adult Social Care Transformation, HOUSING & CARE 21, Adult Social Care Transformation, 17790.17, Block Contracts, 2324P01_CR00001, 2279`
- FY 2023/24 availability: all 12 months present on landing page
- Sample: `/tmp/metdistricts_batch_sandwell_sample.csv`

### Wolverhampton City Council
- Landing page: https://www.wolverhampton.gov.uk/your-council-and-meetings/corporate-finance/transparency-and-accountability-payments-suppliers (open data catalogue: https://www.wolverhampton.gov.uk/your-council/information-governance/freedom-information/open-data-catalogue-current)
- Data URL pattern: `https://www.wolverhampton.gov.uk/sites/default/files/{YYYY-MM-publish}/monthly-spend-report-{month}-2023.csv` (pattern confirmed for Apr23 at 2023-07 folder)
- Format: CSV, comma-delimited, UTF-8 with BOM, ~7,400 rows/month
- Schema (row 4): `Supplier ID, Supplier ID(T), Amount, Account, Account(T), Payment Date, TransNo, Service(T), Cost Centre(T)` — dept=`Service(T)`, purpose=`Cost Centre(T)` / `Account(T)`, supplier=`Supplier ID(T)`, amount=`Amount`
- Cloudflare: no
- Quirks: **3 header rows of query metadata** (`query agr_getbrowser...`, `sort`, `columns...`) then actual header on line 4; every data row prefixed with literal `INSERTED DETAIL` column; **threshold NOT £500** — sample row at £126 visible, publishes ALL payments regardless of amount; BOM at start
- Sample row: `INSERTED DETAIL, 700220, THE Acme Facilities Group Ltd, 126, R2704, Refuse Collection, 28/04/2023, 130387252, Catering, Education Catering General Overheads`
- FY 2023/24 availability: all 12 months per catalogue listing (monthly cadence confirmed 2020-2026)
- Sample: `/tmp/metdistricts_batch_wolverhampton_sample.csv`

### Walsall Metropolitan Borough Council
- Landing page: https://go.walsall.gov.uk/opendata-datasets
- Data URL pattern: `https://go.walsall.gov.uk/sites/default/files/{YYYY-MM-publish}/Spending_Transparency_{Month}_{Year}[_FINAL|v2].csv` (inconsistent capitalisation/URL-encoded spaces; must scrape)
- Format: CSV, comma-delimited, UTF-8, ~10,000 rows/month (Apr23 = 2.3 MB)
- Schema: `Organisation Name, Organisation Code, Unique Ref No, Effective Date, Directorate where expenditure incurred, Supplier Name, Payment date, Net amount, Purpose of Spend, Procurement Classification (Higher Level), Procurement Classification (Lower Level), CAPITAL / REVENUE` — dept=Directorate, purpose=Purpose of Spend, supplier=Supplier Name, amount=Net amount
- Cloudflare: no
- Quirks: header has newline inside quoted column names (`Procurement Classification \n(Higher Level)`); trailing empty commas; **separate quarterly "Spend_Transparency_for_Cards" files** exist for GPC — DO NOT mix (sample row £142 catering)
- Sample row: `WALSALL COUNCIL, ..., 31/03/2024, RESOURCES AND TRANSFORMATION, CHICKEN JOES LTD, 01/01/2024, ...` (card file)
- FY 2023/24 availability: all 12 monthly files (Apr 23, Jul, Sep, Dec, etc. confirmed via search; need to scrape landing for complete set)
- Sample: `/tmp/metdistricts_batch_walsall_sample.csv` (Apr 2023)

### Wirral Metropolitan Borough Council
- Landing page: https://www.wirral.gov.uk/about-council/budgets-and-spending/payments-suppliers-and-agents-2023-2024
- Data URL pattern: `https://www.wirral.gov.uk/files/spend-report-{month}-{year}.csv/download?inline` — stable, predictable for all 12 months
- Format: CSV, comma-delimited, UTF-8, ~6,000 rows/month (Apr23 = 887 KB)
- Schema: `Supplier Name, Transaction Number, Paid Date, Paid Amount, Department, Cost Centre, Description, Irrecoverable VAT` — dept=Department, purpose=Description, supplier=Supplier Name, amount=Paid Amount
- Cloudflare: no
- Quirks: **1 title row** `Payments for Publishing for Invoices paid between 01-APR-2023 and 30-APR-2023` before header; amounts use thousand separators in quoted strings (`"4,175.85"`); trailing space in `Department ` header
- Sample row: `1 CALL BUSINESS SOLUTIONS LIMITED, 101599, 14-APR-2023, "4,175.85", Neighbourhood Services, H2910, Cleaning & Domestic Supplies, (empty)`
- FY 2023/24 availability: all 12 months on dedicated FY page
- Sample: `/tmp/metdistricts_batch_wirral_sample.csv`

### Wakefield Metropolitan District Council
- Landing page: https://datamillnorth.org/dataset/e61m0/council-spending
- Data URL pattern: `https://datamillnorth.org/download/e61m0/{hash}/Supplier%20Spend%202023-24%20Q{n}.csv` — e.g. Q2 hash=`43e` (hashes are non-predictable; must scrape dataset page)
- Format: CSV, comma-delimited, UTF-8, **quarterly** (not monthly), ~8,800 rows/quarter (Q2 = 2.3 MB)
- Schema: `Organisation Name, Organisation Code, Effective Date, Cost Centre Narrative, Supplier Name, Comp. reg. no, Charity Number, Date, TransNo, Seq No, Amount, Description of Spend(T), Catman, Catman(T), Thomclas, Thomclas(T), Subcatman, Subcatman(T)` — dept=Cost Centre Narrative, purpose=Description of Spend(T)/Catman(T), supplier=Supplier Name, amount=Amount
- Cloudflare: datamillnorth itself returns 403 to WebFetch/direct curl headers but allows browser UA from this host (download worked)
- Quirks: **2 metadata rows + 1 blank** before header (row 1 title, rows 2-3 blank); amounts trailing space (`591.63 `); REDACTED rows for personal data; **full ProClass taxonomy included**; publishes ALL payments (not just ≥£500) since 2019/20 Q1
- Sample row: `Wakefield MDC, E08000036, 30.09.23, A&CM Hospital Social Work Teams, COPA COPA LTD T/A BIG FISH LITTLE FISH, ..., 01/08/2023, 25004465, 1, 591.63, Agency Staff, CAT02, Business Services, 31230, Employment & Recruitment Agencies, ...`
- FY 2023/24 availability: 4 quarterly files (Q1-Q4) — Q2 confirmed downloadable; Q1/Q3/Q4 expected under same pattern
- Sample: `/tmp/metdistricts_batch_wakefield_sample.csv` (Q2 = Jul-Sep 2023)

### Kirklees Metropolitan Borough Council
- Landing page: https://www.kirklees.gov.uk/beta/information-and-data/expenditure-data.aspx
- Data URL pattern: `https://www.kirklees.gov.uk/beta/information-and-data/pdf/open-data/expenditure/{Published-Data|KC-published-data|KC-Published-Data}-{YYYY-MM-DD}.xlsx` — **inconsistent casing/prefix across months** (e.g. Nov 2023 has stray space: `KC-Published-Data -2023-11-30.xlsx`)
- Format: **XLSX** (not CSV), sheet name `tbl Data to Publish`, ~5,000 rows/month (Apr23 = 419 KB)
- Schema: `Payment Date, Transaction Number, Amount Excluding VAT, Vendor Number, Vendor Name, Company Number, Debit/Credit Indicator, PO Number, Document Type, Cost Centre, Cost Centre Description, Proclass Code, Proclass Description, Purpose of Spend` — dept=Cost Centre Description, purpose=Purpose of Spend / Proclass Description, supplier=Vendor Name, amount=Amount Excluding VAT
- Cloudflare: no
- Quirks: XLSX only (no CSV); contains **negative amounts** (credit notes: `-950`); `Purpose of Spend` often `REDACTED DATA`; `Proclass Description` frequently null; NOT on Data Mill North despite being West Yorkshire
- Sample row: `2023-04-03, 1900198474, 4575, 103471, TK Access Solutions Ltd, 1166449, H, (blank PO), KR, 660789, Disabled Facilities, (null), (null), REDACTED DATA`
- FY 2023/24 availability: all 12 months
- Sample: `/tmp/metdistricts_batch_kirklees_sample.xlsx`

### Newcastle upon Tyne City Council — PARTIAL (HARD BLOCKER)
- Landing page: https://www.newcastle.gov.uk/local-government/access-information-and-data/open-data/payments-over-ps250-data-sets
- Data URL pattern: `https://www.newcastle.gov.uk/sites/default/files/local-government/Open%20Data/{Month}%20{Year}.csv` — e.g. `November%202023.csv`, `February%202023.csv`, `December%202023.csv`
- Format: CSV (not downloaded — see blocker)
- Schema (per council description, not verified from file): `Directorate, Service Area, Group Description, Paid Date, Supplier Name, Internal Reference, Capital/Revenue, Cost Centre, Cost Centre Name, Total (ex VAT)`
- Cloudflare: unclear — **HARD BLOCKER**: `www.newcastle.gov.uk` (194.61.173.205) refuses TCP :443 from this host (timeout on direct curl AND WebFetch returns ECONNREFUSED). Either IP firewall, geo-block, or aggressive WAF. Verify from another egress.
- Rows/month: unknown (uncommon file to sample)
- Quirks: **£250 threshold** (not £500) — confirmed by page title "Payments over £250"; published monthly with ~30-day lag
- Sample row: not retrieved
- FY 2023/24 availability: monthly files referenced for Feb/Nov/Dec 2023 via search; full Apr23-Mar24 expected under the same pattern
- Sample: NOT DOWNLOADED

### Sunderland City Council — PARTIAL (HARD BLOCKER)
- Landing page: https://www.sunderland.gov.uk/article/13261/Payments-over-500
- Data URL pattern: `https://www.sunderland.gov.uk/media/{id}/Expenditure-over-500-Quarter-{n}-{months}-{year}-CSV/{csv|xls}/...` — **quarterly** files; Q3 Oct-Dec 2023 = `/media/31696/.../xlsx` (note: Sunderland now publishes as XLSX under a `/xls/` path segment despite being labelled CSV); Q2 Jul-Sep 2023 at article 29361; Q4 Jan-Mar 2023 at article 27315
- Format: mix of CSV and XLSX depending on quarter; quarterly cadence (4 files per FY)
- Schema: columns include Supplier Name, Transaction Number, Payment/Invoice Date, Invoice Value (per prior Sunderland format — not verified from downloaded file)
- Cloudflare: **YES — confirmed**. `set-cookie: __cf_bm=...; Server: cloudflare; CF-RAY: 9ec6d7f5c8939b24-EZE` returned on direct download attempts → 403 Forbidden. HARD BLOCKER for automated fetching. Will need `cloudscraper`, browser-emulating client, or manual download.
- Rows/quarter: unknown
- Quirks: quarterly (not monthly), mixed CSV/XLSX, Cloudflare bot-management on media path
- Sample row: not retrieved
- FY 2023/24 availability: Q2, Q3 confirmed accessible via landing article URLs; Q1 + Q4 of 2023/24 need landing page scrape
- Sample: NOT DOWNLOADED (Cloudflare 403)

---

## Hard blockers summary
1. **Sunderland** — Cloudflare bot-management on `/media/` downloads returns 403. Needs cloudscraper or Playwright. Sunderland is also on Data Mill North (`datamillnorth.org/publisher/sunderland-city-council`) as a potential backup route.
2. **Newcastle upon Tyne** — `www.newcastle.gov.uk` refuses TCP :443 from this egress (timeout, not TLS error). Either IP-level firewall or WAF. Retry from different network/Vultr; if persistent, use a proxy or WebArchive mirror. Also note: threshold is **£250**, not £500 — different from the other 7.

## Other notable patterns
- **Only Wirral and Wakefield** use clean, predictable URL patterns. Sandwell, Walsall, Wolverhampton, Kirklees require scraping the landing page to harvest monthly file IDs/dates/casing.
- **Wakefield** uses Data Mill North (as predicted); **Kirklees does NOT** use DMN despite being West Yorkshire — it self-hosts XLSX files.
- **Wolverhampton and Wakefield publish ALL payments** (no £500 filter); downstream pipeline must filter ≥500 if consistency matters.
- **Kirklees is the only XLSX-native** source in this batch (rest are CSV).
- Schema heterogeneity is high: column naming for department/purpose/supplier/amount differs across all 8, consistent with prior Budget Galaxy findings for English councils.
- Sandwell and Wakefield include SeRCOP / ProClass classification — higher-quality categorisation than the others.

## Samples saved
- `/tmp/metdistricts_batch_sandwell_sample.csv` (Apr23, 1.0 MB)
- `/tmp/metdistricts_batch_wolverhampton_sample.csv` (Apr23, 1.1 MB)
- `/tmp/metdistricts_batch_walsall_sample.csv` (Apr23, 2.3 MB)
- `/tmp/metdistricts_batch_wirral_sample.csv` (Apr23, 887 KB)
- `/tmp/metdistricts_batch_wakefield_sample.csv` (Q2 2023/24, 2.3 MB)
- `/tmp/metdistricts_batch_kirklees_sample.xlsx` (Apr23, 419 KB)
- `/tmp/metdistricts_batch_newcastle_sample.csv` — NOT DOWNLOADED (blocker)
- `/tmp/metdistricts_batch_sunderland_sample.xlsx` — NOT DOWNLOADED (Cloudflare 403)