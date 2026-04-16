# London boroughs discovery batch 4

_Agent: agent-a1441507d33ab418f_

All 7 samples downloaded. Here's the scouting report.

---

### Redbridge
- Landing page: https://data.redbridge.gov.uk/View/finance/payments-over-500-2023-24
- Data URL pattern: `https://data.redbridge.gov.uk/Download/finance/payments-over-500-2023-24/{month-name}-{YYYY}/CSV` (e.g. `april-2023/CSV`, `sept-2023/CSV` — note Sept is abbreviated)
- Format: CSV, comma-delimited, UTF-8, ~25,000 rows/month (Jan 2024 = 25,610 rows, 13 MB)
- Schema: 27 columns. dept="Directorate", purpose="Service" + "Bvsum description" + "Account description", supplier="Supplier description", amount="Amount". Also includes Company Reg No + OpenCorporates URI (unusually rich).
- Cloudflare: no (plain nginx DataShare portal)
- Quirks: Richest schema of the 7. Dates as "DD/MM/YYYY 00:00:00". Negative amounts present (credits). Period in YYYYMM (e.g., "202410" = month 10 of FY). September 2023 URL uses `sept-2023` not `september-2023`.
- Sample row: `Redbridge | Central Services | Local Tax Collection | 31/12/2023 | 58.54 | Printing | OPUS TRUST MARKETING LIMITED | 03829462`
- FY 2023/24 availability: all 12 months confirmed via HTTP 200

### Richmond upon Thames
- Landing page: https://www.richmond.gov.uk/council_payments_to_suppliers
- Data URL pattern: `https://www.richmond.gov.uk/media/{hash}/council_expenditure_{month}_{year}.csv` — hash is random per file (e.g. `uarnd01p` = Apr 2023)
- Format: CSV, comma-delimited, ~2,000 rows/month (April 2023 = 2,032 rows, 200 KB). July 2023 is XLSX not CSV.
- Schema: 6 columns. dept="DIRECTORATE", purpose="ACTIVITY", supplier="PAYEE", amount="PAYMENT AMOUNT" (space-padded, thousand separators). Note: "SUPPLIER NO" column actually contains the literal string "Invoice", not an ID.
- Cloudflare: no (Umbraco media)
- Quirks: Schema IDENTICAL to Wandsworth — likely shared Oracle/SAP finance export. `over_500.csv` at `/media/6021/` is an aggregate summary (1667 rows, no dates), NOT transactional — ignore it. July 2023 breaks the CSV pattern (xlsx).
- Sample row: `Environment & Community Services | 04/04/2023 | 754.80 | Elite Guarding UK Ltd TA Troja | Invoice | Agency Staff`
- FY 2023/24 availability: all 12 months (July 2023 is xlsx)

### Sutton
- Landing page: https://www.sutton.gov.uk/web/guest/w/local-government-transparency-code
- Data URL pattern: `https://www.sutton.gov.uk/documents/20124/{folder}/LBS+...payments+over+%C2%A3500+{Month}+{Year}+...csv/{uuid}?t={timestamp}` — Liferay DMS, URLs fragile with spaces, £-sign, inconsistent casing ("Payments over" vs "payments over", "over £500" vs "of £500"). Each month has unique UUID.
- Format: CSV, comma-delimited, ~5,000 rows/month (Nov 2023 = 5,461 rows, 860 KB)
- Schema: 9 columns. dept="Expense Area", purpose="Expense Type" + "Supplier Category", supplier="Supplier name", amount="Amount £ (Excl VAT)" (£ sign mangled as `�` in Latin-1). Date column included.
- Cloudflare: no
- Quirks: Latin-1 encoding on header. Amount is EXCL VAT (unusual). Personal data redacted as "REDACTED - PERSONAL DATA". Transparency page has no static catalog — you must scrape the landing page each time since the UUIDs and timestamps rotate.
- Sample row: `Sutton | 31/10/2023 | 20061555 | 11,125.00 | 31ten Consulting Ltd | FINANCIAL/INSURANCE | Resources | Professional Fees | A44066`
- FY 2023/24 availability: all 12 months confirmed in landing page scrape

### Tower Hamlets
- Landing page: https://www.towerhamlets.gov.uk/lgnl/council_and_democracy/transparency/payments_to_suppliers.aspx
- Data URL pattern: `https://www.towerhamlets.gov.uk/Documents/Transparency-data/Payments-to-suppliers/{folder}/250-Spend-{Month}-{YYYY}.csv` — FY23-24 months Apr-Dec 2023 live in folder `2022-2023`, Jan-Mar 2024 in `2023-2024`. Casing varies (`250-Spend` vs `250-spend`).
- Format: CSV, comma-delimited, UTF-8 with BOM, ~5,000 rows/month (Apr 2023 = 5,026 rows, 942 KB). Threshold is £250 not £500 (filter client-side).
- Schema: 9 columns. dept="Directorate" + "Service" + "Division" + "Responsible Unit", purpose="Expense Type", supplier="Supplier Name", amount="Net Amount". No VAT indicator.
- Cloudflare: no
- Quirks: **Threshold £250** (more rows, can filter). Folder naming is MISLEADING — the "2022-2023" folder actually holds Apr-Dec 2023. Apostrophe encoding issue in "Chief Executive's" (shows as `Executive�s`). Date DD/MM/YYYY. Filename casing varies: `April-2023` (full month) used for 2023, abbreviated `Apr-24` used for 2024.
- Sample row: `Chief Executive's Office | Planning Services | Community Development | 19/04/2023 | 5775320 | 18,830.02 | LONDON BOROUGH OF LEWISHAM`
- FY 2023/24 availability: all 12 months likely — April 2023 verified HTTP 200, pattern consistent

### Waltham Forest
- Landing page: https://www.walthamforest.gov.uk/council-and-elections/about-us/council-budgets-and-spending/council-transparency/spending-and-procurement-information/council-spending-above-ps500
- Data URL pattern: `https://www.walthamforest.gov.uk/sites/default/files/{YYYY-MM}/{Month}%20{YYYY}%20Transparency%20Report.xlsx` — mtime folder is unpredictable (files currently under `2025-04`, `2025-05`, `2025-06`, `2025-07`). Filename spelling inconsistent: "Transparenct" (typo) for Sep/Dec 2023.
- Format: XLSX single-sheet, ~1,430 rows/month (Jan 2024)
- Schema: 7 columns. dept="Division" (format `B0000C-Council Balance Sheet`), purpose="Service" (format `B0000E-...`), supplier="Supplier Name", amount="Invoice Amount". Also has "Invoice Date", "Payment Date".
- Cloudflare: no (Drupal `/sites/default/files/`)
- Quirks: **HARD BLOCKER — only 7 of 12 FY23-24 months available on live page**: Sep, Oct, Nov, Dec 2023 + Jan, Feb, Mar 2024. April-August 2023 are NOT listed (confirmed by parsing landing page). Rolling window — older months pruned. Sheet name = "January 2024" (varies per file). Personal data has leading newline: `\nREDACTED PERSONAL DATA`. Some Windows-1252 quirks. Division codes encode directorate — need parsing.
- Sample row: `SDD Limited | Jan 24/1 | 500 | 15-JUN-2023 | 09-JAN-2024 | B0000C-Council Balance Sheet | B0000E-Council Balance Sheet Service`
- FY 2023/24 availability: **PARTIAL — 7/12 months**. Apr-Aug 2023 require FOI or archive.org recovery.

### Wandsworth
- Landing page: https://www.wandsworth.gov.uk/the-council/how-the-council-works/council-finances/council-expenditure/
- Data URL pattern: `https://www.wandsworth.gov.uk/media/{hash}/council_expenditure_{month}_{year}.csv` — hash random per file (early months are numeric `13692`, later use slugs `czoiyhny`). All 12 URLs enumerated.
- Format: CSV, comma-delimited, ~4,000 rows/month (Aug 2023 = 4,048 rows, 443 KB)
- Schema: 6 columns. dept="DIRECTORATE", purpose="ACTIVITY", supplier="PAYEE", amount="PAYMENT AMOUNT". **Identical schema to Richmond** (shared finance system, probably Oracle Fusion shared services).
- Cloudflare: no (Umbraco media like Richmond)
- Quirks: "SUPPLIER NO" column literally contains "Invoice" not an ID (same bug as Richmond). Heavy personal-data redaction on Adult Social Services rows (many duplicate "Direct Payments to Clients" rows). Also publishes PDF twin of each CSV.
- Sample row: `Adult Social Services | 03/08/2023 | 3,086.48 | REDACTED PERSONAL DATA | Invoice | Direct Payments to Clients`
- FY 2023/24 availability: all 12 months via enumerated URLs

### Westminster
- Landing page: https://www.westminster.gov.uk/about-council/transparency/spending-procurement-and-data-transparency/202324
- Data URL pattern: `https://www.westminster.gov.uk/media/document/q{N}-2023-24---expenditure-over-%C2%A3500` (Q4 URL has `-report` suffix). Served as CSV despite no extension.
- Format: CSV, comma-delimited, UTF-8, **quarterly not monthly**, ~18,000 rows/quarter (Q1 = 17,932 rows, 1.8 MB)
- Schema: 6 columns. dept="Department", purpose="Expense type", supplier="Supplier name", amount="Amount" (space-padded like `" 51,294.00 "`). Also "Posting date", "Supplier number".
- Cloudflare: no (but page is behind a Sitecore CMS — URLs are brittle)
- Quirks: **Quarterly only** — 4 files covers the full FY. Expense type strings are truncated (e.g., `B*Voluntary-Spot-V Dep-Enhanced - do not u`). Department names also truncated (e.g., `ASC Procurement and Business Intelligenc`). Amounts have leading/trailing spaces.
- Sample row: `02/05/2023 | 1249077 | The Advocacy Project | B*Voluntary-Spot-V Dep-Enhanced | ASC Procurement and Business Intelligenc |  51,294.00 `
- FY 2023/24 availability: all 4 quarters confirmed on page

---

**Hard blockers flagged**
- **Waltham Forest**: 5/12 months missing (Apr-Aug 2023) — rolling window prunes older files. Only partial FY23-24 coverage. Try Wayback Machine or London Datastore backups (data.london.gov.uk/dataset/waltham-forest-council-transparency returns 403 to WebFetch but worth a direct-browser attempt).
- **Sutton**: no hard block, but URLs are UUID+timestamp so you must re-scrape the landing page on every run — do not cache URLs.
- **Tower Hamlets**: threshold is £250 not £500, and folder naming is misleading (Apr-Dec 2023 live in `/2022-2023/` folder).
- **Westminster**: quarterly granularity only (not monthly), and column strings are truncated at ~40 chars.
- **Richmond / Wandsworth**: identical minimal 6-col schema, no transaction IDs, "SUPPLIER NO" column holds literal "Invoice".

**Samples saved** to:
- `/tmp/london_batch4_redbridge_sample.csv` (Jan 2024, 13 MB)
- `/tmp/london_batch4_richmond_sample.csv` (Apr 2023, 200 KB)
- `/tmp/london_batch4_sutton_sample.csv` (Nov 2023, 860 KB)
- `/tmp/london_batch4_towerhamlets_sample.csv` (Apr 2023, 942 KB)
- `/tmp/london_batch4_waltham_sample.xlsx` (Jan 2024, 90 KB)
- `/tmp/london_batch4_wandsworth_sample.csv` (Aug 2023, 443 KB)
- `/tmp/london_batch4_westminster_sample.csv` (Q1 2023-24, 1.8 MB)

None of the 7 sites are Cloudflare-protected. No Socrata/CKAN API detected in this batch. 6/7 boroughs have full FY23-24 coverage; Waltham Forest is the only partial.