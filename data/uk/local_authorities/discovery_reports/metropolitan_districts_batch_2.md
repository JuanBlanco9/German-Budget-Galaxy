# Metropolitan Districts batch 2

_Agent: agent-ab89b7f1c9c939d00_

I have enough. The blocked Calderdale/Gateshead files should be cleaned up. Note: calderdale_2023_08.csv was actually Leeds (mis-identified earlier). Here is the final report:

---

### 1. Bolton Metropolitan Borough Council
- Landing page: https://www.bolton.gov.uk/downloads/download/196/expenditure_reports
- Data URL pattern: `https://www.bolton.gov.uk/downloads/file/{id}/expenditure-over-500-for-{month}-{year}` (file IDs 5002-5947 cover Apr23-Mar24)
- Format: CSV, comma-delimited, **Windows-1252 / cp1252 encoding** (£ sign appears as `�` in raw bytes)
- Schema: `Authority, Service Area, Description (purpose), Payment (date), Amount, Supplier`
- Cloudflare: no (plain curl works)
- Rows/month: ~2,100-2,300 (Apr=2117, May=2302)
- Quirks: cp1252 encoding is non-standard — must iconv to UTF-8 or parser fails on £. Flat 6-col schema, no header metadata rows. Threshold strictly £500.
- Sample row: `Bolton MBC,Adult Services,Residential Provision,03-Apr-23,"£15,867.72",62 Wright Street#Mencap`
- FY 2023/24 availability: **all 12 months** confirmed via download page scrape

### 2. Bury Metropolitan Borough Council — HARD BLOCKER (rolling 2-year window)
- Landing page: https://www.bury.gov.uk/council-and-democracy/budgets-and-spending/payments-to-suppliers
- Data URL pattern: `https://www.bury.gov.uk/asset-library/spend-over-500-{month}-{year}.xlsx`
- Format: XLSX, 7 cols, A1:G2978 for Apr23
- Schema: `Account, CostC, Amount, [Council], [Supplier group], Service, Supplier`
- Cloudflare: no
- Rows/month: ~2,977 (April 2023)
- Quirks: **Rolling 2-year retention window**. As of April 2026, only 6 of 12 FY23/24 months respond 200 OK (April, October, December 2023 + Jan, Feb, Mar 2024). **May-Sept 2023 and Nov 2023 = 404 (purged).** Inconsistent naming ("aug" vs "august", "sep-24" vs "september-2024"). Rolled over to `payments-to-suppliers-over-500-*.xlsx` from Dec 2025.
- Sample (Apr23): `Department of Operations, Catering, £###, Tiffin Sandwiches Ltd...`
- FY 2023/24 availability: **6/12 partial — 6 months purged**

### 3. Calderdale Metropolitan Borough Council — HARD BLOCKER (WAF)
- Landing page: https://www.calderdale.gov.uk/council/finances/income-spending/index.jsp (also https://dataworks.calderdale.gov.uk/dataset/2wqx8/payments-to-suppliers)
- Data URL pattern (Google-indexed): `https://www.calderdale.gov.uk/council/finances/income-spending/{YYYY}/{MonthName}.csv` and `{MonthName}-card-payments.csv`; older months use `.xls`
- Format: CSV monthly, ~2 MB each
- Schema (from search snippet): `Body, Organisation Name, Date, Internal Ref Number, Net Amount, Irrecoverable VAT, Supplier (Beneficiary) Name, Registered Company Number, Charity Number, Supplier ID, VAT Reg, Expense Area, Procurement Classification, Expense Code, BVACOP, Proclass, Extended Description, Source, Subsource, Definition, Purpose of Spend (Summary), VCSE flag` (~22 cols, very rich)
- Cloudflare: **BOTH blocking layers** — `www.calderdale.gov.uk` returns HTML "Blocked" page (custom WAF, returns 404/blocked HTML regardless of UA including Firefox, Googlebot, with Referer), AND `dataworks.calderdale.gov.uk` is Cloudflare-managed-challenge protected. All curl/WebFetch attempts failed.
- Rows/month: unknown — ~2 MB CSV implies ~5-10k rows
- Quirks: Separate "card-payments" files. Quarterly aggregation mentioned in search results. NOT on Data Mill North despite being West Yorkshire (Leeds/Bradford/Kirklees/Wakefield are; Calderdale has its own Data Works). Data Mill North's `council-spend-over-250-emd0m` dataset is **Leeds-only** — do not confuse.
- FY 2023/24 availability: **URLs exist per Google index but automated download blocked** — requires headless browser or manual download

### 4. Doncaster Metropolitan Borough Council
- Landing page: https://www.doncaster.gov.uk/services/the-council-democracy/payments-to-suppliers-reports-2023-24
- Data URL pattern: `https://dmbcwebstolive01.blob.core.windows.net/media/Default/Council%20and%20Democracy/Published%20Spend%20Report%20{Month}%20{Year}.csv` (April-Sept 2023) + `https://www.doncaster.gov.uk/Documents/DocumentView/Stream/Media/Default/Council and Democracy/Published Spend Report {Month} {Year}.csv` (Oct 2023-Mar 2024). November has `-1` suffix.
- Format: CSV, comma-delimited, UTF-8, ~2.2 MB Apr23
- Schema: `Date, Transaction Number, Directorate, Local Authority Dept, Merchant Category, Summary of Purpose of Expenditure 1, Summary of Purpose of Expenditure 2, Beneficiary, Total` (9 cols)
- Cloudflare: no
- Rows/month: **~30,000** (Apr23 = 30,222 rows)
- Quirks: **NOT a £500 threshold file** — 22% of rows are under £500 (6,667 of 30,222 in Apr23). This is Doncaster's full spend export. Negative/reversed entries present. Fixed-width padding with trailing spaces in dept columns. Supplier redaction: "REDACTED PERSONAL DATA". Dual hosting (Azure blob + CMS proxy). Separate quarterly purchase-card xlsx files.
- Sample: `01/04/2023,4858791,"CHILDREN,YOUNG PEOPLE&FAMILIES",CiC AND ACHIEVING PERMANENCE  ,SERVICES,FOSTERING - GENERAL,PUBLICITY,TOTAL MERCHANDISE,"2,205.83"`
- FY 2023/24 availability: **all 12 months**

### 5. Gateshead Metropolitan Borough Council — PARTIAL BLOCKER (WAF)
- Landing page: https://www.gateshead.gov.uk/article/3456/Expenditure-over-500
- Data URL pattern: `https://www.gateshead.gov.uk/media/{mediaID}/{Month}-{Year}/excel/{YYMMxx}.csv?m={ts}` — media IDs: 37154 (May-2023 → 202302.csv), 37439 (Jun-2023 → 202303.csv), 38929 (Nov-2023 → 202308.csv). IDs non-sequential.
- Format: CSV (confirmed via Google cache snippets)
- Schema: `Nstrg (dept), CIPF Subject Classification, Transaction Number, Period, Supplier ID, Amount...` (Barclaycard GPC-style)
- Cloudflare: **yes, aggressive WAF** — returns 403 Forbidden to every UA tested (Chrome, Firefox, Googlebot, with Referer). WebFetch also 403.
- Rows/month: unknown
- Quirks: URL filename uses period code (202302 = FY2023 period 2 = May), NOT calendar month. Discovery requires scraping the landing page. Updated 15th of each month.
- FY 2023/24 availability: **URLs likely exist but blocked to automated clients** — same blocker class as Calderdale

### 6. Knowsley Metropolitan Borough Council
- Landing page: https://www.knowsley.gov.uk/council-and-elections/accounts-budgets-and-spending/spending-over-ps500
- Data URL pattern: `https://www.knowsley.gov.uk/sites/default/files/2025-03/2023%20-%20{Month}.xlsx` (Apr-Dec 2023) + `.../2025-03/2024%20-%20{Month}.xlsx` (Jan-Mar 2024). All 12 files re-dated into `/2025-03/` folder (site migration). Dec files have `_0` suffix.
- Format: XLSX, 13 cols, A1:M6250 for Apr23
- Schema (13 cols, column widths suggest): payment date, directorate, service, supplier, amount, description, etc.
- Cloudflare: no
- Rows/month: ~6,249 (Apr23)
- Quirks: Drupal/Frontier CMS. Underscore suffix `_0` for versioned reuploads (Dec 2023). Files renamed/moved when republished — the 2023-12/2023 folder only has Jan-Mar 2023; everything else in 2025-03.
- FY 2023/24 availability: **all 12 months**

### 7. Oldham Metropolitan Borough Council
- Landing page: https://www.oldham.gov.uk/info/200145/budgets_and_spending/1926/council_spending_records → https://www.oldham.gov.uk/downloads/200681/council_spending_records
- Data URL pattern: `https://www.oldham.gov.uk/download/downloads/id/{id}/{quarter_slug}_spending_records.xlsx` — 7712 (Apr-Jun 2023), 7795 (Jul-Sep 2023), 7951 (Oct-Dec 2023), 8002 (Jan-Mar 2024)
- Format: XLSX **quarterly** (not monthly), 8 cols, A1:H6345 for Q1
- Schema: `Portfolio, Directorate, Division, Service Area, Type of Expenditure, Payment Date, Amount (£), Supplier`
- Cloudflare: no
- Rows/quarter: ~6,345 (Q1 FY23/24)
- Quirks: **Quarterly granularity only**, must download 4 files for full FY. Uses numeric download IDs. Rich portfolio/directorate/division/service hierarchy (4 levels).
- Sample headers confirmed in sharedStrings: Portfolio → Directorate → Division → Service Area → Type → Date → Amount
- FY 2023/24 availability: **all 4 quarters**

### 8. Rotherham Metropolitan Borough Council
- Landing page: https://www.rotherham.gov.uk/downloads/download/510/financial-reports-and-documentation-2023-to-2024
- Data URL pattern: `https://www.rotherham.gov.uk/downloads/file/{id}/spend-over-500-{month}-{year}` — IDs 3198 (Apr23) through 3565 (Mar24). Sister `purchase-card-spend-{month}-{year}` for GPC files.
- Format: **XLS (BIFF/OLE Compound Document, Excel 97-2003)** for Apr23 (991 KB); **XLSX for Mar24** (557 KB). Mix of formats across the year.
- Schema (from OLE metadata): Department, Supplier, Category, Amount — includes depts like Finance, Water Services, Public Health, Legal Services, Transport, Catering
- Cloudflare: no
- Rows/month: unknown (binary xls, no Python available to parse)
- Quirks: **Format switched mid-FY** from .xls to .xlsx. Separate companion purchase-card files. Author metadata leaks (Peter Senior, Rotherham MBC).
- FY 2023/24 availability: **all 12 months** + 12 purchase card files

---

## Summary of blockers

| Council | Status | Blocker |
|---|---|---|
| Bolton | OK | cp1252 encoding quirk |
| Bury | **PARTIAL** | Rolling 2-yr window → 6/12 months purged |
| Calderdale | **BLOCKED** | Custom WAF blocks all UAs; dataworks also Cloudflare |
| Doncaster | OK | Not a £500-threshold file; 30k rows/month mixed |
| Gateshead | **BLOCKED** | Aggressive WAF returns 403 to all automated clients |
| Knowsley | OK | — |
| Oldham | OK | Quarterly-only granularity |
| Rotherham | OK | xls/xlsx format mix |

**5 of 8 councils fully downloadable** via curl/WebFetch. For Calderdale and Gateshead, automated download requires a headless browser (Playwright/Selenium) or manual click-through; the URLs are known. For Bury, 6 months of FY23/24 are permanently lost unless Wayback Machine captured them.

## Samples saved to /tmp/
- `/tmp/metdistricts2_bolton_april2023.csv` (220 KB, 2117 rows)
- `/tmp/metdistricts2_bolton_may2023.csv` (240 KB, 2302 rows)
- `/tmp/metdistricts2_bury_april2023.xlsx` (102 KB, 2977 rows)
- `/tmp/metdistricts2_doncaster_april2023.csv` (2.3 MB, 30,222 rows)
- `/tmp/metdistricts2_knowsley_april2023.xlsx` (477 KB, 6249 rows)
- `/tmp/metdistricts2_oldham_q1.xlsx` (324 KB, 6344 rows, Q1 FY23/24)
- `/tmp/metdistricts2_rotherham_april2023.xls` (991 KB, BIFF)
- `/tmp/metdistricts2_rotherham_march2024.xls` (557 KB, actually XLSX)

Note: `/tmp/metdistricts2_calderdale_2023_08.csv` was Leeds-only from Data Mill North and should be disregarded as a Calderdale sample. `/tmp/metdistricts2_calderdale_apr2023.csv` and `/tmp/metdistricts2_gateshead_june2023.csv` are "Blocked"/"403" response bodies, not real data.

Sources:
- [Bolton Council expenditure reports](https://www.bolton.gov.uk/finance-spending/expenditure-reports)
- [Bury payments to suppliers](https://www.bury.gov.uk/council-and-democracy/budgets-and-spending/payments-to-suppliers)
- [Calderdale income and spending](https://www.calderdale.gov.uk/council/finances/income-spending/index.jsp)
- [Doncaster payments to suppliers 2023-24](https://www.doncaster.gov.uk/services/the-council-democracy/payments-to-suppliers-reports-2023-24)
- [Gateshead expenditure over £500](https://www.gateshead.gov.uk/article/3456/Expenditure-over-500)
- [Knowsley spending over £500](https://www.knowsley.gov.uk/council-and-elections/accounts-budgets-and-spending/spending-over-ps500)
- [Oldham council spending records](https://www.oldham.gov.uk/downloads/200681/council_spending_records)
- [Rotherham financial reports 2023-2024](https://www.rotherham.gov.uk/downloads/download/510/financial-reports-and-documentation-2023-to-2024)