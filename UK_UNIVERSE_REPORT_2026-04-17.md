# Budget Galaxy — UK Universe Report
**Generated: 2026-04-17 (end of 2-day marathon session)**

## Executive summary

- **UK root**: £1,390.5B total public spending 2024
- **Local Government England**: £141.7B MHCLG net current expenditure across 411 council nodes in 6 classes
- **Supplier-level enrichment**: 167 of 411 councils (41%) covered, representing **£122.6B of £141.7B = 86.54%** of total LG spending
- **Lookup file**: 166 councils with 1488 service-level entries, ~£102.6B of raw classified spend
- **Tree on disk**: 16.09 MB (live on budgetgalaxy.com, last deploy 15:12 GMT 2026-04-17)
- **Session achievement**: +21.34pp coverage in 2 days (65.2% → 86.54%)

---

## 1. Top-level structure

| Department | Value | Children |
|---|---|---|
| DWP | £297.4B | 16 |
| Local Government (England) | **£141.7B** | 6 classes |
| Department for Education | £140.3B | 25 |
| NHS Provider Sector | £130.8B | 5 top-level (825 nodes with NHS metadata) |
| Department of Health & Social Care | £83.4B | 15 |
| MoD | £71.9B | 15 |
| HM Treasury | £63.5B | 14 |
| Scotland Office (incl devolved) | £48.6B | 3 |
| MHCLG (central dept) | £46.1B | 10 |
| DfT | £41.2B | 13 |
| Scottish Government | £36.8B | 51 |
| HMRC | £34.3B | 9 |
| Northern Ireland Executive | £33.2B | 57 |
| Welsh Assembly Gov | £23.9B | 39 |

---

## 2. Local Government coverage by class

| Class | Councils covered | £ covered | % |
|---|---|---|---|
| **Shire Counties** | 21/21 | £31.4B / £31.4B | **100%** |
| **London Boroughs** | 33/33 | £19.9B / £19.9B | **100%** |
| **Metropolitan Districts** | 35/36 | £23.9B / £24.4B | **98%** |
| **Unitary Authorities** | 56/63 | £27.3B / £30.0B | **91%** |
| **Other Authorities** (PCCs/Fire/Combined) | 16/94 | £19.9B / £32.4B | **61%** |
| **Shire Districts** | 6/164 | £0.3B / £3.5B | **7%** |
| **TOTAL** | **167/411** | **£122.6B / £141.7B** | **87%** |

**Reading**: 3 of 6 classes are effectively complete. Met Districts has 1 holdout (Tameside, UK-only egress). Unitary has 7 (Dorset, Northumberland, Blackburn, Isle of Wight, Southend-on-Sea, N.E. Lincs, Torbay). The big gaps are **Other Authorities** (mostly PCCs, all Cloudflare-blocked) and **Shire Districts** (158 small councils, £20M avg, no manifest coverage).

---

## 3. NHS deep drill (v13 + v16)

- NHS Provider Sector £130.8B split into 5 top-level groupings
- **825 nodes** with NHS-specific metadata (`_source` = "NHS TAC EXP0390" and/or `_workforce`)
- 206/212 NHS Trusts enriched with:
  - Cost-type breakdown (Staff Costs: Salaries / Pensions / Social Security / Agency / Termination / Other)
  - Supplies sub-children (Drugs / Clinical / General / Inventories)
  - Premises sub-children (9 cost buckets)
  - `_workforce` metadata (WTE by 10 staff groups)
- **6 trusts missing**: newer foundation trusts not yet in EXP0390 schema
- ICB (Integrated Care Board) commissioner attached to 211 trusts via NHS Spine ODS REST API

---

## 4. DHSC L5

- £83.4B (£137.9B after netting via net_nhs_overlap.js for OSCAR 2024 baseline)
- Top suppliers attached (226 recipients flattened from 23 DHSC segments)
- Known: OSCAR 2023 had £114B "non-patient-facing NHS" artifact — fixed in 2026-04-10 forensic commit

---

## 5. Council supplier enrichment (core daily work)

### 5a. Methods used (cumulative across sessions)
1. **Direct HTTP download** (47 councils) — vanilla fetch
2. **SharePoint `_layouts/15/download.aspx?share={token}` rewrite** (2 councils: Somerset, Central Beds)
3. **Drupal `/document-search?field_document_target_id={term}` + landing scrape** (Cumberland, Westmorland, etc.)
4. **WordPress `customfilter` AJAX endpoint** (Somerset)
5. **Wayback Machine if_/id_ replay** — for Cloudflare/Akamai geo-blocked councils (Newcastle, Leicestershire, Calderdale, Stockton, Wiltshire, Oxfordshire partial, East Lindsey partial, others)
6. **Wayback Save Page Now with IA S3 auth** — when no snapshot exists (Calderdale)
7. **Vultr Miami SSH proxy** — for Incapsula WAFs that block AR but allow US (Southampton, Halton)
8. **Playwright** — for a few complex cases (Hampshire, Essex pre-session)
9. **Manual browser download** — SharePoint auth-gated (Colchester, pending user action)

### 5b. Classification (Haiku 4.5)
- 102 councils in `auto_configs.json` pipeline
- ~1.2M transactions classified into 13 MHCLG service categories
- Classification quality after fixes: 28 councils still >30% in "Other Services"
  - 13 of those because dept/purpose columns are too generic (Delivery Units, Directorate codes)
  - 5 are pass-through items (NDR collection, levies) — **legitimate**, not a classifier bug
  - Hillingdon £965M "Non-Domestic Rates" is the biggest single pass-through

### 5c. Transparency layer (NEW 2026-04-17)
- `top_purposes` breakdown attached to every service node (96.7% = 1439 of 1488 nodes)
- Shows top 10 (dept + purpose) combinations by £ within each service
- **Purpose**: makes "Other Services" transparent — user sees "Non-Domestic Rates £965M" explicitly instead of opaque £1.2B "Other"

---

## 6. FY label distribution (data recency)

| FY label | Councils |
|---|---|
| 2023/24 | 114 |
| 2024/25 | 33 |
| Calendar 2024 | 2 |
| 2024/25 with caveats (partial months) | 3 |
| 2023/24 with caveats (missing months, PDF-only, mislabeled) | 11 |
| 2024/25 (4/12 Wayback partial — Oxfordshire) | 1 |
| 2024/25 (6/12 Wayback partial — East Lindsey) | 1 |
| 2025/26 (8/12 early) | 1 |

**Gap**: ~30% of councils lag one FY behind because they publish with 6+ month delay. Not fixable — matches upstream cadence.

---

## 7. Known gaps

### 7a. Infrastructure-gated (need UK VPS or OCR)
**Top uncovered by £:**

| Council | £M MHCLG | Blocker |
|---|---|---|
| Greater Manchester Police | 922.6 | Cloudflare WAF from AR+US |
| West Midlands PCC | 891.6 | Cloudflare |
| **Dorset** | **721.2** | Cloudflare, not in Wayback either |
| West Yorkshire Police | 672.1 | Cloudflare |
| Thames Valley PCC | 649.6 | Cloudflare |
| **Northumberland** | **604.1** | TLS + JS blocked, not in Wayback |
| **Tameside** | **486.0** | TCP timeout everywhere incl. IA crawler |
| Kent PCC | 449.0 | Cloudflare |
| Devon & Cornwall PCC | 447.7 | Cloudflare |
| Essex PCC | 433.3 | Cloudflare |
| South Yorkshire PCC | 410.8 | Cloudflare |
| Northumbria PCC | 399.4 | **Image PDFs, needs Tesseract OCR** |
| Sussex PCC | 392.8 | **9/12 image PDFs, needs Tesseract OCR** |
| Liverpool City Region Combined Auth | 372.2 | **Does not publish spend > £500 at all** (confirmed by agent) |
| **Blackburn with Darwen** | 348.2 | datashare.blackburn.gov.uk blocked from AR+US |
| West Mercia PCC | 307.6 | Cloudflare |
| ...14 more PCCs + combined authorities | ~£3B | Mostly Cloudflare or don't publish |

**Sum of UK-VPS-blocked**: ~£10-12B = +7-8pp to coverage if unlocked.

### 7b. Data quality gaps
- **Hillingdon £965M Non-Domestic Rates**: Correctly classified as Other, but inflates council total. Proper fix = filter collection fund items at scrape.
- **Nottingham 202M in Central Services**: Council uses internal cost-centre codes for dept field. Classifier defaulted to Central. Needs council-scoped `_manual_overrides`.
- **Darlington May/Aug/Dec 2024**: Files ship with SQL query rows as header. Only 9/12 months usable. ~£30-45M unrecovered.
- **North Lincolnshire February 2025**: Amount column contains Excel serial numbers (source corruption). ~£15M unrecovered.
- **Spelthorne 59% Other**: Small council (£22M), dept field values are depot/site names. Manual overrides would fix but low ROI.
- **Westmorland & Furness 750M classified vs 468M MHCLG**: includes £140M+ legitimate HMRC/pensions/capital inter-public transfers. Not a bug, documented.

### 7c. Coverage gaps
- **Shire Districts 158/164 uncovered**: Average £21M per council, total £3.2B. Each requires individual recon. Not worth the effort for the marginal coverage — 164 councils × ~30 min each = 80h for +2pp.
- **Birmingham FY 2023/24**: S114 bankruptcy notice 2023 purged transparency rolling window. Data lost upstream. Only recoverable via FOI (20+ working day turnaround).
- **Colchester £50M**: SharePoint auth-gated (login.microsoftonline.com). Needs manual browser download.
- **Chelmsford £37M**: Available but shipped partially (2024-07 to 2025-03 only, 11 months).

### 7d. Data-source gaps (councils that don't publish)
- **Liverpool City Region Combined Authority £372M**: Confirmed via exhaustive probing. Only Statement of Accounts PDFs + ModernGov committee papers. FOI required.
- **Northamptonshire PCC**: Publishes only aggregates, not line-item.
- **Various Fire/Waste authorities** (~8 entities): Summary-only disclosure.

---

## 8. Tree integrity status

- **Tree sum consistency**: ✓ All children sum == parent value (validated)
- **Orphan lookup keys**: 0 (injector matches all 166 councils)
- **NAME_ALIASES**: 29 entries handling council-name / tree-name divergence
- **Reproducibility**: ✓ Full rebuild produces byte-identical lookup (verified with diff)
- **Schema/config consistency**: ✓ All 102 auto_configs have valid dir + mapping file
- **Deploy status**: ✓ Live site (budgetgalaxy.com) serves 16.09MB tree, matches local

---

## 9. Fiscal consolidation layers (for honest display)

Budget Galaxy applies 5 consolidation steps for UK to avoid double-counting across OSCAR/MHCLG/NHS/Local Gov:

1. **Barnett Formula grants** £88-95B — disclosure only (devolved admin allocations)
2. **MHCLG grants vs LA branch** £22-38B — disclosure only (DCLG funds to councils shown in both places)
3. **NHS Provider Sector vs DHSC NHS Trusts** — netted via `net_nhs_overlap.js` (2023, 2024)
4. **OSCAR 2023 "Non-patient-facing NHS" £114B artifact** — removed via `fix_oscar_2023_nhs.js` (HM Treasury schema cleanup between releases)
5. **OSCAR II LG ENGLAND vs MHCLG Revenue Outturn** — replaced via `replace_oscar_lg.js` (2020-2023 trees)

Known residuals documented, never massaged.

---

## 10. What moves the needle next

### Tier 1 (procurement decision)
- **Hetzner London VPS €4/mo**: Unblocks £10-12B in UK-geo-gated councils → **+7-8pp → 94-95%**
- **Tesseract OCR install** (manual, ~10 min): Unlocks Sussex + Northumbria PCCs → **+0.55pp**

### Tier 2 (code-only, lower ROI)
- Manual browser download of Colchester SharePoint: +0.06pp
- Nottingham `_manual_overrides` for cost-centre reassignment: 0pp but UI quality
- Hillingdon NDR filter at scrape time: 0pp but reduces apparent council size by ~60%
- Wakefield apostrophe re-classify: 0pp, quality improvement

### Tier 3 (calendar / external action)
- FOI for Birmingham 2023/24 bankruptcy data: 20+ day turnaround, unknown yield
- FOI for Liverpool CRCA transaction-level data: 20+ days, may refuse
- Wait for councils to publish FY 2024/25 (~30% still lag): natural, ongoing

### Tier 4 (volume, low per-council ROI)
- Shire Districts long tail: 158 councils × £21M avg = £3.3B at ~30 min each = 80h for +2pp
- Combined Authorities (7): ~£1.5B total, similar complexity per each

**Honest ceiling without Tier 1**: ~87%. With Tier 1 + Tier 2: ~95%. Beyond 95% = Tier 3/4 calendar work.

---

## 11. Session metrics (2026-04-16 / 17)

- Start coverage: 65.2% (110 councils, £92.3B)
- End coverage: 86.54% (167 councils, £122.6B)
- **Delta: +21.34pp single-day record**
- Councils added: +57
- £ classified added: +£30B raw supplier spend
- Commits: ~54
- Parallel agent batches: 8 (75% hit rate: 28 probes, 21 shipped)
- New reusable methods discovered: 4 (SharePoint rewrite, Wayback-as-bypass, manifest re-audit, parallel agent batching)
- Critical bugs found + fixed: 4 (Knowsley purposeCol missing, Isles/Spelthorne duplicate columns, Barnet wrong dept column)
- Data validated across 7 checks, deployed to Vultr, pushed to main

---

**File at**: `D:\germany-ngo-map\UK_UNIVERSE_REPORT_2026-04-17.md`
