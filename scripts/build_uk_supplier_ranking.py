#!/usr/bin/env python3
"""
build_uk_supplier_ranking.py

Aggregates UK L5 suppliers across all 15 departments, dedups fuzzy variants,
and produces a ranking by total GBP amount (largest first).

Output: data/recipients/uk/supplier_ranking.json

No external calls — pure local aggregation. Run before the CH enrichment pass.
"""

import json
import re
import sys
from collections import defaultdict
from glob import glob
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
UK_DIR = ROOT / "data" / "recipients" / "uk"
OUT = UK_DIR / "supplier_ranking.json"

LEADING_ID_RE = re.compile(r"^\s*0*\d+\s*[-–—_]\s*")
SUFFIX_RE = re.compile(
    r"\b(limited|ltd\.?|plc|llp|llc|l\.?p\.?|inc\.?|incorporated|"
    r"corp\.?|corporation|co\.?|company|the)\b",
    re.IGNORECASE,
)
PUNCT_RE = re.compile(r"[\.,\"'()&/]+")
WS_RE = re.compile(r"\s+")


def normalize(name: str) -> str:
    """Return a dedup key: strip ID prefix, legal suffixes, punctuation, casing."""
    s = LEADING_ID_RE.sub("", name or "")
    s = s.replace("&", " and ")
    s = PUNCT_RE.sub(" ", s)
    s = SUFFIX_RE.sub(" ", s)
    s = WS_RE.sub(" ", s).strip().lower()
    return s


def pick_display_name(variants: list[str]) -> str:
    """Pick the cleanest display name: prefer ones without leading digit prefix, then longest."""
    clean = [v for v in variants if not LEADING_ID_RE.match(v)]
    pool = clean or variants
    return max(pool, key=len)


def main():
    files = sorted(glob(str(UK_DIR / "l5_*_2024.json")))
    if not files:
        print("No L5 files found", file=sys.stderr)
        sys.exit(1)

    agg: dict[str, dict] = defaultdict(
        lambda: {
            "total_gbp": 0,
            "variants": set(),
            "depts": set(),
            "segments": set(),
            "types": set(),
        }
    )

    for f in files:
        with open(f, encoding="utf-8") as fh:
            d = json.load(fh)
        dept_id = d["dept_id"]
        for seg in d.get("segments", []):
            seg_name = seg.get("segment", "")
            for r in seg.get("top_recipients", []):
                raw = r.get("name", "").strip()
                if not raw:
                    continue
                key = normalize(raw)
                if not key:
                    continue
                entry = agg[key]
                entry["total_gbp"] += r.get("amount", 0)
                entry["variants"].add(raw)
                entry["depts"].add(dept_id)
                entry["segments"].add(f"{dept_id}::{seg_name}")
                if r.get("type"):
                    entry["types"].add(r["type"])

    rows = []
    for key, v in agg.items():
        rows.append(
            {
                "norm_key": key,
                "display_name": pick_display_name(list(v["variants"])),
                "total_gbp": v["total_gbp"],
                "variants": sorted(v["variants"]),
                "n_variants": len(v["variants"]),
                "depts": sorted(v["depts"]),
                "n_depts": len(v["depts"]),
                "n_segments": len(v["segments"]),
                "types": sorted(v["types"]),
            }
        )

    rows.sort(key=lambda r: r["total_gbp"], reverse=True)
    for i, r in enumerate(rows, start=1):
        r["rank"] = i

    total = sum(r["total_gbp"] for r in rows)
    top100 = sum(r["total_gbp"] for r in rows[:100])
    top500 = sum(r["total_gbp"] for r in rows[:500])

    payload = {
        "year": 2024,
        "source": "UK L5 top_recipients across 15 departments",
        "unique_suppliers": len(rows),
        "total_gbp": total,
        "top100_gbp": top100,
        "top100_pct": round(top100 / total * 100, 2) if total else 0,
        "top500_gbp": top500,
        "top500_pct": round(top500 / total * 100, 2) if total else 0,
        "suppliers": rows,
    }

    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"Wrote {OUT.relative_to(ROOT)}")
    print(f"Unique suppliers after dedup: {len(rows):,}")
    print(f"Total L5 sum: £{total/1e9:.2f}B")
    print(f"Top 100 captures: £{top100/1e9:.2f}B ({payload['top100_pct']}%)")
    print(f"Top 500 captures: £{top500/1e9:.2f}B ({payload['top500_pct']}%)")
    print()
    print("Top 30 preview:")
    print(f"{'#':>3}  {'Name':<55} {'Depts':>5} {'Variants':>8}  {'£M':>12}")
    print("-" * 95)
    for r in rows[:30]:
        print(
            f"{r['rank']:>3}  {r['display_name'][:55]:<55} {r['n_depts']:>5} "
            f"{r['n_variants']:>8}  {r['total_gbp']/1e6:>12,.1f}"
        )


if __name__ == "__main__":
    main()
