#!/usr/bin/env python3
"""
purge_bad_enrichments.py

Removes rows from supplier_enrichment.jsonl that are:
  - explicit errors, OR
  - match_quality not in {exact, prefix, high_overlap}, OR
  - rank now belongs to a non-ch-eligible category (e.g. public_body_ndpb).

Also deletes orphan PDFs whose company_number is not referenced by any kept row.

Writes the kept rows back to the JSONL atomically.
"""

from __future__ import annotations

import json
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
UK_DIR = ROOT / "data" / "recipients" / "uk"
CLASSIFIED = UK_DIR / "supplier_ranking_classified.json"
JSONL = UK_DIR / "supplier_enrichment.jsonl"
PDF_DIR = UK_DIR / "supplier_financials"

ACCEPT = {"exact", "prefix", "high_overlap"}


def main() -> None:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")

    if not JSONL.exists():
        print("No JSONL to purge.")
        return

    data = json.loads(CLASSIFIED.read_text(encoding="utf-8"))
    eligible_ranks = {s["rank"] for s in data["suppliers"] if s["ch_eligible"]}

    kept, dropped = [], []
    with open(JSONL, encoding="utf-8") as fh:
        for line in fh:
            try:
                r = json.loads(line)
            except json.JSONDecodeError:
                continue
            reason = None
            if r.get("error"):
                reason = f"error={r['error']}"
            elif r["rank"] not in eligible_ranks:
                reason = "rank_now_ineligible"
            else:
                mq = (r.get("ch_match") or {}).get("match_quality")
                if mq not in ACCEPT:
                    reason = f"weak_match={mq}"
            if reason:
                dropped.append((r, reason))
            else:
                kept.append(r)

    print(f"Kept: {len(kept)}")
    print(f"Dropped: {len(dropped)}")
    print()
    print("Dropped breakdown:")
    from collections import Counter
    cnt = Counter(reason for _, reason in dropped)
    for reason, n in cnt.most_common():
        print(f"  {reason}: {n}")
    print()

    # backup then rewrite
    ts = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    backup = JSONL.with_suffix(f".jsonl.{ts}.bak")
    shutil.copy2(JSONL, backup)
    print(f"Backup: {backup.name}")

    tmp = JSONL.with_suffix(".jsonl.tmp")
    with open(tmp, "w", encoding="utf-8") as fh:
        for r in kept:
            fh.write(json.dumps(r, ensure_ascii=False) + "\n")
    tmp.replace(JSONL)
    print(f"Rewrote {JSONL.name}")

    # orphan PDFs: any PDF whose company_number is NOT referenced by a kept row
    kept_numbers = set()
    for r in kept:
        num = (r.get("company") or {}).get("company_number") or (r.get("ch_match") or {}).get("company_number")
        if num:
            kept_numbers.add(num)

    deleted_pdfs = 0
    freed_bytes = 0
    if PDF_DIR.exists():
        for pdf in PDF_DIR.glob("*.pdf"):
            # filename format: {company_number}_{date}.pdf
            number = pdf.stem.split("_", 1)[0]
            if number not in kept_numbers:
                freed_bytes += pdf.stat().st_size
                pdf.unlink()
                deleted_pdfs += 1

    print(f"Orphan PDFs deleted: {deleted_pdfs} ({freed_bytes/1e6:.1f} MB freed)")


if __name__ == "__main__":
    main()
