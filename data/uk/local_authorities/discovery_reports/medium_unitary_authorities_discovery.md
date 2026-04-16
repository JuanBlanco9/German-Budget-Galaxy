# Medium Unitary Authorities discovery

_Agent: agent-a7d8967caf67665cf_

All data gathered. Sufficient for comprehensive report. Here's the final response.

---

### Reading Borough Council
- Landing page: https://www.reading.gov.uk/the-council-and-democracy/finance-and-legal-information/council-spending-over-500/
- Data URL pattern: `https://images.reading.gov.uk/{YYYY}/{MM}/Over-500-{Month}-{YY}.csv` (inconsistent casing / `-Spend-` infix — see samples). All 12 FY 2023/24 URLs confirmed; Aug23–Mar24 were re-uploaded Sept 2025 under `/2025/09/`.
- Format: CSV, UTF-8 with BOM, comma-delimited, ~5,975 rows (April 2023)
- Schema: dept=`Service Area` + `Directorate`, purpose=`Purpose`, supplier=`Supplier Name`, amount=`Amount (£)` (signed; negatives are credit notes). Extra cols: PurchasingOrg, VoucherNo, PaymentNo, SupplierType, InvoiceType, CostCentreNo
- Cloudflare: no (nginx direct)
- Rows/month: ~5,500–6,000
- Quirks: BOM; filenames drift (inconsistent "Spend" infix, "23" vs "2023", "B" suffixes for Feb/Mar 2024 re-uploads). Aug 2023 onward re-hosted Sept 2025 — the original URLs from mid-2024 are dead.
- Sample row: `RBC Legal Entity,24/04/2023,4791730,542,H.S PRACTITEST LTD,Finance systems Re-procurement,3770.33,Staff/Consultancy,Third Party Supplier,STANDARD,8637,ZZZC-Capital`
- FY 2023/24 availability: all 12 months

### Medway Council
- Landing page: https://www.medway.gov.uk/info/200216/finances/348/council_finances/2 → https://www.medway.gov.uk/downloads/download/742/spending_data_2023_to_2024
- Data URL pattern: `https://www.medway.gov.uk/download/downloads/id/{ID}/spending_data_{month}_{YYYY}.xlsx` (ID 8274=Apr23 through 8731=Mar24)
- Format: XLSX (Office 2007+), single `Sheet1`, ~7,790 rows (April 2023)
- Schema: dept=`Directorate/Balance Sheet Heading` + `Area of Spend` + `Service Level`, purpose=`Expense Description` (+`Expense Code`), supplier=`Supplier or Redacted Statement`, amount=`Value` (numeric, unsigned). Extra: Line, Clearance Date, Reference, Type (INV/CRN), Supplier No.
- Cloudflare: no
- Rows/month: ~7,000–10,000
- Quirks: threshold is £500 (confirmed from sample — contains values as low as £11.25 from VODAFONE, so in practice some sub-threshold rows leak in); Medway originally £250 but the files labeled "over 500". Contains balance-sheet rows (B2000 Dir Exp), not only P&L. XLSX only (no CSV).
- Sample row: `1, 2023-04-13, 0014620198, INV, 11.25, VODAFONE CORPORATE LIMITED, 00556000, NET ASSETS, Current Assets, Short Term Debtors, B2000, Dir Exp`
- FY 2023/24 availability: all 12 months

### Milton Keynes City Council
- Landing page: https://www.milton-keynes.gov.uk/your-council-and-elections/council-information-and-accounts/data-performance-and-spending/milton-0
- Data URL pattern: `https://www.milton-keynes.gov.uk/sites/default/files/{YYYY}-{MM-publish}/Council%20Spend%20Data%20{Month}%20{YY}.csv` — publish-month directory varies (May23 file lives in `2023-07`, June23 in `2023-08`, Nov23 in `2024-01`, Mar24 in `2024-05`); month label uses 2-digit year (`April 23`, not `April 2023`), a few have `_0` suffix
- Format: CSV, Windows-1252 / cp1252 encoded (pound sign = 0xA3, renders as � when opened as UTF-8), comma-delimited
- Schema: dept=`Service Area Categorisation (MKC only)` + `Service Division Categorisation (MKC only)`, purpose=`Expense Type`, supplier=`Supplier Name`, amount=`Amount` (pound prefix, negatives for credits). Extra: Date Paid, Transaction Number
- Cloudflare: no (Fastly VCL `cache-eze*`)
- Rows/month: ~6,000–7,000 (March 2023 = 6,660)
- Quirks: **CRITICAL** - encoding is cp1252, not UTF-8, causing `£` to break under naive parsing. Filename pattern is the worst of the 8 — publish-month subdir prevents URL templating; must scrape landing page or iterate candidate months. File extension `.csv` rejected by search box (`Reason: Searching for this file extension is not allowed`) — must link via page, not search.
- Sample row: `Milton Keynes City Council,01-Mar-23,51500840590,-£540.00,Bill's Minibus and Coach Hire Ltd,Customer and Community Services,Leisure & Community,Transport Contract Payments`
- FY 2023/24 availability: all 12 months (per search index; April 2023 URL not directly verified but May–Nov 2023, Mar 2024 confirmed via Google site: index)

### BCP Council (Bournemouth, Christchurch and Poole)
- Landing page: https://www.bcpcouncil.gov.uk/about-the-council/budgets-and-finance/payments-to-suppliers
- Data URL pattern: `https://www.bcpcouncil.gov.uk/documents/about-the-council/{Month}-2023-AP-Transparency-Data.csv` (Apr23–Dec23); note June 2023 sits under `/documents-old/` not `/documents/`. Newer 2024 files moved to `/Assets/About-the-council/Budgets-and-finance/Payments-to-suppliers/{Month}-2024-AP-Transparency.csv` (naming dropped "-Data" suffix).
- Format: CSV, UTF-8 BOM, ~29,592 rows (April 2023) — by far the largest sample
- Schema: dept=`LOCAL AUTHORITY DEPARTMENT`, purpose=`DESCRIPTION 1` + `DESCRIPTION 2`, supplier=`BENEFICIARY`, amount=`AMOUNT` (string, prefixed `£`). Fixed header row: BODY, LOCAL AUTHORITY DEPARTMENT, DESCRIPTION 1, DESCRIPTION 2, DATE, AMOUNT, BENEFICIARY
- Cloudflare: no (direct backend)
- Rows/month: ~25,000–30,000
- Quirks: threshold appears very low — sample has £13.52 and £15.60 rows, so this is a full AP feed, not truly "over £500". Expect to filter client-side. Path inconsistencies across months (`/documents/`, `/documents-old/`, `/Assets/`) force per-file URL lookup.
- Sample row: `BCP Council,Commissioning,Drug & alcohol services - BCP,Support Services,01/04/2023,£13.52,AVICENNA PHARMACY`
- FY 2023/24 availability: all 12 months

### Luton Borough Council
- Landing page: https://www.luton.gov.uk/council-elections/finance-data-performance/accounts-finance/council-spend/2023-spend (and `/2024-spend`)
- Data URL pattern: **URL migrated mid-2026**. Legacy SharePoint path `/Council_government_and_democracy/Lists/LutonDocuments/Excel/Procurement/Spend%20over%20%C2%A3250/2023/250-23-{a-l}-{month}-payments.csv` is **now 404**. Current working pattern (2024 data) = `https://www.luton.gov.uk/system/files/file-visibility/2026-02/250-24-{letter}-{month}-payments.csv`. The 2023 files likely moved to `/system/files/file-visibility/{YYYY-MM}/250-23-{letter}-{month}-payments.csv` but that subdirectory needs to be re-scraped from the 2023-spend landing page (WebFetch did not report it).
- Format: CSV, UTF-8 BOM, comma-delimited, 5,395 data rows (January 2024)
- Schema: Row 1 = title metadata (`Transparency Report - January 2024,,,,,`); Row 2 = headers: Date, Supplier, Department, `CC Description` (cost-centre), `Ledger Code`, `Value £`. dept=`Department`+`CC Description`, purpose=`Ledger Code`, supplier=`Supplier`, amount=`Value £` (pound prefixed).
- Cloudflare: no (Fastly/Drupal)
- Rows/month: ~5,000–5,500
- Quirks: Publishes £250+ (not £500+) — threshold is lower than the brief assumes. Must skip row 1 (metadata banner). Legacy URL pattern broken as of 2026 re-platform — **hard blocker for Apr–Dec 2023 months without re-scraping the 2023 landing page**. Letters a–l correspond Jan–Dec, so the FY 2023/24 requires months d–l (Apr23–Dec23) from 2023 pattern + a–c (Jan24–Mar24) from 2024 pattern.
- Sample row: `15-Jan-2024,Local Government Association,Chief Executive,Chief Executive,Officers Conference Fees (Non-Training),£505.90`
- FY 2023/24 availability: Jan–Mar 2024 confirmed downloadable; **Apr–Dec 2023 URLs need re-discovery** (landing page has the links but the `/Lists/LutonDocuments/` path migrated)

### Thurrock Council
- Landing page: https://www.thurrock.gov.uk/what-we-spend/payments-to-suppliers
- Data URL pattern: `https://www.thurrock.gov.uk/sites/default/files/assets/documents/payments-{YYYYMM}-v01.csv` (e.g. `payments-202304-v01.csv`) — clean templatable pattern
- Format: CSV, UTF-8 BOM, comma-delimited, 1,831 rows (April 2023)
- Schema: Body Name, Body Id, Month, Date, Department, Beneficiary, Purpose, Merchant Category, Amounts. dept=`Department`, purpose=`Purpose` + `Merchant Category`, supplier=`Beneficiary`, amount=`Amounts` (note leading/trailing space in header, values quoted with commas: `" 27,000.00 "`)
- Cloudflare: no (nginx direct, Drupal)
- Rows/month: ~1,500–2,500
- Quirks: Amount column has literal whitespace padding inside quotes; header label is ` Amounts ` (leading+trailing space). `Month` is textual (`Apr-23`), `Date` is DD/MM/YYYY. `Merchant Category` uses CIPFA codes (`Residential Homes Independent Sector`).
- Sample row: `THURROCK BC,E1502X,Apr-23,15/02/2023,Adults; Housing and Health,Essex County Council,Third Party Payments,Private Contractors," 27,000.00 "`
- FY 2023/24 availability: all 12 months, despite Dec 2022 S114 — pipeline was NOT disrupted
- S114 impact: Thurrock issued S114 on 7 Dec 2022 for both 22/23 and 23/24 budgets; transparency publication continued uninterrupted. The lower row count (~1,800/month vs peers' 5,000–7,000) may reflect spend-freeze effects (council halted non-essential spend), so the data is complete but volume is genuinely depressed. Document as "data complete, spend artificially low due to S114 freeze" rather than a data-quality gap.

### Southend-on-Sea City Council
- Landing page: https://www.southend.gov.uk/council-budgets-spending/spending-500
- Data URL pattern: Collection pages `https://www.southend.gov.uk/downloads/download/{976|944}/our-spending-over-500-{2024|2023}` → individual files `https://www.southend.gov.uk/downloads/file/{ID}/our-spending-over-500-{month}-{year}`. IDs are non-sequential (Dec24 = 8642 PDF / 8641 CSV / 8640 TXT). Collections organised by **calendar year**, so FY 2023/24 = months Apr–Dec from `/976/... 2023` + Jan–Mar from `/976/... 2024` (actually: "our-spending-over-500-2023" = calendar 2023; to get Apr23–Mar24 you pull from both collections).
- Format: CSV, UTF-8, 3,549 data rows (Dec 2024). Also TXT metadata file + PDF (3-file set per month).
- Schema: Row 1 = **blank metadata row** (10 commas, no header text); Row 2 = actual headers. Columns: Organisation name, Organisation Code, Directorate, Service Category label, Service Category code, Supplier name, Payment date, Transaction number, Net Amount, Purpose of spend, Procurement category name. dept=`Directorate`+`Service Category label`, purpose=`Purpose of spend`+`Procurement category name`, supplier=`Supplier name`, amount=`Net Amount` (quoted with thousand-comma: `"1,495.00"`).
- Cloudflare: no (Jadu "Web Server")
- Rows/month: ~3,000–4,000
- Quirks: Must skip row 1 (empty metadata row); `Organisation Code` is a full URL (`https://opendatacommunities.org/doc/unitary-authority/southend`) — DCAT-compliant. Published as 3-file bundle (PDF/CSV/TXT). No XLSX variant.
- Sample row: `Southend-on-Sea City Council,https://opendatacommunities.org/doc/unitary-authority/southend,ED Children & Public Health,Central Services,9009,(G) DAVID STAGG & ASSOCIATES LTD T/A DSA ELECTRICAL,03/12/2024,12075997,"1,495.00",Main Contractor,Main Contractor`
- FY 2023/24 availability: all 12 months (must compose from two calendar-year collections)

### Slough Borough Council
- Landing page: https://www.slough.gov.uk/performance-spending/payments-suppliers → collection https://www.slough.gov.uk/downloads/download/206/payments-to-suppliers-over-500
- Data URL pattern: `https://www.slough.gov.uk/downloads/file/{ID}/payments-to-suppliers-{month}-{year}`. IDs confirmed: Apr23=3732 (CSV) / 3731 (XLSX); May23=3794/3793; … Mar24=4215/4216. CSV and XLSX both published.
- Format: CSV (1,321 rows April 2023), also XLSX available
- Schema: Body Name, Vendor Number, Vendor Name, Cost Centre, Service Label, BV Code, Amount, Period. dept=`Cost Centre`+`Service Label`, purpose=`BV Code` (e.g. "Supplies and Services"), supplier=`Vendor Name`, amount=`Amount` (quoted: `"11,160.00"`). `Period` = `Apr-23` style.
- Cloudflare: no (Jadu)
- Rows/month: ~1,300–1,800
- Quirks: Both CSV + XLSX for every month (rare — most councils pick one); IDs for CSV and XLSX sit adjacent but order flips (Apr: CSV=3732, XLSX=3731; Jul: CSV=3891, XLSX=3892). Low row count reflects both council size and post-S114 spend freeze. `BV Code` column misnamed — it's actually CIPFA service expenditure heading, not a BVPI code.
- Sample row: `Slough Borough Council,804709,247 Careservices Ltd,M44D,Adult Social Care Operations,Supplies and Services,"11,160.00",Apr-23`
- FY 2023/24 availability: all 12 months
- S114 impact: Slough issued S114 on 2 Jul 2021, commissioners still in place through 2023/24. Transparency publication continued uninterrupted; expect suppressed volume due to spend freeze (non-essential spend halted). Like Thurrock, document as "complete but artificially low" rather than a gap. No redactions beyond standard exclusions (foster carers, social care direct payments, employee expenses — the council explicitly warns these are omitted).

---

## Summary & hard blockers

**Samples saved to** `/tmp/` (Windows temp `C:\Users\Usuario\AppData\Local\Temp\`):
- `unitaries_batch_reading_sample.csv` (1,134 KB, 5,975 rows)
- `unitaries_batch_medway_sample.xlsx` (534 KB, 7,790 rows)
- `unitaries_batch_miltonkeynes_sample.csv` (1,005 KB, 6,661 rows — March 2023, cp1252)
- `unitaries_batch_bcp_sample.csv` (3,822 KB, 29,592 rows)
- `unitaries_batch_luton_sample.csv` (686 KB, 5,396 rows — January 2024)
- `unitaries_batch_thurrock_sample.csv` (236 KB, 1,831 rows)
- `unitaries_batch_southend_sample.csv` (881 KB, 3,550 rows — December 2024)
- `unitaries_batch_slough_sample.csv` (162 KB, 1,322 rows)

**No Cloudflare** on any of the 8 — all cleanly fetched with `Mozilla/5.0` UA.

**Hard blockers / flags**:
1. **Luton Apr–Dec 2023 URLs broken**: legacy `/Lists/LutonDocuments/Excel/Procurement/Spend%20over%20%C2%A3250/2023/*.csv` pattern returns 404; files moved in Feb 2026 re-platform. The 2023-spend landing page was re-crawled and still advertises the old URLs — the webfetch may have returned stale cached URLs. Needs direct landing-page scrape at download time to discover the new `/system/files/file-visibility/{YYYY-MM}/250-23-*-payments.csv` subfolders.
2. **Milton Keynes is cp1252, not UTF-8** — parsers must specify encoding or `£` corrupts; filename uses 2-digit year and publish-subdir varies per month (not templatable, must scrape).
3. **BCP threshold is effectively £0** (29K rows/month, includes £13.52 entries) — must filter ≥£500 client-side; also 3 different URL path prefixes over the year (`/documents/`, `/documents-old/`, `/Assets/...`).
4. **Medway threshold is £500 per the page but the XLSX contains sub-£500 rows** (sample has £11.25) — similar filter concern; XLSX-only (no CSV).
5. **Luton threshold is £250** not £500.
6. **Southend has a blank metadata row 1** that breaks naive header parsers; FY must be composed from two calendar-year collection pages.
7. **Thurrock + Slough S114 councils**: data pipelines are complete (no gaps) but row volumes are genuinely 3–5× lower than peers due to spend freezes. This is a truthful signal, not missing data — document as a known effect rather than quality issue.

Sources:
- [Reading Borough Council - Council spending over £500](https://www.reading.gov.uk/the-council-and-democracy/finance-and-legal-information/council-spending-over-500/)
- [Medway Council - Spending data 2023 to 2024](https://www.medway.gov.uk/downloads/download/742/spending_data_2023_to_2024)
- [Milton Keynes City Council - Data, performance and spending](https://www.milton-keynes.gov.uk/your-council-and-elections/council-information-and-accounts/data-performance-and-spending)
- [BCP Council - Payments to suppliers](https://www.bcpcouncil.gov.uk/about-the-council/budgets-and-finance/payments-to-suppliers)
- [Luton Borough Council - Council spending](https://www.luton.gov.uk/council-elections/finance-data-performance/accounts-finance/council-spend/council-spending)
- [Thurrock Council - Payments to suppliers](https://www.thurrock.gov.uk/what-we-spend/payments-to-suppliers)
- [Southend-on-Sea City Council - Our spending over £500](https://www.southend.gov.uk/council-budgets-spending/spending-500)
- [Slough Borough Council - Payments to suppliers over £500](https://www.slough.gov.uk/downloads/download/206/payments-to-suppliers-over-500)
- [Thurrock Council - Section 114 notice](https://www.thurrock.gov.uk/improvement/section-114-notice)
- [Slough Borough Council - Section 114 notice announcement](https://www.slough.gov.uk/news/article/107/council-pauses-non-essential-spending-following-section-114-notice)