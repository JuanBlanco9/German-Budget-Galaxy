# Discovery Surrey CC

_Agent: agent-a0917c2e3e39ce43c_

I have enough. Surrey publishes at the £250 threshold (which includes £500+ as a subset). The naming pattern is "ERP Spend Q[N] 2023-2024.csv". Q3 and Q4 file IDs are confirmed. Q1 and Q2 IDs are not exposed in search snippets, and the dataset listing page is blocked behind a 403/JS wall. Let me write up the deliverable.

Surrey County Council — Spend Data, FY 2023/24 — URL Discovery Report

1. Base URL of transparency portal
- Dataset landing page: https://www.surreyi.gov.uk/dataset/council-spending-e6rgn
- Host: Surrey-i (www.surreyi.gov.uk), Surrey's local information & open data portal
- Threshold: Surrey publishes ALL expenditure items over £250 (stricter than the £500 Local Government Transparency Code 2015 minimum), so £500+ is a subset of these files
- Companion datasets: Purchase Card spend (e6rgn sibling, ID "2n563"), Active Contracts (ID "24jlz")

2. FY 2023/24 download URLs (quarterly CSVs, ERP/SAP system)
Confirmed via search index, format = CSV (UTF-8):
- Q3 (Oct-Dec 2023): https://www.surreyi.gov.uk/download/e6rgn/ll8/ERP%20Spend%20Q3%202023-2024.csv  (~6.68 MB)
  Note: ll8 ID variant — surfaced for both Q3 23-24 and Q2 24-25 in different snippets; needs visual verification on the live dataset page
- Q4 (Jan-Mar 2024): https://www.surreyi.gov.uk/download/e6rgn/s2j/ERP%20Spend%20Q4%202023-2024.csv  (~7.84 MB)
- Q1 (Apr-Jun 2023): URL exists but the 3-char file token is NOT exposed in any indexed result. Pattern: https://www.surreyi.gov.uk/download/e6rgn/{XXX}/ERP%20Spend%20Q1%202023-2024.csv (or possibly "SAP Spend Data Q1 2023-2024.csv" — 23/24 is the SAP→ERP migration window)
- Q2 (Jul-Sep 2023): Same situation. Pattern: https://www.surreyi.gov.uk/download/e6rgn/{XXX}/ERP%20Spend%20Q2%202023-2024.csv

3. Column schema (per LGA Transparency Code; consistent across surrey-i ERP/SAP files)
- Date of payment
- Department/Service area incurring spend
- Beneficiary (supplier) name
- Summary of purpose of spend
- Gross amount (£)
- Merchant category / expense category code
- (Often also: VAT registration number, transaction ID)

4. Sample row: Could not obtain — every download attempt and dataset-page fetch returned HTTP 403 (Surrey-i blocks non-browser User-Agents and WebFetch).

5. Complications
- Surrey-i hard-blocks curl and WebFetch with 403 (likely Cloudflare/UA filtering); manual browser visit required to read the 3-char tokens for Q1/Q2 23-24
- 2023/24 spans the SAP→ERP migration (older files: "SAP Spend Data Qx", newer: "ERP Spend Qx") — Q1/Q2 may use either prefix
- Threshold is £250 not £500 — must filter client-side
- 43 files on the dataset; ID tokens are random 3-char strings, not predictable
- Purchase card spend is a SEPARATE dataset (ID 2n563) and excluded from ERP/SAP files

Sources:
- [Council Spending | Surrey-i](https://www.surreyi.gov.uk/dataset/council-spending-e6rgn)
- [Local government transparency code 2015](https://www.gov.uk/government/publications/local-government-transparency-code-2015/local-government-transparency-code-2015)