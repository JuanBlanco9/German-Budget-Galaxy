# Download 5 councils' spend data

_Agent: agent-a98504211d1636f0e_

## Download Report

**TASK 1 — LFB:** 12/12 SUCCESS. All files 354 KB - 950 KB, all real CSVs. Located at `/d/germany-ngo-map/data/uk/local_authorities/spend/lfb/`

**TASK 2 — GLA Core:** 1/1 SUCCESS. `consolidated_p1_p13_2023_24.csv` = 2.68 MB (matches expected size). Located at `/d/germany-ngo-map/data/uk/local_authorities/spend/gla_core/`

**TASK 3 — TfL:** 14/14 SUCCESS.
- p01-p13: all 1.3-1.9 MB real CSVs (content.tfl.gov.uk worked first try with no UA needed)
- contracts_awarded.csv: initially returned TfL HTML error page even with Chrome UA. Wayback fallback worked: `https://web.archive.org/web/2025id_/https://tfl.gov.uk/cdn/static/cms/documents/contracts-awarded-tfl.csv` → 647 KB
- Located at `/d/germany-ngo-map/data/uk/local_authorities/spend/tfl/`

**TASK 4 — West Sussex:** 1/1 SUCCESS (after retry). First attempt with no UA returned 1.4 KB HTML error page. Retry with Chrome UA + Referer header → 10.23 MB (matches expected). Located at `/d/germany-ngo-map/data/uk/local_authorities/spend/west_sussex/`

**TASK 5 — Hampshire: 2/12 SUCCESS, 10/12 FAILED (Cloudflare bot block)**
- SUCCESS (UA trick worked): `may_2023.xlsx` (1.24 MB), `aug_2023.xlsx` (1.07 MB)
- FAILED with Cloudflare "Just a moment..." challenge despite full Chrome UA + Referer + Accept headers: apr_2023, jun_2023, jul_2023, sep_2023, oct_2023, nov_2023, dec_2023, jan_2024, feb_2024, mar_2024
- Wayback fallback also FAILED — Wayback API confirms zero archived snapshots exist for any of these `documents.hants.gov.uk/opendata/*.xlsx` URLs (`{"archived_snapshots": {}}`)
- Failed/test files were cleaned up. Only the 2 real downloads remain in `/d/germany-ngo-map/data/uk/local_authorities/spend/hampshire/`

**Hampshire summary for main thread:** UA trick gave a 2/12 hit rate — appears to be intermittent Cloudflare challenges, not a clean URL fix. May/Aug succeeded on first try, the rest got challenge pages on every attempt across two batches (~6 minutes apart). Wayback has no snapshots so that fallback is dead. The main thread will need a different approach: headless browser (Playwright/Selenium with cf-clearance cookie), residential proxy, or asking Hampshire directly for the files.

**Total:** 30/40 files successfully downloaded.