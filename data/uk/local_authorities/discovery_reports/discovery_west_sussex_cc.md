# Discovery West Sussex CC

_Agent: agent-aabbe1b154425b58c_

The schema PDF is descriptive only — no column headers listed. Schema must be inferred from the file itself (which we are not downloading). I have enough to deliver.

---

WEST SUSSEX COUNTY COUNCIL — Spend Data URL Discovery (FY 2023/24)

1. BASE URL
https://www.westsussex.gov.uk/about-the-council/information-and-data/data-store/local-government-transparency-code-data/

2. FY 2023/24 DOWNLOAD URL (verified HTTP 200, 10.2 MB, valid xlsx, Last-Modified 2025-09-09)
- Period: April 2023 – March 2024 (full FY, single annual file)
- Format: XLSX
- URL: https://www.westsussex.gov.uk/media/lywj2qkj/wscc_spend_april2023-march2024.xlsx

Adjacent periods on same page (for context, not requested):
- FY 2022/23 XLSX (~9 MB)
- FY 2024/25 XLSX (~10.3 MB)
- FY 2025/26 partial: Apr–Nov 2025 XLSX (7.2 MB) + Dec 2025 CSV (5.5 MB)

Schema documentation PDF: https://www.westsussex.gov.uk/media/10020/info_about_these_data_sets.pdf

3. COLUMN NAMES
Not enumerated in the schema PDF (last updated 16 May 2022). The PDF only describes methodology: data is sourced from the Accounts Payable ledger, classified using SeRCOP objective (cost-incurring service) and subjective (expenditure type) for revenue, and service portfolios for capital. Standard LGTC fields expected (must be confirmed at parse time): Date, Supplier, Amount (net), Directorate/Service, SeRCOP Objective, SeRCOP Subjective, Transaction/Invoice Ref, Capital/Revenue flag.

4. SAMPLE ROW
Not obtainable without download (per instructions).

5. COMPLICATIONS
- Threshold is £100, not £500 — WSCC publishes from April 2012 onwards down to £100; expect a much higher row count than peer £500 councils.
- Negative values present (credit notes, over-payment recoveries) — do not net by supplier blindly.
- Some rows fall below threshold due to invoice line-item coding and petty cash inclusion.
- P-Card transactions are included as merchant-level detail AND as offsetting payments to the card provider — double-count risk if not deduplicated.
- Accounts Receivable offsets are NOT included.
- Single annual file only (no monthly breakdown for 2023/24); no CSV variant for this FY — XLSX only.
- No published column dictionary; schema must be read from file headers.
- Files served from /media/{shortcode}/ Umbraco paths — shortcodes are unstable across re-uploads, so URLs should be re-resolved from the landing page rather than hardcoded long-term.

Sources:
- [Local Government Transparency Code data — West Sussex County Council](https://www.westsussex.gov.uk/about-the-council/information-and-data/data-store/local-government-transparency-code-data/)
- [WSCC spend April 2023 – March 2024 (XLSX)](https://www.westsussex.gov.uk/media/lywj2qkj/wscc_spend_april2023-march2024.xlsx)
- [Information about these data sets (PDF)](https://www.westsussex.gov.uk/media/10020/info_about_these_data_sets.pdf)