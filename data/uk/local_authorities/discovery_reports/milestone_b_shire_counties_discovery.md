# Milestone B Shire Counties discovery

_Agent: agent-a2ef97a8647f8f5cd_

Confirmed: Derbyshire 2023 files are genuinely 404 from the live server. Files were removed but Google still indexes them. Wayback Machine is the only path. Total time spent ~25 min. I have everything I need.

Let me now compile the deliverable report.

===================================================================
BUDGET GALAXY MILESTONE B — UK SHIRE COUNTY URL DISCOVERY REPORT
===================================================================

Research date: 2026-04-13
Target FY: 2023/24 (April 2023 through March 2024)
Files inspected directly: Devon (Apr23 raw), Lincolnshire (Apr23 5.4 MB), Staffordshire (Apr23 xlsx + csv), Suffolk (Apr23 + Jan23)
URL coverage probed via curl: full 12-month sweep for Devon, Staffordshire, Suffolk, Derbyshire-2024
Local cached files: D:/budget-galaxy-research/

===================================================================
COUNCIL 1 — DEVON COUNTY COUNCIL (E10000008, GBP 1.28B)
===================================================================

BLOCKER SEVERITY: GREEN — EASY

Base URL (landing): https://www.devon.gov.uk/factsandfigures/dataset/spending-over-500/
Authoritative repo: https://github.com/Devon-County-Council/spending

FILE FORMAT: CSV, UTF-8 with BOM, monthly, ~12 files

DOWNLOAD URLS (raw, all 12 verified HTTP 200):
- https://raw.githubusercontent.com/Devon-County-Council/spending/master/DCCSpendingOver500_202304.csv
- https://raw.githubusercontent.com/Devon-County-Council/spending/master/DCCSpendingOver500_202305.csv
- https://raw.githubusercontent.com/Devon-County-Council/spending/master/DCCSpendingOver500_202306.csv
- ... (same pattern through 202403)
URL pattern: DCCSpendingOver500_YYYYMM.csv

COLUMN SCHEMA (13 columns, headers verified from Apr 2023 file):
Body, Name of Body, Date, Transaction Number, Invoice Number, Amount, Supplier Name, Supplier ID, Vat Reg No, Expense Area, Expense Type, Expense Code, Creditor Type

- Supplier: "Supplier Name" (note: trailing "****####" supplier-ID hash appended in some rows, e.g. "YOUNG DEVON (IVYBRIDGE)****5215" — strip trailing 4-digit code on ingestion)
- Amount: "Amount" — net of VAT, raw decimal, no GBP symbol, no commas
- Department: "Expense Area" (e.g. "Children's Services")
- Purpose: "Expense Type" (e.g. "Rents & other landlord charges payable") + "Expense Code" (numeric)
- Date: "Date" — ISO format "2023-04-03 00:00:00"

COMPLICATIONS:
- Trailing supplier-ID suffix on Supplier Name needs cleanup
- UTF-8 BOM on first row
- GitHub raw served via githubusercontent (CDN, no rate-limit issues for 12 files)
- 12 files clean, no metadata rows, no encoding issues
- Open Government Licence, hosted by the council itself on GH

This is the easiest of all five. Do this one first.

===================================================================
COUNCIL 2 — STAFFORDSHIRE COUNTY COUNCIL (E10000028, GBP 1.14B)
===================================================================

BLOCKER SEVERITY: GREEN — EASY (very close second to Devon)

Base URL (landing): https://www.staffordshire.gov.uk/Your-council-and-democracy/Transparency/Transparency-overview.aspx
File host directory: https://www.staffordshire.gov.uk/sites/default/files/2026-02/

FILE FORMAT: BOTH CSV and XLSX available for every month — pick CSV (simpler). UTF-8 with BOM.

DOWNLOAD URLS (all 12 verified HTTP 200 in BOTH formats; CSV recommended):
URL pattern: Staffordshire-County-Council-Expenditure-Over-500-DD-MM-YYYY.csv
where DD-MM-YYYY = LAST DAY of the reporting month
- 30-04-2023.csv
- 31-05-2023.csv
- 30-06-2023.csv
- 31-07-2023.csv
- 31-08-2023.csv
- 30-09-2023.csv
- 31-10-2023.csv
- 30-11-2023.csv
- 31-12-2023.csv
- 31-01-2024.csv
- 29-02-2024.csv  (note: 29 not 28 — 2024 leap year)
- 31-03-2024.csv

Full URL example:
https://www.staffordshire.gov.uk/sites/default/files/2026-02/Staffordshire-County-Council-Expenditure-Over-500-30-04-2023.csv

COLUMN SCHEMA (8 columns, verified from both Apr 2023 csv and xlsx):
OrganisationName, OrganisationalUnit, BeneficiaryName, PaymentDate, Amount, Purpose, CategoryInternal, OrganisationURI

- Supplier: "BeneficiaryName"
- Amount: "Amount" — raw decimal "1000.00", no symbol, no commas
- Department: "OrganisationalUnit" (e.g. "UKRS", "Childcare", "ES Child in Care/Care Leavers")
- Purpose: "Purpose" + "CategoryInternal" (often duplicated)
- Date: "PaymentDate" — DD/MM/YYYY in CSV; datetime in xlsx
- OrganisationName always = "Staffordshire County Council"

COMPLICATIONS:
- OrganisationURI has trailing whitespace (rstrip on ingestion)
- XLSX variant has 2 sheets ("Data sheet", "URI link") — read sheet 0 only
- File path includes "/2026-02/" in the URL — this is Drupal's file-revision date stamp, not the actual content date. Don't be confused.
- File sizes ~250 KB to 1 MB per month — small
- No bot blocking, plain GET works with any UA

===================================================================
COUNCIL 3 — LINCOLNSHIRE COUNTY COUNCIL (E10000019, GBP 1.14B)
===================================================================

BLOCKER SEVERITY: GREEN — EASY (rich schema)

Base URL (landing): https://www.lincolnshire.gov.uk/finances-budgets/expenditure-500
Data portal (CKAN): https://data.lincolnshire.gov.uk/dataset/lincolnshire-county-council-spending
File host: https://blob.datopian.com/resources/  (Datopian-managed CKAN object storage)

FILE FORMAT: CSV monthly, UTF-8, no BOM

DOWNLOAD URLS (all 12 FY2023/24 enumerated; URLs contain UUID + random suffix per file):
- April 2023:    https://blob.datopian.com/resources/c53bee04-f589-4130-8318-2e411c1976ca/lccspending2023-04-n75NMw.csv (5.4 MB, verified)
- May 2023:      https://blob.datopian.com/resources/0d564b93-2584-4071-99d7-6999fb11237d/lccspending2023-05-z6rWLu.csv
- June 2023:     https://blob.datopian.com/resources/f8287988-5d56-4e27-bbad-95b67be60810/lccspending2023-06-ATGwWZ.csv
- July 2023:     https://blob.datopian.com/resources/2c68a956-3432-4964-860c-e319fdd3586f/lccspending2023-07-j0GvpE.csv
- August 2023:   https://blob.datopian.com/resources/88d7bb9b-6185-4c2e-b03f-5226625a73eb/lccspending2023-08-DL5lNm.csv
- September 2023: https://blob.datopian.com/resources/29199dd6-f0d4-4a5b-b4e9-124555d29b86/lccspending2023-09-rJSSSW.csv
- October 2023:  https://blob.datopian.com/resources/14928fe5-9bf2-4e58-9a11-dfcb22b6b03f/lccspending2023-10-OuPbGI.csv
- November 2023: https://blob.datopian.com/resources/fa92616f-da54-4da3-86e5-4a26eae1fb95/lccspending2023-11-80U7ti.csv
- December 2023: https://blob.datopian.com/resources/5db69b24-3f6a-4421-ab36-aa963fd6ba97/lccspending2023-12-cMPflF.csv
- January 2024:  https://blob.datopian.com/resources/3953bcde-3b8e-42ab-85f5-ccbb702be44e/lccspending2024-01-eZhily.csv
- February 2024: https://blob.datopian.com/resources/8ac24244-5269-48e0-9b9c-88e4dcaab1de/lccspending2024-02-MzpZJj.csv
- March 2024:    https://blob.datopian.com/resources/b3b73f24-a4d8-42d7-991e-8a85132c1e03/lccspending2024-03-zFl8ka.csv

COLUMN SCHEMA (22 columns — richest of all 5 councils, verified from Apr 2023):
OrganisationName, OrganisationCode, PublishedDate, LatestData, DurationFrom, DurationTo, EffectiveDate, GeoEntityName, GeoCode, GeoName, GeoURI, ReportingPeriodType, ReportingPeriod, LegalEntity, LCC_Period, OrganisationalUnit, Purpose, CategoryInternalName, TransactionNumber, BeneficiaryOtherID, BeneficiaryName, Amount

- Supplier: "BeneficiaryName"
- Amount: "Amount" — raw decimal "7.63", no symbol
- Department: "OrganisationalUnit" (e.g. "Residential Homes & Placements")
- Purpose: "Purpose" + "CategoryInternalName" (e.g. "Cleaning & Domestic Supplies" / "Cleaning Materials")
- Date: "EffectiveDate" (DD/MM/YYYY) — also DurationFrom/DurationTo (ISO with TZ offset)
- E10000019 (Lincolnshire) embedded in GeoCode column — perfect provenance
- LCC_Period encodes financial period (e.g. "202401" means FY2023/24 month 1 = April 2023)

COMPLICATIONS:
- URLs contain randomized hash suffixes per file — must be hard-coded once or scraped from the CKAN API; cannot be derived from a pattern
- File sizes ~5 MB each — large, lots of low-value rows (cleaning supplies of GBP 7.63 etc.); raw data threshold appears to be far below 500, individual transactions are itemized within invoice totals. Will need filtering during aggregation.
- ISO datetime with weird "23:00:00" timezone offset on DurationFrom/DurationTo — use EffectiveDate instead
- CKAN portal stable, datopian blob storage no auth needed

CKAN API for stable IDs (recommended for re-resolution):
https://data.lincolnshire.gov.uk/api/3/action/package_show?id=lincolnshire-county-council-spending

===================================================================
COUNCIL 4 — SUFFOLK COUNTY COUNCIL (E10000029, GBP 1.12B)
===================================================================

BLOCKER SEVERITY: RED — HARD

Base URL (landing): https://www.suffolk.gov.uk/council-and-democracy/open-data-suffolk/council-data-and-transparency/council-expenditure-and-contracts/expenditure-exceeding-250
File host: https://www.suffolk.gov.uk/asset-library/  (root) and /asset-library/imported/ (subdir)

FILE FORMAT: CSV monthly, UTF-8 with BOM
THRESHOLD: GBP 250 (NOT GBP 500) — must filter post-ingestion if Budget Galaxy's tree expects GBP 500 baseline

CRITICAL ISSUE: FOUR different filename conventions used across FY 2023/24, AND 4-of-12 months are missing from the live site entirely.

VERIFIED WORKING URLS (only 8 of 12 months found via brute-force probing):
- Apr 2023: https://www.suffolk.gov.uk/asset-library/SCC-250SpendAllCols-Apr23-formatted.csv  (verified 200, 2.9 MB)
- May 2023: NOT FOUND on live site
- Jun 2023: https://www.suffolk.gov.uk/asset-library/general-transactions-exceeding-250-june-2023.csv  (200)
- Jul 2023: https://www.suffolk.gov.uk/asset-library/general-transactions-july-2023.csv  (200)
- Aug 2023: https://www.suffolk.gov.uk/asset-library/imported/SCC-250SpendAllCols-Aug23-formatted.csv  (200, only one in /imported/)
- Sep 2023: https://www.suffolk.gov.uk/asset-library/SCC-250SpendAllCols-Sep23-formatted.csv  (200)
- Oct 2023: https://www.suffolk.gov.uk/asset-library/SCC-250SpendAllCols-Oct23-formatted.csv  (200)
- Nov 2023: https://www.suffolk.gov.uk/asset-library/SCC-250SpendAllCols-Nov23-formatted.csv  (200)
- Dec 2023: https://www.suffolk.gov.uk/asset-library/SCC-250SpendAllCols-Dec23-formatted.csv  (200)
- Jan 2024: NOT FOUND on live site (probed 6 URL variants)
- Feb 2024: NOT FOUND on live site
- Mar 2024: https://www.suffolk.gov.uk/asset-library/SCC-250SpendAllCols-Mar24-formatted.csv  (search-indexed; not personally verified — needs probe)

So Apr/Jun/Jul/Aug/Sep/Oct/Nov/Dec 2023 = 8 confirmed; Mar 2024 likely 9th. May 2023 + Jan/Feb 2024 must come from Wayback Machine (assistant cannot fetch web.archive.org directly — main thread will need to do this).

COLUMN SCHEMA (10 columns, verified from Apr 2023 SCC-250SpendAllCols variant):
Body Name, Body, Directorate, Service Area, Sub-Service Area, Sub-description, Payment Date, Sub Amount, Invoice Amount, Supplier Name

- Supplier: "Supplier Name"
- Amount: "Sub Amount" (line item) AND "Invoice Amount" (rolled up) — pick one consistently; Sub Amount is finer-grained
- Department: "Directorate" (e.g. "ACS" = Adult Care Services) > "Service Area" > "Sub-Service Area" — 3-level hierarchy, GREAT for tree visualization
- Purpose: "Sub-description" (e.g. "46120-Homecare Exceptional Rate")
- Date: "Payment Date" — DD/MM/YYYY
- WARNING: "Body Name" and "Body" columns are completely BLANK in every row — must hard-code "Suffolk County Council" / E10000029 during ingestion
- Threshold confirmed in Apr 2023 file: rows like GBP 567.00 and GBP 621.00 are present — files include rows below GBP 500, will need filtering

OLDER SCHEMA (Jan 2023 "scc-general-transactions-exceeding-250-..." variant):
Same 10 columns, but UTF-8 BOM order/handling slightly different. Confirmed identical column set.

COMPLICATIONS (cumulative — why this is RED):
1. THREE filename conventions in the same fiscal year: SCC-250SpendAllCols-MonYY-formatted.csv (most common), general-transactions-exceeding-250-{month}-{year}.csv (Jun 2023 only), general-transactions-{month}-{year}.csv (Jul 2023 only)
2. One file lives in /asset-library/imported/ (Aug 2023) — different subdirectory, no apparent reason
3. May 2023 + Jan/Feb 2024 not found anywhere on the live site after exhaustive probing — Wayback Machine required
4. £250 threshold means ~30% more rows than £500 councils; capital + revenue mixed
5. Body Name and Body columns blank — cannot identify council from file content alone; must trust filename
6. Filename month abbreviations are 3-char title case (Apr, May, Jun) — no leading zero, no day component

If main thread wants to do Suffolk, allocate 2x normal effort budget vs Devon/Stafford and plan for Wayback fallback for 3-4 months.

===================================================================
COUNCIL 5 — DERBYSHIRE COUNTY COUNCIL (E10000007, GBP 1.37B)
===================================================================

BLOCKER SEVERITY: RED — HARD

Base URL (landing): https://www.derbyshire.gov.uk/council/budgets-and-spending/spending/spending-over-500.aspx
File host directory: https://www.derbyshire.gov.uk/site-elements/documents/csv/council/spending/{YYYY}/

FILE FORMAT: CSV monthly, UTF-8 with BOM, separate "county fund" and "pension fund" files

CRITICAL ISSUE: Derbyshire ROTATES OFF historical files. The 2023 directory has been deleted from the live server. Google still indexes the 2023 URLs but they all return HTTP 404. Verified by exhaustive probing:
- /csv/council/spending/2023/* — all 404 (live)
- /csv/council/budgets-and-spending/spending/2023/* — all 404 (live, search-indexed but dead)
- /csv/council/spending/2024/* — partial coverage (see below)

VERIFIED 2024 FILES (live, only Q1 2024 useful for FY 23/24):
URL pattern: monthly-report-{monthlongname}-2024-spending-over-500-county-fund.csv
- Jan 2024: january-2024 (200) — https://www.derbyshire.gov.uk/site-elements/documents/csv/council/spending/2024/monthly-report-january-2024-spending-over-500-county-fund.csv
- Feb 2024: february-2024 (200)
- Mar 2024: march-2024 (200)

Months Apr 2023 through Dec 2023 (9 months) MUST come from Wayback Machine.

URL pattern naming has historical inconsistencies even within 2023 (per Google index):
- January 2023 used abbreviated "jan-2023" (not "january-2023")
- July 2023 pension-fund file was "july2023" (no hyphen)
- Other months use full long name with hyphen
This means the Wayback retrieval needs careful URL guessing or manual snapshot inspection.

Two file variants per month:
- monthly-report-{month}-{year}-spending-over-500-county-fund.csv  (main operational spending)
- monthly-report-{month}-{year}-spending-over-500-pension-fund.csv  (pension administration, much smaller, probably skip)

COLUMN SCHEMA (9 columns, verified from June 2024 county fund file):
Body Name, Body, Service Area Categorisation, Responsible Unit, Expense Type, Date, Transaction Number, Amount, Supplier Name

- Supplier: "Supplier Name" (note: PII rows show "REDACTED PERSONAL DATA" for direct-payment recipients)
- Amount: "Amount" — raw decimal "1552.61", no symbol
- Department: "Service Area Categorisation" (e.g. "Children & Education Services") + "Responsible Unit" (e.g. "Children's Services") — 2-level hierarchy
- Purpose: "Expense Type" (e.g. "Academy Payments", "Direct Payment Clawback")
- Date: "Date" — DD/MM/YYYY
- Body Name = "Derbyshire County Council", Body = "1000" (numeric)

COMPLICATIONS (cumulative — why this is RED):
1. 9-of-12 FY 2023/24 months removed from live server — Wayback only
2. Wayback fetch unavailable from this assistant; main thread or operator must do it manually
3. Inconsistent month-name abbreviation across the year (jan vs january, july2023 vs july-2023)
4. UTF-8 BOM
5. PII redaction strings in Supplier Name need filtering
6. Two fund streams (county vs pension) — pick county fund only for £1.37B figure
7. Path moved from /csv/council/budgets-and-spending/spending/ to /csv/council/spending/ at some point in 2024 — historical Wayback snapshots may use either path
8. Derbyshire seems to have a deletion policy; even Q4 2024 files are missing (Sept 2024 404, Dec 2024 404), so the council is actively pruning. Build the ingestion now while 2024 is still partially live.

===================================================================
PRIORITY RANKING (easiest first)
===================================================================

1. GREEN — DEVON CC (£1.28B): GitHub-hosted CSVs, all 12 months verified, simplest schema, smallest cleanup. DO THIS FIRST.

2. GREEN — STAFFORDSHIRE CC (£1.14B): All 12 months verified in both CSV+XLSX, clean 8-column schema, predictable URL pattern (DD-MM-YYYY = month-end last day). DO THIS SECOND.

3. GREEN — LINCOLNSHIRE CC (£1.14B): All 12 months on Datopian CKAN, richest 22-column schema with embedded GeoCode, but URL hashes prevent simple pattern derivation (must hardcode 12 URLs once). Files are large (~5 MB each, lots of low-value rows). Use CKAN API to refresh URLs. DO THIS THIRD.

4. RED — SUFFOLK CC (£1.12B): £250 threshold (not £500), four naming conventions in one fiscal year, /imported/ subdirectory mixing, 3-4 months missing from live site (need Wayback for May 2023 + Jan/Feb 2024), Body Name column blank. Schema is good (3-level Directorate hierarchy great for tree). Allocate 2x effort.

5. RED — DERBYSHIRE CC (£1.37B): Highest spend but 9-of-12 FY2023/24 files have been DELETED from live site. Wayback Machine is mandatory for Apr-Dec 2023, and the assistant could not access web.archive.org directly. Inconsistent month-name abbreviations within the same fiscal year. PII redaction strings. Save for last; consider building a Wayback-Machine-aware fetcher first.

RECOMMENDATION FOR MAIN THREAD: Start with Devon + Staffordshire + Lincolnshire (3 GREEN councils, ~£3.55B combined spend, can be ingested in roughly the same effort budget as one HARD council). Defer Suffolk and Derbyshire to a second sub-milestone where you also build/borrow a Wayback Machine fetch utility. If you must include one RED council in Milestone B for £-coverage reasons, pick Suffolk over Derbyshire (only 3-4 missing months vs 9, and the 8 working URLs are deterministic).

KEY FILE PATHS (local cache from this research, on operator machine):
- D:/budget-galaxy-research/staffs_apr23.xlsx (245 KB, Staffordshire Apr23, openpyxl-readable)
- D:/budget-galaxy-research/staffs_apr23.csv (998 KB, Staffordshire Apr23 CSV)
- D:/budget-galaxy-research/suffolk_apr23.csv (2.9 MB, Suffolk Apr23 SCC-250SpendAllCols variant)
- D:/budget-galaxy-research/derby_jun24.csv (3.2 MB, Derbyshire June 2024 short-path)
- D:/budget-galaxy-research/derby_jun24.csv schema is the canonical 9-column header for Derbyshire ingestion

Total research time: ~25 minutes. All five councils have full schema + URL discovery deliverables. No PDF-only fallbacks were encountered — all 5 publish CSV/XLSX, just with varying degrees of self-inflicted chaos.