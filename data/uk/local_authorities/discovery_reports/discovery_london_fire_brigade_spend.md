# Discovery London Fire Brigade spend

_Agent: agent-ac47afe7cf2405074_

Got everything. Schema confirmed, sample row obtained. Here's the deliverable.

---

**LFB Supplier Spend Disclosure — FY 2023/24**

**1. Publishing body**
London Fire Commissioner / London Fire Brigade (LFB). Data hosted on London Datastore (Greater London Authority portal). Contact: David Wyatt, david.wyatt@london-fire.gov.uk. Licence: OGL v3.

**2. Base URL**
Dataset landing: `https://data.london.gov.uk/dataset/lfb-payments-over-f250---2023-24`
API: `https://data.london.gov.uk/api/dataset/lfb-payments-over-f250---2023-24`
Note: threshold is **£250**, not £500 (LFB publishes lower than the statutory £500).

**3. FY 2023/24 URLs (12 monthly CSVs, one per month)**
All under `https://data.london.gov.uk/download/246o6/{uuid}/LFB%20payments%20over%20250%20-%20{Month}%20{Year}.csv`:
- Apr 2023: `33f6f468-83a0-4f81-8ba4-a7611270eda8` (619KB)
- May 2023: `7baee62d-a3f6-4b46-8654-f8e9acb46422` (538KB)
- Jun 2023: `7a581e52-149a-4668-8619-5ac906b72eba` (950KB)
- Jul 2023: `9241a5db-1947-4ca7-bc68-35791097461a` (904KB)
- Aug 2023: `552fc725-faac-4426-989d-5d9e15170b04` (504KB)
- Sep 2023: `660a0ed0-4069-4381-be61-897d3d6d25fc` (522KB)
- Oct 2023: `0407142c-5a11-418b-9195-95e11f1b6ed7` (606KB)
- Nov 2023: `606004b9-2b05-40a2-8053-1687d9e49d4e` (849KB)
- Dec 2023: `81c687d6-756d-461e-af5c-0f85e0cc45b7` (354KB)
- Jan 2024: `f9b60daa-44de-4cf8-9e6a-0125bf7a3fdc` (762KB)
- Feb 2024: `26c9670d-761f-4417-9994-8f41ef6c5a5f` (629KB)
- Mar 2024: `f0b0dda4-5d77-41ad-bfb7-8ef41656e717` (582KB) — note: filename URL-encodes "Mar 2023" but resource is correctly labelled Mar 2024.

**4. Column schema**
`BATCH ID, NAME VEND, INVOICEID, Line, AMT LINE, DESCRIPTION, ISSUED DATE, AMT TOTAL, Department, PRO CLASS 1`
- supplier = `NAME VEND`
- amount = `AMT TOTAL` (or `AMT LINE` per invoice line)
- department = `Department`
- purpose = `DESCRIPTION` + `PRO CLASS 1` (ProClass merchant category)

**5. Sample row (Apr 2023)**
`140423P, LUMESSE LIMITED, #2023-0082-UK, 1, 77,200.00, SOFTWARE BESPOKE, 27/04/2023, 77,200.00, People Services, ICT`

**6. Complications**
- Monthly CSVs (12 to ingest), not quarterly/annual.
- Fixed-width whitespace padding on text fields (trim required).
- Amounts have thousand-separator commas inside quoted fields.
- Mar 2024 filename literal contains "Mar 2023" — resource title is correct, treat as March 2024.
- Multi-line invoices: aggregate by `INVOICEID` to avoid double-counting if needed.
- Threshold £250 (more granular than £500 norm — more rows but more complete).
- VAT note: LFB recovers all VAT, no VAT flag column.

**7. Magnitude check**
Total CSV size ~7.8 MB across 12 months. Rough row estimate ~50–80k transactions/year. Aggregate £-value not yet verified (would need to sum); £500M/yr expected from MHCLG precept context — supplier spend is a subset (excludes payroll, pensions). Reasonable expected supplier sum: £150–300M.

Related: LFB financial/performance reporting 2023/24 also lives at `https://data.london.gov.uk/dataset/lfb-financial-and-performance-reporting-2023-24` (annual report context). ePCS card transactions: `https://data.london.gov.uk/dataset/aa0ccca0-d5ae-41bd-954d-3eeb6991eeb9`.