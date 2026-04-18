#!/usr/bin/env python3
"""
split_partial_unresolved.py

Refines the 'partial_unresolved' bucket by distinguishing legitimate diffuse
ownership (listed PLCs, 'no PSC' statement) from actual data gaps (missing
filings, unverified declarations).

New terminal resolutions introduced:
  listed_dispersed_legitimate  — parent is a PLC; diffuse shareholding is lawful
  no_psc_declared_legitimate   — parent filed "no individual or entity has significant control"
                                  (lawful statement for dispersed Ltds)
  parent_inactive              — parent is dissolved/liquidation; chain effectively dead
  data_gap_pending             — "steps-to-find-psc-not-yet-completed" or "psc-details-not-confirmed"
  data_gap_other               — no active PSC and no explanatory statement

Reads profile_cache for parent company type/status. No network calls.

Updates supplier_ubo.jsonl in place (with .bak).
"""

from __future__ import annotations

import json
import shutil
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parents[1]
UK_DIR = ROOT / "data" / "recipients" / "uk"
UBO = UK_DIR / "supplier_ubo.jsonl"
PROFILE_CACHE = UK_DIR / "profile_cache.json"


LEGITIMATE_STATEMENTS = {
    "no-individual-or-entity-with-signficant-control",
    "no-individual-or-entity-with-significant-control",
    "psc-exists-but-not-identified",  # edge: the company says it exists but isn't identified
}
PENDING_STATEMENTS = {
    "steps-to-find-psc-not-yet-completed",
    "psc-details-not-confirmed",
    "psc-contacted-but-no-response",
    "restrictions-notice-issued-to-psc",
}


def refine_terminal(hop: dict, profile_cache: dict) -> str | None:
    """Return a refined resolution for a previously 'partial_unresolved' terminal."""
    current = hop.get("resolution")
    if current not in ("unresolved_statement", "no_psc_data", "max_depth_reached"):
        return None

    parent_num = hop.get("parent_company_number")
    parent_profile = profile_cache.get(parent_num) if parent_num else None

    # 1) parent is a PLC — treat as listed dispersed
    if parent_profile and parent_profile.get("type") == "plc":
        return "listed_dispersed_legitimate"

    # 2) parent is dissolved / closed
    if parent_profile and parent_profile.get("status") in {
        "dissolved", "closed", "converted-closed", "liquidation", "administration"
    }:
        return "parent_inactive"

    # 3) look at statements present on the terminal hop
    stmts = hop.get("statements") or []
    if stmts:
        if any(s in LEGITIMATE_STATEMENTS for s in stmts):
            return "no_psc_declared_legitimate"
        if any(s in PENDING_STATEMENTS for s in stmts):
            return "data_gap_pending"
        return "data_gap_other"

    # 4) no statements, no plc parent — genuine data gap
    return "data_gap_other"


def summarize_resolution(chains: list[list[dict]]) -> str:
    if not chains:
        return "no_psc"
    resolutions = {c[-1].get("resolution") for c in chains if c}
    # precedence: clear > partial_foreign > foreign > listed_dispersed > data_gap
    clear = {"individual", "government"}
    foreign = {"foreign_via_wikidata", "foreign_unresolved", "partial_foreign"}
    legitimate_dispersed = {"listed_dispersed_legitimate", "no_psc_declared_legitimate"}
    data_gap = {"data_gap_pending", "data_gap_other", "parent_inactive",
                "unresolved_statement", "no_psc_data", "max_depth_reached"}

    if resolutions <= clear:
        return "government" if resolutions == {"government"} else (
            "individual" if resolutions == {"individual"} else "mixed_clear")
    if resolutions & clear and resolutions & foreign:
        return "partial_foreign"
    if resolutions <= foreign:
        return "foreign_via_wikidata" if "foreign_via_wikidata" in resolutions else "foreign_unresolved"
    if resolutions <= legitimate_dispersed:
        return "listed_dispersed"
    if resolutions & legitimate_dispersed and resolutions & clear:
        return "partial_listed"
    if resolutions <= data_gap:
        return "data_gap"
    # mix of types
    if resolutions & clear:
        return "partial_clear"
    return "partial_unresolved"


def main() -> None:
    profile_cache = {}
    if PROFILE_CACHE.exists():
        profile_cache = json.loads(PROFILE_CACHE.read_text(encoding="utf-8"))
    print(f"Profile cache loaded: {len(profile_cache)} entries")

    rows = []
    with open(UBO, encoding="utf-8") as fh:
        for line in fh:
            rows.append(json.loads(line))

    backup = UBO.with_suffix(f".jsonl.{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}.bak")
    shutil.copy2(UBO, backup)
    print(f"Backup: {backup.name}")

    changes = Counter()
    rows_changed = 0

    for r in rows:
        row_changed = False
        for chain in r.get("ubo_chains", []):
            if not chain:
                continue
            terminal = chain[-1]
            if not isinstance(terminal, dict):
                continue
            new_res = refine_terminal(terminal, profile_cache)
            if new_res and new_res != terminal.get("resolution"):
                terminal["original_resolution"] = terminal.get("resolution")
                terminal["resolution"] = new_res
                terminal["resolution_refined_at"] = datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")
                changes[new_res] += 1
                row_changed = True
        if row_changed:
            r["overall_resolution"] = summarize_resolution(r["ubo_chains"])
            rows_changed += 1

    # rewrite
    tmp = UBO.with_suffix(".jsonl.tmp")
    with open(tmp, "w", encoding="utf-8") as fh:
        for r in rows:
            fh.write(json.dumps(r, ensure_ascii=False) + "\n")
    tmp.replace(UBO)

    print(f"Rows changed: {rows_changed}")
    print("New terminal resolutions applied:")
    for res, n in changes.most_common():
        print(f"  {res:<35} {n}")

    # final overall distribution
    from collections import defaultdict
    overall = Counter()
    overall_spend = defaultdict(float)
    for r in rows:
        overall[r["overall_resolution"]] += 1
        overall_spend[r["overall_resolution"]] += r["source_total_gbp"]
    print()
    print("Overall resolution after refinement:")
    for res in sorted(overall, key=lambda k: -overall_spend[k]):
        print(f"  {res:<30} n={overall[res]:>4}  spend=GBP {overall_spend[res]/1e9:>6.2f}B")


if __name__ == "__main__":
    main()
