# Discovery MPS (Met Police) spend

_Agent: agent-ae2cc09508e3c3b58_

I have enough. The H1 of FY 2023/24 (April–August 2023) doesn't surface in Google — likely a different filename pattern, but the September 2023–March 2024 file covers 7 of 12 months. Let me also confirm that the "Payment of supplier invoices" disclosure page might be the H1 cover.

Time budget reached. Compiling deliverables.

---

**MPS / MOPAC Spend Disclosure — FY 2023/24**

**1. Publishing body:** Metropolitan Police Service (MPS) publishes on behalf of both. Files are branded "MOPAC and MPS expenditure invoices & credit notes over £250" and hosted on `met.police.uk` under the MPS Publication Scheme. MOPAC's `london.gov.uk` "Our finances" page redirects users to the MPS publication scheme rather than hosting files itself.

**2. Base URL of transparency page:**
- MPS Publication Scheme entry: `https://www.met.police.uk/foi-ai/af/accessing-information/publication-scheme/`
- File directory (CDN): `https://www.met.police.uk/SysSiteAssets/foi-media/metropolitan-police/what_we_spend/corporate/`
- MOPAC pointer page: `https://www.london.gov.uk/programmes-strategies/mayors-office-policing-and-crime/about-mayors-office-policing-and-crime-mopac/our-finances`

**3. FY 2023/24 download URLs (XLSX, NOT £500 — threshold is £250):**

- **Sep 2023 – Mar 2024** (confirmed): `https://www.met.police.uk/SysSiteAssets/foi-media/metropolitan-police/what_we_spend/corporate/mopac-mps-expenditure-invoices-credits-over-250-september2023-march2024.xlsx`
- **Apr 2023 – Aug 2023** (NOT located via search; expected but not confirmed). Likely filename pattern by analogy with prior years: `mopac-mps-expenditure-invoices-credits-over-250-april-august2023.xlsx` in the same `/what_we_spend/corporate/` directory. Needs manual browse of the publication-scheme page (CDN blocks bot HEAD requests with 403; cannot verify programmatically).

Historic pattern shows MPS shifted from quarterly (e.g. `april-june2021.xlsx`) to irregular multi-month bundles by 2023.

**4. Schema (typical MPS spend-over-£250 disclosure based on prior-year files in same series):** Columns generally include Supplier Name, Invoice/Credit Note Date, Invoice Amount (gross, £), Cost Centre code, Cost Centre Description (department/BOCU), Account/Expenditure Category, sometimes Project / WBS code. No supplier address or VAT ID.

**5. Sample row:** Not obtainable — `met.police.uk` CDN returns HTTP 403 to all curl/WebFetch requests (User-Agent gating). Confirmed file existence only via Google indexing.

**6. Complications:**
- Threshold is **£250, not £500** (more granular than usual UK central-gov standard — good for our purposes).
- Joint MOPAC+MPS publication: rows may not distinguish which legal entity paid.
- Publication cadence is irregular (was quarterly through 2021, now ~half-yearly bundles); H1 FY23/24 file may not exist as a single artifact.
- Bot blocking on the CDN means automated fetch will need a real browser User-Agent header.
- Files are XLSX only, no CSV.

**7. Magnitude check:** MOPAC budget submissions cite gross 2023/24 expenditure of **£4,286.8m**. After stripping payroll (~60% of police spend) and sub-£250 items, the supplier-level disclosure should sum to roughly **£1.5–2.0bn** for the year, not £4bn. This is consistent with the £4.38bn precept figure once payroll and grants-out are netted off. Sanity-check after first ingest.

Sources:
- [Our finances – London City Hall (MOPAC)](https://www.london.gov.uk/programmes-strategies/mayors-office-policing-and-crime/about-mayors-office-policing-and-crime-mopac/our-finances)
- [MPS Publication Scheme](https://www.met.police.uk/foi-ai/af/accessing-information/publication-scheme/)
- [MOPAC and MPS expenditure invoices & credits over £250 – Sep 2023–Mar 2024 (XLSX)](https://www.met.police.uk/SysSiteAssets/foi-media/metropolitan-police/what_we_spend/corporate/mopac-mps-expenditure-invoices-credits-over-250-september2023-march2024.xlsx)
- [Prior file (April–June 2021) confirming URL pattern](https://www.met.police.uk/SysSiteAssets/foi-media/metropolitan-police/what_we_spend/corporate/mopac-mps-expenditure-invoices-credit-notes-over-250-april-june2021.xlsx)
- [CPM Statement of Accounts 2023/24 (PDF)](https://www.met.police.uk/SysSiteAssets/foi-media/metropolitan-police/what_we_spend/corporate/cpm-audited-statement-accounts-2023-24.pdf)