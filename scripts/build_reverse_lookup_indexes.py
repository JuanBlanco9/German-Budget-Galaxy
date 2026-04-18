#!/usr/bin/env python3
"""
build_reverse_lookup_indexes.py

Generates reverse-lookup indexes derived from the existing supplier profiles.
Each index is a standalone JSON that lets a UI filter or cross-reference
without having to load all 400+ profiles at once.

This script is READ-ONLY on the existing `data/suppliers/` directory — it
only writes into a new subdirectory `data/suppliers/_reverse_indexes/`.
Nothing else is modified. Safe to re-run anytime.

Indexes produced:
  _by_ubo_country.json        — foreign jurisdiction → suppliers
  _by_ubo_individual.json     — individual UBO name → suppliers (reveals shared ownership)
  _by_ubo_government.json     — govt body → suppliers it ultimately owns
  _by_ubo_resolution.json     — resolution bucket → suppliers
  _by_sic_code.json           — SIC code → suppliers
  _by_match_confidence.json   — high/medium/low/suspicious → suppliers
  _by_department.json         — dept_id → suppliers
  _by_company_status.json     — active/dissolved/liquidation → suppliers
  _by_jurisdiction.json       — CH jurisdiction → suppliers
  _by_legal_form.json         — Ltd/PLC/LLP → suppliers
  _by_age_bucket.json         — <5y / 5-10y / 10-25y / 25-50y / 50+y → suppliers
  _sic_section_rollup.json    — SIC top-level section (A-U) → aggregated spend
  _manifest.json              — counts + description of each index

Usage: python scripts/build_reverse_lookup_indexes.py
"""

from __future__ import annotations

import json
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parents[1]
PROFILES_DIR = ROOT / "data" / "suppliers"
OUT_DIR = PROFILES_DIR / "_reverse_indexes"


# SIC 2007 section mapping (top-level industry groups)
# Source: ONS UK Standard Industrial Classification of Economic Activities 2007
SIC_SECTIONS = [
    ("A", "Agriculture, forestry and fishing", (1110, 3220)),
    ("B", "Mining and quarrying", (5100, 9900)),
    ("C", "Manufacturing", (10110, 33200)),
    ("D", "Electricity, gas, steam", (35110, 35300)),
    ("E", "Water supply, sewerage, waste", (36000, 39000)),
    ("F", "Construction", (41100, 43999)),
    ("G", "Wholesale and retail trade", (45110, 47990)),
    ("H", "Transportation and storage", (49100, 53202)),
    ("I", "Accommodation and food", (55100, 56302)),
    ("J", "Information and communication", (58110, 63990)),
    ("K", "Financial and insurance", (64110, 66300)),
    ("L", "Real estate", (68100, 68320)),
    ("M", "Professional, scientific, technical", (69101, 75000)),
    ("N", "Administrative and support services", (77110, 82990)),
    ("O", "Public administration and defence", (84110, 84300)),
    ("P", "Education", (85100, 85600)),
    ("Q", "Human health and social work", (86100, 88990)),
    ("R", "Arts, entertainment, recreation", (90010, 93290)),
    ("S", "Other service activities", (94110, 96090)),
    ("T", "Activities of households", (97000, 98200)),
    ("U", "Extraterritorial organisations", (99000, 99999)),
]


def sic_section(code: str) -> tuple[str, str]:
    try:
        c = int(code)
    except (ValueError, TypeError):
        return ("?", "Unknown")
    for section, label, (lo, hi) in SIC_SECTIONS:
        if lo <= c <= hi:
            return (section, label)
    return ("?", "Unknown")


def age_bucket(years: int | None) -> str:
    if years is None:
        return "unknown"
    if years < 5:
        return "under_5y"
    if years < 10:
        return "5_to_10y"
    if years < 25:
        return "10_to_25y"
    if years < 50:
        return "25_to_50y"
    return "50y_plus"


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    profile_files = sorted([p for p in PROFILES_DIR.glob("*.json") if not p.name.startswith("_")])
    print(f"Reading {len(profile_files)} profiles...")

    # initialize indexes
    by_ubo_country: dict[str, list] = defaultdict(list)
    by_ubo_individual: dict[str, list] = defaultdict(list)
    by_ubo_government: dict[str, list] = defaultdict(list)
    by_ubo_resolution: dict[str, list] = defaultdict(list)
    by_sic_code: dict[str, list] = defaultdict(list)
    by_match_confidence: dict[str, list] = defaultdict(list)
    by_department: dict[str, list] = defaultdict(list)
    by_company_status: dict[str, list] = defaultdict(list)
    by_jurisdiction: dict[str, list] = defaultdict(list)
    by_legal_form: dict[str, list] = defaultdict(list)
    by_age_bucket: dict[str, list] = defaultdict(list)
    sic_section_totals: dict[str, dict] = defaultdict(lambda: {"spend_gbp": 0, "count": 0})

    for pf in profile_files:
        profile = json.loads(pf.read_text(encoding="utf-8"))
        num = profile["company_number"]
        name = profile["display_name"]
        identity = profile.get("identity") or {}
        spend = (profile.get("spend_profile") or {}).get("total_gbp_2024") or 0
        ownership = profile.get("ownership_chain") or {}
        ubo_summary = ownership.get("ubo_summary") or {}
        match_conf = profile.get("match_confidence") or {}

        row_stub = {
            "company_number": num,
            "display_name": name,
            "rank": (profile.get("spend_profile") or {}).get("rank"),
            "total_gbp_2024": spend,
        }

        # by UBO country (foreign)
        for country in ubo_summary.get("ultimate_foreign_countries") or []:
            if country:
                by_ubo_country[country].append(row_stub)

        # by UBO individual
        for ind in ubo_summary.get("ultimate_individuals") or []:
            if ind:
                by_ubo_individual[ind].append(row_stub)

        # by UBO government body
        for govt in ubo_summary.get("ultimate_governments") or []:
            if govt:
                by_ubo_government[govt].append(row_stub)

        # by UBO resolution
        res = ownership.get("resolution")
        if res:
            by_ubo_resolution[res].append(row_stub)

        # by SIC code
        for sic in identity.get("sic_codes") or []:
            if sic:
                by_sic_code[sic].append(row_stub)
                sect, sect_label = sic_section(sic)
                bucket = f"{sect}: {sect_label}"
                sic_section_totals[bucket]["spend_gbp"] += spend
                sic_section_totals[bucket]["count"] += 1

        # by match confidence
        label = match_conf.get("label")
        if label:
            by_match_confidence[label].append(row_stub)

        # by department
        for dept in (profile.get("spend_profile") or {}).get("by_department") or []:
            by_department[dept["dept_id"]].append({
                **row_stub,
                "amount_gbp_in_dept": dept["amount_gbp"],
            })

        # by CH company status
        status = identity.get("status")
        if status:
            by_company_status[status].append(row_stub)

        # by jurisdiction
        jur = identity.get("jurisdiction")
        if jur:
            by_jurisdiction[jur].append(row_stub)

        # by legal form
        lf = identity.get("type")
        if lf:
            by_legal_form[lf].append(row_stub)

        # by age bucket
        by_age_bucket[age_bucket(identity.get("age_years"))].append(row_stub)

    # sort each list by spend desc
    def sort_rows(rows):
        return sorted(rows, key=lambda r: -(r.get("total_gbp_2024") or 0))

    indexes = {
        "_by_ubo_country": {k: sort_rows(v) for k, v in by_ubo_country.items()},
        "_by_ubo_individual": {k: sort_rows(v) for k, v in by_ubo_individual.items()},
        "_by_ubo_government": {k: sort_rows(v) for k, v in by_ubo_government.items()},
        "_by_ubo_resolution": {k: sort_rows(v) for k, v in by_ubo_resolution.items()},
        "_by_sic_code": {k: sort_rows(v) for k, v in by_sic_code.items()},
        "_by_match_confidence": {k: sort_rows(v) for k, v in by_match_confidence.items()},
        "_by_department": {k: sort_rows(v) for k, v in by_department.items()},
        "_by_company_status": {k: sort_rows(v) for k, v in by_company_status.items()},
        "_by_jurisdiction": {k: sort_rows(v) for k, v in by_jurisdiction.items()},
        "_by_legal_form": {k: sort_rows(v) for k, v in by_legal_form.items()},
        "_by_age_bucket": {k: sort_rows(v) for k, v in by_age_bucket.items()},
    }

    # write each
    for name, data in indexes.items():
        p = OUT_DIR / f"{name}.json"
        p.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

    # sic section rollup (different structure)
    rollup = dict(sorted(sic_section_totals.items(), key=lambda x: -x[1]["spend_gbp"]))
    (OUT_DIR / "_sic_section_rollup.json").write_text(
        json.dumps(rollup, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    # manifest
    manifest = {
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z"),
        "generator": "scripts/build_reverse_lookup_indexes.py",
        "source_profiles_count": len(profile_files),
        "status": "DRAFT — not wired into _index.json or frontend yet",
        "indexes": {
            name: {
                "keys": len(data),
                "total_rows": sum(len(v) for v in data.values()),
                "description": {
                    "_by_ubo_country": "Foreign country where a supplier's UBO chain terminates",
                    "_by_ubo_individual": "Natural person UBO → their controlled suppliers (reveals shared ownership)",
                    "_by_ubo_government": "Government body that ultimately owns suppliers",
                    "_by_ubo_resolution": "UBO resolution bucket (government, individual, listed_dispersed, ...)",
                    "_by_sic_code": "SIC 2007 code → suppliers in that industry",
                    "_by_match_confidence": "Match quality label (high/medium/low/suspicious)",
                    "_by_department": "Central govt department → suppliers paid by them",
                    "_by_company_status": "CH company status (active/dissolved/liquidation)",
                    "_by_jurisdiction": "CH jurisdiction (england-wales/scotland/...)",
                    "_by_legal_form": "Company type (ltd/plc/llp/...)",
                    "_by_age_bucket": "Incorporation age range",
                }.get(name, ""),
            }
            for name, data in indexes.items()
        },
        "sic_section_rollup_keys": len(rollup),
    }
    (OUT_DIR / "_manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    print(f"\nWrote indexes to {OUT_DIR.relative_to(ROOT)}/")
    for name, data in indexes.items():
        print(f"  {name:<28} keys={len(data):>4}  rows={sum(len(v) for v in data.values()):>5}")
    print(f"  _sic_section_rollup         sections={len(rollup)}")


if __name__ == "__main__":
    main()
