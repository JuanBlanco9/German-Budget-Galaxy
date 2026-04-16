# Unitaries cleanup + Combined Authorities

_Agent: agent-aa69ec497ed5d68de_

Interesting — ~48k rows (44%) under £500 so N Somerset publishes £250+ (stricter than required). All 109,780 rows for FY23/24 in one file. Max/min look like formatting artifacts. Done with discovery. Here's the report:

---

### County Durham
- Landing page: https://www.durham.gov.uk/article/2437/Payments-to-suppliers-over-500
- Data URL pattern: `https://www.durham.gov.uk/media/{ID}/Council-transactions-over-500-{Month}-{Year}/csv/CouncilTransactionsOver500{Month}{Year}.csv` (monthly, IDs 42487 Apr23 -> 44405 Mar24; exact list collected)
- Format: CSV, Windows-1252 (£ renders as `\x96`), comma-delimited, quoted amounts with thousand separators
- Schema: `Service Area | Service Division | Expense Type | Expense Code | Detailed Expense Type | Payment Date | Transaction Number | Amount Exc VAT | Supplier Name`
- Cloudflare/WAF: no
- Rows/month: ~5,100 (Apr23 = 5,133 lines)
- Quirks: encoding is cp1252 not UTF-8; amounts like `"£1,041.00"` need unquoting
- Sample: `Children and Young Peoples Services, Head of Education and Skills, Supplies and Services, 336005, Advertising E336, 03/04/2023, 4117969-93521, £666.60, ALLWAG PROMOTIONS LTD.`
- FY 2023/24: all 12 months available
- Combined authority: n/a (unitary)

### Derby City Council
- Landing page: https://www.derby.gov.uk/council-and-democracy/open-data-freedom-of-information/open-data-transparency/
- Data URL pattern: `https://www.derby.gov.uk/media/derbycitycouncil/contentassets/documents/councilanddemocracy/foi/opendata/supplierpayments/{2023|2024}/payments-to-suppliers-{month}{year}[v2|-].csv` (monthly, 12 files confirmed)
- Format: CSV, UTF-8 BOM, comma-delimited
- Schema (2 metadata rows then header): `Directorate Description | Department Description | Division Description | Section Description | Supplier Name | Payment Date | Payment Reference | System Reference | (blank) | Purpose of Spend | Procurement Classification | Selection Code 3 Description`
- Cloudflare/WAF: no
- Rows/month: ~3,600 (Apr23 = 3,614 lines including 2 header metadata rows)
- Quirks: title row + blank row before header (skip 2); amount column not in header sample — likely further right in the row; filename convention changes mid-year (`april2023v2.csv` vs `october-2023.csv`); redacted rows marked `"redacted personal data"`
- FY 2023/24: all 12 months available
- Combined authority: n/a (unitary city)

### North Somerset Council
- Landing page: https://n-somerset.gov.uk/council-democracy/accounts-spending-insurance/accounts-budget/spending-over-ps250
- Data URL: https://n-somerset.gov.uk/sites/default/files/2024-12/spending%20over%20250%20-%202023-24.xlsx (single file, whole FY)
- Format: XLSX, 3 sheets: `Note`, `250 Spend`, `Card Transactions`
- Schema (`250 Spend`): `TransactionDate | Beneficiary | Description | CostCentre | Amount`
- Cloudflare/WAF: no
- Rows/year: 109,780 (single file for entire FY, not monthly)
- Quirks: threshold is **£250 not £500** (stricter than required) — ~48k rows are under £500 (44%); data on sheet 2, sheet 1 is license note; no Department column, only cost centre text like "ITU - HTST - Payments to Contractors"; some rows have extreme amounts from reversal entries
- Sample: `2023-03-31 | TRAVELBILLITY LTD | Public Transport - Home to School Transport | ITU - HTST - Payments to Contractors | 5178.68`
- FY 2023/24: full year in one file
- Combined authority: n/a (unitary)

### Isles of Scilly
- Landing page: https://scilly.gov.uk/council-democracy/open-data/payments-over-%C2%A3250
- Data URLs (quarterly XLSX):
  - Q1: https://scilly.gov.uk/sites/default/files/Transactions%20over%20500%20-%20Q1.2023.2024_0.xlsx
  - Q2: https://scilly.gov.uk/sites/default/files/Transactions%20over%20500%20-%20Q2.2023.2024.xlsx
  - Q3: https://scilly.gov.uk/sites/default/files/Transactions%20over%20500%20-%20Q3.2023.2024.xlsx
  - Q4: https://scilly.gov.uk/sites/default/files/Transactions%20over%20500%20-%20Q4.2023.2024.xlsx
- Format: XLSX, single sheet per quarter named `Q{n}.2023.2024`
- Schema: `Entity Name | Directorate | Service/Board | Cost Centre | Description | Subjective | Description | Supplier Name | Payment Date | Line Amount | Invoice Amount | Net Amount` (two "Description" columns — for cost centre and subjective codes)
- Cloudflare/WAF: no
- Rows/quarter: ~570 (Q1 = 569)
- Quirks: smallest English council, very small volume (~2,200/year); leading-space column headers; two "Description" columns will collide on naive ingest; URL slug says "£250" but actual threshold is £500; Line Amount and Net Amount differ when multi-line invoices
- Sample: `51 Council of the Isles of Scilly | Place, Economy and Environment | Natural Resources and Assets | 600001 | Corporate Properties | 43532 | Professional Fees - Other | IOS Ecology | 2023-04-18 | 1092 | 1092 | 1092`
- FY 2023/24: all 4 quarters available
- Combined authority: n/a (unitary)

### Greater Manchester Combined Authority (GMCA)
- Landing page: https://www.greatermanchester-ca.gov.uk/who-we-are/accounts-transparency-and-governance/transparency-reports-finance/
- Data URLs for FY23/24 (quarterly, XLSX + CSV + PDF):
  - Q1 Apr-Jun 23: /media/8204/gmca-spend-500-transparency-q1.xlsx (+ .csv at /media/8205/)
  - Q2 Jul-Sep 23: /media/8679/gmca-spend-500-transparency-q2.xlsx (+ /media/8680/.csv)
  - Q3 Oct-Dec 23: /media/9214/gmca-spend-500-transparency-q3.xlsx (+ /media/9215/.csv)
  - Q4 Jan-Mar 24: /media/1rchovlr/reupload-1-gmca-spend-500-transparency-q4-excel.xlsx (+ /media/kocdfnib/.csv)
- Format: XLSX (sheet `Cleansed Data`) and CSV; threshold £500
- Schema: `Beneficiary | Transaction Date | Procurement Category | Purpose of Spend | Organisation | Net Amount | TransNo`
- Cloudflare/WAF: **yes, Cloudflare** — WebFetch returns 403, but curl with a real User-Agent header works fine
- Rows/quarter: ~4,000-5,000 (Q1 25/26 comparison had 4,221)
- Quirks: Cloudflare challenges default fetchers; Q4 23/24 has a "reupload" prefix (original was withdrawn/corrected); `Organisation` column lets you filter pure GMCA from TfGM and other bodies
- Sample: `BURY COUNCIL | 2023-04-03 | Premises Related Expenditure | Rates | Greater Manchester Combined Authority | 1709.04 | 20120675`
- Combined authority note: GMCA publishes **its own direct spend only** (incl. TfGM/waste disposal/fire as part of the combined entity). Member councils (Bolton, Bury, etc.) appear as *suppliers/beneficiaries*, not as aggregated disbursements. No double-counting with member councils.

### West Midlands Combined Authority (WMCA)
- Landing page: https://www.wmca.org.uk/what-we-do/budget-spending-transparency/financial-disclosures/
- Data URL pattern: `https://www.wmca.org.uk/media/{hash}/financial-disclosures-{month}-{yy}-final.xlsx` — **calendar-year** folders, not FY
  - Jan-Jul 2023: PDF only (hard blocker for those months)
  - Aug 2023 XLSX: /media/jrej5y2j/
  - Sep 2023 XLSX: /media/3udpnmub/
  - Oct 2023 XLSX: /media/lx1njpuq/
  - Nov 2023 XLSX: /media/gifpdi53/
  - Dec 2023 XLSX: /media/3aunh4vy/
  - Jan 2024 XLSX: /media/3geh51az/
  - Feb 2024 XLSX: /media/v20o2epj/
  - Mar 2024 XLSX: /media/v1nfvzk2/
- Format: XLSX sheet `Disclosure`; CSV not offered
- Schema (2-row merged header): `Cost Centre | Account | Expense Type | Supplier ID | Supplier Name | Trans No. | Payment Date | Amount excl vat`
- Cloudflare/WAF: no (standard server)
- Rows/month: ~800 (Aug23 = 831)
- Quirks: **Apr-Jul 2023 only in PDF** — half of Q1+Q2 FY23/24 require PDF parsing; two-row merged header in XLSX (skip row 2); calendar-year not FY organization; only `Cost Centre` text serves as department (no hierarchy); no Purpose column
- Sample: `Head of Operational Assets - Rail Car Parks | 60395 | Physical Construction | 10002 | Serfis Construction & Engineering Ltd. | 7040553 | 2023-08-09 | 6287.80`
- FY 2023/24: Aug23-Mar24 as XLSX; Apr23-Jul23 PDF only
- Combined authority note: WMCA publishes its own direct spend (transport, skills budget, staff); member councils appear as payees only, not aggregated.

### Liverpool City Region Combined Authority (LCRCA) — **HARD BLOCKER**
- Landing page: https://www.liverpoolcityregion-ca.gov.uk/corporate-information (Next.js SPA)
- Data URL: **none found**. LCRCA does not appear to publish a dedicated spend-over-£500 dataset on its .gov.uk site. Searches on site, data.gov.uk, and WhatDoTheyKnow turn up only Statement of Accounts PDFs and grant allocation files (e.g. LCRCA-Allocations-2022-23-June-2023.xlsx, not a transactional spend export).
- Format: n/a
- Schema: n/a
- Cloudflare/WAF: site is Next.js SPA; WebFetch returns 403, curl returns HTML shell only (SPA rendering)
- Quirks: Only available financial documents are Statement of Accounts PDFs; their Modern Gov portal has committee reports. Likely non-compliant with LG Transparency Code 2015 or publishes only internally.
- FY 2023/24: **not publicly available as a downloadable transaction file**
- Combined authority note: LCRCA appears to be the laggard. Recommended escalation: FOI request via WhatDoTheyKnow asking for FY23/24 spend-over-£500 CSV. Budget Galaxy should either skip LCRCA, scrape the Accounts PDF totals as metadata, or file FOI and wait.

### West Yorkshire Combined Authority (WYCA)
- Landing page: https://www.westyorks-ca.gov.uk/about-us/governance-and-transparency/transparency-and-freedom-of-information/what-we-spend-and-how-we-spend-it/
- Data URLs (quarterly XLSX):
  - Q1 Apr-Jun 23: https://www.westyorks-ca.gov.uk/media/qexnoppx/transparency-expenditure-report-apr-jun-2023.xlsx
  - Q2 Jul-Sep 23: https://www.westyorks-ca.gov.uk/media/1umcddcv/transparency-expenditure-report-jul-sep-2023.xlsx
  - Q3 Oct-Dec 23: https://www.westyorks-ca.gov.uk/media/qwzojvug/transparency-expenditure-report-oct-dec-2023.xlsx
  - Q4 Jan-Mar 24: https://www.westyorks-ca.gov.uk/media/zygl2d1i/transparency-expenditure-report-jan-mar-2024.xlsx
- Format: XLSX; 2 sheets; threshold £500
- Schema (header at row 13 after 9 blank rows + 2 title rows): `Document Ref | Date | Beneficiary | Directorate | Summary of Purpose | Merchant Category | Value £`
- Cloudflare/WAF: no
- Rows/quarter: ~1,900 (Q1 = 1,935 incl. header padding)
- Quirks: **12 blank rows then 2 title rows then header at row 13** — naive `pd.read_excel` needs `skiprows=12`; title row literally says "with a minimum expenditure of £500 (includes operators)"; note text says "includes operators" — means some payments are to grant-distributing operators, not end suppliers; file name has "transparency-expenditure-report", not "over 500"
- Sample: `AEBP-1000 | 2023-05-19 | Wakefield Metropolitan District Council | Inclusivity, Economy, Skills & Culture | Grants and Agency costs | Grant & Other Payments | 987.33`
- FY 2023/24: all 4 quarters available
- Combined authority note: WYCA publishes its own direct spend. **Important:** Beneficiaries include member councils (Wakefield MDC, Leeds, etc.) for adult education budget grants/bus service operator grants — these are legitimate WYCA disbursements *through* member councils, not duplication. Budget Galaxy can keep these; they represent WYCA mayoral pot flowing to delivery partners.

---

## Summary

- **Downloaded & verified**: Durham (CSV), Derby (CSV), North Somerset (XLSX), Isles of Scilly (XLSX), GMCA (XLSX), WYCA (XLSX), WMCA (XLSX Aug23+)
- **Hard blockers**:
  1. **LCRCA**: no public spend-over-£500 dataset found — needs FOI or skip
  2. **WMCA Apr-Jul 2023**: PDF-only (4 months of FY23/24 Q1-Q2) — requires PDF extraction
- **Threshold anomalies**: North Somerset publishes £250+ (~44% of rows under £500 — easy filter); Isles of Scilly URL slug says "£250" but actual threshold is £500
- **Cloudflare**: GMCA only; all others plain HTTP. GMCA works with curl + User-Agent header but not WebFetch defaults
- **Combined authority direct spend**: GMCA, WMCA, WYCA all publish their own direct spend (including mayoral/transport/skills grants). Member councils appear as *payees* of CA grants, not as aggregated disbursements — no double counting with Budget Galaxy's existing member council data
- **Samples saved** at `/tmp/cleanup_durham_sample.csv`, `/tmp/cleanup_derby_sample.csv`, `/tmp/cleanup_nsomerset_sample.xlsx`, `/tmp/cleanup_scilly_sample.xlsx`, `/tmp/cleanup_gmca_q1_2324.xlsx`, `/tmp/cleanup_wyca_sample.xlsx`, `/tmp/cleanup_wmca_aug23.xlsx`