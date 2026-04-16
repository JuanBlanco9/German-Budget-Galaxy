# Discovery Hampshire CC

_Agent: agent-a8c4d464ee8a63a4f_

Schema fully captured from a real Hampshire CC payments file. The 2014 schema is almost certainly the same as the 2023/24 XLSX (the page narrative explicitly references the "Posting Date" column header). Let me verify this is the expected schema and assemble the final report.

Hampshire County Council Spend Over £500 — FY 2023/24 URL Discovery Report

1) BASE TRANSPARENCY PORTAL
   Landing page: https://www.hants.gov.uk/aboutthecouncil/informationandstats/opendata/opendatasearch/supplierpayments
   File host: https://documents.hants.gov.uk/opendata/
   Note: The council uses the "hants.gov.uk" domain, not "hampshire.gov.uk".

2) FY 2023/24 DOWNLOAD URLS (all XLSX, all verified from page source via Wayback snapshot 2025-09-15; URLs not crawled by Google because the Akamai-style edge blocks bots — they are however the actual hrefs rendered on the live page)

   Note on filename quirk: HCC's fiscal-year tag in the filename lags the actual month for April. April 2023 is filed under "2022-2023" while May 2023 onward is filed under "2023-2024". This is a real HCC quirk; both must be ingested as part of FY 2023/24.

   April 2023 (XLSX, FY tag 2022-2023):
     https://documents.hants.gov.uk/opendata/2022-2023-All-Departments-Output-HCC-Transparency-Reporting-April2023.xlsx
   May 2023 (XLSX):
     https://documents.hants.gov.uk/opendata/2023-2024-All-Departments-Output-HCC-Transparency-Reporting-May2023.xlsx
   June 2023:
     https://documents.hants.gov.uk/opendata/2023-2024-All-Departments-Output-HCC-Transparency-Reporting-June2023.xlsx
   July 2023:
     https://documents.hants.gov.uk/opendata/2023-2024-All-Departments-Output-HCC-Transparency-Reporting-July2023.xlsx
   August 2023:
     https://documents.hants.gov.uk/opendata/2023-2024-All-Departments-Output-HCC-Transparency-Reporting-August2023.xlsx
   September 2023:
     https://documents.hants.gov.uk/opendata/2023-2024-All-Departments-Output-HCC-Transparency-Reporting-September2023.xlsx
   October 2023:
     https://documents.hants.gov.uk/opendata/2023-2024-All-Departments-Output-HCC-Transparency-Reporting-October2023.xlsx
   November 2023:
     https://documents.hants.gov.uk/opendata/2023-2024-All-Departments-Output-HCC-Transparency-Reporting-November2023.xlsx
   December 2023:
     https://documents.hants.gov.uk/opendata/2023-2024-All-Departments-Output-HCC-Transparency-Reporting-December2023.xlsx
   January 2024:
     https://documents.hants.gov.uk/opendata/2023-2024-All-Departments-Output-HCC-Transparency-Reporting-January2024.xlsx
   February 2024:
     https://documents.hants.gov.uk/opendata/2023-2024-All-Departments-Output-HCC-Transparency-Reporting-February2024.xlsx
   March 2024:
     https://documents.hants.gov.uk/opendata/2023-2024-All-Departments-Output-HCC-Transparency-Reporting-March2024.xlsx

   Total: 12 monthly XLSX files. No CSV variant for FY 2023/24 — the council switched from CSV (legacy "TransparencyReporting" naming, capitalised differently) to XLSX with the new "All-Departments-Output-HCC-Transparency-Reporting" filename pattern in mid-2022.

3) SCHEMA (9 columns, confirmed from a real Hampshire CC payments file at /tmp/hants_sample.csv — same lineage as the 2023/24 XLSX, page text explicitly references the "Posting Date" column header in the current files)

   Column order:
     1. Authority         -> always "Hampshire County Council"
     2. Department        -> e.g. "ADULT SERVICES" (directorate / your department field)
     3. Spending Area     -> cost-centre / service unit, e.g. "ACM-FareGosp Intgrated LD Team" (your purpose/cost-centre field)
     4. Expense Type      -> e.g. "Payments to Health Authorities" (your category field)
     5. Posting Date      -> dd.mm.yyyy (NOT the actual payment date — the date the document was posted to the financial system)
     6. Reference         -> internal payment doc ID
     7. Amount            -> numeric, no £ sign, no thousands separators (sample: 5024.95). NET OF VAT.
     8. Cap / Rev         -> "R" = revenue, "C" = capital
     9. Supplier Name     -> e.g. "SOUTHERN HEALTH (MH,LD & SC) NHS FT". May contain commas (quoted). May be literal "Personal Payments" where redacted.

   Mapping for your pipeline:
     supplier name column   = Supplier Name
     amount column          = Amount
     department column      = Department
     purpose / cost-centre  = Spending Area  (and Expense Type as secondary category)

4) SAMPLE ROW (header + first two data rows from April 2014 file — same schema)
   Authority,Department,Spending Area,Expense Type,Posting Date,Reference,       Amount,Cap / Rev,Supplier Name
   Hampshire County Council,ADULT SERVICES,ACM-FareGosp Intgrated LD Team,Payments to Health Authorities,02.04.2014,2210187071,5024.95,R,"SOUTHERN HEALTH (MH,LD & SC) NHS FT"
   Hampshire County Council,ADULT SERVICES,ACM-FareGosp Intgrated LD Team,Payments to Health Authorities,02.04.2014,2210187073,5024.95,R,"SOUTHERN HEALTH (MH,LD & SC) NHS FT"

5) COMPLICATIONS / QUIRKS

   a) BOT BLOCKING — documents.hants.gov.uk is behind an Akamai-style edge that returns HTTP 403 with HTML error pages to anything that looks like curl/wget/python-requests. Your ingester MUST send a full browser User-Agent plus an Accept-Language header, and ideally a Referer of the supplier-payments landing page. Recommend using `requests` with a Chrome UA string and a session that GETs the landing page first to pick up cookies. Wayback was not able to crawl the actual XLSX files for the same reason — the URLs are correct but you'll only confirm by fetching them with a proper browser fingerprint.

   b) FILENAME FY MISMATCH — April 2023 is in the 2022-2023 bucket, not 2023-2024. Both must be downloaded for FY 2023/24 coverage. Same will apply for April 2024 (will be in 2023-2024 bucket).

   c) FILE FORMAT IS XLSX, not CSV. You'll need openpyxl. Header row position in the XLSX is unknown without opening one — older CSVs had headers on row 1 with no metadata preamble, so XLSX likely follows suit, but be defensive.

   d) AMOUNT COLUMN HEADER has leading whitespace in the legacy CSV ("       Amount") — strip header whitespace before matching. May persist in XLSX.

   e) DATE FORMAT is dd.mm.yyyy (UK with dots, not slashes) and labelled "Posting Date" not "Payment Date" — it's the system-posting date, which can lag the real payment date by days/weeks. HCC also notes data is published "two months in arrears".

   f) REDACTIONS — Supplier Name = "Personal Payments" indicates a redacted personal-nature payment. Filter or flag these; they will not match Companies House.

   g) DATA RE-RUN — HCC explicitly notes: "Data for January 2023 to October 2023 inclusive has been re-run due to a data processing issue affecting the number of records excluded from the originally published data." If you cached older versions, re-download Jan-Oct 2023.

   h) AMOUNTS ARE NET OF VAT (per page narrative). All payments £500+ ex-VAT included. No currency symbol, no thousand separators in legacy data — likely the same in XLSX, but again be defensive.

   i) SCHOOLS DELEGATED BUDGETS are excluded ("pending clarification from Government"). Hampshire's reported total via this dataset will under-state the £2.58B figure because it omits delegated school spend. Document this as a known coverage gap.

   j) ADULT SERVICES ABBREVIATIONS — the Spending Area column for Adult Services uses codes the council documents on the landing page: ACM=Assessment and Care Management, CMHT=Community Mental Health Team, DAAT=Drug and Alcohol Team, LD=Learning Disabilities, MH=Mental Health, OPH=Older Persons Home, OP=Older Persons, PD=Physical Disability, SP=Supporting People, M&S=Management and Support. Worth keeping a lookup table.

   k) LANDING PAGE BLOCKS BOTS TOO — if you want to discover next year's URLs programmatically, scrape via the Wayback Machine (`https://web.archive.org/web/{timestamp}id_/...`) instead of hitting hants.gov.uk directly. Wayback DOES have the page (latest snapshot 2025-09-15).

ALTERNATIVES (in case main URLs are unreachable)
   - data.gov.uk dataset entry exists (https://www.data.gov.uk/dataset/8786e72f-e3dd-4aae-a4e6-784eca291567/payments-to-suppliers-with-a-value-over-500-from-hampshire-county-council) but is NOT maintained — last resource on that page is September 2014. Not usable for FY 2023/24.
   - No third-party mirror found (UKGovScan indexes the data but does not re-host files).
   - If the Akamai block is unbypassable, the only fallback is FOI request to County Treasurers.

RELEVANT FILES PRODUCED LOCALLY DURING RESEARCH
   - C:/tmp/sp_wb.html — Wayback snapshot 2024-05-22 of supplier payments landing page (contains FY 2023/24 hrefs)
   - C:/tmp/sp_wb2.html — Wayback snapshot 2025-09-15 (latest, contains FY 2023/24 + 2024/25 + 2025/26 hrefs)
   - C:/tmp/hants_sample.csv — Real Hampshire CC payments-april-2014.csv from Wayback (15,797 rows, schema reference)

Sources:
- [Hampshire CC Payments to suppliers landing page](https://www.hants.gov.uk/aboutthecouncil/informationandstats/opendata/opendatasearch/supplierpayments)
- [Hampshire CC Open Data and transparency](https://www.hants.gov.uk/aboutthecouncil/informationandstats/opendata)
- [data.gov.uk dataset (stale, 2014 only)](https://www.data.gov.uk/dataset/8786e72f-e3dd-4aae-a4e6-784eca291567/payments-to-suppliers-with-a-value-over-500-from-hampshire-county-council)