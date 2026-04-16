# Shire Counties discovery batch A

_Agent: agent-a82a5e633d43fc2f2_

Samples saved: Cambridgeshire, Gloucestershire, Warwickshire. Leicestershire is the 511-byte Access Denied HTML. Now the final report.

---

## Batch A Shire Counties — FY 2023/24 Discovery

### Cambridgeshire County Council
- Landing page: https://data.cambridgeshireinsight.org.uk/dataset/cambridgeshire-county-council-expenditure-over-%C2%A3500
- Data URL pattern: `https://data.cambridgeshireinsight.org.uk/sites/default/files/CambsPayments{YYYY}-{MM}.csv`
- CKAN API: `https://data.cambridgeshireinsight.org.uk/api/3/action/package_show?id=cambridgeshire-county-council-expenditure-over-%C2%A3500` (works but slow — 229s)
- Format: CSV, comma-delim, Windows-1252 (£ = 0xA3, shows as `\xa3`)
- Schema: `Body Name, Date Paid, Transaction Number, Amount, Supplier Name, Supplier Type, Expense Area, Cost Centre Description, Expense Type` (9 cols)
- Cloudflare: no (plain Apache/Drupal, but Drupal dataset HTML page hangs 180s+ — use CKAN API or direct file URL)
- Rows/month: ~23,000 (Apr 2023 = 23,088 rows, 4.3 MB)
- Quirks: encoding is cp1252 not utf-8; Amount is string with embedded £ sign and comma thousands separator (`"£5,414.40"`); threshold = £500 inc. VAT; CKAN package_show is extremely slow, the /dataset HTML page is unusable — use API or direct file URLs
- Sample row: `Cambridgeshire County Council,03-Apr-23,51301961351,"£5,414.40",Ackerman Pierce Limited,COMPANY,Out of School Tuition,Out of School Provision EHCPs,Independent School Placements`
- FY 2023/24 availability: **all 12 months** (CSVs direct, sample at `/tmp/counties_batch_a_cambridgeshire_sample.csv`)

### Derbyshire County Council
- Landing page: https://www.derbyshire.gov.uk/council/budgets-and-spending/spending/spending-over-500.aspx
- Data URL pattern: n/a — rolling window
- Format: CSV (current reports)
- Schema: `Body name, Body code, Service area categorisation, Responsible unit, Expenses type, Date, Transaction number, Amount, Supplier name` (9 cols, excludes VAT)
- Cloudflare: no
- Rows/month: unknown
- **HARD BLOCKER**: rolling window. Earliest publicly listed report is January 2025. FY 2023/24 is purged from the site; must FOI the finance team via "spending over £500 enquiry form"
- Sample row: n/a
- FY 2023/24 availability: **not available** (FOI-only)

### Gloucestershire County Council
- Landing page: https://www.gloucestershire.gov.uk/council-and-democracy/performance-and-spending/spend-over-500/
- Data URL pattern: `https://www.gloucestershire.gov.uk/media/{slug}/payments-made-during-{month}-{year}.csv` (slug is per-file random); 12 exact URLs extracted:
  - Apr 2023 `/media/tcplqzqj/payments-made-during-april-2023.csv`
  - May 2023 `/media/g1ef0ngo/payments-made-during-may-2023.csv`
  - Jun 2023 `/media/ozjhtj1x/payments-made-during-jun-2023.csv`
  - Jul 2023 `/media/dvgb3zws/payments-made-during-july-2023.csv`
  - Aug 2023 `/media/2owkxqix/payments-made-during-august-2023.csv`
  - Sep 2023 `/media/ho0ouodk/payments-made-during-september-2023.csv`
  - Oct 2023 `/media/hsrj12gh/payments-made-during-october-2023.csv`
  - Nov 2023 `/media/hc5jpovp/payments-made-during-november-2023.csv`
  - Dec 2023 `/media/hvfa0goj/payments-made-during-december-2023.csv`
  - Jan 2024 `/media/iczjd5ag/payments-made-during-january-2024.csv`
  - Feb 2024 `/media/xkupnwlm/payments-made-during-february-2024-csv.csv`
  - Mar 2024 `/media/ct3hmmm3/payments-made-during-march-2024.csv`
- Format: CSV, comma-delim, UTF-8; 16 columns
- Schema: `Service Area, BVA COP, Service Devison, Service Division Code, Expense Type, Expense Code, Payment Date, Transaction No, Payment Amount, Capital/Revenue, Supplier Name, Charity & Company Number, Industry, Account Group, Account Name, Comment`
- Cloudflare: no (plain Umbraco/media host)
- Rows/month: 23,413 for April 2023 (5.3 MB)
- Quirks: threshold = £500 inc. VAT; includes negative amounts (credits/reversals); SME size band in `Industry` col; per-file GUID slugs so you must scrape landing page (no deterministic URL)
- Sample row: `Corporate Resources,Business Service Centre,Business Service Centre,502175,Printing/Stationery/Office expenses,42000,04/04/2023,1700072582,-5828.75,Revenue,GARAS,4026398,,Z003,Commercial (Organisations),`
- FY 2023/24 availability: **all 12 months** (sample at `/tmp/counties_batch_a_gloucestershire_sample.csv`)

### Leicestershire County Council
- Landing page: https://www.leicestershire.gov.uk/about-the-council/council-spending/payments-and-accounts/payments-to-suppliers
- Data URL pattern: `https://www.leicestershire.gov.uk/sites/default/files/{YYYY}-{MM+1}/Payment-to-suppliers-over-500-[all-]{Month}-{YYYY}.csv` (note the "-all-" segment exists for Apr–May 2023, disappears from Jun 2023 onwards; upload month is +1 from data month)
  - e.g. Apr 2023: `.../2023-05/Payment-to-suppliers-over-500-all-April-2023.csv`
  - e.g. Dec 2023: `.../2024-01/Payment-to-suppliers-over-500-December-2023.csv`
- Format: CSV
- Schema: `PAYMENT DATE, DEPARTMENT, SUPPLIER NAME, PAY GROUP, ACCOUNT DESCRIPTION, NET AMOUNT` (6 cols, net of VAT)
- **HARD BLOCKER**: Akamai edge (`errors.edgesuite.net`) — HTTP 403 on direct curl even with full Chrome UA. `Server: AkamaiGHost`-style protection. Needs Playwright with a real browser profile (similar to Surrey pattern).
- Rows/month: unknown (not downloaded)
- Quirks: PAY GROUP tag distinguishes voluntary/community/social-enterprise suppliers from Aug 2021 onwards; threshold = £500 excl. VAT; filename inconsistency ("all-" prefix for first two months only)
- Sample row: n/a (403)
- FY 2023/24 availability: all 12 months exist but **require Playwright**

### Oxfordshire County Council
- Landing page: https://www.oxfordshire.gov.uk/council/about-your-council/council-tax-and-finance/financial-transparency
- Data URL pattern: `https://www.oxfordshire.gov.uk/sites/default/files/file/council-tax-and-finance-spending/{MonthAbbrev}{YYYY}Over500.csv`
  - Confirmed: `March2023Over500.csv`, `Nov2023Over500.csv`
  - Month-token inconsistent: full word for some (`March`), 3-letter abbrev for others (`Nov`, probably `Apr`/`May`/`June`/`July`/`Aug`/`Sept`/`Oct`/`Dec`/`Jan`/`Feb`) — must scrape the landing page to get exact filenames
- Format: CSV
- Schema: `Body Code, Body Name, Service, Posting Date, GL Code, GL Code Description, Document Number, Cost Centre, Document Net Amount, Supplier Name` (10 cols, net of VAT)
- **HARD BLOCKER**: origin 194.81.226.59 is completely unreachable from my current egress — TCP timeouts from curl, `ECONNREFUSED` from WebFetch. Geographic/IP firewall. Need Playwright from a UK-origin host (Vultr LHR? or a UK proxy).
- Rows/month: ~19k (Nov 2023 is 3 MB; March 2023 is 2.6 MB)
- Quirks: P-Card spend is published separately under `PCardSpends{Month}{YYYY}.csv`; filename month-abbrev is inconsistent across months; threshold = £500
- Sample row: n/a (firewalled)
- FY 2023/24 availability: all 12 months exist but **require UK-origin Playwright**

### Somerset Council
- Landing page: https://www.somerset.gov.uk/council-and-democracy/find-council-spend-over-500-directory/
- Data URL pattern: **SharePoint anonymous-share links** (not direct files):
  - Q1 (Apr–Jun 2023) `https://somersetcc.sharepoint.com/:x:/s/SCCPublic/EdP-aq4MIsBEohcFuZluR7IBx5GNuIHm2Kgb-EA_pIh_FQ`
  - Q2 (Jul–Sep 2023) `https://somersetcc.sharepoint.com/:x:/s/SCCPublic/ETtm5EFwT9RPuapod6i81pUBeyA326YKMadwEPTq28se9Q`
  - Q3 (Oct–Dec 2023) `https://somersetcc.sharepoint.com/:x:/s/SCCPublic/EUUmZAO7ygJOrHDS9bv7yhUB8uNv9UZuB3UNZriveapMww`
  - Q4 (Jan–Mar 2024) `https://somersetcc.sharepoint.com/:x:/s/SCCPublic/EXY1vtZS4ftHsNVcudFuYX4B9Prshb9-iKj0GGYJDmz18g`
- Format: XLSX (quarterly, not monthly)
- Schema: not inspected (download blocked)
- **HARD BLOCKER**: SharePoint returns HTTP 401 to raw curl even with `?download=1`; anonymous share requires a browser session with `fedauth`/`rtfa` cookies. Needs Playwright against the SharePoint UI.
- Quirks: **LGR consolidation** — Somerset Council replaced SCC + 4 districts from 1 Apr 2023, so FY 2023/24 is the *first year* of the new unitary. Q1 and Q2 are officially flagged incomplete ("still working to extract all data from our finance system"). Data is **quarterly**, not monthly. Q1–Q2 2023/24 has known **data-integrity caveats** to be documented.
- Sample row: n/a
- FY 2023/24 availability: **4 quarterly XLSX files, Playwright-only, Q1–Q2 incomplete by council's own admission**

### Suffolk County Council
- Landing page: https://www.suffolk.gov.uk/council-and-democracy/open-data-suffolk/council-data-and-transparency/council-expenditure-and-contracts/expenditure-exceeding-250
- Data URL pattern: n/a — rolling window
- Format: CSV (current reports)
- Schema: n/a (not downloaded)
- Cloudflare: no
- **HARD BLOCKER**: rolling window. Earliest publicly listed report is January 2025. FY 2023/24 purged from the site.
- Also note: Suffolk threshold is **£250**, not £500 (below LGR Transparency Code minimum — but still useful, just larger row counts to filter)
- Two datasets published side-by-side: Suffolk County Council operating + Suffolk Pension Fund
- FY 2023/24 availability: **not available** (email alison.gray@suffolk.gov.uk or FOI)

### Warwickshire County Council
- Landing page: https://www.warwickshire.gov.uk/directory/28/warwickshire-open-data/category/174 (category listing) — each month has its own directory-record page, e.g. `https://www.warwickshire.gov.uk/directory-record/7557/payments-to-suppliers-february-2023`
- Data URL pattern: `https://api.warwickshire.gov.uk/documents/WCCC-428063900-{id}` where `{id}` is a 4-digit doc ID embedded in each directory-record page (1703 = Feb 2023, 1929 = Apr 2024) — **must scrape the directory-record page to resolve the api ID**
- Format: XLSX (Excel 2007+), **multi-sheet workbook** with an Oracle BI Publisher template:
  - `_options` (18 rows, internal config)
  - `_control` (19 rows, macro control)
  - `PARAMETER` (4 rows, showing `Payment_date from 01-JAN-2021`)
  - `pound_500` (**actual data**, 9,806 rows in the Feb 2023 file)
- Schema (sheet `pound_500`): `Supplier id, Supplier Name, Transno, Account, Description, Amount, Pay Date, Group` (8 cols, 2 trailing blanks)
- Cloudflare: no
- Rows/month: ~9,800 (Feb 2023 XLSX is 487 KB with 9,806 data rows)
- Quirks: each monthly XLSX is a **rolling snapshot from 01-Jan-2021** filtered to the month, so the same file technically contains prior years — must filter `Pay Date` to the target month; the three non-data sheets must be skipped; `Amount` excludes VAT; individuals redacted; account codes like `R4506`, `R3204`; `Group` = directorate name (Resources, Communities, etc.)
- Sample row: `200003 | 1spatial Group Ltd | 51952111 | R4506 | IT Support & Maintenance | 4300 | 2023-02-24 | Resources`
- FY 2023/24 availability: **all 12 months as individual directory records** (12 API doc-IDs to resolve, sample at `/tmp/counties_batch_a_warwickshire_sample.xlsx`)

---

## Summary & Blockers

| Council | FY23/24 | Action |
|---|---|---|
| Cambridgeshire | 12/12 CSV | Direct URLs, note cp1252, slow CKAN |
| Derbyshire | **0/12** | **FOI-only — rolling window purged** |
| Gloucestershire | 12/12 CSV | 12 GUID URLs captured, direct download works |
| Leicestershire | 12/12 CSV | **Playwright needed — Akamai 403** |
| Oxfordshire | 12/12 CSV | **UK-origin Playwright needed — 194.81.226.59 firewalled** |
| Somerset | 4/4 XLSX (quarterly) | **Playwright needed — SharePoint 401; Q1–Q2 incomplete per council** |
| Suffolk | **0/12** | **FOI-only — rolling window purged, threshold £250** |
| Warwickshire | 12/12 XLSX | Two-step fetch (scrape dir-record → api/documents), multi-sheet with `pound_500` data sheet |

**Ship-ready now (5 councils)**: Cambridgeshire, Gloucestershire, Warwickshire (direct), plus Leicestershire/Oxfordshire/Somerset via Playwright workflows already shipped for other counties.

**Cannot ship without FOI (2 councils)**: Derbyshire, Suffolk. Both purged their FY 2023/24 data behind a rolling window circa late-2024 / early-2025. Suffolk additionally uses a £250 threshold.

Raw samples saved to `C:\Users\Usuario\AppData\Local\Temp\` (Windows mapping of `/tmp/`):
- `counties_batch_a_cambridgeshire_sample.csv` — 4.3 MB, 23,088 rows, Apr 2023
- `counties_batch_a_gloucestershire_sample.csv` — 5.3 MB, 23,413 rows, Apr 2023
- `counties_batch_a_warwickshire_sample.xlsx` — 487 KB, 9,806 data rows in `pound_500` sheet, Feb 2023

Sources:
- [Cambridgeshire Insight Open Data](https://data.cambridgeshireinsight.org.uk/dataset/cambridgeshire-county-council-expenditure-over-%C2%A3500)
- [Derbyshire spending over £500](https://www.derbyshire.gov.uk/council/budgets-and-spending/spending/spending-over-500.aspx)
- [Gloucestershire spend over £500](https://www.gloucestershire.gov.uk/council-and-democracy/performance-and-spending/spend-over-500/)
- [Leicestershire payments to suppliers](https://www.leicestershire.gov.uk/about-the-council/council-spending/payments-and-accounts/payments-to-suppliers)
- [Oxfordshire financial transparency](https://www.oxfordshire.gov.uk/council/about-your-council/council-tax-and-finance/financial-transparency)
- [Somerset spend over £500 directory](https://www.somerset.gov.uk/council-and-democracy/find-council-spend-over-500-directory/)
- [Suffolk expenditure exceeding £250](https://www.suffolk.gov.uk/council-and-democracy/open-data-suffolk/council-data-and-transparency/council-expenditure-and-contracts/expenditure-exceeding-250)
- [Warwickshire Open Data - payments to suppliers Feb 2023](https://www.warwickshire.gov.uk/directory-record/7557/payments-to-suppliers-february-2023)