# Re-discover Surrey Q1/Q2 URLs

_Agent: agent-a1c929cb0a3e5aa27_

Got the full authoritative dataset listing directly from Surrey's API. The complete list of resources for Council Spending dataset shows that Q1 and Q2 of 2023-2024 simply DO NOT EXIST in the current dataset. Looking at the chronology:

- 2022-23: Q1 (rtx), Q2 (t1r), Q3 (73s), Q4 (92v) — all SAP
- 2023-24: Q3 (1p1), Q4 (s2j) — both ERP. **Q1 and Q2 are MISSING from the dataset entirely.**
- 2024-25: Q1 (lpe), Q2 (ll8), Q3 (jm7), Q4 (9km) — all ERP
- 2025-26: Q1 (tx3), Q2 (hex), Q3 (sdj)

Note also: the user's "known URLs" are slightly wrong. ll8 is actually "ERP Spend Q2 2024-2025" (not Q3 2023-2024), and s2j is correctly Q4 2023-2024. The Q3 2023-2024 token is "1p1", not "ll8". The user's first discovery pass had a labeling error.

The Wayback CDX shows that p9d (ERP Spend Data Q1 2023-2024) and vdt (ERP Spend Data Q2 2023-2024) DID exist briefly in Jan 2024, but were removed/replaced and never made it into the current dataset under any token. They're gone from the live API.

The Q1 and Q2 2023-2024 files are **not retrievable from Surrey's live source**. The only artifacts that ever existed are the now-404 Wayback CDX entries for tokens p9d and vdt — neither was ever successfully archived as content.

---

DELIVERABLES:

**1. Q1 (Apr-Jun 2023) URL:** Not available. Historical token was `p9d` at `https://www.surreyi.gov.uk/download/e6rgn/p9d/ERP%20Spend%20Data%20Q1%202023-2024.csv` but returns 404 since at least May 2025. The file is NOT in Surrey's current dataset.

**2. Q2 (Jul-Sep 2023) URL:** Not available. Historical token was `vdt` at `https://www.surreyi.gov.uk/download/e6rgn/vdt/ERP%20Spend%20Data%20Q2%202023-2024.csv` but returns 404 since at least May 2025. Also NOT in Surrey's current dataset.

**3. Strategy that worked:** Surrey's native JSON API at `https://www.surreyi.gov.uk/api/dataset/council-spending-e6rgn` (HTTP 200, no auth, accepts plain curl) returns the complete authoritative resource manifest. This is the canonical source — use it for all future Surrey-i token discovery instead of HTML scraping.

**4. Critical findings the caller needs to know:**
- Surrey deleted Q1 and Q2 2023-2024 entirely. Q3 (1p1) and Q4 (s2j) are the ONLY 2023-24 ERP files Surrey publishes. Only 50% of FY23/24 is recoverable from the official source.
- The user's "known URLs" contain an error: token `ll8` is `ERP Spend Q2 2024-2025` (10.7 MB), NOT Q3 2023-2024. The correct Q3 2023-2024 token is `1p1`: `https://www.surreyi.gov.uk/download/e6rgn/1p1/ERP%20Spend%20Q3%202023-2024.csv`
- Tokens are stable per upload (origin paths in API show upload dates back to 2022); they only rotate when a file is re-uploaded.
- Fallback for Q1/Q2: file an FOI request to `foi@surreycc.gov.uk` (Payments Team, Orbis Business Services), or use the Wayback Machine to attempt content recovery from the Jan 2024 302 snapshots (low probability, since Wayback only captured the redirect, not the CSV body).