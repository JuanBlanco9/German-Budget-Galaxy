#!/usr/bin/env python3
"""
procurement_resolve_to_suppliers.py

DRAFT — NOT WIRED.
Takes flat Contracts Finder rows and resolves supplier identity to our
Companies House numbers via a three-pass match:

  1. Direct GB-COH identifier match  (expected ~33%)
  2. Fuzzy normalized-name match     (expected +30%)
  3. Postcode + name token overlap    (expected +5%)

Reads:
  data/procurement/contracts_flat.jsonl
  data/recipients/uk/supplier_ranking.json   (normalization keys + variants)
  data/suppliers/_index.json                 (CH number → postcode map)

Writes:
  data/procurement/contracts_resolved.jsonl  (same rows + resolved_ch_number + confidence)

Status: standalone; does not modify anything else. Ready to wire later.

Usage: python scripts/procurement_resolve_to_suppliers.py
       python scripts/procurement_resolve_to_suppliers.py --min-confidence high   # only keep high-confidence
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parents[1]
PROC_DIR = ROOT / "data" / "procurement"
# Inputs: prefer per-year files contracts_flat_YYYY.jsonl; fall back to legacy contracts_flat.jsonl
OUT = PROC_DIR / "contracts_resolved.jsonl"
RANKING = ROOT / "data" / "recipients" / "uk" / "supplier_ranking.json"
INDEX = ROOT / "data" / "suppliers" / "_index.json"
REPORT = ROOT / "data" / "procurement" / "_resolution_report.json"

# Reuse normalization from build_uk_supplier_ranking.py (copied to avoid import coupling)
LEADING_ID_RE = re.compile(r"^\s*0*\d+\s*[-–—_]\s*")
SUFFIX_RE = re.compile(
    r"\b(limited|ltd\.?|plc|llp|llc|l\.?p\.?|inc\.?|incorporated|"
    r"corp\.?|corporation|co\.?|company|the|uk)\b",
    re.IGNORECASE,
)
PUNCT_RE = re.compile(r"[\.,\"'()&/]+")
WS_RE = re.compile(r"\s+")


def normalize(name: str) -> str:
    if not name:
        return ""
    s = LEADING_ID_RE.sub("", name)
    s = s.replace("&", " and ")
    s = PUNCT_RE.sub(" ", s)
    s = SUFFIX_RE.sub(" ", s)
    return WS_RE.sub(" ", s).strip().lower()


def clean_postcode(pc: str | None) -> str | None:
    if not pc:
        return None
    return re.sub(r"\s+", "", pc).upper()


def postcode_area(pc: str | None) -> str | None:
    """'SW1A1AA' → 'SW'"""
    c = clean_postcode(pc)
    if not c:
        return None
    m = re.match(r"([A-Z]+)", c)
    return m.group(1) if m else None


def load_supplier_lookup() -> tuple[dict, dict, dict]:
    """
    Returns:
      by_ch_number: {ch_number -> {display_name, norm_key, rank, postcode}}
      by_norm_key:  {norm_key   -> [list of ch-enriched supplier records]}
      all_variants: {norm_variant -> [list of (ch_number, display_name, rank)]}
    """
    ranking = json.loads(RANKING.read_text(encoding="utf-8"))
    index = json.loads(INDEX.read_text(encoding="utf-8")) if INDEX.exists() else []

    # index is by company_number, ranking is by norm_key
    by_ch: dict[str, dict] = {}
    for row in index:
        by_ch[row["company_number"]] = {
            "display_name": row["display_name"],
            "rank": row["rank"],
            # postcode requires loading the per-supplier profile; defer lazily
        }

    # map every variant from the ranking to a norm_key
    by_norm: dict[str, list[dict]] = defaultdict(list)
    for supp in ranking["suppliers"]:
        norm_key = supp["norm_key"]
        by_norm[norm_key].append({
            "norm_key": norm_key,
            "display_name": supp["display_name"],
            "rank": supp["rank"],
            "variants": supp.get("variants") or [],
            "n_depts": supp.get("n_depts"),
        })

    # normalize every variant and map to norm_key
    variant_norms: dict[str, list] = defaultdict(list)
    for supp in ranking["suppliers"]:
        for v in supp.get("variants") or []:
            vn = normalize(v)
            if vn:
                variant_norms[vn].append(supp)

    return by_ch, by_norm, variant_norms


def load_postcode_map() -> dict[str, str]:
    """CH number -> first chunk of postcode from the profile."""
    out: dict[str, str] = {}
    profiles_dir = ROOT / "data" / "suppliers"
    if not profiles_dir.exists():
        return out
    for p in profiles_dir.glob("*.json"):
        if p.name.startswith("_"):
            continue
        try:
            d = json.loads(p.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            continue
        pc = ((d.get("identity") or {}).get("registered_office") or {}).get("postal_code")
        num = d.get("company_number")
        if num and pc:
            out[num] = clean_postcode(pc)
    return out


def resolve_row(row: dict, by_ch: dict, by_norm: dict, variant_norms: dict,
                postcode_map: dict) -> dict:
    """Three-pass match. Returns updated row with resolved_ch_number + confidence + method."""
    # Pass 1: direct GB-COH
    if row.get("supplier_ch_number"):
        ch = row["supplier_ch_number"]
        if ch in by_ch:
            return {
                **row,
                "resolved_ch_number": ch,
                "resolved_display_name": by_ch[ch]["display_name"],
                "resolution_method": "direct_ch_id",
                "resolution_confidence": "high",
                "resolution_notes": None,
            }
        else:
            # CH number exists but wasn't in our enrichment (maybe below rank 2388 cutoff)
            return {
                **row,
                "resolved_ch_number": ch,
                "resolved_display_name": row.get("supplier_name"),
                "resolution_method": "direct_ch_id_not_in_enrichment",
                "resolution_confidence": "high",
                "resolution_notes": "CH number from OCDS but not in our enriched set",
            }

    supplier_name = row.get("supplier_name") or row.get("supplier_legal_name") or ""
    if not supplier_name:
        return {
            **row,
            "resolved_ch_number": None,
            "resolved_display_name": None,
            "resolution_method": "no_supplier_name",
            "resolution_confidence": "none",
            "resolution_notes": "OCDS record has no supplier name or identifier",
        }

    norm_q = normalize(supplier_name)
    if not norm_q:
        return {
            **row,
            "resolved_ch_number": None,
            "resolved_display_name": None,
            "resolution_method": "empty_normalized_name",
            "resolution_confidence": "none",
        }

    # Pass 2a: exact normalized match against variants
    if norm_q in variant_norms:
        matches = variant_norms[norm_q]
        # deterministic pick: highest-ranked supplier (lowest rank number = biggest spend)
        best = min(matches, key=lambda s: s["rank"])
        # find CH number via the display_name → rank → ch mapping
        # easiest: find in by_ch by display_name match
        # fallback: None
        ch_number = next((k for k, v in by_ch.items() if v["rank"] == best["rank"]), None)
        return {
            **row,
            "resolved_ch_number": ch_number,
            "resolved_display_name": best["display_name"],
            "resolution_method": "fuzzy_exact_normalized",
            "resolution_confidence": "high" if ch_number else "medium",
            "resolution_notes": f"matched {len(matches)} supplier variant(s)",
        }

    # Pass 2b: token overlap ≥75% against ranking norm_keys
    q_tokens = set(norm_q.split())
    if q_tokens:
        best_score = 0.0
        best_norm = None
        for norm_k in by_norm:
            k_tokens = set(norm_k.split())
            if not k_tokens:
                continue
            overlap = len(q_tokens & k_tokens) / max(len(q_tokens), len(k_tokens))
            if overlap > best_score:
                best_score = overlap
                best_norm = norm_k
        if best_norm and best_score >= 0.75:
            best = min(by_norm[best_norm], key=lambda s: s["rank"])
            ch_number = next((k for k, v in by_ch.items() if v["rank"] == best["rank"]), None)
            return {
                **row,
                "resolved_ch_number": ch_number,
                "resolved_display_name": best["display_name"],
                "resolution_method": "fuzzy_token_overlap_75",
                "resolution_confidence": "medium" if ch_number else "low",
                "resolution_notes": f"token overlap {best_score:.2f}",
            }
        if best_norm and best_score >= 0.5:
            best = min(by_norm[best_norm], key=lambda s: s["rank"])
            ch_number = next((k for k, v in by_ch.items() if v["rank"] == best["rank"]), None)
            # Pass 3: use postcode to confirm
            if ch_number and postcode_map.get(ch_number):
                supplier_pc = clean_postcode(row.get("supplier_postcode"))
                if supplier_pc and postcode_map[ch_number][:4] == supplier_pc[:4]:
                    return {
                        **row,
                        "resolved_ch_number": ch_number,
                        "resolved_display_name": best["display_name"],
                        "resolution_method": "token_overlap_50_postcode_confirm",
                        "resolution_confidence": "medium",
                        "resolution_notes": f"overlap {best_score:.2f} + postcode area match",
                    }

    return {
        **row,
        "resolved_ch_number": None,
        "resolved_display_name": None,
        "resolution_method": "unmatched",
        "resolution_confidence": "none",
        "resolution_notes": f"supplier_name='{supplier_name[:60]}' no good match",
    }


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--min-confidence", choices=["none", "low", "medium", "high"], default="none",
                    help="Filter output to only rows at or above this confidence (default: keep all)")
    args = ap.parse_args()

    # find all input files — per-year preferred, legacy fallback
    per_year = sorted(PROC_DIR.glob("contracts_flat_*.jsonl"))
    legacy = PROC_DIR / "contracts_flat.jsonl"
    if per_year:
        input_files = per_year
    elif legacy.exists():
        input_files = [legacy]
    else:
        print(f"Error: no contracts_flat*.jsonl found. Run procurement_ingest_contracts_finder.py first.", file=sys.stderr)
        sys.exit(1)
    print(f"Input files: {[f.name for f in input_files]}")

    print("Loading supplier lookup tables...")
    by_ch, by_norm, variant_norms = load_supplier_lookup()
    print(f"  Enriched suppliers by CH number: {len(by_ch)}")
    print(f"  Ranking entries by norm key:     {len(by_norm)}")
    print(f"  Normalized variants:             {len(variant_norms)}")

    print("Loading postcode map...")
    postcode_map = load_postcode_map()
    print(f"  CH numbers with postcode: {len(postcode_map)}")

    rows_in = []
    for f in input_files:
        with open(f, encoding="utf-8") as fh:
            for line in fh:
                rows_in.append(json.loads(line))
    print(f"\nInput rows: {len(rows_in)}")

    conf_rank = {"none": 0, "low": 1, "medium": 2, "high": 3}
    min_conf = conf_rank[args.min_confidence]

    method_counter: Counter = Counter()
    conf_counter: Counter = Counter()
    matched_ch_counter: Counter = Counter()

    with open(OUT, "w", encoding="utf-8") as fh:
        for row in rows_in:
            result = resolve_row(row, by_ch, by_norm, variant_norms, postcode_map)
            method_counter[result["resolution_method"]] += 1
            conf_counter[result["resolution_confidence"]] += 1
            if result.get("resolved_ch_number"):
                matched_ch_counter[result["resolved_ch_number"]] += 1
            if conf_rank[result["resolution_confidence"]] >= min_conf:
                fh.write(json.dumps(result, ensure_ascii=False) + "\n")

    report = {
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z"),
        "input_rows": len(rows_in),
        "min_confidence_filter": args.min_confidence,
        "by_method": dict(method_counter),
        "by_confidence": dict(conf_counter),
        "unique_ch_numbers_matched": len(matched_ch_counter),
        "rows_matched_any_confidence": sum(1 for r in rows_in
                                           if resolve_row(r, by_ch, by_norm, variant_norms, postcode_map)
                                           .get("resolved_ch_number")),
        "status": "DRAFT — not wired",
    }

    # cheaper: compute rows_matched from counter
    report["rows_matched_any_confidence"] = sum(n for m, n in method_counter.items()
                                                if m not in ("unmatched", "no_supplier_name", "empty_normalized_name"))
    report["match_rate_pct"] = round(report["rows_matched_any_confidence"] / max(len(rows_in), 1) * 100, 2)

    REPORT.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")

    print("\n=== RESOLUTION REPORT ===")
    print(f"  input rows:                  {len(rows_in)}")
    print(f"  matched (any confidence):    {report['rows_matched_any_confidence']} ({report['match_rate_pct']}%)")
    print(f"  unique CH numbers matched:   {report['unique_ch_numbers_matched']}")
    print()
    print("By resolution method:")
    for m, n in method_counter.most_common():
        print(f"  {m:<40} {n:>4}")
    print()
    print("By confidence:")
    for c, n in conf_counter.most_common():
        print(f"  {c:<20} {n:>4}")


if __name__ == "__main__":
    main()
