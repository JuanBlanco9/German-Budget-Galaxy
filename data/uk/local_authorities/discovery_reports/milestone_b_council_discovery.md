# Milestone B council discovery

_Agent: agent-a4e551b89a3dec738_

Interesting — Lincolnshire includes transactions below £500 (that 7.63 row). The data is richer than the minimum threshold. All three councils confirmed, no Cloudflare blocks. Here is the final report.

---

### Devon County Council
- Landing page: https://github.com/Devon-County-Council/spending (also https://www.devon.gov.uk/factsandfigures/dataset/spending-over-500/)
- Data URL pattern: `https://raw.githubusercontent.com/Devon-County-Council/spending/master/DCCSpendingOver500_YYYYMM.csv` (e.g. `..._202304.csv` through `..._202403.csv` for FY 2023/24)
- Format: CSV, comma-delimited, UTF-8 with BOM
- Schema: dept=`Expense Area`, purpose=`Expense Type`, supplier=`Supplier Name`, amount=`Amount`; full header: `Body, Name of Body, Date, Transaction Number, Invoice Number, Amount, Supplier Name, Supplier ID, Vat Reg No, Expense Area, Expense Type, Expense Code, Creditor Type`
- Cloudflare: no (raw.githubusercontent.com, HTTP 200)
- Rows/month: ~10,600 (April 2023 = 10,597 rows, ~1.8 MB)
- Quirks: Supplier names anonymised for individuals with a `****NNNN` suffix; `Date` is ISO `YYYY-MM-DD 00:00:00`; BOM on first byte — strip when parsing headers. 12 files cover Apr 2023 – Mar 2024 cleanly.
- Sample row: `18,Devon County Council,2023-04-03 00:00:00,CAPEELOC36004527,2023787,2186.22,YOUNG DEVON (IVYBRIDGE)****5215,120708,,Children's Services,Rents & other landlord charges payable,2321,CHTY`

### Staffordshire County Council
- Landing page: https://www.staffordshire.gov.uk/council-and-democracy/transparency/expenditure-exceeding-ps500/20232024
- Data URL pattern: `https://www.staffordshire.gov.uk/sites/default/files/2026-02/Staffordshire-County-Council-Expenditure-Over-500-DD-MM-YYYY.csv` (also `.xlsx` available). End-of-month dates: `30-04-2023, 31-05-2023, 30-06-2023, 31-07-2023, 31-08-2023, 30-09-2023, 31-10-2023, 30-11-2023, 31-12-2023, 31-01-2024, 29-02-2024, 31-03-2024`. Note the `2026-02/` path segment is a Drupal upload bucket — not a year indicator, keep it literal.
- Format: CSV, comma-delimited, UTF-8 with BOM (XLSX available as fallback)
- Schema: dept=`OrganisationalUnit`, purpose=`Purpose` (and duplicate `CategoryInternal`), supplier=`BeneficiaryName`, amount=`Amount`; full header: `OrganisationName, OrganisationalUnit, BeneficiaryName, PaymentDate, Amount, Purpose, CategoryInternal, OrganisationURI`
- Cloudflare: no (HTTP 200, 998 KB direct)
- Rows/month: ~4,800 (April 2023 = 4,812 rows)
- Quirks: `PaymentDate` is UK format `DD/MM/YYYY`; `OrganisationURI` has trailing whitespace; BOM on header; `Purpose` and `CategoryInternal` are near-identical in most rows — pick `Purpose` as canonical.
- Sample row: `Staffordshire County Council,Childcare,18 St John Street Chambers,06/04/2023,1872.00,Legal Costs and Stamp Duty,Legal Costs and Stamp Duty,http://opendatacommunities.org/id/county-council/staffordshire`

### Lincolnshire County Council
- Landing page: https://data.lincolnshire.gov.uk/dataset/lincolnshire-county-council-spending (CKAN; old `lincolnshire.ckan.io` 301-redirects here)
- Data URL pattern: Datopian blob storage with per-resource UUIDs — no predictable pattern; must resolve via CKAN API `https://data.lincolnshire.gov.uk/api/3/action/package_show?id=lincolnshire-county-council-spending` and follow `resources[].url`. Confirmed working example: `https://blob.datopian.com/resources/c53bee04-f589-4130-8318-2e411c1976ca/lccspending2023-04-n75NMw.csv`. Full list of 12 FY 2023/24 monthly URLs captured in scout notes (each has form `/resources/{uuid}/lccspendingYYYY-MM-{rand6}.csv`).
- Format: CSV, comma-delimited, UTF-8 (no BOM on sampled file)
- Schema: dept=`OrganisationalUnit`, purpose=`Purpose` (free-text) or `CategoryInternalName` (normalised), supplier=`BeneficiaryName`, amount=`Amount`; full header has 22 columns including heavy metadata prefix (`OrganisationName, OrganisationCode, PublishedDate, LatestData, DurationFrom, DurationTo, EffectiveDate, GeoEntityName, GeoCode, GeoName, GeoURI, ReportingPeriodType, ReportingPeriod, LegalEntity, LCC_Period, OrganisationalUnit, Purpose, CategoryInternalName, TransactionNumber, BeneficiaryOtherID, BeneficiaryName, Amount`)
- Cloudflare: no (blob.datopian.com, HTTP 200, 5.4 MB)
- Rows/month: ~12,700 (April 2023 = 12,695 rows, ~5.4 MB — largest of the three)
- Quirks: **File contains rows below £500** (sampled 7.63, 3.47, 27.77) — filter `Amount >= 500` if strict £500 threshold is required, otherwise ingest as-is. Each month is for that accounting period but some rows use `LCC_Period=202401` even for 2023-04 (fiscal-period code, not calendar). `Purpose` is coarse, `CategoryInternalName` is the finer category — prefer concatenating both or use `CategoryInternalName` for supplier metadata. URL slugs are randomised, so hardcoding is brittle — re-query CKAN API before each run.
- Sample row: `Lincolnshire,http://opendatacommunities.org/id/county-council/lincolnshire,2023-08-03T00:00:00,TRUE,2023-04-01T23:00:00,2023-04-30T23:59:59,30/04/2023,County,E10000019,Lincolnshire,...,2023-04,Lincolnshire County Council,202401,Residential Homes & Placements,"Tools, Equipment, Furniture & Materials",Equipment & Materials Admin,2039540506,200000,91 Eastgate Imprest,3.47`

---

**Status: all three councils GREEN.** No Cloudflare, no JS challenges, direct CSV downloads all HTTP 200 on first attempt with a standard UA. Devon is the simplest (stable GitHub raw URLs, predictable filenames). Staffordshire is also a stable URL pattern but depends on the `2026-02/` Drupal bucket remaining live — worth re-verifying latest file in the follow-up session before bulk download. Lincolnshire requires the CKAN API hop because Datopian blob URLs embed random suffixes, but the CKAN endpoint is reliable and 12 monthly files are all present.

**Recommendation for follow-up session:**
1. Devon: simple loop over `DCCSpendingOver500_{YYYYMM}.csv` for YYYYMM ∈ {202304..202403}. Strip BOM, parse `Date` as ISO.
2. Staffordshire: loop over hardcoded end-of-month dates. Parse `Amount` as float, `PaymentDate` as `DD/MM/YYYY`. Note Feb 2024 = 29-02.
3. Lincolnshire: hit CKAN `package_show` API once, filter `resources` where `name` matches `LCC Spending Dataset 2023-0[4-9]`, `2023-1[0-2]`, or `2024-0[1-3]`, then download each `url`. Filter rows `Amount >= 500` if strict threshold required.

Relevant absolute file paths from this scout session (temp samples, can be re-downloaded):
- `/tmp/devon_apr23.csv` (1.8 MB, 10,598 lines)
- `/tmp/staffs_apr23.csv` (998 KB, 4,813 lines)
- `/tmp/lincs_apr23.csv` (5.4 MB, 12,696 lines)

Sources:
- [Devon County Council spending GitHub](https://github.com/Devon-County-Council/spending)
- [Devon County Council open data](https://www.devon.gov.uk/factsandfigures/dataset/spending-over-500/)
- [Staffordshire 2023/24 expenditure page](https://www.staffordshire.gov.uk/council-and-democracy/transparency/expenditure-exceeding-ps500/20232024)
- [Lincolnshire CKAN dataset](https://data.lincolnshire.gov.uk/dataset/lincolnshire-county-council-spending)