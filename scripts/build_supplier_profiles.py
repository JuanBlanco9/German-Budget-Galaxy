#!/usr/bin/env python3
"""
build_supplier_profiles.py

Joins everything we built for UK suppliers into one JSON per company, ready to
consume from a "supplier detail" tab in Budget Galaxy.

Reads:
  data/recipients/uk/supplier_ranking_classified.json   (classification)
  data/recipients/uk/l5_*_2024.json                      (raw per-segment spend)
  data/recipients/uk/supplier_enrichment.jsonl           (identity + accounts)
  data/recipients/uk/supplier_governance.jsonl           (officers + direct PSCs)
  data/recipients/uk/supplier_ubo.jsonl                  (full chain walk + wikidata merged in)

Writes:
  data/suppliers/{company_number}.json   (one per supplier)
  data/suppliers/_index.json             (flat list for search/listing)
  data/suppliers/_manifest.json          (counts, generated_at, versions)

Idempotent: regenerate anytime from the inputs.
Nothing is fetched from the network.

Usage: python scripts/build_supplier_profiles.py
"""

from __future__ import annotations

import json
import re
import sys
from collections import defaultdict
from datetime import date, datetime, timezone
from glob import glob
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parents[1]
UK_DIR = ROOT / "data" / "recipients" / "uk"
RANKING = UK_DIR / "supplier_ranking_classified.json"
ENRICHMENT = UK_DIR / "supplier_enrichment.jsonl"
GOVERNANCE = UK_DIR / "supplier_governance.jsonl"
UBO = UK_DIR / "supplier_ubo.jsonl"
MATCH_CONF = UK_DIR / "supplier_match_confidence.jsonl"

OUT_DIR = ROOT / "data" / "suppliers"
INDEX = OUT_DIR / "_index.json"
MANIFEST = OUT_DIR / "_manifest.json"

GENERATOR_VERSION = "1.1.0"

# ---- SIC codes: small canonical map for the common ones ----
SIC_LABELS = {
    "30300": "Aircraft and spacecraft manufacture",
    "35110": "Electricity production",
    "36000": "Water collection, treatment and supply",
    "37000": "Sewerage",
    "41100": "Development of building projects",
    "41201": "Construction of commercial buildings",
    "41202": "Construction of residential buildings",
    "42110": "Construction of roads and motorways",
    "42120": "Construction of railways",
    "42130": "Construction of bridges and tunnels",
    "43999": "Other specialised construction activities",
    "45320": "Retail sale of motor vehicle parts",
    "46711": "Wholesale of solid, liquid and gaseous fuels",
    "46900": "Non-specialised wholesale trade",
    "49100": "Passenger rail transport, interurban",
    "49390": "Other passenger land transport n.e.c.",
    "52220": "Service activities incidental to water transport",
    "61100": "Wired telecommunications activities",
    "61900": "Other telecommunications activities",
    "62012": "Business and domestic software development",
    "62020": "IT consultancy activities",
    "62090": "Other information technology service activities",
    "63990": "Other information service activities",
    "64191": "Banks",
    "64205": "Activities of financial services holding companies",
    "64303": "Activities of investment trusts",
    "64929": "Other credit granting",
    "64999": "Other financial service activities n.e.c.",
    "68209": "Other letting and operating of own or leased real estate",
    "70100": "Activities of head offices",
    "70229": "Management consultancy activities (other)",
    "71122": "Engineering-related scientific and technical consulting",
    "71129": "Other engineering activities",
    "74909": "Other professional, scientific and technical activities",
    "78109": "Activities of employment placement agencies",
    "81100": "Combined facilities support activities",
    "82990": "Other business support service activities",
    "84110": "General public administration activities",
    "84220": "Defence activities",
    "85320": "Technical and vocational secondary education",
    "85590": "Other education n.e.c.",
    "87300": "Residential care for the elderly and disabled",
    "88100": "Social work activities without accommodation for the elderly",
    "96090": "Other service activities n.e.c.",
}


def sic_label(code: str) -> str:
    return SIC_LABELS.get(code, f"SIC {code}")


def load_jsonl(path: Path) -> list[dict]:
    out = []
    if not path.exists():
        return out
    with open(path, encoding="utf-8") as fh:
        for line in fh:
            try:
                out.append(json.loads(line))
            except json.JSONDecodeError:
                continue
    return out


def compute_age_years(iso_date: str | None) -> int | None:
    if not iso_date:
        return None
    try:
        d = date.fromisoformat(iso_date)
        return int((date.today() - d).days / 365.25)
    except ValueError:
        return None


# ---- per-dept spend recomputation from raw L5 ----

def build_norm_to_dept_amounts() -> dict[str, list[dict]]:
    """
    For each normalized supplier key, return a list of:
      { dept_id, dept_name, segment, amount, pct_of_segment }
    so we can build spend_by_department on the fly per supplier.
    """
    import re
    from glob import glob

    # replicate normalization used in build_uk_supplier_ranking.py
    LEADING_ID = re.compile(r"^\s*0*\d+\s*[-–—_]\s*")
    SUFFIX_RE = re.compile(
        r"\b(limited|ltd\.?|plc|llp|llc|l\.?p\.?|inc\.?|incorporated|"
        r"corp\.?|corporation|co\.?|company|the)\b",
        re.IGNORECASE,
    )
    PUNCT = re.compile(r"[\.,\"'()&/]+")
    WS = re.compile(r"\s+")

    def norm(name: str) -> str:
        s = LEADING_ID.sub("", name or "")
        s = s.replace("&", " and ")
        s = PUNCT.sub(" ", s)
        s = SUFFIX_RE.sub(" ", s)
        return WS.sub(" ", s).strip().lower()

    rows: dict[str, list[dict]] = defaultdict(list)
    for f in sorted(glob(str(UK_DIR / "l5_*_2024.json"))):
        with open(f, encoding="utf-8") as fh:
            d = json.load(fh)
        dept_id = d["dept_id"]
        dept_name = d["dept"]
        for seg in d.get("segments", []):
            seg_name = seg.get("segment")
            seg_total = seg.get("total") or 0
            for r in seg.get("top_recipients", []):
                k = norm(r.get("name") or "")
                if not k:
                    continue
                rows[k].append({
                    "dept_id": dept_id,
                    "dept_name": dept_name,
                    "segment": seg_name,
                    "segment_total": seg_total,
                    "amount": r.get("amount") or 0,
                    "pct_of_segment": r.get("pct_of_segment"),
                    "rank_in_segment": r.get("rank"),
                    "type": r.get("type"),
                })
    return rows


def spend_profile_for(norm_key: str, dept_spend_index: dict[str, list[dict]],
                      display_name: str, rank: int, category: str) -> dict:
    entries = dept_spend_index.get(norm_key, [])
    total = sum(e["amount"] for e in entries)
    by_dept: dict[str, dict] = {}
    for e in entries:
        d = by_dept.setdefault(e["dept_id"], {
            "dept_id": e["dept_id"],
            "dept_name": e["dept_name"],
            "amount_gbp": 0,
            "segments": [],
        })
        d["amount_gbp"] += e["amount"]
        d["segments"].append({
            "segment": e["segment"],
            "amount_gbp": e["amount"],
            "pct_of_segment": e["pct_of_segment"],
            "rank_in_segment": e["rank_in_segment"],
            "type": e["type"],
        })
    return {
        "total_gbp_2024": total,
        "rank": rank,
        "category": category,
        "n_departments": len(by_dept),
        "by_department": sorted(by_dept.values(), key=lambda d: -d["amount_gbp"]),
    }


# ---- section builders ----

def build_identity(enr_row: dict) -> dict:
    c = enr_row.get("company") or {}
    sic_codes = c.get("sic_codes") or []
    doc = c.get("date_of_creation")
    ch_num = c.get("company_number")
    return {
        "ch_number": ch_num,
        "official_name": c.get("name") or enr_row.get("display_name"),
        "display_name": enr_row.get("display_name"),
        "status": c.get("status"),
        "type": c.get("type"),
        "jurisdiction": c.get("jurisdiction"),
        "incorporated": doc,
        "age_years": compute_age_years(doc),
        "registered_office": c.get("registered_office"),
        "sic_codes": sic_codes,
        "sic_labels": [sic_label(s) for s in sic_codes],
        "ch_match_quality": (enr_row.get("ch_match") or {}).get("match_quality"),
        "ch_url": f"https://find-and-update.company-information.service.gov.uk/company/{ch_num}" if ch_num else None,
    }


def build_financial_health(enr_row: dict) -> dict | None:
    acc = enr_row.get("accounts")
    if not acc:
        return None
    next_due = ((enr_row.get("company") or {}).get("next_accounts_due"))
    overdue = False
    if next_due:
        try:
            overdue = date.fromisoformat(next_due) < date.today()
        except ValueError:
            pass
    pdf_bytes = acc.get("pdf_bytes") or 0
    pdf_path = acc.get("pdf_path")
    return {
        "last_filing_date": acc.get("date"),
        "period_end": acc.get("action_date"),
        "accounts_type_code": acc.get("type"),
        "accounts_type_description": acc.get("description"),
        "transaction_id": acc.get("transaction_id"),
        "pdf": {
            "path": pdf_path,
            "size_mb": round(pdf_bytes / 1_000_000, 2) if pdf_bytes else None,
            "exists": bool(pdf_path),
        } if pdf_path else None,
        "next_accounts_due": next_due,
        "overdue": overdue,
    }


def build_governance(gov_row: dict | None) -> dict | None:
    if not gov_row:
        return None
    off = gov_row.get("officers") or {}
    psc = gov_row.get("psc") or {}
    active = off.get("active") or []
    resigned = off.get("resigned") or []
    # board turnover signal
    n_active = max(len(active), 1)
    ratio = len(resigned) / n_active
    if ratio < 2.0:
        turnover = "low"
    elif ratio < 5.0:
        turnover = "medium"
    else:
        turnover = "high"

    directors = [o for o in active if o.get("role") == "director"]
    secretaries = [o for o in active if o.get("role") and "secret" in o["role"].lower()]

    return {
        "officers_active_count": len(active),
        "officers_resigned_count": len(resigned),
        "board_turnover_ratio": round(ratio, 2),
        "board_turnover_signal": turnover,
        "active_directors": directors,
        "secretaries": secretaries,
        "all_active_officers": active,
        "resigned_officers_summary": {
            "count": len(resigned),
            # last 5 resignations for context
            "recent": sorted(resigned, key=lambda o: o.get("resigned_on") or "", reverse=True)[:5],
        },
        "direct_psc_count": len(psc.get("active") or []),
        "direct_psc_statements": psc.get("statements") or [],
    }


def build_ownership_chain(ubo_row: dict | None) -> dict | None:
    if not ubo_row:
        return None
    chains = ubo_row.get("ubo_chains") or []
    # summarize UBO categories
    ult_individuals, ult_govs, ult_foreign_countries = [], [], []
    listed_dispersed = False
    for c in chains:
        if not c:
            continue
        t = c[-1]
        if not isinstance(t, dict):
            continue
        res = t.get("resolution")
        if res == "individual" and t.get("name"):
            ult_individuals.append(t["name"])
        elif res == "government" and t.get("name"):
            ult_govs.append(t["name"])
        elif res in ("foreign_unresolved", "foreign_via_wikidata") and t.get("jurisdiction"):
            ult_foreign_countries.append(t["jurisdiction"])
        # crude signal for listed PLC parent
        if t.get("parent_type") == "plc":
            listed_dispersed = True

    return {
        "resolution": ubo_row.get("overall_resolution"),
        "direct_psc_count": ubo_row.get("direct_psc_count"),
        "chains_count": len(chains),
        "chains": chains,  # hops preserved as-is with source URLs on every hop
        "ubo_summary": {
            "ultimate_individuals": sorted(set(ult_individuals)),
            "ultimate_governments": sorted(set(ult_govs)),
            "ultimate_foreign_countries": sorted(set(ult_foreign_countries)),
            "listed_dispersed_signal": listed_dispersed,
        },
    }


def build_sources(identity: dict, fin: dict | None,
                  governance: dict | None, ownership: dict | None) -> list[dict]:
    src: list[dict] = []
    if identity.get("ch_url"):
        src.append({
            "section": "identity",
            "type": "companies_house_api",
            "url": identity["ch_url"],
        })
    if fin and fin.get("pdf"):
        src.append({
            "section": "financial_health",
            "type": "ch_filing_pdf",
            "transaction_id": fin.get("transaction_id"),
            "pdf_path": fin["pdf"]["path"],
        })
    if governance:
        ch_num = identity.get("ch_number")
        src.append({
            "section": "governance.officers",
            "type": "companies_house_api",
            "url": f"https://api.company-information.service.gov.uk/company/{ch_num}/officers",
        })
        src.append({
            "section": "governance.psc",
            "type": "companies_house_api",
            "url": f"https://api.company-information.service.gov.uk/company/{ch_num}/persons-with-significant-control",
        })
    if ownership and ownership.get("chains"):
        # each hop carries its own source; collect wikidata URLs here
        wd_urls = set()
        for chain in ownership["chains"]:
            for hop in chain:
                if isinstance(hop, dict) and hop.get("wikidata", {}).get("wikidata_url"):
                    wd_urls.add(hop["wikidata"]["wikidata_url"])
        for u in sorted(wd_urls):
            src.append({"section": "ownership_chain.wikidata", "type": "wikidata", "url": u})
    return src


# ---- main ----

def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    print("Loading inputs...")
    ranking = json.loads(RANKING.read_text(encoding="utf-8"))
    ranking_by_norm = {s["norm_key"]: s for s in ranking["suppliers"]}

    enrichments = load_jsonl(ENRICHMENT)
    # dedup enrichment rows by ch company_number (pick the highest-ranked per num)
    enr_by_num: dict[str, dict] = {}
    for r in enrichments:
        if r.get("error"):
            continue
        num = (r.get("company") or {}).get("company_number")
        if not num:
            continue
        existing = enr_by_num.get(num)
        if not existing or r["rank"] < existing["rank"]:
            enr_by_num[num] = r

    gov_by_num = {g["company_number"]: g for g in load_jsonl(GOVERNANCE) if not g.get("error")}
    ubo_by_num = {u["company_number"]: u for u in load_jsonl(UBO) if not u.get("error")}
    conf_by_num = {c["company_number"]: c for c in load_jsonl(MATCH_CONF)}

    print(f"  ranking suppliers: {len(ranking_by_norm)}")
    print(f"  enrichment (dedup by CH number): {len(enr_by_num)}")
    print(f"  governance: {len(gov_by_num)}")
    print(f"  ubo: {len(ubo_by_num)}")
    print(f"  match_confidence: {len(conf_by_num)}")

    print("Building per-dept spend index from raw L5...")
    dept_spend_index = build_norm_to_dept_amounts()
    print(f"  norm keys with L5 entries: {len(dept_spend_index)}")

    print("Building profiles...")
    index_rows = []
    written = 0
    for num, enr in enr_by_num.items():
        gov = gov_by_num.get(num)
        ubo = ubo_by_num.get(num)
        norm_key = enr.get("norm_key")
        rank_row = ranking_by_norm.get(norm_key) or {}

        identity = build_identity(enr)
        spend = spend_profile_for(
            norm_key,
            dept_spend_index,
            enr.get("display_name"),
            enr["rank"],
            enr.get("category"),
        )
        financial = build_financial_health(enr)
        governance = build_governance(gov)
        ownership = build_ownership_chain(ubo)
        sources = build_sources(identity, financial, governance, ownership)

        conf = conf_by_num.get(num) or {}

        profile = {
            "company_number": num,
            "display_name": enr.get("display_name"),
            "identity": identity,
            "spend_profile": spend,
            "financial_health": financial,
            "governance": governance,
            "ownership_chain": ownership,
            "match_confidence": {
                "score": conf.get("match_confidence_score"),
                "label": conf.get("match_confidence_label"),
                "reasons": conf.get("match_confidence_reasons") or [],
            } if conf else None,
            "sources": sources,
            "classification": {
                "category": enr.get("category"),
                "ch_eligible_source_reason": None,
            },
            "metadata": {
                "source_rank": enr["rank"],
                "enriched_at": enr.get("enriched_at"),
                "governance_enriched_at": gov.get("enriched_at") if gov else None,
                "ubo_enriched_at": ubo.get("enriched_at") if ubo else None,
                "wikidata_merged_at": ubo.get("wikidata_merged_at") if ubo else None,
                "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z"),
                "generator_version": GENERATOR_VERSION,
            },
        }

        out_path = OUT_DIR / f"{num}.json"
        out_path.write_text(json.dumps(profile, ensure_ascii=False, indent=2), encoding="utf-8")
        written += 1

        index_rows.append({
            "company_number": num,
            "display_name": enr.get("display_name"),
            "official_name": identity["official_name"],
            "rank": enr["rank"],
            "total_gbp_2024": spend["total_gbp_2024"],
            "category": enr.get("category"),
            "status": identity.get("status"),
            "jurisdiction": identity.get("jurisdiction"),
            "sic_codes": identity.get("sic_codes"),
            "n_departments": spend["n_departments"],
            "ubo_resolution": (ownership or {}).get("resolution"),
            "ubo_ultimate_countries": (ownership or {}).get("ubo_summary", {}).get("ultimate_foreign_countries") or [],
            "has_accounts_pdf": bool(financial and financial.get("pdf")),
            "has_wikidata_enrichment": any(
                hop.get("wikidata") for chain in (ownership or {}).get("chains", []) for hop in chain
                if isinstance(hop, dict)
            ),
            "match_confidence_score": conf.get("match_confidence_score"),
            "match_confidence_label": conf.get("match_confidence_label"),
        })

    # sort index by rank
    index_rows.sort(key=lambda r: r["rank"])
    INDEX.write_text(json.dumps(index_rows, ensure_ascii=False, indent=2), encoding="utf-8")

    from collections import Counter
    conf_dist = Counter(r.get("match_confidence_label") for r in index_rows if r.get("match_confidence_label"))
    res_dist = Counter(r.get("ubo_resolution") for r in index_rows if r.get("ubo_resolution"))

    manifest = {
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z"),
        "generator_version": GENERATOR_VERSION,
        "counts": {
            "suppliers": written,
            "with_governance": sum(1 for n in enr_by_num if n in gov_by_num),
            "with_ubo": sum(1 for n in enr_by_num if n in ubo_by_num),
            "with_pdf": sum(1 for r in index_rows if r["has_accounts_pdf"]),
            "with_wikidata": sum(1 for r in index_rows if r["has_wikidata_enrichment"]),
            "by_confidence": dict(conf_dist),
            "by_ubo_resolution": dict(res_dist),
        },
        "sources": {
            "ranking": str(RANKING.relative_to(ROOT)),
            "enrichment": str(ENRICHMENT.relative_to(ROOT)),
            "governance": str(GOVERNANCE.relative_to(ROOT)),
            "ubo": str(UBO.relative_to(ROOT)),
        },
        "schema_sections": [
            "identity", "spend_profile", "financial_health", "governance",
            "ownership_chain", "sources", "classification", "metadata",
        ],
    }
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")

    print()
    print(f"Wrote {written} profiles to {OUT_DIR.relative_to(ROOT)}/")
    print(f"Index: {INDEX.relative_to(ROOT)}")
    print(f"Manifest: {MANIFEST.relative_to(ROOT)}")
    print()
    print("Manifest counts:")
    for k, v in manifest["counts"].items():
        print(f"  {k:<20} {v}")


if __name__ == "__main__":
    main()
