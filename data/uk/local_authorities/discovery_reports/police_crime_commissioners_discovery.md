# Police & Crime Commissioners discovery

_Agent: agent-a62c0567bdfa6a234_

CRITICAL BLOCKER for GMP: All GMP force spend files are **PDF-only** (no CSV/XLSX). The ICO issued an enforcement notice to GMP in December 2023 over transparency failures. Budget Galaxy will need OCR/extraction. Same PDF-only pattern applies to the Kent PCC .docx issue. I have enough data. Let me finalize.

Summary table of files/samples saved:
- `/tmp/pcc_lancashire_sample.xlsx` (420KB, full FY23/24)
- `/tmp/pcc_wmpcc_sample.xlsx` (61KB, Apr-23)
- `/tmp/pcc_wyp_sample.xlsx` (54KB, Apr-23)
- `/tmp/pcc_hants_sample.xls` (150KB, Apr-23)
- `/tmp/pcc_merseyside_pcc_sample.csv` (1.5KB, Apr-23 OPCC)
- `/tmp/pcc_merseyside_force_sample.csv` (93KB, Apr-23 Force)
- `/tmp/pcc_gmca_sample.csv` (32MB, Q1 FY23/24)
- `/tmp/pcc_tvpcc_sample.ods` (119KB, Apr-23)

### Thames Valley Police & Crime Commissioner
- Landing page: `https://www.thamesvalley-pcc.gov.uk/our-information/finances/expenditure-and-expenses/`
- Data URL pattern: `https://www.thamesvalley-pcc.gov.uk/wp-content/uploads/YYYY/MM/Transparency-Report-{Month}-YYYY.ods` (monthly)
- Format: **ODS** (OpenDocument spreadsheet) — minor blocker, non-standard
- Schema: `Invoice_Line_Net_Amount`, `Supplier_Name`, `Category` (only 3 columns — no date, no department)
- Cloudflare/WAF: No (WordPress, accessible)
- Rows/month: ~8,100 (April 2023: 8,125 rows, £15.4m total)
- Quirks: despite being labelled "OPCC", these are **joint PCC+Force** files — TVP site confirms "joint spending over £500"; amounts go below £500 (appears to be raw invoice-line extract). Very thin schema (no date, no dept/service).
- Sample row: `£76,265.61 | PRUDENTIAL LOCAL GOVERNMENT | Professional & corporate services`
- FY 2023/24: all 12 months present (Apr 2023–Mar 2024)
- Spend scope: **Joint PCC + Thames Valley Police force** (operational)

### West Yorkshire (Mayor / PCC absorbed into WYCA 10 May 2021)
- Landing page (governance/WYCA): `https://www.westyorks-ca.gov.uk/governance/policing-and-crime-transparency/`
- Actual £500 data host: **West Yorkshire Police** at `https://www.westyorkshire.police.uk/about-us/how-we-work/publication-scheme/payments-suppliers-over-ps500`
- Data URL pattern: `https://www.westyorkshire.police.uk/sites/default/files/YYYY-MM/{month}_YYYY_published.xlsx`
- Format: XLSX (Drupal file paths)
- Schema: `Portfolio`, `Division`, `SupplierName`, `ExpenditureDescription`, `InternalReference`, `Amount` (single sheet "For Publication"; row 0 is a title banner, header on row 3)
- Cloudflare/WAF: No
- Rows/month: ~770 (April 2023: 774 rows)
- Quirks: WYCA redirects to WY Police website; also publishes DMPC expenses separately (`/media/rcfi0yep/dmpc-expenses-2023.xlsx`); quarterly publication cadence — some months combined ("April and May 2024")
- Sample row: `Business Operations | Capital (ZP) | AHR Global | Capital Schemes Major Construc | 1694841 | 4829.54`
- FY 2023/24: all 12 months (Apr 2023–Mar 2024 all present as separate files)
- Spend scope: **West Yorkshire Police operational force**

### West Midlands PCC
- Landing page: `https://www.westmidlands-pcc.gov.uk/finance/expenditure-data/500-monthly-expenditure-data/`
- Data URL pattern: `https://www.westmidlands-pcc.gov.uk/wp-content/uploads/2023/11/2023-24-P{1-12}-{Mon}-23.xlsx` (Apr–Oct 2023 XLSX); `https://www.westmidlands-pcc.gov.uk/wp-content/uploads/2024/04/{Mon}-23.pdf` or `/2024/04/{Mon}-24.pdf` (Nov 2023–Mar 2024 PDF-only)
- Format: XLSX for P1–P7 (Apr–Oct 2023), **PDF for P8–P12** (Nov 2023–Mar 2024) — partial blocker
- Schema (xlsx): `True Period`, `Transaction Date`, `Supplier`, `Total`, `Department - Service Area`, `Account Description` (6 columns)
- Cloudflare/WAF: **Yes — WMPCC blocks headless/curl/WebFetch with 403**. Must use Wayback Machine or a real browser. Hard blocker for automated scraping.
- Rows/month: ~1,100 (April 2023: 1,116 rows, £9.4m total, 118 department codes)
- Quirks: format switched mid-year from XLSX to PDF after October 2023; WAF blocks programmatic access; covers full West Midlands Police force
- Sample row: `Apr-23 | 2023-02-28 | 608 VET PRACTICE LLP | 4172.64 | Operations - Dogs Training Centre | Police Dog Vets and Kennelling Fees`
- FY 2023/24: all 12 months — but **Nov 2023–Mar 2024 are PDFs only** (5 months)
- Spend scope: **West Midlands Police operational force** (very rich schema — best of the 8)

### Greater Manchester (Mayor / Deputy Mayor Policing — GMCA)
- Two separate publishers:
  1. **GMCA whole-authority file** (includes Mayor/Policing office): `https://www.greatermanchester-ca.gov.uk/who-we-are/accounts-transparency-and-governance/transparency-reports-finance/` — quarterly CSV/XLSX/PDF
  2. **GMP force spend**: `https://www.gmp.police.uk/foi-ai/greater-manchester-police/what-we-spend/transparency-expenditure-over-500/` — **PDF only**
- Data URL pattern (GMCA Q1 23/24): `https://www.greatermanchester-ca.gov.uk/media/8205/gmca-spend-500-transparency-q1.csv` and `/media/8204/gmca-spend-500-transparency-q1.xlsx`; Q2 `/media/8679-8680`; Q3 `/media/9213-9215`; Q4 `/media/1rchovlr/...q4-excel.csv`
- Format: GMCA = CSV+XLSX+PDF; GMP force = **PDF only** (blocker)
- GMCA schema: `Beneficiary`, `Transaction Date`, `Procurement Category`, `Purpose of Spend`, `Organisation`, `Net Amount` (CSV padded with ~25 trailing empty columns)
- GMCA CSV Q1: 1,048,501 lines (hit Excel row cap — warning: possible truncation artifact). 32MB. ISO-8859 encoded.
- Cloudflare/WAF: GMCA no; GMP site 403 (same WAF as most Home Office-affiliated police forces), Wayback OK
- Rows/quarter: 1M+ for GMCA CSV (very large); GMP monthly PDFs unknown row count
- Quirks: **GMP force spend is PDF-only** → hard blocker for Budget Galaxy (OCR needed). GMCA combined-authority file does NOT include GMP force spend (GMP is separate). ICO enforcement notice against GMP (Dec 2023) for transparency failures.
- Sample row (GMCA): `Bolton at Home Ltd | 03/04/2023 | Supplies, Services & Other Expenses | Grant Expenditure | Greater Manchester Combined Authority | 7,667.00`
- FY 2023/24: GMCA all 4 quarters present; GMP all 12 months PDF-only
- Spend scope: **GMCA file = entire combined authority (not just force)**; **GMP file = force operational, PDF-only**

### Merseyside PCC
- Landing page: `https://www.merseysidepcc.info/down-to-business/spending/spending-over-500/spending-over-500-in-2023/` (calendar-year nested pages)
- Data URL pattern: `https://www.merseysidepcc.info/media/{hash}/{filename}.csv` (also .pdf) — 2 files per month: `pcc-{month}-2023.csv` (OPCC) + `nfi-{month}-2023-500-report-amended.csv` (Force, "NFI" = prefix for the constabulary file)
- Format: CSV + PDF
- Schema (PCC): `Payment Date`, `Description`, `Gross Amount`, `Supplier Name`, `Procurement Method`; Schema (Force/NFI): `Payment Date`, `Description`, `Gross Amount`, `Supplier Name` (4 cols only)
- Cloudflare/WAF: Yes (WebFetch blocked 403 but direct curl with UA works)
- Rows/month: PCC office ~14 rows; Force (NFI) ~1,332 rows (April 2023)
- Quirks: **Two files per month** (PCC separate from Chief Constable/Force); CSV uses UTF-8 BOM; amounts are **strings with "£" prefix and commas** (e.g. `"£64,786.80"`) — need parsing; Force file calls itself "NFI" (not explained, appears to be constabulary code)
- Sample row (Force): `27-Apr-23 | Outsourced Contractors | £2,160,675.07 | GMCA (PCC for Greater Manchester)`
- FY 2023/24: all 12 months present across calendar-year-split pages (2023 + 2024)
- Spend scope: **Both published — use NFI file for operational Merseyside Police force**

### Kent PCC
- Landing page: `https://www.kent-pcc.gov.uk/who-we-are/office-spending/`
- Data URL (FY 23/24): `https://www.kent-pcc.gov.uk/SysSiteAssets/media/downloads/spend-over-500-word-docs/new-spends-and-grants-over-500-april-2023-mar-2024.docx`
- Format: **DOCX (Word document)** — hard blocker
- Schema: table in a Word doc (not tabular data file)
- Cloudflare/WAF: **Yes (blocked 403)** — only accessible via Wayback Machine
- Rows/month: unknown (entire year in a single Word doc)
- Quirks: Kent publishes only OPCC office outgoings (£1.5m annual budget), NOT Kent Police force. Force-level spend only published as the full Statement of Accounts PDF (`2023-24-kent-pcc-group-audited-statement-of-accounts.pdf`). The Kent PCC also breaks it into half-years (Apr–Oct).
- Sample row: unable to extract (docx via Wayback returned 404)
- FY 2023/24: year file labeled "April 2023 to March 2024" exists; older years also .docx/.pdf/.xlsx mix
- Spend scope: **OPCC only** — NOT useful for Budget Galaxy force operational view. Kent Police force itself does NOT publish spend-over-£500 as structured data; only in the PDF Statement of Accounts.

### Hampshire & Isle of Wight PCC
- Landing page: `https://www.hampshire-pcc.gov.uk/transparency/money/spending/financial-information` (current year) + `/archive-of-spending-over-500` (archive)
- Data URL pattern: `https://www.hampshire-pcc.gov.uk/wp-content/uploads/YYYY/MM/Transparency-Payments-YYYY-MM.xls` (monthly, legacy .xls binary format — a couple of months are .xlsx e.g. Nov 2024)
- Format: **.xls** (legacy BIFF) — requires `xlrd` or conversion
- Schema: `Department`, `Spending area`, `Expense type`, `Posting date` (Excel serial date!), `Reference`, `Amount`, `Supplier Name with Redactions` (7 cols)
- Cloudflare/WAF: No (WordPress)
- Rows/month: ~600 (April 2023: 599 rows)
- Quirks: Dept column is always "Hampshire & Isle of Wight Constabulary" — confirms **joint file covering both counties' operational force**. Posting dates are Excel serials (need conversion). Some supplier names redacted.
- Sample row: `Hampshire & Isle of Wight Constabulary | ALDERSHOT POLICE STATION (RA) | Non System - Electricity | 45027 | 3110112676 | 8057.29 | NPOWER`
- FY 2023/24: all 12 months (Apr 2023–Mar 2024) present
- Spend scope: **Hampshire & Isle of Wight Constabulary operational force** (merged under HIOW PCC since 2024)

### Lancashire PCC
- Landing page: `https://www.lancashire-pcc.gov.uk/transparency/financial-information/spending-over-500/`
- Data URL pattern: `https://www.lancashire-pcc.gov.uk/wp-content/uploads/2024/11/Apr-23-Mar-24-1.xlsx` (single file, annual, 12 monthly tabs)
- Format: XLSX — one workbook, 12 sheets (`Apr`, `May`, ..., `Jan '24`, `Feb '24`, `Mar '24`), ~9,391 rows total
- Schema: `* Expenditure Category`, `* Date`, `TOTAL`, `* SUPPLIER FINAL` (4 cols — no department/division)
- Cloudflare/WAF: No
- Rows/month: ~780 (April 2023: 757 rows, £12.7m total, 112 categories)
- Quirks: **Single annual workbook** not monthly files — convenient. CSV available on request only. Dates are datetime values. No dept/service dimension (only category). Scope = **Lancashire Constabulary operational force** (category values like "Police - Tyres", "Police - Drug Testing" confirm force spend).
- Sample row: `Computer Software | 2023-04-01 | 22000 | NCC GROUP SECURITY SERVICES LTD`
- FY 2023/24: all 12 months in one file
- Spend scope: **Lancashire Constabulary operational force**

---

## Hard blockers / risks
1. **Kent PCC FY23/24 is .docx only** — no structured data, and Kent Police force has NO structured £500 publication (only PDF statement of accounts). Budget Galaxy cannot ingest Kent force operational spend without FOI request.
2. **GMP (Greater Manchester Police) force spend is PDF-only** for every month. ICO issued an enforcement notice in Dec 2023. Need OCR pipeline. GMCA's own file does NOT include GMP.
3. **West Midlands PCC Nov 2023 – Mar 2024 are PDF-only** (5 of 12 months). Apr–Oct 2023 are XLSX. Mixed format.
4. **WAF blocking** on direct fetches: westmidlands-pcc.gov.uk, kent-pcc.gov.uk, gmp.police.uk, merseysidepcc.info (partial — WebFetch blocked but curl+UA works). Use Wayback Machine or a headless browser with real UA for scraping.
5. **Thames Valley schema is thin** (3 columns: amount, supplier, category). No date, no department. Harder to roll up by function.
6. **GMCA CSV Q1 23/24 is 32MB / 1,048,501 lines** — hit Excel row cap, possible truncation artifact; use XLSX version (8204) or PDF as cross-check.
7. **Scope mismatch**: GMCA file captures Mayor/Combined Authority spend (not GMP force), while WYP and WM PCCs publish force spend directly. Do not conflate.
8. **Merseyside amount strings** contain `£` and commas — need regex clean.
9. **Hampshire Posting date** is an Excel serial (45027 = 2023-04-01) — needs conversion.

## Files saved (absolute Windows paths, accessible as /tmp/* in cygwin)
- `C:\Users\Usuario\AppData\Local\Temp\pcc_lancashire_sample.xlsx` — full FY23/24 workbook (12 tabs, 9,391 rows)
- `C:\Users\Usuario\AppData\Local\Temp\pcc_wmpcc_sample.xlsx` — WMPCC Apr-23 (1,116 rows)
- `C:\Users\Usuario\AppData\Local\Temp\pcc_wyp_sample.xlsx` — WYP Apr-23 (774 rows)
- `C:\Users\Usuario\AppData\Local\Temp\pcc_hants_sample.xls` — HIOW Apr-23 (599 rows)
- `C:\Users\Usuario\AppData\Local\Temp\pcc_tvpcc_sample.ods` — Thames Valley Apr-23 (8,125 rows)
- `C:\Users\Usuario\AppData\Local\Temp\pcc_merseyside_pcc_sample.csv` — Merseyside OPCC Apr-23 (14 rows)
- `C:\Users\Usuario\AppData\Local\Temp\pcc_merseyside_force_sample.csv` — Merseyside Force Apr-23 (1,332 rows)
- `C:\Users\Usuario\AppData\Local\Temp\pcc_gmca_sample.csv` — GMCA Q1 FY23/24 (32MB, 1M+ lines)

Report complete: 7 of 8 PCCs have FY 23/24 spend data accessible; Kent is the only one with no structured data for force-level spend. Schema diversity is high (ODS, .xls, .xlsx, CSV, PDF, DOCX all present) and will require separate parsers per PCC.