#!/usr/bin/env python3
"""
inventory_cleanup_candidates.py

Walks the UK recipients data directory and produces a report of files that
are candidates for cleanup — but does NOT delete anything. The output is a
proposal for human + multi-agent alignment.

Categories of candidates:
  - backup_files      — *.bak files from in-place rewrites
  - pilot_outputs     — JSONLs from aborted early experiments
  - orphan_pdfs       — PDFs not referenced by any supplier_enrichment.jsonl row
  - large_intermediate — large intermediate caches that could be regenerated

Output: data/recipients/uk/_cleanup_inventory.json
        with path, size, reason, safe-to-delete flag

Usage: python scripts/inventory_cleanup_candidates.py
"""

from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parents[1]
UK_DIR = ROOT / "data" / "recipients" / "uk"
PDF_DIR = UK_DIR / "supplier_financials"
ENRICHMENT = UK_DIR / "supplier_enrichment.jsonl"
OUT = UK_DIR / "_cleanup_inventory.json"


def human_size(n: int) -> str:
    for unit in ("B", "KB", "MB", "GB"):
        if n < 1024:
            return f"{n:.1f}{unit}"
        n /= 1024
    return f"{n:.1f}TB"


def main() -> None:
    items: list[dict] = []

    # 1. Backup files
    for p in UK_DIR.glob("*.bak"):
        items.append({
            "category": "backup_files",
            "path": str(p.relative_to(ROOT)).replace("\\", "/"),
            "size_bytes": p.stat().st_size,
            "size_human": human_size(p.stat().st_size),
            "reason": "Automatic .bak from in-place rewrite; redundant if script output is verified",
            "safe_to_delete": True,
            "recommendation": "delete if last-modified > 7 days",
            "mtime": datetime.fromtimestamp(p.stat().st_mtime, tz=timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z"),
        })

    # 1b. .jsonl.YYYYMMDD.bak files too
    for p in UK_DIR.glob("*.jsonl.*.bak"):
        items.append({
            "category": "backup_files",
            "path": str(p.relative_to(ROOT)).replace("\\", "/"),
            "size_bytes": p.stat().st_size,
            "size_human": human_size(p.stat().st_size),
            "reason": "Pre-rewrite snapshot from iterative refinement scripts",
            "safe_to_delete": True,
            "recommendation": "keep newest 2 per script; delete older",
            "mtime": datetime.fromtimestamp(p.stat().st_mtime, tz=timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z"),
        })

    # 2. Tmp / .part files
    for p in UK_DIR.rglob("*.tmp"):
        items.append({
            "category": "tmp_files",
            "path": str(p.relative_to(ROOT)).replace("\\", "/"),
            "size_bytes": p.stat().st_size,
            "size_human": human_size(p.stat().st_size),
            "reason": "Incomplete write marker",
            "safe_to_delete": True,
            "recommendation": "delete — no script leaves .tmp on normal exit",
        })
    for p in PDF_DIR.glob("*.part"):
        items.append({
            "category": "tmp_files",
            "path": str(p.relative_to(ROOT)).replace("\\", "/"),
            "size_bytes": p.stat().st_size,
            "size_human": human_size(p.stat().st_size),
            "reason": "Partial PDF download not finalized",
            "safe_to_delete": True,
            "recommendation": "delete — re-run enrichment will redo download",
        })

    # 3. Orphan PDFs (not referenced by supplier_enrichment.jsonl)
    referenced_pdfs: set[str] = set()
    if ENRICHMENT.exists():
        with open(ENRICHMENT, encoding="utf-8") as fh:
            for line in fh:
                try:
                    r = json.loads(line)
                except json.JSONDecodeError:
                    continue
                pdf_path = (r.get("accounts") or {}).get("pdf_path")
                if pdf_path:
                    referenced_pdfs.add(os.path.basename(pdf_path))

    if PDF_DIR.exists():
        for p in PDF_DIR.glob("*.pdf"):
            if p.name not in referenced_pdfs:
                items.append({
                    "category": "orphan_pdfs",
                    "path": str(p.relative_to(ROOT)).replace("\\", "/"),
                    "size_bytes": p.stat().st_size,
                    "size_human": human_size(p.stat().st_size),
                    "reason": "PDF not referenced by any current supplier_enrichment.jsonl row",
                    "safe_to_delete": True,
                    "recommendation": "delete — likely from purged weak-match row",
                })

    # 4. Large caches (regeneratable but useful)
    cache_files = [
        (UK_DIR / "psc_cache.json", "accelerates UBO chain walk re-runs"),
        (UK_DIR / "profile_cache.json", "accelerates UBO chain walk re-runs"),
        (UK_DIR / "supplier_geo_cache.json", "accelerates geo enrichment"),
    ]
    for p, why in cache_files:
        if p.exists():
            sz = p.stat().st_size
            items.append({
                "category": "caches_regeneratable",
                "path": str(p.relative_to(ROOT)).replace("\\", "/"),
                "size_bytes": sz,
                "size_human": human_size(sz),
                "reason": f"API-call cache ({why})",
                "safe_to_delete": True,
                "recommendation": "keep unless disk pressure — re-fetching is slow and costs API calls",
            })

    # aggregate stats
    by_cat: dict[str, dict] = {}
    total_bytes = 0
    for item in items:
        cat = item["category"]
        if cat not in by_cat:
            by_cat[cat] = {"count": 0, "size_bytes": 0}
        by_cat[cat]["count"] += 1
        by_cat[cat]["size_bytes"] += item["size_bytes"]
        total_bytes += item["size_bytes"]

    for cat, stats in by_cat.items():
        stats["size_human"] = human_size(stats["size_bytes"])

    report = {
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z"),
        "generator": "scripts/inventory_cleanup_candidates.py",
        "status": "DRAFT — inventory only. Nothing was deleted. Review + confirm before cleanup.",
        "total_candidate_bytes": total_bytes,
        "total_candidate_human": human_size(total_bytes),
        "by_category": by_cat,
        "items": sorted(items, key=lambda x: -x["size_bytes"]),
    }

    OUT.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"Report written to {OUT.relative_to(ROOT)}")
    print(f"\n=== INVENTORY SUMMARY ===")
    print(f"Total candidate files: {len(items)}")
    print(f"Total candidate size:  {human_size(total_bytes)}")
    print()
    print(f"{'Category':<26} {'Count':>6} {'Size':>10}")
    print("-" * 48)
    for cat, s in sorted(by_cat.items(), key=lambda x: -x[1]["size_bytes"]):
        print(f"{cat:<26} {s['count']:>6} {s['size_human']:>10}")
    print()
    print("NOTHING WAS DELETED. Review _cleanup_inventory.json and run manual rm commands, ")
    print("or add a --execute flag to this script (not implemented) if aligned across sessions.")


if __name__ == "__main__":
    main()
