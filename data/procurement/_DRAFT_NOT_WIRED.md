# Procurement Data Layer — DRAFT, NOT WIRED

> **READ BEFORE USING OR INTEGRATING.**

## What this directory contains

Standalone workstream for UK procurement enrichment via Contracts Finder OCDS
data. Everything here is **parallel to the active pipeline** — nothing in this
directory is consumed by `scripts/build_supplier_profiles.py` or the frontend
yet.

## Files

| File | Purpose |
|---|---|
| `contracts_flat.jsonl` | Ingested OCDS records, flattened to one row per (release, award, supplier) |
| `contracts_resolved.jsonl` | Flat rows + resolved CH number + confidence (after running the resolver) |
| `supplier_procurement.jsonl` | Per-supplier aggregated procurement metrics (after running the aggregator) |
| `_cross_cutting_stats.json` | Dataset-wide procurement analytics (method breakdown, top sole-source suppliers) |
| `_cursor_state.json` | Ingestion resume state (cursor for Contracts Finder pagination) |
| `_ingest_log.json` | Run history of ingestion |
| `_resolution_report.json` | Entity-resolution hit-rate breakdown |

## Scripts (in `scripts/` dir)

| Script | Purpose | Status |
|---|---|---|
| `procurement_ingest_contracts_finder.py` | Paginate CF OCDS API → `contracts_flat.jsonl` | Tested (5 pages = 659 rows) |
| `procurement_resolve_to_suppliers.py` | Match OCDS suppliers to our CH numbers | Tested (42.5% match rate on pilot) |
| `procurement_aggregate_by_supplier.py` | Per-CH-number procurement metrics | Tested |

All three scripts are standalone — they read from this directory and write back
to this directory. None modify anything else in the repo.

## Current state

- ✅ Ingestion script tested: paginates CF API correctly, writes proper OCDS flat rows
- ✅ Resolution script tested: 42.5% match rate on 5-page pilot
- ✅ Aggregation script tested: per-supplier metrics computed correctly
- ⏸️ Full-year ingestion NOT yet run (waiting to align on scope)
- ⏸️ Integration into `build_supplier_profiles.py` NOT done (by design — awaits team sign-off)

## What to do to wire this into the live pipeline

1. **Decide date range**: recommend FY 2024 (Apr 2024 - Mar 2025) for alignment
   with L5 spend data, OR calendar 2024 for OCDS alignment. Document chosen.

2. **Run full ingestion**:
   ```bash
   python scripts/procurement_ingest_contracts_finder.py --year 2024
   ```
   Expected runtime: 5-15 min. Expected output: 30k-100k rows.

3. **Run resolver**:
   ```bash
   python scripts/procurement_resolve_to_suppliers.py
   ```
   Expected match rate: ~40-60% (rises with more enriched suppliers).

4. **Run aggregator**:
   ```bash
   python scripts/procurement_aggregate_by_supplier.py
   ```

5. **Wire into profile builder**: add to `scripts/build_supplier_profiles.py`:
   ```python
   PROCUREMENT = ROOT / "data" / "procurement" / "supplier_procurement.jsonl"
   proc_by_num = {p["company_number"]: p for p in load_jsonl(PROCUREMENT)}
   # ... in profile assembly ...
   profile["procurement"] = proc_by_num.get(num)  # None if no contracts matched
   ```

6. **Update `_index.json`** to include procurement flags for filter UI:
   ```python
   index_row["procurement_sole_source_heavy"] = (procurement or {}).get("flags", {}).get("sole_source_heavy", False)
   ```

7. **Rebuild profiles**:
   ```bash
   python scripts/build_supplier_profiles.py
   ```

## Known caveats before wiring

1. **Match rate is partial** — ~40-60% of OCDS records resolve to our CH set.
   Non-matches include:
   - Suppliers below our enrichment rank (batches 2/3 will help)
   - Non-UK suppliers
   - Public-body-to-public-body transactions (councils buying from each other)
   - Acronyms and name variants we can't normalize

2. **Contract value ≠ paid spend** (L5 data). Document this clearly in UI.
   The procurement section shows *awarded value*; the spend_profile shows
   *actually paid in FY 2024*. Delta surfaces overruns OR framework call-offs
   that aren't individual contracts.

3. **Framework call-offs often invisible** at individual-contract level. CF
   lists frameworks once but individual call-offs against them may not appear
   as separate notices. `framework_pct` only captures notices tagged
   `frameworkAgreement`, not all framework-sourced work.

4. **MoD + Intelligence redactions** are systematic. Defence suppliers will
   show artificially high `direct` / `limited` method % compared to reality.

5. **Date range completeness**: CF coverage starts 2015. For historical
   analysis pre-2015 you'd need TED or other sources.

6. **Resolution confidence should be preserved in UI**. A `medium` or `low`
   resolution should be visible as such — don't silently promote to high.

## Schema: supplier_procurement.jsonl row

```json
{
  "company_number": "07934306",
  "display_name": "Govia Thameslink Railway Limited",
  "n_contracts": 12,
  "total_awarded_gbp": 1100000000,
  "summary": {
    "procurement_method_count": {"open": 4, "selective": 5, "direct": 1, "limited": 2},
    "procurement_method_value_gbp": {"open": 300000000, "selective": 750000000, ...},
    "sole_source_pct": 6.4,
    "competitive_pct": 85.3,
    "framework_pct": 0,
    "avg_n_tenderers": 3.2,
    "median_n_tenderers": 3,
    "tenderers_disclosed_pct": 58
  },
  "cpv_breakdown": [
    {"code": "60100000", "label": "Passenger transport services", "contracts": 8, "value_gbp": 950000000}
  ],
  "buyers": [
    {"buyer_id": "...", "buyer_name": "Department for Transport", "contracts": 10, "value_gbp": 1050000000}
  ],
  "n_unique_buyers": 2,
  "contracts_timeline": [/* last 30 contracts with full detail */],
  "flags": {
    "sole_source_heavy": false,
    "framework_captive": false,
    "single_buyer_dependency": true
  },
  "resolution_confidence_distribution": {"high": 12, "medium": 0, "low": 0},
  "status": "DRAFT — not wired"
}
```

## Pilot findings (5 pages, 659 rows, 202 suppliers)

- **Match rate: 42.5%** (pilot)
  - 31 direct CH in enriched set
  - 186 direct CH NOT in enriched set (will be captured in batches 2/3)
  - 60 fuzzy normalized match
  - 3 token overlap
  - 379 unmatched
- **Procurement method distribution by value**: 63% open, 36% selective, <1% direct/limited
  (in this small sample; full year likely shifts toward frameworks)
- **100% of records have CPV code**
- Median award value £179k; max £1.1B
- Top buyers in sample: councils and NHS bodies (expected — they submit more notices than central govt)

## Tomorrow's TODO (when picking up)

1. [ ] Run full 2024 ingestion (~10 min)
2. [ ] Run resolver (~1 min)
3. [ ] Run aggregator (~30 sec)
4. [ ] Spot-check 5 suppliers manually: verify their procurement metrics against CF website
5. [ ] Decide whether to extend historical range (2023, 2022, etc.) — useful for trend analysis
6. [ ] Wire into build_supplier_profiles.py (30 min)
7. [ ] Update _preview.html to render procurement card
8. [ ] Document in methodology (add procurement section)

## Why everything is DRAFT

Per-session protocol: this workstream was built in parallel to allow alignment
across multiple Claude Code sessions before any integration. When the team
(human + agents) agrees on:
- Scope (calendar 2024 vs FY 2024, historical depth)
- Schema shape for `profile.procurement`
- UI treatment for unmatched resolution confidences
- How to display `awarded_value` vs `paid_spend` delta

...only then should the "wire it in" step proceed.
