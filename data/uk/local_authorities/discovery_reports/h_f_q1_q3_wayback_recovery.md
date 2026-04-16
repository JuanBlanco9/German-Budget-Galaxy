# H&F Q1-Q3 Wayback recovery

_Agent: agent-ab2dff98865ba6c52_

## Recovery report: LBHF FY 2023/24 quarterly spend files

**Key finding: the live files were NOT purged — they are unlinked from the public page but still served.** The 403s were a user-agent block, not a 404. Q1 and Q2 downloaded cleanly from the live origin with a Chrome UA. Wayback Machine has NO archived copy of any Q1/Q2/Q3 2023-24 file (confirmed via CDX `filter=original:.*lbhf-spend.*` — only Q4 2023-24, Q1 2024-25, and Q2 2024-25 are archived anywhere on the `/sites/default/files/` tree). The procurement page itself is also not in Wayback.

### Q1 2023/24 (Apr-Jun 2023)
- Live URL: `https://www.lbhf.gov.uk/sites/default/files/section_attachments/lbhf-spend-data-q1-2023-24.xlsx`
- Source: live origin (requires browser UA; page no longer links it)
- Downloaded to: `/tmp/hf_q1_2023_24.xlsx`
- Size: 2,188,428 bytes (2.1 MB), data_rows: **48,712**, 9 columns
- Sheet: `Data Q1 2023-24`
- Date range: **2023-04-03 to 2023-07-18** (matches Apr-Jun + trailing late-posted)
- Headers: Organisation, Supplier Name, Document Number, Payment Date, Cost Center/Capital Project, Cost Center/Capital Project Description, GL Account, GL Account Description, Amount (Ex VAT)

### Q2 2023/24 (Jul-Sep 2023)
- Live URL: `https://www.lbhf.gov.uk/sites/default/files/2023-11/lbhf-spend-data-q2-2023-24-no-filter.xlsx`
- Source: live origin (requires browser UA; filename uses `-no-filter` suffix, no longer linked from page)
- Downloaded to: `/tmp/hf_q2_2023_24.xlsx`
- Size: 1,361,374 bytes (1.3 MB), data_rows: **32,987**, 7 columns
- Sheet: `Data Q2 2023-24`
- Date range: **2023-07-03 to 2023-10-24**
- Headers: Organisation, Supplier Name, Unique reference number, Payment Date, Cost Center/Capital Project Description, GL Account Description, Amount (Ex VAT)

### Q3 2023/24 (Oct-Dec 2023) — NOT RECOVERED
- Not available via Wayback Machine, Google index, or live origin.
- Probed 42 URL/folder/filename combinations on lbhf.gov.uk (upload folders 2024-01 through 2024-07, filenames `lbhf-spend-data-q3-2023-24.xlsx`, `-no-filter.xlsx`, `_0.xlsx`, `-nofilter.xlsx`, `spend-data-q3-2023-24.xlsx`, `lbhf_spend_data_q3_2023_24.xlsx`, `lbhf-spend-data-q3-oct-dec-2023.xlsx`, `lbhf-spend-data-oct-dec-2023.xlsx`, plus `section_attachments/` variants) — **all return 404**.
- Wayback availability API: zero snapshots for any variant.
- CDX prefix search on `www.lbhf.gov.uk/sites/default/files/` filtered to `lbhf-spend` returns only three files ever archived (Q4 2023-24, Q1 2024-25, Q2 2024-25).
- Google indexed references: none — neither `lbhf-spend-data-q3-2023-24` nor any variant appears in SERPs.
- data.london.gov.uk and data.gov.uk: no mirror.
- Conclusion: Q3 2023-24 spend data was apparently never uploaded to a reachable URL, or was deleted before Wayback/Google crawled it. Best remaining options are (a) FOI request to LBHF citing the Local Government Transparency Code 2015 obligation, or (b) email the transparency team at `foi@lbhf.gov.uk` for a direct copy.

### Additional notes
- **Schema does NOT match the Q4 schema described in the task brief.** None of the 2023-24 files contain "Beneficiary", "Category/Purpose", "Department", "Net value", "VAT Value", "Gross", or "Date incurred -Payment Date" columns. Actual schema is: Organisation, Supplier Name, reference column, Payment Date, cost center column, GL account column, Amount (Ex VAT). Q1 additionally splits cost-center and GL into code+description (9 cols vs 7). If downstream Budget Galaxy code expects the brief's column names, it will need to be adapted.
- **The Q1 file uses "Document Number" as the reference column, Q2 uses "Unique reference number", Q4 uses "Reference"** — reference column name differs per quarter. Cost center column also varies ("Cost Center/Capital Project Description" vs "Service Area/Capital Project Description" in Q4).
- All three files are valid Microsoft Excel 2007+ (verified with `file`).
- Q2 file contains some late-posted October invoices (last date 2023-10-24), which is normal ledger behavior.

### Files written
- `/tmp/hf_q1_2023_24.xlsx` (2,188,428 bytes)
- `/tmp/hf_q2_2023_24.xlsx` (1,361,374 bytes)
- `/tmp/hf_q4_2023_24.xlsx` (709,368 bytes, downloaded as sanity check against known live URL)