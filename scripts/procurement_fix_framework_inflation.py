#!/usr/bin/env python3
"""
procurement_fix_framework_inflation.py

DRAFT — NOT WIRED.
Corrects a known OCDS data quality issue: when an award/framework agreement is
shared across multiple suppliers, each supplier row in the flat output is
credited with the FULL value — which means the sum dramatically over-counts
when a £150B framework has 20 listed suppliers.

Fix: for each ocid, group suppliers and derive a *per-supplier share*:

  per_supplier_value = award_value_gbp / n_suppliers_sharing_ocid

Also adds:
  is_framework_or_shared       — boolean, true if ocid has >1 supplier OR framework keyword
  suppliers_on_same_ocid       — count
  original_award_value_gbp     — preserved for audit
  per_supplier_award_value_gbp — corrected share

Writes: contracts_resolved_corrected.jsonl

Does not mutate the upstream file. Standalone.
"""

from __future__ import annotations

import json
import re
import sys
from collections import defaultdict
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parents[1]
IN = ROOT / "data" / "procurement" / "contracts_resolved.jsonl"
OUT = ROOT / "data" / "procurement" / "contracts_resolved_corrected.jsonl"

FRAMEWORK_KEYWORDS = re.compile(r"\bframework\s+agreement\b|\bdynamic\s+purchasing\b|\bDPS\b", re.IGNORECASE)


def main() -> None:
    rows = []
    with open(IN, encoding="utf-8") as fh:
        for line in fh:
            rows.append(json.loads(line))
    print(f"Input rows: {len(rows)}")

    # group by ocid: count suppliers
    suppliers_per_ocid: dict[str, set] = defaultdict(set)
    for r in rows:
        ocid = r.get("ocid")
        supp_key = r.get("resolved_ch_number") or r.get("supplier_name") or r.get("supplier_identifier_id")
        if ocid and supp_key:
            suppliers_per_ocid[ocid].add(supp_key)

    # stats
    multi_ocid = {k: len(v) for k, v in suppliers_per_ocid.items() if len(v) > 1}
    print(f"OCIDs with multiple suppliers: {len(multi_ocid)}")
    print(f"  Max suppliers on one OCID: {max(multi_ocid.values()) if multi_ocid else 0}")

    total_frameworks_tagged = 0
    total_divided = 0
    with open(OUT, "w", encoding="utf-8") as fh:
        for r in rows:
            ocid = r.get("ocid")
            n_sup = len(suppliers_per_ocid.get(ocid, {None}))
            title = (r.get("tender_title") or "") + " " + (r.get("tender_description") or "")
            method = r.get("procurement_method") or ""
            is_framework = (
                method == "frameworkAgreement"
                or bool(FRAMEWORK_KEYWORDS.search(title))
                or n_sup >= 10
            )

            original = r.get("award_value_gbp") or 0
            if n_sup > 1 and original > 0:
                per_supplier = original / n_sup
                total_divided += 1
            else:
                per_supplier = original

            corrected = {
                **r,
                "suppliers_on_same_ocid": n_sup,
                "is_framework_or_shared": is_framework,
                "original_award_value_gbp": original,
                "per_supplier_award_value_gbp": per_supplier,
            }
            if is_framework:
                total_frameworks_tagged += 1
            fh.write(json.dumps(corrected, ensure_ascii=False) + "\n")

    print(f"\nRows flagged as framework/shared: {total_frameworks_tagged}")
    print(f"Rows with divided per-supplier value: {total_divided}")
    print(f"\nWrote {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
