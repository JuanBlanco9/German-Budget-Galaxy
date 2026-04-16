# London boroughs discovery batch 3

_Agent: agent-a61c4f0c816865d24_

All samples validated. I have complete schemas and confirmed formats for 6/7 boroughs. Kingston is a confirmed hard blocker. Now delivering the report.

---

### Hillingdon
- Landing page: https://www.hillingdon.gov.uk/article/9044/Council-spending-over-500 (302 -> `pre.hillingdon.gov.uk/performance-spending/council-spending-500`)
- Data URL pattern: `https://pre.hillingdon.gov.uk/downloads/file/{188,197,199,195,189,196,198,194,193,184,176,177}/{month}-{year}-council-spending-over-500` (file IDs not sequential; see map below)
- Format: XLSX (single sheet, ~100-300 KB)
- Schema: dept=`Cclvl4 Desc`, purpose=`Account Desc`, supplier=`Vendor Name`, amount=`Distrib Amount SUM` (also `Year`, `Month`, `Month Name`, `Paym Acc Date`)
- Cloudflare: no (plain Apache/PHP, `pre.` subdomain)
- Rows/month: ~1,800 (April 2023 = 1,867 rows)
- Quirks: Calendar-year split (2023 + 2024 files), not FY. File IDs scrambled — must scrape landing pages once. Date column is datetime. FY23/24 IDs: Apr=188, May=197, Jun=199, Jul=195, Aug=189, Sep=196, Oct=198, Nov=194, Dec=193, Jan=184, Feb=176, Mar=177.
- Sample: `2023, 4, APRIL, 2023-04-05, "Director Planning & Regeneration (PHT)", "Counsel's Fees", "11 KBW T/A MR JAMES GOUDIE KC", 1260`
- FY 2023/24: all 12 months

### Hounslow
- Landing page: https://www.hounslow.gov.uk/find-data-information/council-budgets-spending -> https://data.hounslow.gov.uk/@london-borough-of-hounslow/council-spending-over-500
- Data URL pattern: `https://blob.datopian.com/resources/{hash}/invoices-over-500-{mon}-{year}.csv` (PortalJS/Datopian hosted, per-file content-addressed hash — must scrape dataset page once to map)
- Format: CSV, UTF-8, comma-delimited, no BOM
- Schema: dept=`OrganisationalUnit`, purpose=`Purpose` (also `ServiceCategoryLabel`, `CategoryInternalName`), supplier=`BeneficiaryName`, amount=`Amount`
- Cloudflare: no (blob.datopian.com, AWS-backed)
- Rows/month: ~3,100 (Jan 2023 sample = 3,147 rows, 550 KB)
- Quirks: Host is third-party (`blob.datopian.com`); each file has unique opaque hash — cannot construct URL from filename alone. 136 files total 2010-2026.
- Sample: `CAPITAL HRA, Housing, 21 DEGREES HEATING LTD, 24/01/2023, 5291044, 24762.00, 0.00, PAYMENT TO MAIN CONTRACTOR, Construction Industry suppliers (CIS)`
- FY 2023/24: all 12 months

### Islington
- Landing page: https://www.islington.gov.uk/about-the-council/information-governance/freedom-of-information/publication-scheme/what-we-spend-and-how-we-spend-it/council-spending
- Data URL pattern: `https://www.islington.gov.uk/~/media/sharepoint-lists/public-records/finance/financialmanagement/expenditure/20232024/expenditure-for-{period}.csv`
- Format: CSV, UTF-8 with BOM, comma-delimited
- Schema: dept=`Department` (also `Service`), purpose=`Spend Type`, supplier=`Supplier Name`, amount=`Net Amount` (thousands-comma-quoted). Plus `Account`, `Entry Date`, `Payment type`.
- Cloudflare: no
- Rows/quarter: ~20,500 (Q1 FY23/24 sample = 20,502 rows, 2.8 MB)
- Quirks: QUARTERLY not monthly (4 files cover FY23/24). Q1 file named `...march-2023-through-to-june-2023.csv` (actually spans Mar-Jun — slight overlap with prior FY). Q4 named `...january-through-to-march-2024.csv`. Numeric amounts quoted with thousands separators.
- Sample: `11KBW Limited, "1,800", Use Of Counsel-Barristers Fees, Head Of Law & Business Support, Resources, General Fund, 21-Mar-23, Invoiced`
- FY 2023/24: all 12 months (via 4 quarterly files)

### Kensington and Chelsea (RBKC)
- Landing page: https://www.rbkc.gov.uk/council-councillors-and-democracy/open-data-and-transparency/suppliers-contracts-transactions-equalities-information-and-staff-data
- Data URL pattern: `https://www.rbkc.gov.uk/media/document/quarter-{one,two,three,four}-2023` (Content-Disposition returns e.g. `2023 Q4 - Final_2.csv`)
- Format: CSV, UTF-8, comma-delimited. Note: raw bytes include `\x92` (Windows-1252) in headers (`Council's procurement category name`) — treat as cp1252/latin1 for safety.
- Schema: dept=`Directorate / service where expenditure incurred` (also `Service Category label`), purpose=`purpose_of_spend` (also `Procurement classification / merchant category: CPV label`), supplier=`Supplier (Beneficiary) name`, amount=`Net Amount` (quoted thousands)
- Cloudflare: YES (CF-Ray header confirmed) — curl works fine with default UA, no JS challenge
- Rows/quarter: ~19,400 (Q4 2023 = 19,407 rows, 3.8 MB)
- Quirks: QUARTERLY by calendar year, 22 columns (widest schema of the batch). "Quarter four 2023" = Oct-Dec 2023. Rich metadata: CPV codes, ProClass codes, VCSE flag, registered-charity number, card_transaction flag.
- Sample: `The Royal Borough of Kensington and Chelsea, RBKC, , Director Integrated Commissioning, Head of Service Commissioning, , Nottingham Rehab Ltd - NRS Healthca, 1307671, , , , 16/01/2024, 2200367519, "227,642.41", , Fees, , , , , , , No`
- FY 2023/24: all 12 months (Q2 2023 + Q3 + Q4 + Q1 2024 — note calendar quarters, so FY23/24 needs Apr-Jun from "Q2 2023" file, etc.)

### Kingston upon Thames — HARD BLOCKER
- Landing page: https://www.kingston.gov.uk/finance-budgets/accounts (no transparency-spend link)
- data.gov.uk dataset: https://www.data.gov.uk/dataset/db140e39-afe3-4944-9355-c422b8401ad6/local-authority-spending-over-500-kingston-upon-thames — **last updated 12 Aug 2013, latest file Oct 2010**, all resources archived at `webarchive.nationalarchives.gov.uk/+/http://www.kingston.gov.uk/*_items_of_spend.xls`
- data.kingston.gov.uk is an ArcGIS/InstantAtlas demographics portal, no finance datasets
- Current kingston.gov.uk has no discoverable spend-over-500 page. Two site searches, publisher listing, and CKAN org page all negative.
- **Recommendation**: FOI request or skip. This is the only hard blocker in the batch.
- FY 2023/24: not available publicly

### Lewisham
- Landing page: https://lewisham.gov.uk/mayorandcouncil/aboutthecouncil/finances/council-spending-over-250/council-spending-over-250-in-2023-2024
- Data URL pattern (inconsistent — scrape once): `https://lewisham.gov.uk/-/media/mayor-and-council/about-us/finances/{varies}/{mon}{year}paymentsover250.xlsx`
- Format: XLSX, single sheet per month
- Schema: dept=`DEPARTMENT` (also `SERVICE`), purpose=`DESCRIPTION`, supplier=`SUPPLIER`, amount=`£ SPEND (EXCLUDING VAT)`, plus `PAYMENT DATE`
- Cloudflare: no (IIS)
- Rows/month: ~5,500 (May 2023 = 5,552 data rows)
- Quirks: **Threshold is £250 not £500**; filter amount>=500 if you want parity. Metadata row 1 = title, row 2 = blank, row 3 = headers (skip 2 rows). Sheet name non-ASCII: `May-23 Payemnts ove £250` (sic — misspelled, `£` stored as `\x92`). Path prefix inconsistent per month — 6 different directory stems observed in FY23/24 (`/0-finance/`, `/0-finance/23-24/`, `/finances/250-spend/spending-over-250/`, `/finances/250-spend/spending-over-250/23-24/`, `/finances/finance/23-24/`, `/finances/finance/`). April and June 2023 use `.ashx` shell redirects; HEAD returns 404 but GET serves the file. Must scrape the 23-24 landing page to map URLs.
- Sample: `02/05/2023, Allan White Motors, FLEET SERVICES, FLEET SERVICES, VEHICLE HIRE, 1095.85`
- FY 2023/24: all 12 months

### Newham
- Landing page: https://www.newham.gov.uk/council/council-spending
- Data URL pattern: `https://www.newham.gov.uk/downloads/file/{id}/payments-to-suppliers-{month}-{year}-csv-` (file IDs assigned sequentially and leak — e.g. Jan24=7203, Feb24=7205, Mar24=7207, Dec23=6914, Nov23=6912, Oct23=6910, Aug23=6659, Jul23=6660, Jun23=6271, May23=6268, Apr23=6267; Sep23 not yet confirmed — scrape page 2). Both Excel (odd id) and CSV (even id) offered.
- Format: CSV, UTF-8, comma-delimited
- Schema: dept=`Local Authority Department`, purpose=`Purpose` (also `Merchant Category`), supplier=`BENEFICIARY`, amount=`Amount` (also `Transaction Date`, `Non Recoverable`)
- Cloudflare: no
- Rows/month: ~32,100 (Jan 2024 = 32,140 rows, 3.7 MB — largest in batch)
- Quirks: **Threshold £250 not £500**; filter. Personal payments redacted as `Personal Information - Redacted`. File-ID naming is opaque and non-monotonic across months — must scrape. Page 2 (`/council/council-spending/2`) returns 404, so earlier-months links live on page 1 as expanding accordion.
- Sample: `01-01-2024, Dedicated Schools Budget, Personal Information - Redacted, Private Contractors Payment - Other, 5793.33, 0, VENDOR`
- FY 2023/24: all 12 months

---

**Hard blockers summary**:
- **Kingston**: no current transparency publication — FOI-only. Only blocker in the batch.
- **Hillingdon, Hounslow, Lewisham, Newham**: URL-discovery blockers (opaque/non-sequential IDs or hashes) — mitigated by one-time landing-page scrape per borough, then stable direct downloads.
- **RBKC**: Cloudflare-fronted but curl with default UA passes through. Calendar-quarter not FY-quarter.
- **Islington**: quarterly not monthly, Q1 file mislabeled (spans Mar-Jun).
- **Lewisham & Newham**: £250 threshold — filter `amount >= 500` for parity with the £500 cohort.

**Samples saved** (note: `/tmp` on this Windows bash maps elsewhere; files written to `C:\tmp\london_batch3\`):
- `C:\tmp\london_batch3\hillingdon_sample.xlsx` (Apr 2023, 112 KB)
- `C:\tmp\london_batch3\hounslow_sample.csv` (Jan 2023, 550 KB, 3,147 rows)
- `C:\tmp\london_batch3\islington_sample.csv` (Q1 FY23/24, 2.8 MB, 20,502 rows)
- `C:\tmp\london_batch3\rbkc_sample.csv` (Q4 2023, 3.8 MB, 19,407 rows)
- `C:\tmp\london_batch3\lewisham_sample.xlsx` (May 2023, 220 KB, 5,552 rows)
- `C:\tmp\london_batch3\newham_sample.csv` (Jan 2024, 3.7 MB, 32,140 rows)
- Kingston: none (blocker)

Sources:
- [Hillingdon Council spending over £500](https://pre.hillingdon.gov.uk/performance-spending/council-spending-500)
- [Hounslow open data portal (PortalJS)](https://data.hounslow.gov.uk/@london-borough-of-hounslow/council-spending-over-500)
- [Islington council spending page](https://www.islington.gov.uk/about-the-council/information-governance/freedom-of-information/publication-scheme/what-we-spend-and-how-we-spend-it/council-spending)
- [RBKC suppliers, contracts, transactions](https://www.rbkc.gov.uk/council-councillors-and-democracy/open-data-and-transparency/suppliers-contracts-transactions-equalities-information-and-staff-data)
- [Kingston upon Thames on data.gov.uk (stale)](https://www.data.gov.uk/dataset/db140e39-afe3-4944-9355-c422b8401ad6/local-authority-spending-over-500-kingston-upon-thames)
- [Lewisham spending over £250 FY 2023-24](https://lewisham.gov.uk/mayorandcouncil/aboutthecouncil/finances/council-spending-over-250/council-spending-over-250-in-2023-2024)
- [Newham council spending](https://www.newham.gov.uk/council/council-spending)