#!/usr/bin/env python3
"""
procurement_build_supplier_timelines.py

DRAFT — NOT WIRED.
Shifts the procurement layer from 'universe stats' to 'deep history per
current supplier'. For each CH number in our enriched set, builds a
year-by-year timeline with trajectory metrics.

Reads:
  data/procurement/contracts_resolved_corrected.jsonl
    (+ additional yearly files if present — auto-detected)
  data/recipients/uk/supplier_enrichment.jsonl  (to filter to our current set)

Writes:
  data/procurement/supplier_timeline.jsonl  (one row per CH number)

Key design choice: framework/shared rows are tagged and partially attributed
(per-supplier share) to avoid trajectory distortion while preserving the
signal that a supplier is on frameworks.

Usage:
  python scripts/procurement_build_supplier_timelines.py
  python scripts/procurement_build_supplier_timelines.py --min-contracts 3   # focus on active
"""

from __future__ import annotations

import argparse
import json
import statistics
import sys
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parents[1]
PROC_DIR = ROOT / "data" / "procurement"
ENRICHMENT = ROOT / "data" / "recipients" / "uk" / "supplier_enrichment.jsonl"
OUT = PROC_DIR / "supplier_timeline.jsonl"
OUT_STATS = PROC_DIR / "_timeline_stats.json"

SOLE_SOURCE_METHODS = {"direct", "limited"}
COMPETITIVE_METHODS = {"open", "selective", "competitiveDialogue"}
FRAMEWORK_METHODS = {"frameworkAgreement"}


def safe_pct(part, whole):
    return round(part / whole * 100, 2) if whole else 0.0


def _val(row) -> float:
    """Per-supplier corrected value, falls back to raw award_value_gbp."""
    v = row.get("per_supplier_award_value_gbp")
    if v is None:
        v = row.get("award_value_gbp") or 0
    return v or 0


def _year_from_iso(s: str | None) -> int | None:
    if not s:
        return None
    try:
        return int(s[:4])
    except (ValueError, TypeError):
        return None


def load_current_supplier_ch_numbers() -> set[str]:
    """CH numbers present in our active enrichment (priority targets for timelines)."""
    nums = set()
    if not ENRICHMENT.exists():
        return nums
    with open(ENRICHMENT, encoding="utf-8") as fh:
        for line in fh:
            try:
                r = json.loads(line)
            except json.JSONDecodeError:
                continue
            if r.get("error"):
                continue
            num = (r.get("company") or {}).get("company_number")
            if num:
                nums.add(num)
    return nums


def load_all_resolved_rows() -> list[dict]:
    """Load resolved rows, preferring corrected (framework-adjusted) file."""
    corrected = PROC_DIR / "contracts_resolved_corrected.jsonl"
    plain = PROC_DIR / "contracts_resolved.jsonl"
    path = corrected if corrected.exists() else plain
    if not path.exists():
        print(f"Error: no resolved contracts file found at {path}", file=sys.stderr)
        sys.exit(1)
    rows = []
    with open(path, encoding="utf-8") as fh:
        for line in fh:
            try:
                rows.append(json.loads(line))
            except json.JSONDecodeError:
                continue
    return rows


def classify_trajectory(yearly: dict[int, dict]) -> tuple[str, str]:
    """
    Look at per-year awarded values to label trajectory.
    Returns (label, explanation).
    """
    years = sorted(yearly.keys())
    if len(years) <= 1:
        return ("insufficient_data", "only one year of data")

    current_year = max(years)
    prior_year = current_year - 1
    if prior_year not in yearly:
        # data gap
        return ("gap_in_history", f"no data for {prior_year}")

    # assess trajectory from first-to-last year of data
    first_val = yearly[years[0]]["awarded_gbp_non_framework"]
    last_val = yearly[years[-1]]["awarded_gbp_non_framework"]

    if first_val == 0 and last_val > 0:
        return ("new_entrant", f"no contracts before {years[-1]}")
    if last_val == 0 and first_val > 0:
        return ("exited", f"no contracts in {years[-1]}")
    if last_val == 0 and first_val == 0:
        return ("only_frameworks", "all revenue from framework listings")

    # use compound annual growth rate (CAGR) over first non-trivial year → last year,
    # more robust than averaging YoY percent changes (which explodes on small bases).
    non_trivial_years = [y for y in years if yearly[y]["awarded_gbp_non_framework"] >= 1_000_000]
    if len(non_trivial_years) < 2:
        return ("sparse", "fewer than 2 years with >=£1M non-framework")
    y0, yN = non_trivial_years[0], non_trivial_years[-1]
    v0 = yearly[y0]["awarded_gbp_non_framework"]
    vN = yearly[yN]["awarded_gbp_non_framework"]
    n_years = yN - y0
    if v0 <= 0 or n_years <= 0:
        return ("sparse", "insufficient baseline")
    cagr = (vN / v0) ** (1.0 / n_years) - 1.0
    note = f"CAGR {cagr*100:+.1f}% between {y0} (£{v0/1e6:.0f}M) and {yN} (£{vN/1e6:.0f}M)"
    if cagr > 0.15:
        return ("growing", note)
    if cagr < -0.15:
        return ("declining", note)
    return ("stable", note)


def build_timeline_for_supplier(ch: str, rows: list[dict]) -> dict:
    """Compute full timeline + summary for one supplier."""
    # partition by year
    by_year: dict[int, list[dict]] = defaultdict(list)
    for r in rows:
        y = _year_from_iso(r.get("award_date")) or _year_from_iso(r.get("release_date"))
        if y:
            by_year[y].append(r)

    yearly: dict[int, dict] = {}
    for year, year_rows in sorted(by_year.items()):
        non_fw_rows = [r for r in year_rows if not r.get("is_framework_or_shared")]
        fw_rows = [r for r in year_rows if r.get("is_framework_or_shared")]

        method_counts = Counter(r.get("procurement_method") or "unspecified" for r in year_rows)
        method_values: dict[str, float] = defaultdict(float)
        for r in year_rows:
            method_values[r.get("procurement_method") or "unspecified"] += _val(r)

        tenderers = [r["number_of_tenderers"] for r in year_rows if r.get("number_of_tenderers")]

        buyers: dict[str, dict] = defaultdict(lambda: {"contracts": 0, "value_gbp": 0})
        for r in year_rows:
            name = r.get("buyer_name") or "unknown"
            buyers[name]["contracts"] += 1
            buyers[name]["value_gbp"] += _val(r)
        buyer_list = sorted(
            [{"buyer": k, **v} for k, v in buyers.items()],
            key=lambda b: -b["value_gbp"],
        )

        total_val = sum(_val(r) for r in year_rows)
        non_fw_val = sum(_val(r) for r in non_fw_rows)
        fw_val = sum(_val(r) for r in fw_rows)
        sole_source_val = sum(_val(r) for r in year_rows
                              if (r.get("procurement_method") or "") in SOLE_SOURCE_METHODS)

        yearly[year] = {
            "n_contracts": len(year_rows),
            "n_contracts_non_framework": len(non_fw_rows),
            "awarded_gbp_total": total_val,
            "awarded_gbp_non_framework": non_fw_val,
            "awarded_gbp_framework_share": fw_val,
            "sole_source_pct": safe_pct(sole_source_val, total_val),
            "avg_n_tenderers": round(statistics.mean(tenderers), 1) if tenderers else None,
            "n_unique_buyers": len(buyers),
            "top_buyers": buyer_list[:5],
            "procurement_method_counts": dict(method_counts),
        }

    # cross-year summary
    all_contracts = [r for rl in by_year.values() for r in rl]
    non_fw_all = [r for r in all_contracts if not r.get("is_framework_or_shared")]

    buyer_totals: dict[str, dict] = defaultdict(lambda: {"years_seen": set(), "contracts": 0, "value_gbp": 0})
    for r in all_contracts:
        name = r.get("buyer_name") or "unknown"
        y = _year_from_iso(r.get("award_date")) or _year_from_iso(r.get("release_date"))
        if y:
            buyer_totals[name]["years_seen"].add(y)
        buyer_totals[name]["contracts"] += 1
        buyer_totals[name]["value_gbp"] += _val(r)
    longest_buyer = None
    if buyer_totals:
        longest_buyer = max(buyer_totals.items(), key=lambda x: (len(x[1]["years_seen"]), x[1]["value_gbp"]))
        longest_buyer = {
            "buyer": longest_buyer[0],
            "years_count": len(longest_buyer[1]["years_seen"]),
            "years_list": sorted(longest_buyer[1]["years_seen"]),
            "total_value_gbp": longest_buyer[1]["value_gbp"],
            "n_contracts": longest_buyer[1]["contracts"],
        }

    # consecutive same-buyer direct awards
    consecutive_direct = 0
    sorted_contracts = sorted([r for r in all_contracts if (r.get("procurement_method") or "") in SOLE_SOURCE_METHODS],
                               key=lambda r: r.get("award_date") or r.get("release_date") or "")
    current_streak = 0
    prev_buyer = None
    max_streak = 0
    for r in sorted_contracts:
        b = r.get("buyer_name")
        if b and b == prev_buyer:
            current_streak += 1
            max_streak = max(max_streak, current_streak)
        else:
            current_streak = 1
        prev_buyer = b

    trajectory_label, trajectory_note = classify_trajectory(yearly)

    # CPV evolution — top CPV each year
    cpv_by_year: dict[int, dict] = {}
    for year, year_rows in sorted(by_year.items()):
        cpv_counter: Counter = Counter()
        cpv_values: dict[str, float] = defaultdict(float)
        cpv_labels: dict[str, str] = {}
        for r in year_rows:
            code = r.get("cpv_code")
            if code:
                cpv_counter[code] += 1
                cpv_values[code] += _val(r)
                cpv_labels[code] = r.get("cpv_label") or cpv_labels.get(code, "")
        if cpv_counter:
            top_code = cpv_values and max(cpv_values.items(), key=lambda x: x[1])[0]
            cpv_by_year[year] = {
                "top_code": top_code,
                "top_label": cpv_labels.get(top_code),
                "top_value_gbp": cpv_values[top_code],
                "n_distinct_codes": len(cpv_counter),
            }

    # red flag detection
    flags = {
        "consecutive_same_buyer_direct_awards": max_streak >= 3,
        "consecutive_streak_length": max_streak,
        "single_buyer_dependency_always": longest_buyer and len(buyer_totals) == 1,
        "trajectory_growing": trajectory_label == "growing",
        "trajectory_declining": trajectory_label == "declining",
        "new_entrant_last_year": trajectory_label == "new_entrant",
        "only_frameworks": trajectory_label == "only_frameworks",
    }

    display_name = next((r.get("resolved_display_name") or r.get("supplier_name")
                         for r in all_contracts
                         if r.get("resolved_display_name") or r.get("supplier_name")), "")

    return {
        "company_number": ch,
        "display_name": display_name,
        "years_covered": sorted(yearly.keys()),
        "yearly": {str(y): v for y, v in yearly.items()},  # JSON keys must be strings
        "cpv_evolution": {str(y): v for y, v in cpv_by_year.items()},
        "summary": {
            "total_contracts_all_years": len(all_contracts),
            "total_contracts_non_framework": len(non_fw_all),
            "total_awarded_all_years_gbp": sum(_val(r) for r in all_contracts),
            "total_awarded_non_framework_gbp": sum(_val(r) for r in non_fw_all),
            "years_active": len(yearly),
            "first_year_seen": min(yearly.keys()) if yearly else None,
            "last_year_seen": max(yearly.keys()) if yearly else None,
            "trajectory": trajectory_label,
            "trajectory_note": trajectory_note,
            "longest_buyer_relationship": longest_buyer,
            "n_unique_buyers_all_years": len(buyer_totals),
            "max_consecutive_same_buyer_direct": max_streak,
        },
        "flags": flags,
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z"),
        "status": "DRAFT — not wired",
    }


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--min-contracts", type=int, default=1,
                    help="Skip suppliers with fewer than N total contracts (default: 1)")
    args = ap.parse_args()

    current_ch = load_current_supplier_ch_numbers()
    print(f"Current enriched suppliers: {len(current_ch)}")

    rows = load_all_resolved_rows()
    print(f"Resolved contract rows: {len(rows)}")

    # group by resolved CH number, but only keep rows where CH matches our current set
    rows_by_ch: dict[str, list[dict]] = defaultdict(list)
    for r in rows:
        ch = r.get("resolved_ch_number")
        if ch:
            rows_by_ch[ch].append(r)

    # focus on current-supplier matches
    current_with_contracts = {ch: rs for ch, rs in rows_by_ch.items() if ch in current_ch}
    print(f"Current suppliers with ≥1 contract in data: {len(current_with_contracts)}")
    print(f"Non-current suppliers with contracts:       {len(rows_by_ch) - len(current_with_contracts)}")

    # detect years covered in the dataset
    all_years = set()
    for rs in rows_by_ch.values():
        for r in rs:
            y = _year_from_iso(r.get("award_date")) or _year_from_iso(r.get("release_date"))
            if y:
                all_years.add(y)
    print(f"Years covered in data: {sorted(all_years)}")

    timelines = []
    trajectory_counter = Counter()
    for ch, supplier_rows in current_with_contracts.items():
        if len(supplier_rows) < args.min_contracts:
            continue
        timeline = build_timeline_for_supplier(ch, supplier_rows)
        timelines.append(timeline)
        trajectory_counter[timeline["summary"]["trajectory"]] += 1

    timelines.sort(key=lambda t: -t["summary"]["total_awarded_non_framework_gbp"])

    with open(OUT, "w", encoding="utf-8") as fh:
        for t in timelines:
            fh.write(json.dumps(t, ensure_ascii=False) + "\n")

    # cross-cutting stats
    stats = {
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z"),
        "years_in_data": sorted(all_years),
        "total_current_suppliers": len(current_ch),
        "current_with_contracts": len(current_with_contracts),
        "coverage_pct": safe_pct(len(current_with_contracts), len(current_ch)),
        "timelines_written": len(timelines),
        "by_trajectory": dict(trajectory_counter),
        "status": "DRAFT — not wired",
    }
    OUT_STATS.write_text(json.dumps(stats, indent=2, ensure_ascii=False), encoding="utf-8")

    print()
    print("=== TIMELINE BUILD SUMMARY ===")
    print(f"  years in data:          {sorted(all_years)}")
    print(f"  timelines written:      {len(timelines)}")
    print(f"  coverage (our set):     {stats['coverage_pct']}% of {len(current_ch)} current suppliers")
    print()
    print("Trajectory distribution:")
    for traj, n in trajectory_counter.most_common():
        print(f"  {traj:<20} {n:>4}")


if __name__ == "__main__":
    main()
