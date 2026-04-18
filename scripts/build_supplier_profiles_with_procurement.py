#!/usr/bin/env python3
"""
build_supplier_profiles_with_procurement.py

DRAFT — NOT WIRED.
Creates an enriched parallel version of each supplier profile that adds a
`procurement` section with:

  - 5-year timeline (per-year contracts, values, top buyer, sole-source %)
  - Trajectory label (growing / declining / stable / new_entrant / exited)
  - Longest buyer relationship
  - Cross-layer signals (paid 2024 from L5 vs awarded 2024 from CF, ratio, interpretation)
  - Contract timeline events (last 30) for UI timeline viz
  - CPV evolution
  - Red-flag procurement flags
  - Source citations (Contracts Finder notice URLs)

This script does NOT modify anything under data/suppliers/. It writes the
enriched profiles to a parallel directory data/suppliers_v2/, and a parallel
_index.json with additional procurement filter fields.

When the team aligns on integration, the following steps wire it in:
  1. Merge this script's logic into build_supplier_profiles.py
  2. Add PROCUREMENT and TIMELINE path constants
  3. Rebuild data/suppliers/
  4. Update frontend to render the new procurement section
  5. (Optional) Update _index.json with procurement filter fields

Reads:
  data/suppliers/{num}.json                    (existing profiles — not modified)
  data/suppliers/_index.json                   (existing index — not modified)
  data/procurement/supplier_timeline.jsonl     (from procurement_build_supplier_timelines.py)
  data/procurement/supplier_procurement.jsonl  (from procurement_aggregate_by_supplier.py)

Writes:
  data/suppliers_v2/{num}.json
  data/suppliers_v2/_index.json
  data/suppliers_v2/_manifest.json
  data/suppliers_v2/_procurement_coverage_report.json

Usage: python scripts/build_supplier_profiles_with_procurement.py
"""

from __future__ import annotations

import json
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parents[1]

# inputs (read-only)
SRC_PROFILES = ROOT / "data" / "suppliers"
TIMELINE = ROOT / "data" / "procurement" / "supplier_timeline.jsonl"
PROCUREMENT = ROOT / "data" / "procurement" / "supplier_procurement.jsonl"

# outputs (parallel, safe)
OUT_DIR = ROOT / "data" / "suppliers_v2"
OUT_INDEX = OUT_DIR / "_index.json"
OUT_MANIFEST = OUT_DIR / "_manifest.json"
OUT_COVERAGE = OUT_DIR / "_procurement_coverage_report.json"

VERSION = "1.2.0-procurement-draft"


def load_jsonl_by_key(path: Path, key: str) -> dict[str, dict]:
    out: dict[str, dict] = {}
    if not path.exists():
        return out
    with open(path, encoding="utf-8") as fh:
        for line in fh:
            try:
                r = json.loads(line)
            except json.JSONDecodeError:
                continue
            k = r.get(key)
            if k:
                out[k] = r
    return out


def interpret_awarded_vs_paid(awarded_2024: float, paid_2024: float) -> dict:
    """Interpret the cross-layer delta between CF awarded and L5 paid."""
    if awarded_2024 is None and paid_2024 is None:
        return {"signal": "no_data", "note": None, "ratio": None}
    awarded_2024 = awarded_2024 or 0
    paid_2024 = paid_2024 or 0
    ratio = (awarded_2024 / paid_2024) if paid_2024 > 0 else None

    if paid_2024 > 0 and awarded_2024 == 0:
        return {
            "signal": "paid_on_prior_contracts",
            "note": "Paid in 2024 but no new awards visible in Contracts Finder — "
                    "likely on pre-existing multi-year contracts.",
            "ratio": None,
        }
    if awarded_2024 > 0 and paid_2024 == 0:
        return {
            "signal": "awarded_not_yet_paid",
            "note": "New awards in 2024 but no L5 payments — pipeline for future years.",
            "ratio": None,
        }
    if ratio is None:
        return {"signal": "no_match", "note": None, "ratio": None}
    if ratio >= 3:
        return {
            "signal": "forward_pipeline_large",
            "note": f"Awarded {ratio:.1f}× current payments — major pipeline for 2025+.",
            "ratio": round(ratio, 2),
        }
    if ratio >= 1.5:
        return {
            "signal": "forward_pipeline_moderate",
            "note": f"Awarded {ratio:.1f}× current payments — moderate growth expected.",
            "ratio": round(ratio, 2),
        }
    if ratio >= 0.66:
        return {
            "signal": "balanced",
            "note": "Awarded and paid roughly aligned.",
            "ratio": round(ratio, 2),
        }
    inverse = 1.0 / ratio if ratio > 0 else None
    return {
        "signal": "paid_exceeds_awarded",
        "note": f"Paid {inverse:.1f}× awarded — payments on existing contracts, "
                f"scope changes, or framework draw-downs not in new notices.",
        "ratio": round(ratio, 2),
    }


def build_procurement_section(
    company_number: str,
    paid_2024_l5: int,
    timeline: dict | None,
    procurement: dict | None,
) -> dict:
    if not timeline and not procurement:
        return {
            "status": "no_contracts_found",
            "note": "No Contracts Finder matches for this supplier in 2020-2024.",
        }

    awarded_2024 = 0
    if timeline and "2024" in timeline.get("yearly", {}):
        awarded_2024 = timeline["yearly"]["2024"].get("awarded_gbp_total", 0)
    elif procurement:
        awarded_2024 = procurement.get("total_awarded_gbp", 0)

    cross_layer = interpret_awarded_vs_paid(awarded_2024, paid_2024_l5)

    section: dict = {
        "status": "matched",
        "data_sources": ["contracts_finder_ocds"],
    }

    if timeline:
        s = timeline.get("summary") or {}
        section["coverage_years"] = timeline.get("years_covered", [])
        section["summary"] = {
            "total_contracts": s.get("total_contracts_all_years"),
            "total_contracts_non_framework": s.get("total_contracts_non_framework"),
            "total_awarded_gbp": s.get("total_awarded_all_years_gbp"),
            "total_awarded_non_framework_gbp": s.get("total_awarded_non_framework_gbp"),
            "years_active": s.get("years_active"),
            "first_year": s.get("first_year_seen"),
            "last_year": s.get("last_year_seen"),
            "trajectory": s.get("trajectory"),
            "trajectory_note": s.get("trajectory_note"),
            "longest_buyer_relationship": s.get("longest_buyer_relationship"),
            "n_unique_buyers_all_years": s.get("n_unique_buyers_all_years"),
            "max_consecutive_same_buyer_direct": s.get("max_consecutive_same_buyer_direct"),
        }
        section["yearly"] = {
            year: {
                "n_contracts": y.get("n_contracts"),
                "n_contracts_non_framework": y.get("n_contracts_non_framework"),
                "awarded_gbp_total": y.get("awarded_gbp_total"),
                "awarded_gbp_non_framework": y.get("awarded_gbp_non_framework"),
                "awarded_gbp_framework_share": y.get("awarded_gbp_framework_share"),
                "sole_source_pct": y.get("sole_source_pct"),
                "avg_n_tenderers": y.get("avg_n_tenderers"),
                "n_unique_buyers": y.get("n_unique_buyers"),
                "top_buyer": (y.get("top_buyers") or [{}])[0] if y.get("top_buyers") else None,
                "procurement_method_counts": y.get("procurement_method_counts"),
            }
            for year, y in timeline.get("yearly", {}).items()
        }
        section["cpv_evolution"] = timeline.get("cpv_evolution", {})
        section["flags"] = timeline.get("flags", {})

    if procurement:
        # detail tables available from aggregation
        section["procurement_detail"] = {
            "procurement_method_count_all_years": procurement.get("summary", {}).get("procurement_method_count"),
            "procurement_method_value_gbp_all_years": procurement.get("summary", {}).get("procurement_method_value_gbp"),
            "sole_source_pct_all_years": procurement.get("summary", {}).get("sole_source_pct"),
            "competitive_pct_all_years": procurement.get("summary", {}).get("competitive_pct"),
            "framework_pct_all_years": procurement.get("summary", {}).get("framework_pct"),
            "avg_n_tenderers_all_years": procurement.get("summary", {}).get("avg_n_tenderers"),
            "tenderers_disclosed_pct": procurement.get("summary", {}).get("tenderers_disclosed_pct"),
        }
        section["top_buyers_all_years"] = procurement.get("buyers", [])[:15]
        section["cpv_breakdown_all_years"] = procurement.get("cpv_breakdown", [])[:10]
        section["contracts_timeline"] = procurement.get("contracts_timeline", [])[:30]
        # merge aggregator flags with timeline flags (they're complementary)
        section.setdefault("flags", {}).update(procurement.get("flags") or {})

    section["cross_layer_signals"] = {
        "paid_2024_gbp_from_l5": paid_2024_l5,
        "awarded_2024_gbp_from_cf": awarded_2024,
        **cross_layer,
    }

    return section


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    timelines = load_jsonl_by_key(TIMELINE, "company_number")
    procurements = load_jsonl_by_key(PROCUREMENT, "company_number")
    print(f"Timelines loaded:   {len(timelines)}")
    print(f"Procurements loaded: {len(procurements)}")

    if not SRC_PROFILES.exists():
        print(f"Error: {SRC_PROFILES} not found.", file=sys.stderr)
        sys.exit(1)

    profile_files = [p for p in SRC_PROFILES.glob("*.json") if not p.name.startswith("_")]
    print(f"Source profiles to enrich: {len(profile_files)}")

    enriched_index: list[dict] = []
    stats = {
        "profiles_processed": 0,
        "with_procurement_data": 0,
        "no_contracts_found": 0,
        "trajectory_distribution": Counter(),
        "forward_pipeline_large": 0,
        "paid_exceeds_awarded": 0,
    }

    for pf in profile_files:
        profile = json.loads(pf.read_text(encoding="utf-8"))
        num = profile["company_number"]

        paid_2024 = (profile.get("spend_profile") or {}).get("total_gbp_2024") or 0

        procurement_section = build_procurement_section(
            num,
            paid_2024,
            timelines.get(num),
            procurements.get(num),
        )
        profile["procurement"] = procurement_section

        # update sources to include CF citation if matched
        if procurement_section.get("status") == "matched":
            profile.setdefault("sources", []).append({
                "section": "procurement",
                "type": "contracts_finder_ocds",
                "url": "https://www.contractsfinder.service.gov.uk",
                "note": "Per-contract source URLs embedded in procurement.contracts_timeline[].source_url",
            })

        # metadata bump
        md = profile.setdefault("metadata", {})
        md["procurement_enriched_at"] = datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")
        md["generator_version"] = VERSION

        out_path = OUT_DIR / pf.name
        out_path.write_text(json.dumps(profile, ensure_ascii=False, indent=2), encoding="utf-8")

        stats["profiles_processed"] += 1
        if procurement_section.get("status") == "matched":
            stats["with_procurement_data"] += 1
            traj = (procurement_section.get("summary") or {}).get("trajectory")
            if traj:
                stats["trajectory_distribution"][traj] += 1
            signal = (procurement_section.get("cross_layer_signals") or {}).get("signal")
            if signal == "forward_pipeline_large":
                stats["forward_pipeline_large"] += 1
            elif signal == "paid_exceeds_awarded":
                stats["paid_exceeds_awarded"] += 1
        else:
            stats["no_contracts_found"] += 1

        # enriched index row
        identity = profile.get("identity") or {}
        spend = profile.get("spend_profile") or {}
        ownership = profile.get("ownership_chain") or {}
        mc = profile.get("match_confidence") or {}
        p = procurement_section

        y2024 = ((p.get("yearly") or {}).get("2024")) if p.get("status") == "matched" else None

        enriched_index.append({
            "company_number": num,
            "display_name": profile.get("display_name"),
            "official_name": identity.get("official_name"),
            "rank": spend.get("rank"),
            "total_gbp_2024": spend.get("total_gbp_2024"),
            "category": profile.get("classification", {}).get("category"),
            "status": identity.get("status"),
            "jurisdiction": identity.get("jurisdiction"),
            "sic_codes": identity.get("sic_codes"),
            "n_departments": spend.get("n_departments"),
            "ubo_resolution": ownership.get("resolution"),
            "ubo_ultimate_countries": (ownership.get("ubo_summary") or {}).get("ultimate_foreign_countries") or [],
            "has_accounts_pdf": bool((profile.get("financial_health") or {}).get("pdf")),
            "match_confidence_score": mc.get("score"),
            "match_confidence_label": mc.get("label"),
            # new procurement filter fields:
            "procurement_status": p.get("status"),
            "procurement_trajectory": (p.get("summary") or {}).get("trajectory") if p.get("status") == "matched" else None,
            "procurement_total_awarded_gbp_all_years": (p.get("summary") or {}).get("total_awarded_non_framework_gbp") if p.get("status") == "matched" else None,
            "procurement_awarded_2024_gbp": y2024.get("awarded_gbp_total") if y2024 else None,
            "procurement_sole_source_pct_2024": y2024.get("sole_source_pct") if y2024 else None,
            "procurement_years_active": (p.get("summary") or {}).get("years_active") if p.get("status") == "matched" else None,
            "procurement_cross_layer_signal": (p.get("cross_layer_signals") or {}).get("signal"),
            "procurement_cross_layer_ratio": (p.get("cross_layer_signals") or {}).get("ratio"),
            "procurement_has_consecutive_same_buyer_direct": (p.get("flags") or {}).get("consecutive_same_buyer_direct_awards", False),
        })

    enriched_index.sort(key=lambda r: r["rank"] or 99999)
    OUT_INDEX.write_text(json.dumps(enriched_index, ensure_ascii=False, indent=2), encoding="utf-8")

    # manifest
    manifest = {
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z"),
        "generator_version": VERSION,
        "status": "DRAFT — parallel to data/suppliers/. Not wired anywhere.",
        "source_profiles_dir": str(SRC_PROFILES.relative_to(ROOT)),
        "inputs": {
            "timeline_jsonl": str(TIMELINE.relative_to(ROOT)),
            "procurement_jsonl": str(PROCUREMENT.relative_to(ROOT)),
        },
        "counts": {
            "profiles_processed": stats["profiles_processed"],
            "with_procurement_data": stats["with_procurement_data"],
            "no_contracts_found": stats["no_contracts_found"],
            "forward_pipeline_large": stats["forward_pipeline_large"],
            "paid_exceeds_awarded": stats["paid_exceeds_awarded"],
            "trajectory_distribution": dict(stats["trajectory_distribution"]),
        },
        "additions_vs_v1": [
            "added `procurement` section with 5-year timeline + summary + yearly + cpv_evolution",
            "added `procurement.cross_layer_signals` (paid L5 vs awarded CF comparison)",
            "added procurement source citation to `sources` when matched",
            "extended `_index.json` rows with procurement_* filter fields",
        ],
        "integration_steps_when_aligned": [
            "merge logic into scripts/build_supplier_profiles.py",
            "delete data/suppliers_v2/ after merging",
            "rebuild data/suppliers/ with the merged script",
            "update frontend to render profile.procurement section",
            "add procurement filter chips to supplier list UI using new _index.json fields",
        ],
    }
    OUT_MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")

    # coverage report
    coverage = {
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z"),
        "total_profiles": stats["profiles_processed"],
        "with_procurement_data": stats["with_procurement_data"],
        "coverage_pct": round(stats["with_procurement_data"] / stats["profiles_processed"] * 100, 2)
            if stats["profiles_processed"] else 0,
        "trajectory_distribution": dict(stats["trajectory_distribution"]),
        "cross_layer_signal_counts": {
            "forward_pipeline_large": stats["forward_pipeline_large"],
            "paid_exceeds_awarded": stats["paid_exceeds_awarded"],
        },
    }
    OUT_COVERAGE.write_text(json.dumps(coverage, ensure_ascii=False, indent=2), encoding="utf-8")

    print()
    print("=== PROFILE ENRICHMENT SUMMARY ===")
    print(f"  profiles_processed:         {stats['profiles_processed']}")
    print(f"  with_procurement_data:      {stats['with_procurement_data']}")
    print(f"  no_contracts_found:         {stats['no_contracts_found']}")
    print(f"  coverage_pct:               {coverage['coverage_pct']}%")
    print()
    print(f"Cross-layer signals:")
    print(f"  forward_pipeline_large:     {stats['forward_pipeline_large']}")
    print(f"  paid_exceeds_awarded:       {stats['paid_exceeds_awarded']}")
    print()
    print(f"Trajectory distribution:")
    for t, n in stats["trajectory_distribution"].most_common():
        print(f"  {t:<20} {n:>4}")
    print()
    print(f"Outputs:")
    print(f"  profiles: {OUT_DIR.relative_to(ROOT)}/{{company_number}}.json ({stats['profiles_processed']} files)")
    print(f"  index:    {OUT_INDEX.relative_to(ROOT)}")
    print(f"  manifest: {OUT_MANIFEST.relative_to(ROOT)}")
    print()
    print("Status: DRAFT — data/suppliers/ is unchanged. Align with team before wiring.")


if __name__ == "__main__":
    main()
