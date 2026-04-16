# London boroughs discovery batch 1

_Agent: agent-ad374852002c914db_

All 7 boroughs cracked. Bromley columns = Portfolio | Supplier_Name | Payment_Date | Transaction_Number | Net Amount | Merchant Category. Dim was A1:F2772 so ~2771 data rows in April 2023. Final report below.

---

### Barking and Dagenham
- Landing: https://www.lbbd.gov.uk/council-and-democracy/performance-and-spending/corporate-procurement/payments-over-ps250-and-ps500
- Data URL pattern: `https://www.lbbd.gov.uk/sites/default/files/YYYY-MM/Amounts%20paid%20{Month}%20{Year}%20%28CSV%29.csv` (upload month = report month + 1; April 2023 lives in `2023-05/`)
- Format: CSV, comma-delimited, ISO-8859/Windows-1252 (detected by `file`)
- Schema: dept=`Cost Centre Description` (+ 3 parent cols), purpose=`Nominal Description`, supplier=`Supplier`, amount=`Gross` (also `Vat`)
- Cloudflare: no
- Rows/month: ~3,800 (April 2023)
- Quirks: Row 1 is a title row "LBBD Payments Greater than £250 for Publishing" — **skip 1 row before header**. Three identically-named `Cost Centre Parent` columns. Data is >£250 threshold, not £500 — filter client-side on `Gross`.
- Sample: `03-Apr-23,All Saints Catholic School and Technolog,Other Local Authorities,D61900,SECONDARY SCHOOL - ARP PROV,DSG - OTHER 40,DSG - HIGH NEEDS 40G,ARP FUNDING 40GB,661360 SCHOOLS - TRANSFER PAYM,26000.00,0.00`
- FY 2023/24 availability: all 12 months

### Barnet
- Landing: https://open.barnet.gov.uk/dataset/2331d/expenditure-reporting-202324
- Data URL pattern: `https://open.barnet.gov.uk/download/2331d/{slug}/Expenditure%20Report%20{Month}%20{Year}.csv` — slugs are non-guessable (e.g. `dsv`,`w65`,`jzm`,`3n7`,`1lp`,`579`,`jdx`,`bc8`,`qjn`,`lml`,`yhv`,`n9b`). Fetch via CKAN API `https://open.barnet.gov.uk/api/action/package_show?id=2331d` and parse `result.resources[].url`.
- Format: CSV, UTF-8
- Schema: dept=`Directorate` + `Department`, purpose=`Expenditure Type`, supplier=`Vendor Name`, amount=`Expenditure Amount (exc VAT)`
- Cloudflare: **YES on landing pages** ("Just a moment..." via curl), but the CKAN `/api/action/` and `/download/` endpoints return 200 with a normal UA — **no Playwright needed**
- Rows/month: ~12,800 (April 2023)
- Quirks: 8th column is a multi-line header `"Comment from\nDatabase:\nPublish/ Exclude/ Publish-Redact Name"` — preserve newlines when parsing. Values like "PUBLISH-REDACT" indicate redacted supplier names.
- Sample: `Delivery Units,Assurance,Training,1024005402,CHARTERED INST. INTERNAL AUDITORS,"5,600.00",24/04/2023,PUBLISH`
- FY 2023/24 availability: all 12 months

### Bexley
- Landing: https://www.bexley.gov.uk/bexley-business-employment/business-services/contracts-tenders-and-procurement/expenditure-records/publication-payments-over-ps500
- Data URL pattern (per month, irregular folders):
  - Apr23: `/sites/default/files/2023-06/april-2023.csv`
  - May23: `/sites/default/files/2023-06/May-23-v2.csv`
  - Jun23: `/sites/default/files/2023-07/june-2023.csv`
  - Jul23: `/sites/default/files/2023-10/july-2023.csv`
  - Aug23: `/sites/default/files/2023-11/aug-2023.csv`; Sep23: `/sites/default/files/2023-11/sept-2023.csv`
  - Oct23: `/sites/default/files/2024-01/oct-2023.csv`
  - Nov23/Dec23: `/sites/default/files/2024-03/{nov,dec}-2023.csv`
  - Jan24: `/sites/default/files/2024-04/january-2024.csv`
  - Feb24/Mar24: `/sites/default/files/2024-05/{February-2024,march-2024}.csv`
  - Base: `https://www.bexley.gov.uk`
- Format: CSV, UTF-8 with BOM
- Schema: dept=`Directorate` + `Service Area`, purpose=`Expense Type`, supplier=`Supplier`, amount=`Amount` (net, ex-VAT; negatives = credit notes)
- Cloudflare: no
- Rows/month: ~5,900 (April 2023)
- Quirks: **Row 1 is metadata** (`,,,,April 2023 £500 spend data,,,,`) — **skip 1 row before header**. BOM on first cell. URL slugs irregular (`v2`, `sept` vs `september`, etc.) — hardcode the 12 URLs; no programmatic pattern.
- Sample: `03/04/2023,862852,0,40000,RFMP TRUST ACCOUNT,dd,Insurance,Finance & Corporate,Central Finance`
- FY 2023/24 availability: all 12 months

### Brent
- Landing: https://data.brent.gov.uk/dataset/vq756/what-we-spend
- Data URL pattern: `https://data.brent.gov.uk/download/vq756/{slug}/Transparency%20Report%20{range}.csv` via CKAN API `https://data.brent.gov.uk/api/action/package_show?id=vq756`. FY23/24 quarters:
  - `d90/Transparency%20report%20Mar%202023%20-%20May%202023.csv`
  - `wqg/Transparency%20Report%20Jun%202023%20-%20Aug%202023.csv`
  - `fx1/Transparency%20Report%20Sep%202023%20-%20Nov%202023.csv`
  - `7tl/Transparency%20Report%20Dec%202023%20-%20Feb%202024.csv`
  - `tnx/Transparency%20report%20Mar%202024%20%E2%80%93%20May%202024.csv` (note Unicode en-dash %E2%80%93)
- Format: CSV, UTF-8, **quarterly** (not monthly)
- Schema: dept=`Cost Centre Description`, purpose=`Subjective Description` (+ `Subjective` code), supplier=`Vendor Name 2`, amount=`Amount` (ex-VAT; also `Non Recoverable VAT`)
- Cloudflare: **YES on HTML pages**, but `/api/action/` and `/download/` return 200 with a Chrome UA — same pattern as Barnet
- Rows/quarter: ~17,000 (Jun–Aug 2023) ≈ 5,600/month
- Quirks: Row 1 is title metadata (`Transparency Report 23 June - 23 Aug,,,,,,,`) — **skip 1 row**. Leading space in vendor names (" TKE UK Ltd"). March 2023 and March 2024 each sit in 3-month files that span FY boundaries — must dedupe by Payment Date when stitching `Mar-May 2023` with `Mar-May 2024` to avoid March 2024 from March file. Redacted rows show "REDACTED PERSONAL DATA".
- Sample: `07/07/2023, TKE UK Ltd,B06131,Ppm M and E,620120,Works - Construction Repair and Maintenance - Buildings,30069.80,0`
- FY 2023/24 availability: all 12 months (across 5 quarterly files with boundary dedup)

### Bromley
- Landing: https://www.bromley.gov.uk/council-democracy/council-spending/2
- Data URL pattern: `https://www.bromley.gov.uk/downloads/file/{id}/payments-to-suppliers-invoices-over-500-{month}-{year}` — **IDs are sequential but irregular** (Apr23=2289). The `/downloads/download/NNN/...` URLs redirect to the landing HTML, not the file — use `/downloads/file/{id}/...` only. Must scrape the landing page each run to extract the 12 file IDs.
- Format: **XLSX** (despite URL suffix looking like a slug — `file` confirms `Microsoft Excel 2007+`). Single sheet, no metadata row.
- Schema: dept=`Portfolio`, purpose=`Merchant Category`, supplier=`Supplier_Name`, amount=`Net Amount` (also `Payment_Date`, `Transaction_Number`)
- Cloudflare: no
- Rows/month: ~2,771 (April 2023, dim `A1:F2772`)
- Quirks: Single-sheet XLSX, clean header row 1, dates stored as Excel serials (e.g. 45019 = 03-Apr-2023). Threshold is £500.
- Sample (decoded): `Adult Care and Health,ABSOLUTE CARE SERVICES LTD,2023-04-03,5029315,4701.17,TCR DOMICILIARY PROVIDER`
- FY 2023/24 availability: all 12 months

### City of London
- Landing: https://www.cityoflondon.gov.uk/about-us/budgets-spending/local-authority-expenditure
- Data URL pattern: `https://www.cityoflondon.gov.uk/assets/about-us/budget-and-spending/local-authority-expenditure-xlsx-{MM}-{YYYY}.xlsx` — FY23/24 = `04-2023.xlsx`, `05-2023.xlsx`, …, `03-2024.xlsx`. All 12 confirmed on landing HTML. (Note: recent months since ~April 2025 use a different path `/assets/about-us/Copy-of-local-authority-expenditure-over-500-{month}-{year}.xlsx`, not relevant for FY23/24.)
- Format: **XLSX**, single sheet
- Schema: dept=`Department` (+ `Division of Service`), purpose=`Purpose of Expenditure` (+ `Merchant Category`), supplier=`Supplier Name`, amount=`Net Amount` (also `Body`, `Payment Date`, `Transaction Code`)
- Cloudflare: no
- Rows/month: ~3,500–4,000 est. (April 2023 file = 243 KB; sharedStrings uniqueCount=3164). Exact row count not parsed (no python3), but aligns with other boroughs of similar size.
- Quirks: Clean header row 1, no metadata prelude. `Body` column is always "City of London" but also captures "City of London Police" — filter if you want council-only. Threshold £500.
- Sample (first data row, decoded): `City of London, Early Years and Primary Education, Supplies and Services, ..., Department..., Payment Date, Transaction Code, Net Amount, Supplier Name`
- FY 2023/24 availability: all 12 months

### Ealing
- Landing: https://www.ealing.gov.uk/info/201041/council_budgets_and_spending/864/council_spending_over_250/1
- Data URL pattern: `https://www.ealing.gov.uk/download/downloads/id/{id}/{month}_{year}.csv` with per-month IDs:
  19036/april_2023, 19079/may_2023, 19080/june_2023, 19216/july_2023, 19217/august_2023, 19234/september_2023, 19348/october_2023, 19394/november_2023, 19651/december_2023, 19652/january_2024, 19746/february_2024, 19745/march_2024 (note Feb/Mar are reversed). Scrape landing once to get IDs.
- Format: CSV, UTF-8
- Schema: dept=`Service Label` + `Organisation Unit`, purpose=`Expenditure Category` (+ `Expenditure Code`), supplier=`Amended Supplier Name` (prefer over `Supplier ID`), amount=`Net Amount`
- Cloudflare: no
- Rows/month: ~10,880 (April 2023) — **much larger because threshold is £250, not £500**
- Quirks: **First column is "columns"** containing the literal string `INSERTED DETAIL` on every row — this is a status flag, not data. Header row is the literal first line (no metadata prelude). Dataset includes transactions with dates outside the "April 2023" file (e.g. 31/03/2023, 15/04/2023) — use `Date` col, not filename, when windowing. Separate `credit_card_spend.xlsx` file covers Apr23–Feb24 for pcard spend — optional enrichment.
- Sample: `INSERTED DETAIL,,Ealing Council,http://opendatacommunities.org/id/london-borough-council/ealing,PLACE,6,STREET SERVICES,PAYMENTS TO CONTRACTORS,4000,,31/03/2023,41061243,13597.6,16351,M.P.M SPECIALIST SOLUTIONS LIMITED T/A MPM GRAFFITI-SOLUTIONS`
- FY 2023/24 availability: all 12 months

---

## Key findings summary

- **No Playwright needed.** Both Cloudflare-gated portals (Barnet, Brent) expose CKAN `/api/action/package_show?id={ds}` and `/download/{ds}/{slug}/...` endpoints that return 200 with a standard Chrome User-Agent. Use the API to enumerate resources since slugs are non-guessable.
- **Bromley** URL pattern caveat: the `/downloads/download/NNN/...` URLs visible in WebFetch output redirect to landing HTML — do NOT use them. The real file URL lives in the landing page HTML as `/downloads/file/{id}/...` and serves XLSX.
- **Metadata-row boroughs** (skip row 1): Barking and Dagenham, Bexley, Brent. Bromley, Barnet, City of London, Ealing have clean headers.
- **Threshold divergence**: Barking-Dagenham and Ealing publish at £250 (not £500) — filter `amount >= 500` client-side for consistency with the other 5. Bexley and Brent amounts are net (ex-VAT); Barking-Dagenham is gross.
- **Brent is quarterly**, not monthly — FY23/24 requires 5 files with dedup on boundary months (March 2023 and March 2024 each appear in two files).
- **Ealing supplier column**: use `Amended Supplier Name` (the last column), not `Supplier ID`.

## Sample files saved
- /tmp/london_batch1_barking_dagenham_sample.csv (735 KB, April 2023)
- /tmp/london_batch1_barnet_sample.csv (1.58 MB, April 2023)
- /tmp/london_batch1_bexley_sample.csv (691 KB, April 2023)
- /tmp/london_batch1_brent_sample.csv (2.31 MB, Jun–Aug 2023 quarter)
- /tmp/london_batch1_bromley_sample.xlsx (133 KB, April 2023)
- /tmp/london_batch1_city_of_london_sample.xlsx (243 KB, April 2023)
- /tmp/london_batch1_ealing_sample.csv (2.48 MB, April 2023)

Sources:
- [Barking and Dagenham — Payments over £250 and £500](https://www.lbbd.gov.uk/council-and-democracy/performance-and-spending/corporate-procurement/payments-over-ps250-and-ps500)
- [Barnet Open Data — Expenditure Reporting 2023/24](https://open.barnet.gov.uk/dataset/2331d/expenditure-reporting-202324)
- [Bexley — Publication of payments over £500](https://www.bexley.gov.uk/bexley-business-employment/business-services/contracts-tenders-and-procurement/expenditure-records/publication-payments-over-ps500)
- [Brent Open Data — What we spend](https://data.brent.gov.uk/dataset/vq756/what-we-spend)
- [Bromley — Payments to suppliers over £500](https://www.bromley.gov.uk/council-democracy/council-spending/2)
- [City of London — Local authority expenditure](https://www.cityoflondon.gov.uk/about-us/budgets-spending/local-authority-expenditure)
- [Ealing — Council spending over £250](https://www.ealing.gov.uk/info/201041/council_budgets_and_spending/864/council_spending_over_250/1)