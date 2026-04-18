#!/usr/bin/env python3
"""
resolve_ubo_unknown_jurisdictions.py

Fixes UBO chains whose terminal hop is `foreign_unresolved` with a missing
jurisdiction label AND missing registration_number. These are almost always
UK companies where the PSC filer didn't fill `country_registered` — so we
search CH by PSC name to recover the real company number, then resume the
chain walk from there (reusing the same cache).

Behavior:
  - match_quality exact/prefix: treat as resolved, walk up
  - match_quality lower: leave as foreign_unresolved with a note
  - if name-searched company is foreign: update jurisdiction label

Rewrites supplier_ubo.jsonl atomically, with a .bak copy kept.

Usage:
  CH_API_KEY="..." python scripts/resolve_ubo_unknown_jurisdictions.py
"""

from __future__ import annotations

import json
import os
import shutil
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote

import requests

# reuse building blocks from the main script
sys.path.insert(0, str(Path(__file__).resolve().parent))
from enrich_uk_suppliers_ubo import (  # type: ignore
    CH_API,
    ChClient,
    PROFILE_CACHE_FILE,
    PSC_CACHE_FILE,
    RATE_SLEEP_S,
    auth_header,
    clean_ch_number,
    get_with_retry,
    hop_from_psc,
    load_json,
    normalize_jurisdiction,
    save_json,
    summarize_resolution,
    walk_chain,
)

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parents[1]
UK_DIR = ROOT / "data" / "recipients" / "uk"
JSONL = UK_DIR / "supplier_ubo.jsonl"


def ch_search_company(name: str, headers: dict) -> dict | None:
    """Search CH and return best match with quality score."""
    import re as _re
    q = _re.sub(r"\s+", " ", name.strip())[:140]
    url = f"{CH_API}/search/companies?q={quote(q)}&items_per_page=5"
    time.sleep(RATE_SLEEP_S)
    r = get_with_retry(url, headers)
    if not r:
        return None
    items = r.json().get("items", [])
    if not items:
        return None

    def _norm(s: str) -> str:
        s = _re.sub(r"[^\w\s]", " ", (s or "").lower())
        s = _re.sub(r"\b(limited|ltd|plc|llp|inc|incorporated|company|co|corp|the|uk)\b", " ", s)
        return _re.sub(r"\s+", " ", s).strip()

    qn = _norm(name)
    best = None
    best_score = "low"
    rank = {"exact": 0, "prefix": 1, "high_overlap": 2, "medium_overlap": 3, "low": 4}
    for it in items:
        cn = _norm(it.get("title", ""))
        if qn == cn:
            score = "exact"
        elif cn.startswith(qn) or qn.startswith(cn):
            score = "prefix"
        else:
            qt, ct = set(qn.split()), set(cn.split())
            overlap = len(qt & ct) / max(len(qt), 1)
            score = "high_overlap" if overlap >= 0.75 else ("medium_overlap" if overlap >= 0.45 else "low")
        if rank[score] < rank[best_score]:
            best_score = score
            best = it
        elif best is None:
            best = it
    return {
        "match_quality": best_score,
        "company_number": best.get("company_number"),
        "title": best.get("title"),
        "company_status": best.get("company_status"),
        "candidates_returned": len(items),
    } if best else None


def needs_resolve(hop: dict) -> bool:
    return (
        hop.get("resolution") == "foreign_unresolved"
        and not hop.get("jurisdiction")
        and not hop.get("parent_company_number")
    )


def main() -> None:
    key = os.environ.get("CH_API_KEY")
    if not key:
        print("Error: CH_API_KEY not set.", file=sys.stderr)
        sys.exit(1)

    rows = []
    with open(JSONL, encoding="utf-8") as fh:
        for line in fh:
            rows.append(json.loads(line))

    # Find rows with at least one chain that needs resolving
    affected = []
    total_hops = 0
    for ri, r in enumerate(rows):
        chains = r.get("ubo_chains") or []
        problem_chain_indices = [ci for ci, c in enumerate(chains) if needs_resolve(c[-1])]
        if problem_chain_indices:
            affected.append((ri, r, problem_chain_indices))
            total_hops += len(problem_chain_indices)
    print(f"Rows needing fix: {len(affected)} (total problem chains: {total_hops})")

    if not affected:
        return

    # Setup client (reuses caches)
    headers = auth_header(key)
    psc_cache = load_json(PSC_CACHE_FILE)
    profile_cache = load_json(PROFILE_CACHE_FILE)
    client = ChClient(headers, psc_cache, profile_cache)
    name_resolution_cache: dict[str, dict | None] = {}

    backup = JSONL.with_suffix(f".jsonl.{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}.bak")
    shutil.copy2(JSONL, backup)
    print(f"Backup: {backup.name}")

    stats = {"resolved_uk": 0, "confirmed_foreign": 0, "low_quality_match": 0, "no_match": 0}
    t0 = time.time()

    for idx, (ri, r, problem_chain_indices) in enumerate(affected, start=1):
        for ci in problem_chain_indices:
            chain = r["ubo_chains"][ci]
            broken_hop = chain[-1]
            psc_name = broken_hop.get("name")
            if not psc_name:
                stats["no_match"] += 1
                continue

            # cache name -> search result (same name may appear across chains)
            if psc_name not in name_resolution_cache:
                name_resolution_cache[psc_name] = ch_search_company(psc_name, headers)
            match = name_resolution_cache[psc_name]

            if not match:
                stats["no_match"] += 1
                broken_hop["resolution_note"] = "name_search_no_results"
                continue

            if match["match_quality"] not in ("exact", "prefix"):
                stats["low_quality_match"] += 1
                broken_hop["resolution_note"] = f"name_search_weak_match_{match['match_quality']}"
                broken_hop["search_best_candidate"] = {
                    "title": match["title"],
                    "number": match["company_number"],
                }
                continue

            resolved_number = match["company_number"]
            # fetch profile to determine jurisdiction
            profile = client.get_profile(resolved_number)
            jur = normalize_jurisdiction(profile.get("jurisdiction") if profile else None)

            if jur != "uk":
                # confirmed foreign — just upgrade the label
                broken_hop["jurisdiction"] = (profile or {}).get("jurisdiction") or "unknown"
                broken_hop["parent_company_number"] = resolved_number
                broken_hop["resolution_note"] = "jurisdiction_resolved_via_name_search"
                stats["confirmed_foreign"] += 1
                continue

            # UK — walk up from this resolved company
            # Build a synthetic corporate PSC record from the broken hop to restart walking
            psc_record = {
                "kind": broken_hop.get("kind") or "corporate-entity-person-with-significant-control",
                "name": psc_name,
                "natures_of_control": broken_hop.get("natures_of_control") or [],
                "notified_on": broken_hop.get("notified_on"),
                "ceased_on": None,
                "identification": {
                    "registration_number": resolved_number,
                    "country_registered": (profile or {}).get("jurisdiction"),
                },
                "links": None,
            }

            # visited set: everything in the prefix chain
            prefix_companies = set()
            for h in chain[:-1]:
                if h.get("from_company"):
                    prefix_companies.add(h["from_company"])
                if h.get("parent_company_number"):
                    prefix_companies.add(h["parent_company_number"])
            # also the current supplier itself
            prefix_companies.add(r["company_number"])

            # replay the walk starting from the broken hop's position
            starting_depth = broken_hop.get("step", len(chain))
            from_company = broken_hop.get("from_company") or r["company_number"]
            new_branches = walk_chain(
                client,
                from_company,
                psc_record,
                visited=prefix_companies,
                depth=starting_depth,
            )

            # Replace the last hop with the new branch(es)
            # If there are multiple branches now, the row grows by (branches - 1) chains.
            old_prefix = chain[:-1]
            replacements = []
            for branch in new_branches:
                replacements.append(old_prefix + branch)
            # substitute
            r["ubo_chains"] = (
                r["ubo_chains"][:ci]
                + replacements
                + r["ubo_chains"][ci + 1 :]
            )
            stats["resolved_uk"] += 1

        # recompute overall_resolution for this row
        r["overall_resolution"] = summarize_resolution(r["ubo_chains"])
        r["resolved_at"] = datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")

        if idx % 10 == 0 or idx == len(affected):
            save_json(PSC_CACHE_FILE, client.psc_cache)
            save_json(PROFILE_CACHE_FILE, client.profile_cache)
            print(
                f"[{idx:>3}/{len(affected)}] {r['company_number']} stats={stats} "
                f"elapsed={time.time()-t0:.0f}s",
                flush=True,
            )

    # rewrite JSONL
    tmp = JSONL.with_suffix(".jsonl.tmp")
    with open(tmp, "w", encoding="utf-8") as fh:
        for r in rows:
            fh.write(json.dumps(r, ensure_ascii=False) + "\n")
    tmp.replace(JSONL)

    save_json(PSC_CACHE_FILE, client.psc_cache)
    save_json(PROFILE_CACHE_FILE, client.profile_cache)
    print(f"\nDone. {stats}")
    print(f"API calls used: {client.api_calls}")


if __name__ == "__main__":
    main()
