# Metropolitan Districts batch 3

_Agent: agent-a7aa87c1e7a208233_

All 8 samples have clean schemas. Compiling final report.

---

# Metropolitan Districts Batch 3 — Discovery Report (FY 2023/24)

All 8 councils discovered. 7/8 have complete 12-month FY2023/24 coverage online; **North Tyneside has purged April-June 2023** (rolling window trim).

### Barnsley Metropolitan Borough Council
- Landing: https://www.barnsley.gov.uk/services/council-and-democracy/information-we-publish/expenditure-over-500/
- Pattern: `https://www.barnsley.gov.uk/media/{slug}/exp-ex-{gbp500|500}-{mon}-{yy}.csv` (unique CMS slug per month; filename prefix = `exp-ex-gbp500` Apr-June 23, `exp-ex-500` from July 23)
- Format: CSV, UTF-8 (Latin-1 £ glyphs), comma
- Schema (row 6 header after 4 metadata rows): `Transaction Date, Gross Amount £, Supplier Name, Expense Area, Expense Type, Expense Code, VCSE, Charity Number`
- Cloudflare: no (Umbraco media, direct)
- Rows/month: ~4,800 (Sep 2023 sample)
- Quirks: 4 metadata rows preamble (Organisation Name, URI, Document Title, Effective Date, blank), £500 gross threshold, adds VCSE/charity-number flagging; no procurement-card breakout. NOT on Data Mill North (e61m0 is Wakefield).
- Sample: `30/09/2023,£1,234.56,Kier Integrated Services Ltd,Highways,A&M PAY TO CONTRACTO,400400,N,`
- FY 23/24: all 12 months

### Sefton Metropolitan Borough Council
- Landing: https://www.sefton.gov.uk/your-council/transparency/transparency/council-spend-other-key-documents/council-spend-over-500/
- Pattern: `https://www.sefton.gov.uk/media/{numID}/sefton-council-supplier-{spend|spent}-{month}-{year}.csv` (numeric 4-digit IDs Apr23-Mar24)
- Format: CSV, Latin-1 (£ mangles), comma
- Schema: 1 title row then `SUPPLIER, AMOUNT, TRANSACTION DATE, COST CENTRE, ACCOUNT, DEPARTMENT, SUMMARY OF EXPENDITURE`
- Cloudflare: no
- Rows/month: ~6,000 (Jan 2024)
- Quirks: 1 metadata header row; file name alternates "spend"/"spent"; Nov 2023 contains typo "counsil"; negatives (credit notes) present; £500 cost-centre threshold (not per-transaction)
- Sample: `1 2 1 In The Community Ltd,580.85,04/01/2024,AL05,R4053,Adult Social Care,Learning Disability Support...`
- FY 23/24: all 12 months

### Solihull Metropolitan Borough Council
- Landing: https://www.solihull.gov.uk/about-council/expenditure
- Pattern: `https://www.solihull.gov.uk/sites/default/files/{YYYY-MM}/{Expenditure-{Month}-{Year}|Expenditure{Month}{Year}}-CSV.csv` — filename casing/hyphenation chaotic per month
- Format: CSV, UTF-8, comma
- Schema: `Body name, Directorate, Service Area Categorisation, Supplier Name, Payment Date, Card Transaction, Net Amount, Purpose of Spend, Procurement Classification: ProClass Label`
- Cloudflare: no (Drupal)
- Rows/month: ~13,500 (Jan 2024)
- Quirks: £250 threshold (NOT £500), net-of-VAT, card-transaction flag column, ProClass categorisation included, dates `dd-mm-yyyy`
- Sample: `Solihull MBC,ECONOMY AND INFRASTRUCTURE,Other Housing Services,24-7 Locks Ltd,13-01-2024,,1676.00,OTHER CONTRACTED SERVICES,SLA Charges - External Providers`
- FY 23/24: all 12 months

### North Tyneside Metropolitan Borough Council
- Landing: https://my.northtyneside.gov.uk/page/20287/transparency (redirects; files hosted on legacy domain)
- Pattern: `https://legacy.northtyneside.gov.uk/sites/default/files/web-page-related-files/Invoices%20over%20250%20{Month}%20{YY}.csv` — naming alternates 4-digit ("November 2023") vs 2-digit ("March 24") with no rule
- Format: CSV, UTF-8, comma
- Schema: `Payment Date, Transaction Number, Net Amount, Supplier (Beneficiary) Name, Local Supplier Internal Reference, Directorate/Service, Service Category Label, Service Category URI, SeRCOP Expenditure Category, SeRCOP Expenditure Code, Purpose of Spend, SeRCOP Detailed Expenditure Code, Capital/Revenue, Procurement Classification`
- Cloudflare: no (legacy nginx)
- Rows/month: ~21,000 (Nov 2023)
- Quirks: **£250 threshold**; **rolling-window purge — April, May, June 2023 already deleted** (LGA "current + 2 prior FYs" window; in April 2026 FY23/24 is at the edge). Richest schema of the 8 (SeRCOP codes).
- Sample: `28/11/2023,2702221,1049754.00,NORTH OF TYNE COMBINED AUTHORITY,398434,Central Items,N/A,N/A,Third Party Payments,505,Other Agencies,5043,Revenue,NON INFLUENCIBLE.PUBLIC SECTOR`
- FY 23/24: **partial — only July 2023 through March 2024 (9 of 12 months)**. **HARD BLOCKER: April-June 2023 not retrievable from official source.**

### South Tyneside Metropolitan Borough Council
- Landing: https://www.southtyneside.gov.uk/article/1350/Council-spending-over-500
- Pattern: `https://www.southtyneside.gov.uk/media/{mediaID}/Council-Spending-Over-500-and-GPC-{Month}-{Year}/csv/Council_Spending_Over__500___GPC_{Month}_{Year}.csv?m={timestamp}` — each month has unique media ID (e.g. 5764 Apr23, 5454 Jan23, 6277 Jul23)
- Format: CSV, Latin-1, comma
- Schema: `Name of Organisation, Body, Service Area, Service Detail, Spend Description, Date, Amount (Net of VAT), Unrecoverable VAT, Supplier Name, Spend (cost-code), Spend (Cap/Rev), Transaction Reference`
- Cloudflare: no (WAF blocks curl HEAD on homepage with 403 but media GET works fine). Homepage hostile to scripting.
- Rows/month: ~4,300 (Jan 2023)
- Quirks: combined £500 + GPC (gov procurement card) data in one file; header has duplicate "Spend" column names; `?m=` timestamp query not required but present in landing HTML links; date format `dd-MMM-yy`
- Sample: `South Tyneside Council,00CL,Business & Resources Group,Housing Revenue Account,Management Fee,03-Jan-23,2577708.37,£0.00,South Tyneside Homes,709090,Revenue,JAN22-002`
- FY 23/24: all 12 months (each URL must be harvested individually from landing page — must curl landing with browser UA)

### Salford City Council
- Landing: https://www.salford.gov.uk/your-council/finance/council-expenditure-over-500/
- Pattern: `https://www.salford.gov.uk/media/{slug_or_6digit}/expenditure-report-{month}-{year}.csv` — FY23/24 uses 6-digit numeric IDs (399206-399580) for Apr-Sep 2023 then alphanumeric slugs (`11whl5ma`, `tvwf4bap`, etc) for Oct 2023-Mar 2024
- Format: CSV, UTF-8, comma
- Schema: `Authority Name, Date of Payment, DocumentNo, Gross, VAT, Net, Vendor Name, Service Area, GL Description`
- Cloudflare: no (Umbraco)
- Rows/month: ~2,200 (Jan 2024)
- Quirks: clean single-row header; `dd/mm/yyyy` dates; gross+VAT+net tri-column; GL description used as purpose
- Sample: `Salford City Council,02/01/2024,601510824,4985,0,4985,3S Adolescent Care,People (Childrens) Service Group,Payments to Agencies`
- FY 23/24: all 12 months

### Stockport Metropolitan Borough Council
- Landing: https://www.stockport.gov.uk/transparency/spending-and-contracts (legacy dataset page at data.gov.uk/dataset/0c5487f4-c863-4f99-b882-459d3acf4b54)
- Pattern: `https://live-iag-static-assets.s3-eu-west-1.amazonaws.com/pdf/Transparency/spendOver500/{prefix}+%C2%A3500+spend+-+{Month}+{Year}.csv` — Apr-Aug 2023 use `Over+%C2%A3500+spend+-+`, Sep-Nov 2023 use `Spend+over+%C2%A3500+-+`, Dec 2023 onwards drop hyphen. Each month has subtle casing/punctuation variation.
- Format: CSV, UTF-8, comma
- Schema: `Merchant Category, Supplier, Service, Summary of Purpose of Expenditure, invoice_date, net_amount`
- Cloudflare: no (AWS S3)
- Rows/month: ~18,300 (Jan 2024)
- Quirks: simplest schema of the 8; no department/directorate; hosted on S3 bucket `live-iag-static-assets`; personal-info redacted to `*Redact - Personal Information`. Stockport **migrated to "all spend" from April 2025** so this legacy £500 dataset is frozen/archival. Note: earlier Mar 2024/Jan 2024 files are duplicated in the newer `/Transparency+data/Purchases+over+%C2%A3500/` S3 path too.
- Sample: `Education Services,CHARNWOOD NURSERY SCHOOL,Services to People,Expenses and Allowances,28/12/2023,3580`
- FY 23/24: all 12 months (different S3 subpath from later months — script must handle both)

### Trafford Metropolitan Borough Council
- Landing: https://www.trafford.gov.uk/council-data-and-democracy/council-data-and-democracy/transparency-and-accountability/local-government-and-transparency-code/council-spend
- Pattern: **All historical per-month CSVs consolidated into one ZIP**: `https://www.trafford.gov.uk/sites/default/files/2025-12/supplier-spend-archive.zip` (34 MB). Internal path: `January_2019-March_2024/Trafford-Supplier-Spend-{Month}-{Year}.csv`. Current year in separate annual ZIP (`trafford-supplier-spend-2025-26.zip`).
- Format: CSV, UTF-8 BOM, comma, quoted thousands (`"52,587.57"`)
- Schema: `Body, Body name, Date, Transaction number, Invoice Number, Amount, Supplier Name, Supplier ID, VAT Registration Number, Expense Area, Expense Type, Expense Code, BVACOP, ProClass, ProClass Description, Extended Description, Profit Centre`
- Cloudflare: no (Drupal site migrated late 2025)
- Rows/month: ~19,600 (Jan 2024)
- Quirks: **HUGE BREAKING CHANGE** — old URL pattern `/about-your-council/open-data/docs/Trafford-Supplier-Spend-{Month}-{Year}.csv` is 404 (site redesigned Dec 2025, old aspx path dead, nothing in Wayback for the CSVs). **Must download ZIP and unzip** to get FY2023/24. Amount column uses quoted thousands separator — requires `thousands=','` on parse. VAT reg numbers included (unique). Has trailing space on Body URI. Richest schema after North Tyneside.
- Sample: `http://statistics.data.gov.uk/id/statistical-geography/E08000009 ,Trafford,18/01/2024,5100456729,10327920,"52,587.57",Kier Construction Ltd,3203,GB166099927,Capital Schemes,A&M PAY TO CONTRACTO,400400,,391110,CONSTRUCTION: Bld Construction,Partington Leisure Village - PCSA,990000`
- FY 23/24: all 12 months (inside archive ZIP)

---

## Key findings & blockers

1. **North Tyneside HARD BLOCKER**: April-June 2023 files purged from rolling window. 9/12 months only. Need to ask NT directly via PolicyPerformance&Research@northtyneside.gov.uk or use Wayback CDX (not tested due to 503).
2. **Trafford URL migration**: the old indexed `open-data/docs/` URLs all 404 since Dec 2025 migration; the `supplier-spend-archive.zip` is the ONLY working path for historical FY2023/24 data.
3. **Data Mill North is NOT used by Barnsley** — the e61m0 dataset is Wakefield's. Barnsley hosts its own Umbraco media files.
4. **Threshold drift**: Solihull and North Tyneside publish over **£250** not £500; others publish over £500. Sefton threshold is "cost-centre sum" not per-transaction.
5. **Data Mill North is Cloudflare-protected** (confirmed JS challenge on /dataset/ pages). Irrelevant here since no councils in this batch use DMN.
6. **Schema richness**: North Tyneside and Trafford have full ProClass/SeRCOP coding; Stockport has the sparsest (6 cols); Salford's `GL Description` is the weakest purpose field.
7. All 8 samples saved to `/tmp/metdistricts3_{slug}_sample.csv`.
8. **Stockport caveat**: the over-£500 dataset is frozen (moved to all-spend from Apr 2025) but the historical FY2023/24 files remain hosted on S3 indefinitely.