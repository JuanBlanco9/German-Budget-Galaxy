# Re-discover MPS H1 spend file

_Agent: agent-a810a964ff397a9c4_

All Met Police URLs return 403 from curl due to Cloudflare's JS challenge — same as the known-good H2 file. The 403 is not a missing-file signal. The URL is confirmed by the published-items lister snapshot (Wayback 2023-12-06, internal category ic=217281 = Publication scheme). The file will be downloadable from a real browser session, just not via curl.

---

**DELIVERABLES:**

**1. H1 file URL (single bundle, not quarterly):**

`https://www.met.police.uk/SysSiteAssets/foi-media/metropolitan-police/what_we_spend/corporate/mopac-mps-expenditure-invoices-credits-over-250-january-august2023.xlsx`

Title in lister: "MOPAC and MPS expenditure-invoices & credits over £250 January - August 2023"

**2. Strategy that worked:** Wayback CDX of the `published-items` lister page (not the `publication-scheme` landing). The 2023-12-06 snapshot filtered by `dt=Publication%20scheme&ic=217281` (the spend category) listed the exact href. URL:
`https://web.archive.org/web/20231206090057/https://www.met.police.uk/foi-ai/af/accessing-information/published-items/?dt=Publication%20scheme&ic=217281`

**3. Important coverage note:** The H1 bundle is **January–August 2023**, not April–August. It overlaps with the prior fiscal year (FY22/23 Q4 = Jan–Mar 2023). For FY23/24 you must filter rows to April 2023 onward, OR document the Jan–Mar 2023 portion as belonging to FY22/23. Combined with the H2 file (Sep 2023 – Mar 2024), full FY23/24 coverage is achievable.

**4. Curl access:** all met.police.uk URLs (including the known-good H2 control) return Cloudflare 403 from curl regardless of UA/headers — JS challenge required. Download must be done via real browser, headless Chrome, or Playwright. Wayback never crawled the binary itself, so it cannot serve as a fetch fallback.