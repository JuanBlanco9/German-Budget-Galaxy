# Discovery GLA core (Mayor's office)

_Agent: agent-a6abd7dd8f8ecb61f_

Verified the file, schema, sample row, and reconciliation total. All deliverables ready.

---

**GLA CORE — Spend Disclosure FY 2023/24 (URL Discovery)**

**1. Publishing body**
Greater London Authority (GLA) — "Mayor's £250 Report" (covers GLA + GLA Land & Property Ltd). Mayor of London / London City Hall.

**2. Base URLs**
- Landing page: https://www.london.gov.uk/who-we-are/governance-and-spending/spending-money-wisely/our-spending
- Media host: https://www.london.gov.uk/media/{id}/download

**3. FY 2023/24 URLs (period + format)**
Best file (one-shot, full year, CSV):
- **Consolidated P1–P13 (01-Apr-2023 → 31-Mar-2024)** — https://www.london.gov.uk/media/106057/download (CSV, 2.68 MB, filename `06. Mayor's 250 Report - 2023-24 P1 - P13.csv`)

Per-period files also exist (4-week accounting periods) if needed:
- P1 (01–29 Apr 2023): /media/101807/download
- P2 (30 Apr–27 May): /media/102011/download
- P3 (28 May–24 Jun): /media/102015/download
- P4 (25 Jun–22 Jul): /media/102989/download
- P5–P13: linked from the same landing page (same /media/{id}/download pattern)
Recommend just using the consolidated 106057 file — no need to stitch periods.

**4. Column schema** (verified, row 10 of CSV is header)
`Vendor ID | Vendor Name | Cost Element | Expenditure Account Code Description | Document No | Amount | Clearing Date | Directorate | Service Expenditure Analysis`
- Supplier name → `Vendor Name`
- Amount → `Amount` (negative rows = credits/reversals — must net)
- Department → `Directorate` (e.g., GOOD GROWTH, COMMUNITIES & SKILLS, STRATEGY & COMMUNICATIONS, CHIEF OFFICER)
- Function/category → `Service Expenditure Analysis` (e.g., PLANNING SERVICES, CULTURAL & RELATED SERVICES, CENTRAL SERVICES) — this maps directly to MHCLG's RO categories.
- Purpose → `Expenditure Account Code Description` (e.g., MANAGEMENT & SUPPORT CONSULTANCY, EVENT MANAGEMENT FEE, GRANTS TO EXTERNAL ORGANISATIONS)
- Threshold: £250 excl. VAT (not £500)

**5. Sample row**
`10000221, AECOM LIMITED, 542000, MANAGEMENT & SUPPORT CONSULTANCY, 5110241196, 2,113,000.00, 12/04/2023, GOOD GROWTH, PLANNING SERVICES`

**6. Complications**
- File covers GLA + GLA Land & Property only. **Does NOT include TfL, MPS, LFB** — those are separate functional bodies with their own transparency feeds. Clean separation, no de-duplication needed.
- Negative reversal rows present (same vendor/doc no) — must sum, not count.
- File header rows 1–9 are metadata; real header is row 10. Pandas: `skiprows=9`.
- "Step 1 / Step 2" text in header is internal reconciliation tagging, ignore.
- Encoding has a stray byte where £ should be (Latin-1, not UTF-8) — read with `encoding='latin-1'` or `cp1252`.

**7. Magnitude check**
File's own `Summary Total` = **£2,009,554,720.61** for the year. That is ~2× the £1B MHCLG-attributed GLA-core figure. The gap is because the £250 register includes grants, capital, and pass-through spend (e.g., housing investment grants, GLA Land & Property capital) that MHCLG nets out or attributes elsewhere. Expected — flag for reconciliation, don't treat as error. Total remuneration line (£76.9M) is shown separately in the metadata header for staff costs.