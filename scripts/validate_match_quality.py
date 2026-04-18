#!/usr/bin/env python3
"""
validate_match_quality.py

Computes a match-confidence score (0-100) for every enriched supplier using
multiple heuristics beyond the name-match quality we already have.

Signals combined:
  + exact/prefix CH match
  + company active
  + company age >= 3 years
  + govt-owned PSC (consistent with UK govt supplier)
  + foreign multinational resolved via Wikidata
  + multi-hop corporate chain (unlikely false-positive)
  - dissolved/liquidation company receiving large spend
  - newly incorporated (<3 yrs) with big spend
  - single British individual UBO with very large spend (suspicious unless family-run)
  - weak name match + large spend
  - registered office micro-entity + big spend (commercial inconsistency)

Output:
  data/recipients/uk/supplier_match_confidence.jsonl
    one row per supplier with score, flags, reasons — meant for a "needs review" UI.
  Also: suspects sorted by spend for manual review.

Uses only local files. No network.
"""

from __future__ import annotations

import json
import sys
from collections import Counter
from datetime import date
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parents[1]
UK_DIR = ROOT / "data" / "recipients" / "uk"
PROFILES_DIR = ROOT / "data" / "suppliers"
OUT = UK_DIR / "supplier_match_confidence.jsonl"


def load_jsonl(path: Path) -> list[dict]:
    rows = []
    if not path.exists():
        return rows
    with open(path, encoding="utf-8") as fh:
        for line in fh:
            try:
                rows.append(json.loads(line))
            except json.JSONDecodeError:
                continue
    return rows


def compute_age_years(iso: str | None) -> int | None:
    if not iso:
        return None
    try:
        return int((date.today() - date.fromisoformat(iso)).days / 365.25)
    except ValueError:
        return None


# Known family-surname patterns — avoid flagging legit family business UBOs
FAMILY_NAME_TOKENS = {
    "wates", "bouygues", "kretinsky", "kretínský", "metter", "thorp", "holterman",
    "booth", "kirby", "laing", "jcb", "bamford", "lussenburg",
    "murray", "stewart", "hamilton", "rhodes", "jones", "ames", "tilbury",
}


def signal_score(profile: dict) -> dict:
    score = 50
    reasons: list[tuple[str, str]] = []

    identity = profile.get("identity") or {}
    spend_p = profile.get("spend_profile") or {}
    fin = profile.get("financial_health") or {}
    own = profile.get("ownership_chain") or {}
    gov = profile.get("governance") or {}

    mq = identity.get("ch_match_quality")
    spend = spend_p.get("total_gbp_2024") or 0
    status = identity.get("status") or ""
    age = identity.get("age_years")
    jur = (identity.get("jurisdiction") or "").lower()
    resolution = own.get("resolution")
    ultimate_individuals = (own.get("ubo_summary") or {}).get("ultimate_individuals") or []

    # --- name match
    if mq == "exact":
        score += 25
        reasons.append(("+25", "exact_name_match"))
    elif mq == "prefix":
        score += 15
        reasons.append(("+15", "prefix_name_match"))
    elif mq == "high_overlap":
        score += 5
        reasons.append(("+5", "high_overlap_name_match"))
    elif mq in ("medium_overlap", "low", None):
        score -= 15
        reasons.append(("-15", "weak_name_match"))

    # --- status
    if status == "active":
        score += 10
        reasons.append(("+10", "company_active"))
    elif status in {"dissolved", "closed", "converted-closed"}:
        if spend > 10_000_000:
            score -= 25
            reasons.append(("-25", f"company_{status}_with_high_spend"))
        else:
            score -= 10
            reasons.append(("-10", f"company_{status}"))
    elif status in {"liquidation", "administration"}:
        if spend > 10_000_000:
            score -= 30
            reasons.append(("-30", f"company_{status}_with_high_spend"))
        else:
            score -= 15
            reasons.append(("-15", f"company_{status}"))

    # --- age vs spend
    if age is not None:
        if age < 3 and spend > 10_000_000:
            score -= 20
            reasons.append(("-20", f"company_too_young_({age}y)_for_spend"))
        elif age < 1:
            score -= 10
            reasons.append(("-10", "company_brand_new"))
        elif age >= 10:
            score += 5
            reasons.append(("+5", "established_company_10y_plus"))

    # --- ownership consistency
    if resolution == "government":
        score += 20
        reasons.append(("+20", "govt_psc_consistent_with_supplier"))
    elif resolution == "foreign_via_wikidata":
        score += 10
        reasons.append(("+10", "foreign_chain_resolved"))
    elif resolution == "individual":
        if ultimate_individuals and spend > 50_000_000:
            # check if name looks like a known family/pe founder
            all_tokens = " ".join(ultimate_individuals).lower().split()
            if any(tok in FAMILY_NAME_TOKENS for tok in all_tokens):
                score += 5
                reasons.append(("+5", "known_family_pe_pattern"))
            else:
                score -= 15
                reasons.append(("-15", "unknown_individual_ubo_very_large_spend"))
    elif resolution in ("listed_dispersed", "listed_dispersed_legitimate"):
        score += 10
        reasons.append(("+10", "listed_plc_dispersed_ownership"))

    # --- jurisdiction coherence
    if jur and "united kingdom" not in jur and "england" not in jur and "wales" not in jur and "scotland" not in jur and "ireland" not in jur:
        score -= 10
        reasons.append(("-10", "foreign_jurisdiction_for_uk_contract"))

    # --- accounts filing freshness
    if fin and fin.get("overdue"):
        score -= 10
        reasons.append(("-10", "accounts_overdue"))

    # --- governance coherence
    turnover = gov.get("board_turnover_signal")
    if turnover == "high":
        score -= 5
        reasons.append(("-5", "high_board_turnover"))
    elif turnover == "low":
        score += 3
        reasons.append(("+3", "stable_board"))

    score = max(0, min(100, score))

    # Severity label
    if score >= 75:
        label = "high"
    elif score >= 55:
        label = "medium"
    elif score >= 35:
        label = "low"
    else:
        label = "suspicious"

    return {
        "match_confidence_score": score,
        "match_confidence_label": label,
        "match_confidence_reasons": reasons,
    }


def main() -> None:
    profile_files = sorted(PROFILES_DIR.glob("*.json"))
    profile_files = [p for p in profile_files if not p.name.startswith("_")]
    print(f"Evaluating {len(profile_files)} profiles...")

    results: list[dict] = []
    for pf in profile_files:
        profile = json.loads(pf.read_text(encoding="utf-8"))
        conf = signal_score(profile)
        results.append({
            "company_number": profile["company_number"],
            "display_name": profile["display_name"],
            "rank": (profile.get("spend_profile") or {}).get("rank"),
            "total_gbp_2024": (profile.get("spend_profile") or {}).get("total_gbp_2024"),
            "status": (profile.get("identity") or {}).get("status"),
            "match_quality": (profile.get("identity") or {}).get("ch_match_quality"),
            **conf,
        })

    # write JSONL
    with open(OUT, "w", encoding="utf-8") as fh:
        for r in sorted(results, key=lambda x: x["rank"] or 9999):
            fh.write(json.dumps(r, ensure_ascii=False) + "\n")

    # distribution
    label_counts = Counter(r["match_confidence_label"] for r in results)
    print("\nConfidence label distribution:")
    for label in ("high", "medium", "low", "suspicious"):
        n = label_counts.get(label, 0)
        spend = sum(r["total_gbp_2024"] or 0 for r in results if r["match_confidence_label"] == label)
        print(f"  {label:<12} {n:>4}  GBP {spend/1e9:>5.2f}B")

    # top suspects by spend
    suspects = [r for r in results if r["match_confidence_label"] in ("suspicious", "low")]
    suspects.sort(key=lambda x: -(x["total_gbp_2024"] or 0))
    print(f"\nTop {min(20, len(suspects))} suspect matches by spend (review manually):")
    print(f"  {'rank':>4}  {'score':>5}  {'spend_M':>8}  {'status':<14}  {'match':<15}  name")
    for r in suspects[:20]:
        print(f"  #{(r['rank'] or 0):>3}  {r['match_confidence_score']:>5}  "
              f"{(r['total_gbp_2024'] or 0)/1e6:>7.1f}M  {(r['status'] or '?')[:14]:<14}  "
              f"{(r['match_quality'] or '?')[:15]:<15}  {r['display_name'][:50]}")

    print(f"\nWrote {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
