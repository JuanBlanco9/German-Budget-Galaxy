# Kingston recovery - alt sources

_Agent: agent-ab6e259ba5268c17a_

Mission accomplished. Schema confirmed consistent across all 12 files.

---

## RECOVERY SUCCESSFUL — Kingston FY 2023/24 fully recovered

**Source:** `https://www.kingston.gov.uk/your-council/privacy-and-data/local-government-transparency-code/finance`
(Transparency page exists and is current; the prior agent was mistaken about it being gone. Files live under `/sites/default/files/2025-05/` and were batch-uploaded in May 2025 per the RBK transparency code.)

**Files downloaded** to `/tmp/kingston_fy2324/` (12 CSVs, one per month):

| Month | Rows (incl. header) |
|---|---|
| Apr 2023 | 3,420 |
| May 2023 | 4,126 |
| Jun 2023 | 3,415 |
| Jul 2023 | 2,846 |
| Aug 2023 | 3,962 |
| Sep 2023 | 3,093 |
| Oct 2023 | 3,529 |
| Nov 2023 | 3,124 |
| Dec 2023 | 3,273 |
| Jan 2024 | 3,641 |
| Feb 2024 | 3,388 |
| Mar 2024 | 3,756 |
| **Total** | **41,573** (~41,561 data rows) |

**Format:** CSV, UTF-8 with Latin-1 pound sign (`�` byte in header needs `cp1252`/`latin-1` decode)
**Schema (9 columns, identical across all 12 months):**
`Council Name, Date, TransNo, Amount £ (Excl VAT), Supplier name, Supplier Category, Expense Area, Expense Type, Expense Code`

**Threshold:** £500 (excl. VAT), confirmed in filenames and file contents
**Date range:** confirmed April 2023 through March 2024 — full FY 2023/24 coverage. (Note: April 2023 file contains a few 31/03/2023 transactions posted in the April accounting period — normal cutover.)
**Restrictions:** None. Direct HTTPS, no Cloudflare challenge, no login.
**Council Name field value:** `Royal Borough of Kingston` (use this for Budget Galaxy name-matching)

**Bonus data also available on same page** (not downloaded, URLs captured):
- Government Procurement Card / credit card spend Sep 2023 - Feb 2024 (6 XLSX-as-CSV files under same `/sites/default/files/2025-05/` prefix, filename pattern `Credit_card_spend_<Month>_<YY>.xlsx___Sheet1.csv`)

**Data.gov.uk status (for the record):** the old dataset `db140e39-afe3-4944-9355-c422b8401ad6` is stale — last update 12 Aug 2013, only lists 2010 XLS files via The National Archives. Do not rely on data.gov.uk for Kingston; go direct to `kingston.gov.uk`.

**Next step for Budget Galaxy ingest:** decode CSVs as `cp1252`, rename `Amount £ (Excl VAT)` column to ASCII, concatenate the 12 months, parse `Date` as `DD/MM/YYYY`, sum by `Supplier name` for the supplier-level view.