# London boroughs discovery batch 2

_Agent: agent-a2fc80339048312b2_

All 6 non-blocked boroughs have samples saved. Enfield is blocked by Cloudflare. Here's the final report.

---

### Enfield
- Landing page: `https://www.enfield.gov.uk/services/your-council/what-we-spend-and-how-we-spend-it`
- Data URL pattern: **UNKNOWN — hard Cloudflare wall**. Every request to `www.enfield.gov.uk` returns a Cloudflare "Just a moment..." challenge (confirmed on both the section page and the slug `/services/your-council/spending-over-500`). WebFetch also returns 403.
- Format / schema / samples: not obtainable via curl or WebFetch
- Cloudflare: **YES — blocker**
- Quirks: needs Playwright persistent-profile fallback to reach the page, then scrape the actual download slugs
- FY 2023/24 availability: unknown until browser fetch

### Greenwich
- Landing page: `https://www.royalgreenwich.gov.uk/downloads/download/1402/quarterly_payments_in_2023_and_2024`
- Data URL pattern (all 4 quarters of FY23/24, hosted on site, stable):
  - Q1: `https://www.royalgreenwich.gov.uk/sites/default/files/2025-12/Greater_than___500_Qtr_1_Apr_to_Jun_23_24_Final_for_Publishing.xlsx`
  - Q2: `.../2025-12/Greater_than___500_Qtr_2_Jul_to_Sept_23_24_Final_for_Publishing.xlsx`
  - Q3: `.../2025-12/Greater_than___500_Qtr_3_Oct_to_Dec_23_24_Final_for_Publishing.xlsx`
  - Q4: `.../2025-12/Greater_than___500_Qtr_4_Jan_to_Mar_23_24.xlsx`
- Format: XLSX (single sheet per file, ~20,800 rows Q1)
- Schema (row 1 headers): `Creditor_Name`, `Invoice Line Amount`, `Payment_Date`, `Expenditure Category/Description`, `LA Department`  → supplier=Creditor_Name, amount=Invoice Line Amount, dept=LA Department, purpose=Expenditure Category/Description
- Cloudflare: no (plain Drupal, standard UA works)
- Rows/quarter: ~20,000 (Q1 dim ref A1:E20847)
- Quirks: the filename uses `___` in place of `£`. Some rows have supplier = "REDACTED PERSONAL INFORMATION". Dates are Excel serials.
- Sample row: `Creditor="GAS & ENVIRONMENTAL SERVICES LTD", Amount=765.84, Date=45033, Category=..., Dept="Housing Services HRA"`
- FY 2023/24 availability: **all 4 quarters (full year)**
- Saved: `/tmp/london_batch2_greenwich_sample.xlsx` (Q1)

### Hackney
- Landing page: `https://www.hackney.gov.uk/council-and-elections/finances-and-transparency/transparency/council-spending-over-ps250`
- Data URL pattern: **Google Drive individual file IDs, one per month**. Each month has a viewer URL `https://drive.google.com/file/d/{ID}/view`; direct download via `https://drive.usercontent.google.com/download?id={ID}&export=download&confirm=t`
- Format: files named `.xlsx` are actually **CSV** (mime mismatch — `file` reports "CSV UTF-8 text"). Comma delimited.
- Schema: `1. YEAR, 2. MONTH, 3. DATE INCURRED, 4. DATE PAID, 5. BENEFICIARY, 6. SUPPLIER NO., 7. DEPARTMENT, 8. PURPOSE OF EXPENDITURE, 9. MERCHANT CATEGORY, Total` → supplier=BENEFICIARY, dept=DEPARTMENT, purpose=PURPOSE OF EXPENDITURE, amount=Total (formatted as ` £ 2,465.00 ` with leading/trailing spaces and thousands separator — needs cleaning)
- Cloudflare: no
- Rows/month: ~6,300 (sample was 6327 lines)
- Quirks:
  - Threshold is **£250** (not £500) — more rows than typical
  - File labels on landing page are generic "2023 spreadsheet (google sheets)" — month is only in the surrounding `<h4>` header; parser must associate each drive link with the preceding month heading
  - Anchor labels are unreliable: file I downloaded under "April 2023" header actually contains December 2023 data. **Assume each file is a single month but validate by reading YEAR/MONTH columns**, or treat all as one big pool filtered by date
  - **FY 2023/24 gaps**: h4 headers show April 2023 → February 2024 present, but **March 2024 is missing** from the landing page (last 2024 entry before October 2024 is February 2024)
  - Amount column needs regex strip: `£`, spaces, commas
- Sample row: `2023/24,DECEMBER,21/11/23,07/12/23,1GC FAMILY LAW,824376,N2001 EXTERNAL LEGAL SERVICES,500005 EXTERNAL CONTRACTORS,LEGAL SERVICES," £ 2,465.00 "`
- FY 2023/24 availability: **11/12 months (March 2024 missing)**
- Saved: `/tmp/london_batch2_hackney_sample.csv`

### Hammersmith & Fulham
- Landing page: `https://www.lbhf.gov.uk/councillors-and-democracy/data-and-information/transparency/procurement-and-financial-data`
- Data URL pattern (rolling window): `https://www.lbhf.gov.uk/sites/default/files/{YYYY-MM}/lbhf-spend-data-q{N}-{YY}-{YY}.xlsx`
  - Only live file for FY23/24: `https://www.lbhf.gov.uk/sites/default/files/2024-10/lbhf-spend-data-q4-2023-24.xlsx`
- Format: XLSX, single sheet, 7 columns, ~16,800 rows
- Schema: `Beneficiary, Category/Purpose, Department, Net value, VAT Value, Gross, Date incurred -Payment Date` → supplier=Beneficiary, purpose=Category/Purpose, dept=Department, amount=Gross (or Net value)
- Cloudflare: **Partial — CloudFront 403 on bare curl UA**. Works with realistic Chrome UA + `Accept-Language` + `--compressed`. Not a true JS challenge.
- Rows/quarter: ~16,850
- Quirks:
  - **Rolling window / purge**: Q1, Q2, Q3 of 2023/24 have been **removed from the live page** — only Q4 2023/24 remains. Hard blocker for full FY23/24 unless you find archived copies (Wayback Machine is the only recourse).
  - `Date incurred -Payment Date` header has a rogue hyphen and space
- Sample row: `Beneficiary="Play Association Hammersmith & Fulham", Department="Disabled Children's Team", Category="Care Packages", Net=6111.43, VAT=0, Gross=6111.43, Date=45314`
- FY 2023/24 availability: **Q4 only (Jan–Mar 2024), 1/4 quarters**. Q1-Q3 need Wayback.
- Saved: `/tmp/london_batch2_hammersmith_fulham_sample.xlsx`

### Haringey
- Landing page: `https://haringey.gov.uk/business/selling-to-council/council-expenditure`
- Data URL pattern (stable, all 4 quarters of FY23/24 present):
  - `https://www.haringey.gov.uk/sites/default/files/2024-07/council_expenditure_q1_23-24.csv`
  - `.../2024-07/council_expenditure_q2_23-24.csv`
  - `.../2024-07/council_expenditure_q3_23-24.csv`
  - `.../2024-07/council_expenditure_q4_23-24.csv`
- Format: **CSV UTF-8, comma-delimited**, ~21,400 rows Q1 (2 MB)
- Schema: `Payment date, Supplier Name, Purpose, Department, Amount` → supplier=Supplier Name, purpose=Purpose, dept=Department, amount=Amount (raw number, no £)
- Cloudflare: no
- Rows/quarter: ~21,000
- Quirks: **cleanest schema of the batch**. Date is `DD/MM/YYYY`. Amounts are plain decimals. Header in row 1, no metadata preamble.
- Sample row: `03/04/2023,NRT Building Services Group Ltd.,Technical & Feasibility,Housing Revenue Account,683478.69`
- FY 2023/24 availability: **all 4 quarters (full year)**
- Saved: `/tmp/london_batch2_haringey_sample.csv`

### Harrow
- Landing page: `https://www.harrow.gov.uk/downloads/download/12587/council-budgets-and-spending`
- Data URL pattern (slug-based file IDs, four quarters):
  - Q1 2023/24 (Apr–Jun): `https://www.harrow.gov.uk/downloads/file/31803/council-budget-and-spending-report-apr-to-jun-2023-final-xls-`
  - Q2 (Jul–Sep): `.../downloads/file/31969/council-budget-and-spending-report-for-july-to-september-2023-xls-`
  - Q3 (Oct–Dec): `.../downloads/file/32079/council-spend-september-december-2023-xls-`  *(note: slug says "september-december" but is actually Oct-Dec per sibling PDF 32076)*
  - Q4 (Jan–Mar 2024): `.../downloads/file/32231/council-spend-january-march-2024-xls-`
- Format: XLSX (despite "-xls-" in slug, `file` reports Excel 2007+, zipped Open XML). ~16,850 rows Q4.
- Schema (headers at row 1, located near end of sharedStrings): `Beneficiary, Category/Purpose, Department, [Net value], VAT Value, Gross, Date incurred -Payment Date` → supplier=Beneficiary, purpose=Category/Purpose, dept=Department, amount=Gross
- Cloudflare: no
- Rows/quarter: ~16,850
- Quirks:
  - Same Drupal file-download pattern as Greenwich/H&F
  - Each file ID is a fresh hash; no predictable URL pattern across quarters — must scrape the landing page
  - Some suppliers are "REDACTED PERSONAL DATA" / "REDACTED COMMERCIAL DATA"
  - Purchase card spend is a separate series — filter to "council-spend-…" not "purchase-card-spend-…"
- Sample row: `Supplier="Islington Car Service Ltd", Purpose="Trans (Private Hire)", Dept="Brent SNT Childrens", Gross=...`
- FY 2023/24 availability: **all 4 quarters (full year)**
- Saved: `/tmp/london_batch2_harrow_sample.xlsx`

### Havering
- Landing page: `https://www.havering.gov.uk/council-data-spending/spend-500` → per-year index: `https://www.havering.gov.uk/downloads/download/994/spend-over-500-2023-24`
- Data URL pattern (one file per calendar month, all 12 months of FY23/24 present):
  - `https://www.havering.gov.uk/downloads/file/6203/april-2023`
  - `.../file/6210/may-2023`
  - `.../file/6310/june-2023` … through `.../file/6610/march-2024`
- Format: **CSV ASCII**, comma-delimited, ~6,000 lines/month (April 2023 = 5993 rows, 663 KB)
- Schema: `Transaction Date, Local Authority Department, Beneficiary, Purpose of Expenditure, Amount (excluding VAT), Non Recoverable VAT, Merchant Category` → supplier=Beneficiary, dept=Local Authority Department, purpose=Purpose of Expenditure, amount=Amount (excluding VAT)
- Cloudflare: no
- Rows/month: ~6,000
- Quirks:
  - Dates as `DD-MM-YYYY` with a leading space (` 20-04-2023`) — trim before parsing
  - File extension not in URL slug (served as CSV via Content-Disposition)
  - Includes Merchant Category column (useful extra dimension)
- Sample row: ` 20-04-2023,Adults,Prepaid Financial Services 266 Corporate,Private Contractors Payment - Other,500.00,0.00,COMMERCIAL SUPPLIER`
- FY 2023/24 availability: **all 12 monthly files (Apr 2023 → Mar 2024), complete**
- Saved: `/tmp/london_batch2_havering_sample.csv`

---

### Summary / blockers
| Borough | Status | FY23/24 coverage |
|---|---|---|
| Enfield | **BLOCKED — Cloudflare JS challenge**. Needs Playwright persistent-profile | unknown |
| Greenwich | OK, XLSX | 4/4 quarters |
| Hackney | OK via GDrive direct download, threshold £250, CSV-in-xlsx | 11/12 months (**Mar 2024 missing**) |
| Hammersmith & Fulham | Partial — needs realistic UA (CloudFront 403 bare curl), **rolling window dropped Q1-Q3** | **1/4 quarters (Q4 only)** — recover Q1-Q3 from Wayback |
| Haringey | OK, clean CSV, cleanest schema of batch | 4/4 quarters |
| Harrow | OK, XLSX, slug-scraped file IDs | 4/4 quarters |
| Havering | OK, monthly CSV, complete | 12/12 months |

Two hard blockers requiring your Playwright fallback: **Enfield** (full Cloudflare wall) and **H&F** (Q1-Q3 2023/24 purged from live site — Wayback Machine needed, CloudFront is only UA-sensitive not JS-challenged). Everything else is curl-scriptable.

Samples saved to `/tmp/london_batch2_{borough}_sample.{csv|xlsx}` for six boroughs.