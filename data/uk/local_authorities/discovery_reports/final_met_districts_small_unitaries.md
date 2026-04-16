# Final met districts + small unitaries

_Agent: agent-a105b80e5aa3d2ff8_

Good — IoW schema captured. Tameside CSV domain blocks WebFetch but URLs are confirmed via search. I have enough to finalize the report.

### Wigan Metropolitan Borough Council
- Landing page: https://www.wigan.gov.uk/Council/DataProtection-FOI-Stats/Spending-and-Finance-data.aspx
- Data URL pattern: `https://www.wigan.gov.uk/Docs/PDF/Council/Data-Protection-FOI/Open-Data/Open-Data-{YYYY}/{Month}-{YYYY}-Creditor-Payments-CSV.csv` (e.g. `March-2024-Creditor-Payments-CSV.csv`)
- Format: CSV, comma-delimited, UTF-8, 12 monthly files
- Schema: date=`Invoice Date`, txn=`Transaction Number`, supplier=`Supplier Name(T)`/`Supplier Name`, amount=`Amount`, dept/purpose=`Expense Area(T)`, category=`Expense Code(T)`, plus `Invoice Number`, `VAT Registration Number`, `Expense Code`
- Cloudflare/WAF: no (direct static asset)
- Rows/month: ~5-8k
- Quirks: file-naming inconsistency (`Open-Data-2022-2023` vs `Open-Data-2024` folders); Supplier Name columns sometimes blank, falling back to (T) variant
- Sample row: `30/04/2023,05435903,,2668.04,,,,Braintree Fees April 23,R4403,Bank Charges`
- FY 2023/24 availability: all 12 months

### Tameside Metropolitan Borough Council
- Landing page: https://www.tameside.gov.uk/Legal/Transparency-in-Local-Government
- Data URL pattern (quarterly, not monthly):
  - Q1: `https://www.tameside.gov.uk/TamesideMBC/media/transparency/Q1-2023-24-Tameside-Transparency-(rerun-12-07-23)_2.csv`
  - Q3: `https://www.tameside.gov.uk/TamesideMBC/media/transparency/q3-2023-24.csv`
  - Q2 and Q4 2023-24 filenames not confirmed via search
- Format: CSV (some years XLSX)
- Schema: not captured (WebFetch ECONNREFUSED on tameside.gov.uk host)
- Cloudflare/WAF: YES — landing page and media host both block WebFetch (ECONNREFUSED / connection reset); likely WAF or geo-block
- Rows/quarter: ~15-25k (unverified)
- Quirks: **quarterly** publication (not monthly), inconsistent filename casing (`Q1-…` vs `q3-…`), occasional "_2" / "rerun" suffix, mixed CSV+XLSX historical layer
- Sample row: not captured
- FY 2023/24 availability: Q1 + Q3 confirmed; Q2/Q4 need direct browser verification
- **BLOCKER**: Tameside host refuses server-side fetches — will need headless browser or residential IP

### St Helens Metropolitan Borough Council
- Landing page: https://sthelens.gov.uk/article/4545/Payments-to-suppliers (current FY); previous years at https://sthelens.gov.uk/article/14773/Payments-to-suppliers-data-previous-financial-years
- Data URL pattern: `https://sthelens.gov.uk/media/{id}/{Month}{YYYY}/xls/{Month}{YYYY}.xlsx?m={ts}` — all 12 months confirmed (IDs 13831-13842 range), e.g. April 2023 → media/13831
- Format: XLSX (one month Feb 2024 is `.xls` legacy)
- Schema: not captured (binary XLSX not parsed inline by WebFetch)
- Cloudflare/WAF: no
- Rows/month: unknown (likely 1-3k)
- Quirks: legacy transparency portal `secure.sthelens.net/servlet/localtransparency/` also exists as dropdown interface; Feb 2024 file is `.xls` not `.xlsx`; "October2023_.xlsx" has trailing underscore
- Sample row: not captured (XLSX)
- FY 2023/24 availability: all 12 months

### West Northamptonshire Council
- Landing page: https://www.westnorthants.gov.uk/access-information/expenditure
- Data URL pattern: `https://cms.westnorthants.gov.uk/media/{id}/download` with IDs 7064 (Apr-23), 7067, 7589, 9809, 9812, 10250, 11543, 12723, 12999, 14637, 15030, 15033 (Mar-24)
- Format: CSV, UTF-8, 1.3–2.5 MB
- Schema: `Body Name, Date Paid, Transaction Number, Amount, Invoice Date, Supplier Name, Supplier Type (CCC & NCC only), Invoice Number, Account, Transaction Type, Transaction Type Description, Supplier Reporting, Expense Area (CCC & NCC only), Cost Centre Description (CCC & NCC only), Service Area Categorisation (MKC only), Service Division Categorisation (MKC only), Expense Type`
- Cloudflare/WAF: no
- Rows/month: ~4-6k
- Quirks: amounts stored as text with £ symbol and commas (`"-£23,484.00"`); **legacy CCC/NCC/MKC column suffixes** preserved from pre-2021 Northamptonshire County + Milton Keynes accounting systems, so many columns are sparsely populated depending on source system; credits shown as negative
- Sample row: `West Northamptonshire Council,03-Apr-23,51400286824,-£23484.00,30-Mar-23,OAKLEAF CARE GROUP,CARE ESTABLISHMENT,NT833393 P132803-00006,E7130,CPN,Social Care West Northampton Council CareCost Payments,,PD Physical Disability RES LT [NCC],Physical Support Res Long Term PD,Adult Services,Specialist and Complex - Working Age Adults [NCC],Nursing Care`
- FY 2023/24 availability: all 12 months

### North Northamptonshire Council
- Landing page: https://www.northnorthants.gov.uk/finance/expenditure
- Data URL pattern: `https://cms.northnorthants.gov.uk/media/{id}/download` with IDs 6215 (Apr-23), 6218, 7875, 7878, 7881, 8889, 8892, 8895, 8898, 9841, 9844, 9847 (Mar-24)
- Format: CSV, UTF-8, 1.0–1.4 MB
- Schema (simpler than West): `Body Name, Date Paid, Transaction Number, Amount, Supplier Name, Supplier Type, Expense Area, Cost Centre Description, Expense Type` (no invoice number or MKC suffixes)
- Cloudflare/WAF: no
- Rows/month: ~3-5k
- Quirks: amount text with £, thousand sep and quotes; 2021 reorganisation complete — no legacy suffixes here, schema is cleaner than West Northants
- Sample row: `North Northamptonshire Council,03-Apr-23,51200433307,"-£8,503.95",TRIANGULAR CARE SERVICES LTD,CARE ESTABLISHMENT,OP North Older People CCP LT,Physical Support CCP Long Term OP North,Domiciliary Care`
- FY 2023/24 availability: all 12 months

### Rutland County Council
- Landing page: https://www.rutland.gov.uk/council-councillors/budgets-finance/council-spending
- Data URL pattern: `https://www.rutland.gov.uk/sites/default/files/2025-01/payments_made_to_suppliers_2023_to_2024.csv` — **single file for entire FY**
- Format: CSV, UTF-8, 5.6 MB
- Schema: `Beneficiary, Date, Merchant Category, Amount (Net of VAT)` — only 4 columns, **no dept/service**, no purpose beyond merchant category
- Cloudflare/WAF: no
- Rows/year: ~20-30k (not per month)
- Quirks: annual single file (not monthly); amount is NET of VAT not gross; merchant category is the only categorisation — no service area, no directorate; very small council so very minimal schema
- Sample row: `Huws Gray Ltd,05/05/2023,Direct Materials,"3,400.37"`
- FY 2023/24 availability: full year in one file

### Isle of Wight Council
- Landing page: https://www.iow.gov.uk/council-and-councillors/transparency-our-data/our-finances/spending-and-finance/
- Data URL pattern: `https://www.iow.gov.uk/documentlibrary/download/transparency-data-{month}-{yyyy}-csv` and `https://digitalservices.iow.gov.uk/documents/download/transparency-data-{month}-{yyyy}-csv` and `https://iwc.iow.gov.uk/documentlibrary/download/transparency-data-{month}-{yyyy}-csv` — **three different host aliases** observed
- Format: CSV (some months published earlier as PDF first)
- Schema: `Capital/Revenue/Balance Sheet, [blank], Directorate, SERCOP High Level Category, SERCOP Detailed Category, Transaction Number, Date, Service Area, Expenses Type, Amount, Supplier Name` — note stray empty column after first field
- Cloudflare/WAF: landing page returned 403 to WebFetch; digitalservices subdomain works
- Rows/month: ~2-4k
- Quirks: **SERCOP** (Service Reporting Code of Practice) taxonomy is a strong plus — both high-level and detailed categories; date format `dd.mm.yyyy`; empty 2nd column header; triple host aliases complicate scripting
- Sample row: `Revenue,RE,Resources,Central Services,Support Services,5105766009,22.12.2023,ICT Cyber Security,Computer Software Licencing,"45,600.00",CDW LIMITED UK`
- FY 2023/24 availability: all 12 months confirmed (Apr-23 through Mar-24 individually indexed)

### Torbay Council
- Landing page: https://www.torbay.gov.uk/council/finance/expenditure/
- Data URL pattern: `https://www.torbay.gov.uk/Public_Reports/rdPage.aspx?rdReport=AP_500_Report` — **no direct file**; parameterised Logi Analytics report requiring Year/Month From + To + Submit + switch to "Analysis Grid" view, then export icon
- Format: export-only (CSV from Analysis Grid export)
- Schema: not captured (requires interactive session)
- Cloudflare/WAF: WebFetch returned 403 on landing page; Logi report page loads but needs JS/session
- Rows/month: unknown
- Quirks: **no static file** — Logi Analytics interactive report spanning Mar 2022 to Feb 2026; cancelled transactions highlighted red; date window selectable so one export can return full FY 2023/24 at once; amounts shown excl. VAT; export is two-click hidden behind grid mode
- Sample row: not captured
- FY 2023/24 availability: data exists for all 12 months but only via interactive export
- **BLOCKER**: Torbay requires a headless browser (Playwright/Selenium) to drive the Logi rdPage — cannot be fetched with a static GET

## Hard blockers summary
1. **Torbay** — no static file; Logi Analytics `rdPage.aspx?rdReport=AP_500_Report` requires browser automation (form submit + "Analysis Grid" toggle + export). Highest effort of the 8.
2. **Tameside** — host blocks server fetches (ECONNREFUSED/403); URLs confirmed via Google cache (Q1, Q3 2023-24) but Q2/Q4 filenames and schema unverified. Needs residential IP or Playwright.
3. **Isle of Wight** landing page is 403 to WebFetch but actual CSVs on `digitalservices.iow.gov.uk` and `iwc.iow.gov.uk` subdomains are fetchable; **inconsistent host aliases** (iow.gov.uk / iwc.iow.gov.uk / digitalservices.iow.gov.uk) require per-month URL lookup.
4. **Rutland** minimal 4-column schema — will have **no directorate/service area** field for Budget Galaxy tree mapping, only merchant category; conservative estimate: treat as single-node council.
5. **West Northamptonshire** legacy CCC/NCC/MKC suffix columns from pre-2021 reorganisation are inconsistently populated and need source-system-aware parsing; several nullable columns.

## Raw samples
Only 2 binary samples were cached by WebFetch during schema inspection: Rutland 2023-24 CSV (5.6 MB, octet-stream) and St Helens April 2023 XLSX (147 KB) — both saved under the harness webfetch cache, not to `/tmp/` (my direct curl attempts to the public web were blocked by the local sandbox network: `HTTP 000`/ECONNREFUSED on every host except wigan.gov.uk which returned 404). None were written to `/tmp/final_misc_*`. For production ingest, use WebFetch-equivalent or headless fetch on the URLs above.