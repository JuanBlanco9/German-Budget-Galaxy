#!/usr/bin/env python3
"""
procurement_aggregate_by_supplier.py

DRAFT — NOT WIRED.
Takes resolved contract rows and produces a per-supplier procurement summary.
Output lives in data/procurement/supplier_procurement.jsonl.

Metrics per supplier (keyed by company_number):
  - n_contracts_awarded, total_awarded_gbp
  - procurement_method_pct (open/selective/limited/direct/framework breakdown)
  - sole_source_pct (direct + limited as % of value)
  - framework_dependency_pct
  - avg/median n_tenderers (when disclosed)
  - cpv_breakdown (top sectors of work)
  - buyers (who buys from them + value per buyer)
  - contracts timeline (most recent N)
  - flags: sole_source_heavy, framework_captive, single_buyer_dependency, etc.

Status: standalone; does not modify the active pipeline. Ready for integration.

Usage: python scripts/procurement_aggregate_by_supplier.py
"""

from __future__ import annotations

import json
import statistics
import sys
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parents[1]
IN = ROOT / "data" / "procurement" / "contracts_resolved_corrected.jsonl"
if not IN.exists():
    IN = ROOT / "data" / "procurement" / "contracts_resolved.jsonl"
OUT = ROOT / "data" / "procurement" / "supplier_procurement.jsonl"
CROSS_CUTTING = ROOT / "data" / "procurement" / "_cross_cutting_stats.json"

SOLE_SOURCE_METHODS = {"direct", "limited"}
COMPETITIVE_METHODS = {"open", "selective", "competitiveDialogue"}
FRAMEWORK_METHODS = {"frameworkAgreement"}


def safe_pct(part: float, whole: float) -> float:
    return round(part / whole * 100, 2) if whole else 0.0


def main() -> None:
    if not IN.exists():
        print(f"Error: {IN} not found. Run procurement_resolve_to_suppliers.py first.", file=sys.stderr)
        sys.exit(1)

    rows: list[dict] = []
    with open(IN, encoding="utf-8") as fh:
        for line in fh:
            rows.append(json.loads(line))

    # group by resolved CH number
    by_ch: dict[str, list[dict]] = defaultdict(list)
    for r in rows:
        ch = r.get("resolved_ch_number")
        if not ch:
            continue
        by_ch[ch].append(r)

    print(f"Input rows: {len(rows)}")
    print(f"Grouped suppliers: {len(by_ch)}")

    out_records: list[dict] = []
    cross_cutting = {
        "by_procurement_method": Counter(),
        "by_procurement_method_value_gbp": defaultdict(float),
        "top_sole_source_suppliers": [],
        "top_non_competitive_buyers": Counter(),
        "overrun_signals": [],  # reserved: requires cross-join with spend data
    }

    for ch, supplier_rows in by_ch.items():
        # metrics
        n_awards = sum(1 for r in supplier_rows if r.get("award_id"))
        def _val(r):
            v = r.get("per_supplier_award_value_gbp")
            return v if v is not None else r.get("award_value_gbp")
        values = [_val(r) for r in supplier_rows if _val(r) and _val(r) > 0]
        total_value = sum(values)

        # procurement method breakdown
        method_value: dict[str, float] = defaultdict(float)
        method_count: Counter = Counter()
        for r in supplier_rows:
            m = r.get("procurement_method") or "unspecified"
            method_count[m] += 1
            v = (r.get("per_supplier_award_value_gbp") if r.get("per_supplier_award_value_gbp") is not None else r.get("award_value_gbp")) or 0
            method_value[m] += v
            cross_cutting["by_procurement_method"][m] += 1
            cross_cutting["by_procurement_method_value_gbp"][m] += v

        sole_source_value = sum(method_value[m] for m in SOLE_SOURCE_METHODS)
        competitive_value = sum(method_value[m] for m in COMPETITIVE_METHODS)
        framework_value = sum(method_value[m] for m in FRAMEWORK_METHODS)

        # tenderers
        tenderers = [r["number_of_tenderers"] for r in supplier_rows
                     if r.get("number_of_tenderers")]

        # CPV breakdown
        cpv_stats: dict[str, dict] = defaultdict(lambda: {"count": 0, "value_gbp": 0, "label": None})
        for r in supplier_rows:
            code = r.get("cpv_code")
            if code:
                cpv_stats[code]["count"] += 1
                cpv_stats[code]["value_gbp"] += (r.get("per_supplier_award_value_gbp") if r.get("per_supplier_award_value_gbp") is not None else r.get("award_value_gbp")) or 0
                cpv_stats[code]["label"] = r.get("cpv_label") or cpv_stats[code]["label"]

        # buyer breakdown
        buyers: dict[tuple, dict] = defaultdict(lambda: {"contracts": 0, "value_gbp": 0})
        for r in supplier_rows:
            key = (r.get("buyer_id"), r.get("buyer_name"))
            buyers[key]["contracts"] += 1
            buyers[key]["value_gbp"] += (r.get("per_supplier_award_value_gbp") if r.get("per_supplier_award_value_gbp") is not None else r.get("award_value_gbp")) or 0
        buyer_list = [
            {"buyer_id": k[0], "buyer_name": k[1], "contracts": v["contracts"], "value_gbp": v["value_gbp"]}
            for k, v in buyers.items()
        ]
        buyer_list.sort(key=lambda b: -b["value_gbp"])

        # contracts timeline (all, sorted desc)
        timeline = []
        for r in supplier_rows:
            timeline.append({
                "ocid": r.get("ocid"),
                "date": r.get("award_date") or r.get("release_date"),
                "buyer": r.get("buyer_name"),
                "title": r.get("tender_title"),
                "value_gbp": (r.get("per_supplier_award_value_gbp") if r.get("per_supplier_award_value_gbp") is not None else r.get("award_value_gbp")),
                "procurement_method": r.get("procurement_method"),
                "cpv_code": r.get("cpv_code"),
                "cpv_label": r.get("cpv_label"),
                "contract_start": r.get("award_contract_start"),
                "contract_end": r.get("award_contract_end"),
                "source_url": r.get("source_notice_url"),
                "resolution_method": r.get("resolution_method"),
                "resolution_confidence": r.get("resolution_confidence"),
            })
        timeline.sort(key=lambda t: t.get("date") or "", reverse=True)

        # flags
        flags = {
            "sole_source_heavy": safe_pct(sole_source_value, total_value) >= 30,
            "framework_captive": safe_pct(framework_value, total_value) >= 70,
            "single_buyer_dependency": buyer_list and safe_pct(buyer_list[0]["value_gbp"], total_value) >= 80,
            "repeat_same_buyer_direct": False,  # harder signal; reserved
            "mixed_below_and_above_threshold": False,  # reserved
        }

        # confidence summary
        conf_distribution = Counter(r["resolution_confidence"] for r in supplier_rows)

        record = {
            "company_number": ch,
            "display_name": supplier_rows[0].get("resolved_display_name") or supplier_rows[0].get("supplier_name"),
            "n_contracts": n_awards,
            "total_awarded_gbp": total_value,
            "awarded_gbp_with_value_n": len(values),
            "summary": {
                "procurement_method_count": dict(method_count),
                "procurement_method_value_gbp": {m: v for m, v in method_value.items() if v > 0},
                "sole_source_pct": safe_pct(sole_source_value, total_value),
                "competitive_pct": safe_pct(competitive_value, total_value),
                "framework_pct": safe_pct(framework_value, total_value),
                "avg_n_tenderers": round(statistics.mean(tenderers), 2) if tenderers else None,
                "median_n_tenderers": statistics.median(tenderers) if tenderers else None,
                "tenderers_disclosed_pct": safe_pct(len(tenderers), n_awards),
            },
            "cpv_breakdown": sorted(
                [{"code": c, "label": d["label"], "contracts": d["count"], "value_gbp": d["value_gbp"]}
                 for c, d in cpv_stats.items()],
                key=lambda x: -x["value_gbp"]
            )[:10],
            "buyers": buyer_list[:15],
            "n_unique_buyers": len(buyer_list),
            "contracts_timeline": timeline[:30],
            "flags": flags,
            "resolution_confidence_distribution": dict(conf_distribution),
            "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z"),
            "status": "DRAFT — not wired",
        }
        out_records.append(record)

        # cross-cutting: top sole-source suppliers
        if flags["sole_source_heavy"]:
            cross_cutting["top_sole_source_suppliers"].append({
                "ch": ch,
                "name": record["display_name"],
                "sole_source_pct": record["summary"]["sole_source_pct"],
                "sole_source_value_gbp": sole_source_value,
            })

    # sort by total value
    out_records.sort(key=lambda r: -r["total_awarded_gbp"])

    with open(OUT, "w", encoding="utf-8") as fh:
        for r in out_records:
            fh.write(json.dumps(r, ensure_ascii=False) + "\n")

    # cross-cutting stats: finalize
    cross_cutting["by_procurement_method"] = dict(cross_cutting["by_procurement_method"])
    cross_cutting["by_procurement_method_value_gbp"] = dict(cross_cutting["by_procurement_method_value_gbp"])
    cross_cutting["top_sole_source_suppliers"].sort(key=lambda x: -x["sole_source_value_gbp"])
    cross_cutting["top_sole_source_suppliers"] = cross_cutting["top_sole_source_suppliers"][:20]
    cross_cutting["top_non_competitive_buyers"] = {}  # reserved for future
    cross_cutting["generated_at"] = datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")
    cross_cutting["input_rows"] = len(rows)
    cross_cutting["unique_suppliers_aggregated"] = len(by_ch)
    cross_cutting["status"] = "DRAFT — not wired"

    CROSS_CUTTING.write_text(json.dumps(cross_cutting, indent=2, ensure_ascii=False), encoding="utf-8")

    print()
    print("=== AGGREGATION SUMMARY ===")
    print(f"  input rows:                 {len(rows)}")
    print(f"  suppliers aggregated:       {len(by_ch)}")
    print(f"  output file:                {OUT.relative_to(ROOT)}")
    print(f"  cross-cutting stats:        {CROSS_CUTTING.relative_to(ROOT)}")
    print()
    print("Procurement method (value £):")
    method_values = cross_cutting["by_procurement_method_value_gbp"]
    total = sum(method_values.values()) or 1
    for m, v in sorted(method_values.items(), key=lambda x: -x[1]):
        print(f"  {m:<20} £{v/1e6:>8,.1f}M  ({v/total*100:>5.1f}%)")
    print()
    if cross_cutting["top_sole_source_suppliers"]:
        print(f"Top {min(10, len(cross_cutting['top_sole_source_suppliers']))} sole-source heavy suppliers in dataset:")
        for s in cross_cutting["top_sole_source_suppliers"][:10]:
            print(f"  #{s['ch']:<10} £{s['sole_source_value_gbp']/1e6:>6.1f}M ({s['sole_source_pct']:>5.1f}% SS) {s['name'][:50]}")


if __name__ == "__main__":
    main()
