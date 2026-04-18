#!/usr/bin/env python3
"""
merge_wikidata_to_ubo.py

Merges Wikidata enrichment findings into supplier_ubo.jsonl — annotates each
chain hop that corresponds to a queried name with its Wikidata match + parent
chain + citation URL.

The original CH-sourced chain stays intact; Wikidata data is additive under
`wikidata` field per hop, so downstream consumers can choose which source they
prefer.

Updates `overall_resolution` for rows whose previously unresolved chain now has
a Wikidata-backed terminal country (upgraded to `foreign_via_wikidata`).

Usage: python scripts/merge_wikidata_to_ubo.py
"""

from __future__ import annotations

import json
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parents[1]
UK_DIR = ROOT / "data" / "recipients" / "uk"
UBO = UK_DIR / "supplier_ubo.jsonl"
WD = UK_DIR / "supplier_wikidata.jsonl"


def main() -> None:
    # build wikidata lookup by query_name
    wd_by_name: dict[str, dict] = {}
    with open(WD, encoding="utf-8") as fh:
        for line in fh:
            r = json.loads(line)
            if r.get("match") and (r["match"].get("is_company_like")):
                wd_by_name[r["query_name"]] = r

    print(f"Wikidata hits indexed: {len(wd_by_name)}")

    rows = []
    with open(UBO, encoding="utf-8") as fh:
        for line in fh:
            rows.append(json.loads(line))

    backup = UBO.with_suffix(f".jsonl.{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}.bak")
    shutil.copy2(UBO, backup)
    print(f"Backup: {backup.name}")

    merged = upgraded = 0

    for r in rows:
        row_upgraded = False
        for chain in r.get("ubo_chains", []):
            for hop in chain:
                if not isinstance(hop, dict):
                    continue
                name = hop.get("name")
                if not name or name not in wd_by_name:
                    continue
                wd = wd_by_name[name]
                m = wd["match"]
                wd_chain = wd.get("chain") or []
                wd_terminal = wd_chain[-1] if wd_chain else None

                # attach slim Wikidata record to this hop
                hop["wikidata"] = {
                    "qid": m["qid"],
                    "label": m.get("label"),
                    "description": m.get("description"),
                    "match_quality": m.get("match_quality"),
                    "wikidata_url": f"https://www.wikidata.org/wiki/{m['qid']}",
                    "parent_chain": [
                        {
                            "qid": h["qid"],
                            "label": h["label"],
                            "description": h.get("description"),
                            "country_labels": h.get("country_labels") or [],
                            "revision_id": h.get("revision_id"),
                            "source_url": h.get("source_url"),
                        }
                        for h in wd_chain
                    ],
                    "ultimate_label": wd_terminal.get("label") if wd_terminal else None,
                    "ultimate_country": (wd_terminal.get("country_labels") or [None])[0]
                        if wd_terminal else None,
                    "queries_used": wd.get("queries_used"),
                }
                merged += 1

                # if this hop was previously `foreign_unresolved` and Wikidata
                # gives us a country, upgrade the resolution
                if hop.get("resolution") == "foreign_unresolved" and hop["wikidata"]["ultimate_country"]:
                    hop["resolution"] = "foreign_via_wikidata"
                    hop["jurisdiction"] = hop["wikidata"]["ultimate_country"]
                    row_upgraded = True

        if row_upgraded:
            upgraded += 1
            # recompute overall_resolution
            resolutions = {c[-1].get("resolution") for c in r["ubo_chains"]}
            if resolutions == {"individual"} or resolutions == {"government"}:
                r["overall_resolution"] = list(resolutions)[0]
            elif resolutions <= {"individual", "government"}:
                r["overall_resolution"] = "mixed_clear"
            elif "foreign_via_wikidata" in resolutions and (resolutions & {"individual", "government", "foreign_via_wikidata"}) == resolutions:
                r["overall_resolution"] = "foreign_via_wikidata"
            elif "foreign_via_wikidata" in resolutions and (resolutions & {"individual", "government"}):
                r["overall_resolution"] = "partial_foreign_wd"
            elif "foreign_via_wikidata" in resolutions:
                r["overall_resolution"] = "partial_with_wd"
            # else leave existing overall_resolution
            r["wikidata_merged_at"] = datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")

    # rewrite
    tmp = UBO.with_suffix(".jsonl.tmp")
    with open(tmp, "w", encoding="utf-8") as fh:
        for r in rows:
            fh.write(json.dumps(r, ensure_ascii=False) + "\n")
    tmp.replace(UBO)

    print(f"Hops annotated with Wikidata: {merged}")
    print(f"Rows upgraded to foreign_via_wikidata: {upgraded}")


if __name__ == "__main__":
    main()
