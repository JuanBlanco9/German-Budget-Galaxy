#!/usr/bin/env python3
"""
infer_ubo_suffix_jurisdictions.py

Patches supplier_ubo.jsonl: for terminal hops flagged as `foreign_unresolved`
with no `jurisdiction` AND no `parent_company_number`, infer the jurisdiction
from the legal-form suffix in the PSC name (Inc., S.A., GmbH, NV, etc.).

Also re-tags some mislabeled corporate PSCs as `government` when the name
starts with "Department For", "Secretary Of State", etc. (CH filers sometimes
file these as corporate instead of legal-person.)

Pure-regex. Zero API calls.

Usage: python scripts/infer_ubo_suffix_jurisdictions.py
"""

from __future__ import annotations

import json
import re
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parents[1]
UK_DIR = ROOT / "data" / "recipients" / "uk"
JSONL = UK_DIR / "supplier_ubo.jsonl"

# (regex on PSC name, inferred country, confidence)
# Order matters — run more specific first
SUFFIX_RULES: list[tuple[re.Pattern, str, str]] = [
    (re.compile(r",?\s+(Inc\.|Incorporated|LLC|L\.L\.C\.)\s*$", re.I), "United States", "high"),
    (re.compile(r",?\s+Corp(\.|oration)?\s*$", re.I), "United States", "medium"),  # could be Canadian
    (re.compile(r"\bS\.?A\.?\s*$"), "France", "medium"),  # also Spain; France more common in UK gov supply
    (re.compile(r"\bS\.?p\.?A\.?\s*$"), "Italy", "high"),
    (re.compile(r"\b(GmbH|gmbh)\s*$"), "Germany", "high"),
    (re.compile(r"\b(AG|A\.G\.)\s*$"), "Germany / Austria / Switzerland", "medium"),
    (re.compile(r"\bN\.?V\.?\s*$"), "Netherlands", "medium"),  # could be Belgium
    (re.compile(r"\bB\.?V\.?\s*$"), "Netherlands", "high"),
    (re.compile(r"\bSE\s*$"), "Germany (Societas Europaea)", "medium"),
    (re.compile(r"\bOy\s*$", re.I), "Finland", "high"),
    (re.compile(r"\bPte\.?\s+Ltd\.?\s*$", re.I), "Singapore", "high"),
    (re.compile(r"\bPty\.?\s+Ltd\.?\s*$", re.I), "Australia", "high"),
    (re.compile(r"\bS\.?L\.?\s*$"), "Spain", "medium"),  # Sociedad Limitada
    (re.compile(r"\bLtée\s*$"), "Canada (Quebec)", "high"),
    (re.compile(r"\b(KGaA|OHG|KG)\s*$"), "Germany", "high"),
]

# Government-body prefixes (should be legal-person, not corporate)
GOVT_RULES: list[re.Pattern] = [
    re.compile(r"^\s*Department\s+(For|Of)\b", re.I),
    re.compile(r"^\s*Ministry\s+Of\b", re.I),
    re.compile(r"^\s*Secretary\s+Of\s+State\b", re.I),
    re.compile(r"^\s*The\s+Secretary\s+Of\s+State\b", re.I),
    re.compile(r"^\s*HM\s+Treasury\b", re.I),
    re.compile(r"^\s*The\s+Welsh\s+Ministers\b", re.I),
    re.compile(r"^\s*The\s+Scottish\s+Ministers\b", re.I),
    re.compile(r"^\s*The\s+Board\s+Of\s+Trustees\b", re.I),
    re.compile(r"\bWaste\s+Disposal\s+Authority\b", re.I),
    re.compile(r"\bTourist\s+Authority\b", re.I),
    re.compile(r"\bCombined\s+Authority\b", re.I),
]


def infer_jurisdiction(name: str | None) -> tuple[str, str] | None:
    if not name:
        return None
    for pat, country, conf in SUFFIX_RULES:
        if pat.search(name):
            return country, conf
    return None


def is_govt_body(name: str | None) -> bool:
    if not name:
        return False
    return any(p.search(name) for p in GOVT_RULES)


def needs_resolve(hop: dict) -> bool:
    return (
        hop.get("resolution") == "foreign_unresolved"
        and not hop.get("jurisdiction")
        and not hop.get("parent_company_number")
    )


def summarize_resolution(chains: list[list[dict]]) -> str:
    """Copy of the same function from enrich_uk_suppliers_ubo.py (avoid circular import)."""
    if not chains:
        return "no_psc"
    resolutions = {c[-1].get("resolution") for c in chains}
    if resolutions == {"individual"}:
        return "individual"
    if resolutions == {"government"}:
        return "government"
    if resolutions <= {"individual", "government"}:
        return "mixed_clear"
    if "foreign_unresolved" in resolutions:
        return "partial_foreign" if (resolutions & {"individual", "government"}) else "foreign_unresolved"
    if "unresolved_statement" in resolutions or "no_psc_data" in resolutions:
        return "partial_unresolved"
    return "partial_unresolved"


def main() -> None:
    rows = []
    with open(JSONL, encoding="utf-8") as fh:
        for line in fh:
            rows.append(json.loads(line))

    backup = JSONL.with_suffix(f".jsonl.{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}.bak")
    shutil.copy2(JSONL, backup)
    print(f"Backup: {backup.name}")

    stats = {"jurisdiction_inferred": 0, "retagged_government": 0, "still_unresolved": 0}
    jur_counter: dict[str, int] = {}

    for r in rows:
        changed = False
        for chain in r.get("ubo_chains", []):
            hop = chain[-1]
            if not needs_resolve(hop):
                continue
            name = hop.get("name")
            # check for govt body miscategorised as corporate
            if is_govt_body(name):
                hop["resolution"] = "government"
                hop["resolution_note"] = "retagged_from_corporate_via_name_pattern"
                stats["retagged_government"] += 1
                changed = True
                continue
            # infer jurisdiction from suffix
            inf = infer_jurisdiction(name)
            if inf:
                country, conf = inf
                hop["jurisdiction"] = country
                hop["jurisdiction_inference"] = {
                    "method": "legal_suffix_regex",
                    "confidence": conf,
                    "inferred_from_name": name,
                }
                stats["jurisdiction_inferred"] += 1
                jur_counter[country] = jur_counter.get(country, 0) + 1
                changed = True
            else:
                stats["still_unresolved"] += 1
        if changed:
            r["overall_resolution"] = summarize_resolution(r["ubo_chains"])
            r["suffix_inferred_at"] = datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")

    # rewrite atomically
    tmp = JSONL.with_suffix(".jsonl.tmp")
    with open(tmp, "w", encoding="utf-8") as fh:
        for r in rows:
            fh.write(json.dumps(r, ensure_ascii=False) + "\n")
    tmp.replace(JSONL)

    print("\nDone.")
    print(f"  jurisdiction_inferred:  {stats['jurisdiction_inferred']}")
    print(f"  retagged_government:    {stats['retagged_government']}")
    print(f"  still_unresolved:       {stats['still_unresolved']}")
    if jur_counter:
        print("\nInferred jurisdictions:")
        for j, n in sorted(jur_counter.items(), key=lambda x: -x[1]):
            print(f"  {j:<35} {n:>3}")


if __name__ == "__main__":
    main()
