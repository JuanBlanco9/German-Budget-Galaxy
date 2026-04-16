# Counties B + Big Unitaries discovery

_Agent: agent-a378b1e90d535b51a_

Now I have enough to produce the final report.

### Batch B council discovery report

Fully mapped (5 of 8): Worcestershire, Cumberland, Westmorland & Furness, Brighton & Hove, Portsmouth. Hard blockers (3 of 8): Wiltshire (Cloudflare), Dorset (Cloudflare), Southampton (Imperva/Incapsula); Plymouth is a soft blocker (no modern transparency page found in sitemap).

### Worcestershire County Council
- Landing: `https://www.worcestershire.gov.uk/council-services/council-and-democracy/council-finance/payments-commercial-suppliers`
- Data URL pattern: `https://www.worcestershire.gov.uk/sites/default/files/{yyyy-mm}/over_ps500_spend_report_{month}_{yyyy}.xlsx` (capitalisation inconsistent, e.g. `Over%20%C2%A3500%20Spend%20Report%20...`; March 2024 file is `Over%20%C2%A3500%20and%20Pcard%20data%20March%202024.xlsx`; Jan 2024 is `Over500SpendReportJan2024.xlsx`)
- Format: XLSX, single sheet
- Schema: Directorate | Cost Centre Code | Cost Centre Description | Supplier Name | Item Code Desc | Nominal Description | Transaction Reference | Payment Date | Total Net Amount
- Cloudflare: no
- Rows: June 2023 file ~303 KB, 4114 unique strings (~3-4k rows/month)
- Quirks: threshold £500; March 2024 and Feb 2024 sheets bundled with Pcard data (likely second tab); filename scheme changed mid-year; `ps500` vs `£500` encoding varies
- Sample: see `/tmp/counties_batch_b_worcestershire_sample.xlsx` (June 2023)
- FY 2023/24 availability: **all 12 months present** (Apr 2023 – Mar 2024)

### Cumberland Council (new unitary since 1 Apr 2023)
- Landing: `https://www.cumberland.gov.uk/your-council/legal-and-financial-information/cumberland-council-spend-over-ps250/council-expenditure-over-ps250`
- FY 23/24 index: `https://www.cumberland.gov.uk/document-search?field_document_target_id=1287`
- Data URL pattern: `https://www.cumberland.gov.uk/sites/default/files/{yyyy-mm}/{Month}%20{YYYY}%2C%20expenditure%20over%20%C2%A3250%20{category}.csv` (4 categories per month: `trade suppliers`, `private homes`, `support related payments to individuals`, plus `corporate_purchase_card_spend` and `schools_purchase_card_spend`)
- Format: CSV, UTF-8 with 2 metadata rows + header on row 3
- Schema: Company | coded supplier | Supplier Name | Date | System Reference | Directorate Description | Directorate Area | Expenditure Description | Type of Expenditure | Line Number | Line Amount
- Cloudflare: no
- Rows: April 2023 trade suppliers ~6.8k rows
- Quirks: **threshold £250** (not £500); multiple files per month per category; encoding issue in "Resources" column (replacement chars); legacy 500 data separate page `/legacy-council-expenditure-over-ps500`; also has legacy Allerdale/Carlisle/Copeland files for April 2023 transition month
- Sample: `/tmp/counties_batch_b_cumberland_sample.csv`
- FY 2023/24 availability: **all 12 months present** (inherits former Cumbria CC area + coverage from Apr 2023 vesting)

### Westmorland and Furness Council (new unitary since 1 Apr 2023)
- Landing: `https://www.westmorlandandfurness.gov.uk/your-council/finance/payments-suppliers/payments-over-ps250/spending-over-ps250-2023-2024`
- Data URL pattern: `https://www.westmorlandandfurness.gov.uk/sites/default/files/{yyyy-mm}/{Category}%20{MONTH}%20{YYYY}%20-%20WF.csv` (categories: `Trade Suppliers`, `Private Homes`, `Support Related Payments to Individuals`)
- Format: CSV, same 3-row metadata header as Cumberland (likely shared Cumbria legacy system)
- Schema: identical to Cumberland (Company, coded supplier, Supplier Name, Date, System Reference, Directorate Description, Directorate Area, Expenditure Description, Type of Expenditure, Line Number, Line Amount)
- Cloudflare: no
- Rows: April 2023 trade suppliers ~6.2k rows
- Quirks: **threshold £250**; 3 categories per month; filenames inconsistent (APRIL2023, MAY%202023, JULY vs July); encoding mostly clean
- Sample: `/tmp/counties_batch_b_westmorland_furness_sample.csv`
- FY 2023/24 availability: **all 12 months present** for all 3 categories

### Wiltshire Council (unitary)
- Landing: `https://www.wiltshire.gov.uk/article/1028/Payments-to-suppliers` (historically), now 403-blocked
- Data URL pattern: historical `https://www.wiltshire.gov.uk/paymentsoverfivehundred-{YYYY}-{MM}-v1.csv` — **returns 404 for modern dates**, pattern abandoned post-2012
- **HARD BLOCKER**: the entire `www.wiltshire.gov.uk` domain returns **HTTP 403** to curl (Cloudflare challenge requires JS); even archival Wayback CDX queries return empty for 2023-2024 payments URLs. DGU listing only has 2010-2011 files. Requires headless browser (Playwright) to render or manual download.
- FY 2023/24 availability: **unknown via HTTP automation** — manual download required

### Dorset Council (unitary)
- Landing: unknown (all candidates 403)
- **HARD BLOCKER**: `www.dorsetcouncil.gov.uk` returns **HTTP 403** on all tested paths including root, sitemap, and known-good transparency URL variants. Cloudflare-protected; sitemap also empty (0 bytes). DGU lists only the former East/North/West Dorset district councils (pre-2019 merger). Requires headless browser.
- FY 2023/24 availability: **unknown via HTTP automation**

### Brighton and Hove City Council (unitary)
- Landing: `https://www.brighton-hove.gov.uk/council-and-democracy/creditor-payments-over-ps250-2023-2024`
- Data URL pattern: `https://www.brighton-hove.gov.uk/sites/default/files/{yyyy-mm}/Creditor%20Payments%20Over%20250%20{Month}%20{YYYY}.csv` (case varies)
- Format: CSV, UTF-8, header on row 1
- Schema (18 cols): Body Name | Body | Service Label | Service Code | Service Division Label | Service Division Code | Expenditure Category | Expenditure Code | CIPFA Detailed Expenditure Type | CIPFA Detailed Expenditure Code | Date | Transaction Number | CC 43 TBM Section | CCN 43 TBM Section | CC 02 Council or Non Council | Net Amount | Capital and Revenue | Creditor Name
- Cloudflare: no
- Rows: April 2023 ~6.4k rows
- Quirks: **threshold £250**; dual-published (CSV + PDF for each month); date format DD/MM/YYYY; the sibling page `/spending` is a separate stale 14 MB inline-HTML dump (July-Sept 2020 only) — do NOT use that one
- Sample: `/tmp/counties_batch_b_brighton_hove_sample.csv`
- FY 2023/24 availability: **all 12 months present**

### Plymouth City Council (unitary)
- **SOFT BLOCKER**: Full 3-page sitemap traversal found zero transparency/spend-over-500 pages. Candidate URLs `/expenditure-over-500`, `/spend-over-500`, `/transparency`, `/payments-over-500` all 404. Only `/statement-accounts` and `/council-finances-and-accounts` exist, and neither contains supplier spend files. data.gov.uk only lists a stale 2015 dataset. 
- Likely Plymouth has ceased publishing monthly transparency CSVs post-2015 or buries them behind Moderngov committee papers. Requires targeted FOI or deep site search.
- FY 2023/24 availability: **not found**

### Portsmouth City Council (unitary)
- Landing: `https://www.portsmouth.gov.uk/services/council-and-democracy/transparency/payments-to-suppliers/`
- Data portal: `https://data.portsmouth.gov.uk/tables/payments-to-suppliers`
- Data URL pattern: `https://data.portsmouth.gov.uk/media/tables/pcc-spend-transparency-template-fusion-{month}-{YYYY}-.csv` (April 2023 uses slug `payment-to-suppliers-april-2023`, all other months `payments-to-suppliers-{month}-{YYYY}`; actual file slug `pcc-spend-transparency-template-fusion-{month}-{yyyy}-.csv`, occasionally with trailing/leading hyphens)
- Format: CSV, UTF-8, header on row 1
- Schema (13 cols): Body Name | Body | Service Area Categorisation | Service Division Categorisation | Responsible Unit | Expenses Type | Detailed Expenses Type | Payment Date | Transaction Number | Payment Amount | Supplier Type | Supplier Name | Supplier Id
- Cloudflare: no
- Rows: April 2023 ~16.2k rows (richest in batch)
- Quirks: threshold **£500**; follows CIPFA Fusion template; amounts with thousands separators need quoting; April 2023 has different page slug from other months; negative amounts (refunds) present; DD-MMM-YY date format
- Sample: `/tmp/counties_batch_b_portsmouth_sample.csv`
- FY 2023/24 availability: **all 12 months present**

### Southampton City Council (unitary)
- **HARD BLOCKER**: `www.southampton.gov.uk` and `data.southampton.gov.uk` protected by **Imperva/Incapsula**; any path returns a sub-1 KB iframe stub `<iframe src="/_Incapsula_Resource...">`. Sitemap also Incapsula-stubbed. DGU lists only a 2010 webarchive XLS (`Payments over 500 Apr to Sept 2010 publish v2`). Requires headless browser.
- FY 2023/24 availability: **unknown via HTTP automation**

### Summary table

| Council | Threshold | Format | Cloudflare/WAF | FY 23/24 coverage | Status |
|---|---|---|---|---|---|
| Worcestershire | £500 | XLSX | no | 12/12 | DONE |
| Cumberland | £250 | CSV | no | 12/12 (3+ cats) | DONE |
| Westmorland & Furness | £250 | CSV | no | 12/12 (3 cats) | DONE |
| Wiltshire | ? | ? | **yes (CF 403)** | unknown | BLOCKED |
| Dorset | ? | ? | **yes (CF 403)** | unknown | BLOCKED |
| Brighton & Hove | £250 | CSV (+PDF) | no | 12/12 | DONE |
| Plymouth | ? | ? | no (404s) | not published | BLOCKED (soft) |
| Portsmouth | £500 | CSV (Fusion template) | no | 12/12 | DONE |
| Southampton | ? | ? | **yes (Imperva)** | unknown | BLOCKED |

### Samples saved
- `/tmp/counties_batch_b_worcestershire_sample.xlsx` (303 KB, June 2023)
- `/tmp/counties_batch_b_cumberland_sample.csv` (965 KB, April 2023 trade suppliers, ~6.8k rows)
- `/tmp/counties_batch_b_westmorland_furness_sample.csv` (721 KB, April 2023 trade suppliers, ~6.2k rows)
- `/tmp/counties_batch_b_brighton_hove_sample.csv` (1.8 MB, April 2023, ~6.4k rows)
- `/tmp/counties_batch_b_portsmouth_sample.csv` (3.9 MB, April 2023, ~16.2k rows)

### Key findings for Budget Galaxy

1. **Cumbria abolition is clean**: both Cumberland and Westmorland & Furness publish from April 2023 vesting day, using the same inherited Cumbria-legacy schema. Cumberland additionally has "legacy Carlisle/Copeland" files for the April 2023 transition month. No gap in FY 23/24 coverage between old/new authorities.
2. **£250 threshold is more common than expected** in this batch: Cumberland, WF and Brighton & Hove all publish at £250, not £500. Filter the £500+ subset client-side if you want comparability with shire counties.
3. **Three Cloudflare/Imperva hard blockers** (Wiltshire, Dorset, Southampton) need a headless browser stage (Playwright/Selenium) — pure curl cannot pass the JS challenge. Budget accordingly: probably 20-30 min of Playwright work per council to get cookies and download monthly files.
4. **Plymouth is the worst case**: no visible transparency page at all in a full 3-page sitemap traversal. Recommend FOI request or manual investigation of Moderngov committee papers, or deprioritise Plymouth entirely for FY 23/24.
5. **Portsmouth uses the CIPFA Fusion template** — richest schema in the batch (13 cols including Service Division Categorisation and Responsible Unit) and cleanest for a multi-council ETL.
6. **Schema fragmentation is high**: 5 different schemas across the 5 councils fully mapped — no two share column names. Expect to write per-council column mappers.