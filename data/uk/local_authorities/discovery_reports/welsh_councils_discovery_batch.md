# Welsh councils discovery batch

_Agent: agent-a0f28b44ffff9d9bf_

I have sufficient data. The Cardiff dataset definitely appears to not exist as a downloadable file — the 2019 FOI response said they were "reviewing" publication. Let me finalize the report.

Note on the earlier CSV sample: the file at the Vale of Glamorgan URL is actually tab-delimited despite the .csv extension. The content includes "Rhondda Cynon Taf County Borough Council" as a *supplier* (a government body paying another government body), confirming this IS Vale of Glamorgan's data.

---

# Welsh Councils Transparency Data Discovery — FY 2023/24

**CRITICAL CONTEXT**: Welsh councils are NOT bound by the England-only Local Government Transparency Code 2015. Publication is voluntary under Welsh Government open-data guidance, leading to highly inconsistent coverage. No central equivalent of MHCLG exists; `opendata.wales` (Data Cymru) is a thin aggregator and does NOT host payment-level data for these 8 councils. Only 2 of 8 councils publish machine-readable supplier-payment data at the granularity Budget Galaxy needs.

### Cardiff Council
- Landing page: https://foi.cardiff.gov.uk/eng/Pages/OpenData_All.aspx
- Data URL pattern: **NONE** — not published as machine-readable
- Format: N/A
- Schema: N/A
- Bilingual: N/A
- Cloudflare/WAF: yes (site regularly 403s WebFetch; cardiff.gov.uk and foi.cardiff.gov.uk are protected)
- Rows/month: N/A
- Quirks: A 2019 FOI (WhatDoTheyKnow) recorded Cardiff saying publication of spend >£500 was "under review". As of 2026 there is still no downloadable supplier-level payments dataset on the Cardiff Council Open Data portal. Cardiff has datasets (business rates, Council Tax bands) but NOT payments.
- FY 2023/24 availability: **not available** — HARD BLOCKER, likely requires FOI request

### Swansea Council (City and County of Swansea)
- Landing page: https://www.swansea.gov.uk/article/5549/Supplier-information---ordering-and-payments
- Data URL pattern: **NONE** — no published transparency dataset
- Cloudflare/WAF: yes (swansea.gov.uk returned 403 on WebFetch)
- Quirks: Swansea publishes budget & statement-of-accounts PDFs only. Payments team contact is Fin.Admin@swansea.gov.uk; no programmatic portal.
- FY 2023/24 availability: **not available** — HARD BLOCKER, FOI required

### Newport City Council
- Landing page: https://www.newport.gov.uk/en/Council-Democracy/Transparency/Payments-to-suppliers.aspx
- Data URL pattern: `https://www.newport.gov.uk/documents/Council-and-Democracy/Transparency/Payments-to-suppliers/2023-2024/Payments-to-suppliers-Q{N}-2023.xlsx` (historical filenames also observed as `Payments-to-suppliers-{YY}{YY}-Qtr{N}.xlsx`, e.g. `Payments-to-suppliers-1819-Qtr1.xlsx`)
- Format: XLSX (quarterly, 4 files per FY)
- File sizes observed: Q1 ~388 KB, Q2 ~393 KB, Q3 ~287 KB, Q4 ~451 KB
- Schema: cumulative-by-supplier report (not transaction-level); threshold cumulative >£500
- Bilingual: no (English only)
- Cloudflare/WAF: yes (403 on WebFetch; accessing files likely needs browser UA)
- Rows/qtr: unknown, likely ~1–3k unique suppliers per quarter
- Quirks: **NOT transaction-level** — Newport publishes quarterly *totals by supplier* where cumulative exceeds £500, not each invoice. This is a critical schema difference vs English councils.
- FY 2023/24 availability: all 4 quarters present (Q1 Apr–Jun 2023, Q2 Jul–Sep 2023, Q3 Oct–Dec 2023, Q4 Jan–Mar 2024)

### Rhondda Cynon Taf County Borough Council
- Landing page: https://www.rctcbc.gov.uk/EN/Business/TendersandProcurement/ContractInformationandData.aspx
- Data URL pattern: **NONE for payments**. Only a Contracts Register XLSX exists: `/EN/Business/TendersandProcurement/Relateddocuments/ContractInformationandData/ProcContracts07Feb22.xlsx` (dated Feb 2022, stale)
- Bilingual: page has EN/CY toggle but XLSX is English
- FY 2023/24 availability: **not available** — HARD BLOCKER, only a contracts register (not actual spend)

### Caerphilly County Borough Council
- Landing page: https://www.caerphilly.gov.uk/My-Council/Performance,-budgets-and-spending/Council-budget
- Data URL pattern: **NONE**
- Cloudflare/WAF: yes (ECONNREFUSED on WebFetch)
- Quirks: Only publishes budget summary PDFs. Recently in news for refusing FOIs on suspension costs.
- FY 2023/24 availability: **not available** — HARD BLOCKER

### Carmarthenshire County Council
- Landing page: https://www.carmarthenshire.gov.wales/home/business/tenders-contracts/supplier-guide-to-tendering/what-do-we-spend-our-money-on/
- Data URL pattern: **NONE** — only aggregated % by 11 categories on webpage, no file
- Quirks: Bilingual website (EN/CY URLs parallel). Publishes Budget Digest PDF annually. No supplier-level data.
- FY 2023/24 availability: **not available** — HARD BLOCKER

### Wrexham County Borough Council
- Landing page: https://www.wrexham.gov.uk/service/finance-documents and https://www.wrexham.gov.uk/service/publication-scheme
- Data URL pattern: **NONE** — Finance Documents page only has Medium Term Financial Plan, Statement of Accounts, Revenue Budget (all PDFs)
- Quirks: Publication scheme mentions "what we spend and how we spend it" but no linked file. Contact: finance@wrexham.gov.uk.
- FY 2023/24 availability: **not available** — HARD BLOCKER

### Vale of Glamorgan Council
- Landing page: https://www.valeofglamorgan.gov.uk/en/our_council/Council-Finance.aspx
- Data URL pattern: `https://www.valeofglamorgan.gov.uk/Documents/Our%20Council/Council/Finance/2023/Payables-Greater-than-500-{Month}-Excel-2023.xls` and `...{Month}-2023.csv` (inconsistent month abbrevs: `April`, `May-2023`, `Jun`, `Jul`, `Aug`, `Sept`, `Oct`, `Nov`, `Dec`; Jan–Mar 2024 files live under `/2023/` folder with `-2024` suffix: e.g. `Payables-Greater-than-500-Jan-Excel-2024.xls`)
- Format: Monthly, both `.xls` and `.csv` published. **The `.csv` file is actually TAB-delimited UTF-8-BOM with CRLF terminators — not comma-delimited.** Verify before parsing.
- Schema (verified from April 2023 file): `Parent Cost Centre Description (Addl)` | `Parent Cost Centre Description` | `Invoice Accounting Date` | `Cost Centre` | `Supplier  Name` (note double space) | `Amount` | `Type`
  - dept="Parent Cost Centre Description (Addl)" (e.g., "Direct Social Services")
  - purpose="Parent Cost Centre Description" (e.g., "Older People Community Care")
  - supplier="Supplier  Name"
  - amount="Amount" (numeric, no £, excl VAT)
- Bilingual: **no** — English only despite being a Welsh council
- Cloudflare/WAF: no (files downloaded cleanly)
- Rows/month: ~3,000–5,000 (April 2023 file = 496 KB, transaction-level)
- Quirks: Threshold is **≥£500 per cost-centre charge (excl VAT)**; fostering/adoption payments excluded; "Supplier Name" has two spaces; tab delimiter despite `.csv` extension; sensitive/personal-data payments removed. Uses "Payables" (Oracle terminology) not "Spend".
- Sample rows (April 2023, tab-delimited):
  ```
  Direct Policy	Policy	02/04/2023	471900	Rhondda Cynon Taf County Borough Council	1204.72	REVENUE
  Direct Social Services	Older People Community Care	03/04/2023	215489	Willowmere Home Care Agency Limited	993.88	REVENUE
  ```
- FY 2023/24 availability: **all 12 months** — April 2023 through March 2024 confirmed listed on landing page
- Sample saved: `C:\Users\Usuario\.claude\projects\...\webfetch-1776215133952-2pjvjp.bin` (April 2023, 507 KB). Could not copy to `/tmp/welsh_vale_of_glamorgan_sample.csv` due to Bash permission restriction — file is cached in WebFetch tool-results dir.

---

## Summary: Net Welsh coverage for Budget Galaxy

**Only 2 of 8 councils publish usable FY 2023/24 supplier data:**
- **Vale of Glamorgan** — Transaction-level, monthly, clean schema. *Best candidate*. Ingestion-ready once the tab-vs-comma quirk is handled.
- **Newport** — Quarterly cumulative-by-supplier XLSX. Usable but *not transaction-level*; coarser than English MHCLG data. Schema differs from Vale of Glamorgan.

**6 HARD BLOCKERS (no machine-readable spend data published)**: Cardiff, Swansea, Rhondda Cynon Taf, Caerphilly, Carmarthenshire, Wrexham. For these, the only options are:
1. FOI request (30-day statutory response, possibly partial)
2. Wait for Welsh Government / Data Cymru to mandate — no current timeline

**Bilingual question answered**: None of the published data (Vale of Glamorgan, Newport) uses bilingual headers. Welsh councils publish finance data in English only, even though parent websites are bilingual. StatsWales (https://statswales.gov.wales/catalogue/local-government/finance) has aggregated authority-service budgets but NO supplier-level granularity.

**Threshold convention**: Vale of Glamorgan uses ≥£500 excl VAT per cost-centre charge (same as old English rule). Newport uses cumulative-by-supplier >£500/quarter (different — more like an annual creditors' report). No Welsh-specific threshold convention exists because there is no Welsh equivalent of the English Transparency Code.

**Recommendation for Budget Galaxy**: Treat Welsh expansion as a 2-council incremental (Vale of Glamorgan + Newport). For the other 6, file FOI requests now to beat NABSA and flag each with a "FOI-pending" status node rather than embedding empty placeholders. The 6-of-8 gap is a structural devolution issue, not a scraping problem.

Sources:
- [Vale of Glamorgan Council Finance](https://www.valeofglamorgan.gov.uk/en/our_council/Council-Finance.aspx)
- [Newport Payments to Suppliers](https://www.newport.gov.uk/en/Council-Democracy/Transparency/Payments-to-suppliers.aspx)
- [Cardiff FOI Open Data](https://foi.cardiff.gov.uk/eng/Pages/OpenData_All.aspx)
- [RCT Contract Information](https://www.rctcbc.gov.uk/EN/Business/TendersandProcurement/ContractInformationandData.aspx)
- [Wrexham Publication Scheme](https://www.wrexham.gov.uk/service/publication-scheme)
- [Caerphilly Budget](https://www.caerphilly.gov.uk/My-Council/Performance,-budgets-and-spending/Council-budget)
- [Carmarthenshire Spend](https://www.carmarthenshire.gov.wales/home/business/tenders-contracts/supplier-guide-to-tendering/what-do-we-spend-our-money-on/)
- [Swansea Supplier Info](https://www.swansea.gov.uk/article/5549/Supplier-information---ordering-and-payments)
- [Data Cymru Open Data](https://www.data.cymru/open-data)
- [Cardiff FOI re spend over £500](https://www.whatdotheyknow.com/request/council_expenditure_or_payment_t_57)