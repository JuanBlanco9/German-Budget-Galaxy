#!/usr/bin/env python3
"""
enrich_uk_suppliers_wikidata.py

Queries Wikidata for companies whose UBO chain terminated as `foreign_unresolved`
or with weak/missing jurisdiction data. Wikidata has parent organisation (P749),
country (P17), industry (P452), headquarters (P159), legal form (P1454) for
notable companies, each with a Q-ID + revision URL for citation.

Target pool: terminal hops of unresolved chains in supplier_ubo.jsonl.

Output: data/recipients/uk/supplier_wikidata.jsonl  (one line per queried name)
        Each result includes: match, wikidata_id, country, parent chain, sources.

Usage:
  python scripts/enrich_uk_suppliers_wikidata.py
  python scripts/enrich_uk_suppliers_wikidata.py --limit 20
  python scripts/enrich_uk_suppliers_wikidata.py --target all   # also try resolved chains
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import requests

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parents[1]
UK_DIR = ROOT / "data" / "recipients" / "uk"
UBO = UK_DIR / "supplier_ubo.jsonl"
OUT = UK_DIR / "supplier_wikidata.jsonl"

WIKIDATA_API = "https://www.wikidata.org/w/api.php"
WIKIDATA_ENTITY = "https://www.wikidata.org/wiki/Special:EntityData/{qid}.json"
WIKIDATA_PAGE = "https://www.wikidata.org/wiki/{qid}"
USER_AGENT = "budget-galaxy-wikidata/0.1 (+github.com/JuanBlanco9/Budget-Galaxy)"

# Rate limit politely — Wikidata allows 5 req/sec, we use 3
RATE_SLEEP_S = 0.35

# Q-IDs of "company-like" classes used for filtering search results
COMPANY_CLASS_QIDS = {
    "Q4830453": "business enterprise",
    "Q891723": "public company",
    "Q786820": "automobile manufacturer",  # illustrative; many sub-classes
    "Q167037": "corporation",
    "Q6881511": "enterprise",
    "Q43229": "organization",
    "Q783794": "company",
    "Q1156831": "private company limited by shares",
    "Q270791": "state-owned enterprise",
    "Q48204": "limited liability company",
    "Q1341478": "legal person",
    "Q2221906": "geographic location",  # exclude — but keep class for detection
    "Q15649794": "corporate group",
    "Q4830453": "business enterprise",
}

# Minimal label cleanup for match scoring
NORM_RE = re.compile(r"[^\w\s]")
SUFFIX_RE = re.compile(
    r"\b(limited|ltd\.?|plc|llp|inc\.?|incorporated|company|co\.?|the|corp\.?|"
    r"corporation|s\.?a\.?|gmbh|a\.?g\.?|n\.?v\.?|b\.?v\.?|spa|s\.?l\.?|pte|pty|group)\b",
    re.IGNORECASE,
)
WS_RE = re.compile(r"\s+")


def norm(s: str | None) -> str:
    if not s:
        return ""
    s = NORM_RE.sub(" ", s.lower())
    s = SUFFIX_RE.sub(" ", s)
    return WS_RE.sub(" ", s).strip()


def score_match(query: str, candidate: str) -> str:
    q = norm(query)
    c = norm(candidate)
    if not q or not c:
        return "low"
    if q == c:
        return "exact"
    if c.startswith(q) or q.startswith(c):
        return "prefix"
    qt, ct = set(q.split()), set(c.split())
    if not qt:
        return "low"
    overlap = len(qt & ct) / len(qt)
    if overlap >= 0.75:
        return "high_overlap"
    if overlap >= 0.5:
        return "medium_overlap"
    return "low"


# ------------------------------ HTTP ------------------------------

_session = requests.Session()
_session.headers.update({"User-Agent": USER_AGENT, "Accept": "application/json"})


def get_with_retry(url: str, params: dict | None = None, max_retries: int = 4) -> dict | None:
    backoff = 1.0
    for _ in range(max_retries):
        try:
            r = _session.get(url, params=params, timeout=30)
            if r.status_code == 429:
                wait = int(r.headers.get("Retry-After", 30))
                time.sleep(wait)
                continue
            if r.status_code >= 500:
                time.sleep(backoff)
                backoff *= 2
                continue
            if r.status_code == 404:
                return None
            r.raise_for_status()
            return r.json()
        except requests.RequestException:
            time.sleep(backoff)
            backoff *= 2
    return None


# ------------------------------ Wikidata ------------------------------

def search_entities(name: str, limit: int = 5) -> list[dict]:
    time.sleep(RATE_SLEEP_S)
    res = get_with_retry(
        WIKIDATA_API,
        params={
            "action": "wbsearchentities",
            "search": name,
            "language": "en",
            "format": "json",
            "limit": limit,
            "type": "item",
        },
    )
    if not res:
        return []
    return res.get("search", [])


def fetch_entity(qid: str) -> dict | None:
    time.sleep(RATE_SLEEP_S)
    res = get_with_retry(WIKIDATA_ENTITY.format(qid=qid))
    if not res:
        return None
    return (res.get("entities") or {}).get(qid)


def get_claim_value(entity: dict, prop: str) -> list[str]:
    """Return list of Q-IDs for the given property claims."""
    out = []
    for c in (entity.get("claims") or {}).get(prop, []):
        m = (c.get("mainsnak") or {}).get("datavalue", {}).get("value", {})
        if isinstance(m, dict) and m.get("id"):
            out.append(m["id"])
    return out


def get_claim_string(entity: dict, prop: str) -> list[str]:
    """Return list of string values for the given property claims."""
    out = []
    for c in (entity.get("claims") or {}).get(prop, []):
        m = (c.get("mainsnak") or {}).get("datavalue", {}).get("value")
        if isinstance(m, str):
            out.append(m)
        elif isinstance(m, dict) and "text" in m:
            out.append(m["text"])
    return out


def get_label(entity: dict, lang: str = "en") -> str:
    return ((entity.get("labels") or {}).get(lang) or {}).get("value") or entity.get("id", "")


def get_description(entity: dict, lang: str = "en") -> str:
    return ((entity.get("descriptions") or {}).get(lang) or {}).get("value") or ""


COMPANY_DESC_KEYWORDS = re.compile(
    r"\b(company|corporation|subsidiary|group|holdings?|enterprise|"
    r"manufacturer|producer|firm|conglomerate|business|construction|"
    r"consultant|consultancy|services|operator|airline|bank|insurer)\b",
    re.IGNORECASE,
)


def is_company_like(entity: dict) -> bool:
    p31s = get_claim_value(entity, "P31")
    if set(p31s) & set(COMPANY_CLASS_QIDS.keys()):
        return True
    # description keyword fallback — catches Wikidata items with unusual P31 (e.g., "Royal BAM Group")
    desc = get_description(entity)
    if COMPANY_DESC_KEYWORDS.search(desc):
        return True
    return False


_SUFFIX_STRIP_RE = re.compile(
    r",?\s+(Inc\.?|Incorporated|LLC|L\.L\.C\.|Corp\.?|Corporation|"
    r"Limited|Ltd\.?|PLC|LLP|S\.?A\.?|GmbH|A\.?G\.?|N\.?V\.?|B\.?V\.?|"
    r"SpA|S\.?p\.?A\.?|S\.?L\.?|Oy|Pte|Pty|Holdings?|Group(e)?|SE|"
    r"Groep|International|UK|Global)\s*$",
    re.IGNORECASE,
)
_PREFIX_STRIP_RE = re.compile(r"^(The|Koninklijke|Royal)\s+", re.IGNORECASE)


def simplify_name(name: str) -> str:
    """Iteratively strip trailing corporate suffixes and leading articles."""
    s = name.strip(" .,;")
    for _ in range(5):
        new = _SUFFIX_STRIP_RE.sub("", s).strip(" .,;")
        if new == s or not new:
            break
        s = new
    s = _PREFIX_STRIP_RE.sub("", s).strip()
    return s


def entity_snapshot(entity: dict, max_chain_depth: int = 3) -> dict:
    """Collect company-relevant fields."""
    qid = entity.get("id")
    label = get_label(entity)
    desc = get_description(entity)
    p31 = get_claim_value(entity, "P31")
    country_qids = get_claim_value(entity, "P17")
    industry_qids = get_claim_value(entity, "P452")
    hq_qids = get_claim_value(entity, "P159")
    legal_qids = get_claim_value(entity, "P1454")
    parent_qids = get_claim_value(entity, "P749")
    owner_qids = get_claim_value(entity, "P127")
    # revisions for citation
    revision = entity.get("lastrevid")
    return {
        "qid": qid,
        "label": label,
        "description": desc,
        "instance_of": p31,
        "country_qids": country_qids,
        "industry_qids": industry_qids,
        "headquarters_qids": hq_qids,
        "legal_form_qids": legal_qids,
        "parent_qids": parent_qids,
        "owner_qids": owner_qids,
        "revision_id": revision,
        "source_url": WIKIDATA_PAGE.format(qid=qid),
    }


def resolve_qid_labels(qids: list[str], cache: dict) -> dict[str, str]:
    """Resolve a list of Q-IDs to their English labels (cached)."""
    out = {}
    for q in qids:
        if q in cache:
            out[q] = cache[q]
            continue
        ent = fetch_entity(q)
        if ent:
            label = get_label(ent)
            cache[q] = label
            out[q] = label
        else:
            cache[q] = q
            out[q] = q
    return out


def walk_parents_wd(entity: dict, depth: int, visited: set[str], label_cache: dict) -> list[dict]:
    """Walk parent organisation chain upward to depth."""
    chain = []
    current = entity
    while depth > 0 and current:
        snap = entity_snapshot(current)
        countries = resolve_qid_labels(snap["country_qids"], label_cache)
        snap["country_labels"] = list(countries.values())
        chain.append(snap)
        parent_qids = snap["parent_qids"] or snap["owner_qids"]
        if not parent_qids:
            break
        parent_qid = parent_qids[0]  # take first
        if parent_qid in visited:
            break
        visited.add(parent_qid)
        current = fetch_entity(parent_qid)
        depth -= 1
    return chain


def resolve_name(name: str, label_cache: dict) -> dict:
    """Search Wikidata for a name and return best company match with parent chain."""
    result = {
        "query_name": name,
        "match": None,
        "candidates_n": 0,
        "chain": [],
        "queries_used": [name],
        "error": None,
    }
    try:
        cands = search_entities(name, limit=5)
        # fallback: if no hits or weak-only, retry with simplified name
        if not cands or all(score_match(name, c.get("label", "")) == "low" for c in cands):
            simple = simplify_name(name)
            if simple and simple.lower() != name.lower():
                result["queries_used"].append(simple)
                cands2 = search_entities(simple, limit=5)
                cands = cands + [c for c in cands2 if c.get("id") not in {x.get("id") for x in cands}]
        result["candidates_n"] = len(cands)
        if not cands:
            return result

        # score each candidate and try to confirm as company
        scored = []
        for c in cands:
            q = score_match(name, c.get("label", ""))
            scored.append((q, c))
        rank = {"exact": 0, "prefix": 1, "high_overlap": 2, "medium_overlap": 3, "low": 4}
        scored.sort(key=lambda x: rank[x[0]])

        # fetch entities for top candidates until we find one that's company-like
        for quality, c in scored[:3]:
            ent = fetch_entity(c["id"])
            if not ent:
                continue
            if not is_company_like(ent) and quality not in ("exact",):
                continue
            chain = walk_parents_wd(ent, depth=5, visited={ent.get("id")}, label_cache=label_cache)
            result["match"] = {
                "match_quality": quality,
                "qid": c["id"],
                "label": c.get("label"),
                "description": c.get("description"),
                "is_company_like": is_company_like(ent),
            }
            result["chain"] = chain
            return result

        # no company-like match → return first weak match for reference
        best_quality, best_cand = scored[0]
        result["match"] = {
            "match_quality": best_quality,
            "qid": best_cand["id"],
            "label": best_cand.get("label"),
            "description": best_cand.get("description"),
            "is_company_like": False,
            "note": "best candidate not company-like; keeping for reference only",
        }
    except Exception as e:
        result["error"] = f"{type(e).__name__}: {e}"
    return result


# ------------------------------ pipeline ------------------------------

def collect_targets(target_mode: str) -> list[dict]:
    """Pull name+context to query from supplier_ubo.jsonl based on target_mode."""
    rows = []
    with open(UBO, encoding="utf-8") as fh:
        for line in fh:
            rows.append(json.loads(line))

    targets: list[dict] = []
    seen = set()
    for r in rows:
        for c in r.get("ubo_chains", []):
            t = c[-1]
            if not isinstance(t, dict):
                continue
            name = t.get("name")
            if not name:
                continue
            res = t.get("resolution")
            include = False
            if target_mode == "unresolved":
                include = res in ("foreign_unresolved", "max_depth_reached")
            elif target_mode == "all":
                include = res != "individual" and res != "government"
            if include and name not in seen:
                seen.add(name)
                targets.append({
                    "query_name": name,
                    "source_rank": r["source_rank"],
                    "source_company_number": r["company_number"],
                    "source_company_name": r["company_name"],
                    "current_resolution": res,
                    "current_jurisdiction": t.get("jurisdiction"),
                })
    return targets


def load_done() -> set[str]:
    done = set()
    if OUT.exists():
        with open(OUT, encoding="utf-8") as fh:
            for line in fh:
                try:
                    obj = json.loads(line)
                    if obj.get("query_name") and not obj.get("error"):
                        done.add(obj["query_name"])
                except json.JSONDecodeError:
                    continue
    return done


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--limit", type=int, default=None)
    ap.add_argument("--target", choices=["unresolved", "all"], default="unresolved",
                    help="'unresolved' = foreign_unresolved+max_depth (default); 'all' = any non-terminal")
    args = ap.parse_args()

    targets = collect_targets(args.target)
    if args.limit:
        targets = targets[: args.limit]

    done = load_done()
    todo = [t for t in targets if t["query_name"] not in done]

    print(f"Unique query names (target={args.target}): {len(targets)}")
    print(f"Already queried: {len(done)}")
    print(f"To process: {len(todo)}")
    print(f"Output: {OUT.relative_to(ROOT)}")

    if not todo:
        return

    label_cache: dict[str, str] = {}
    ok = err = hits = 0
    t0 = time.time()

    with open(OUT, "a", encoding="utf-8") as fh:
        for i, target in enumerate(todo, start=1):
            res = resolve_name(target["query_name"], label_cache)
            # enrich with context from the query
            res.update({
                "source_rank": target["source_rank"],
                "source_company_number": target["source_company_number"],
                "source_company_name": target["source_company_name"],
                "current_resolution": target["current_resolution"],
                "queried_at": datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z"),
            })
            fh.write(json.dumps(res, ensure_ascii=False) + "\n")
            fh.flush()
            if res.get("error"):
                err += 1
            else:
                ok += 1
                if res.get("match") and res["match"].get("is_company_like"):
                    hits += 1
            if i % 10 == 0 or i == len(todo):
                elapsed = time.time() - t0
                rate = i / elapsed if elapsed else 0
                eta = (len(todo) - i) / rate if rate else 0
                print(
                    f"[{i:>4}/{len(todo)}] {target['query_name'][:40]:<40} ok={ok} hits={hits} err={err} "
                    f"elapsed={elapsed:.0f}s eta={eta:.0f}s",
                    flush=True,
                )

    print(f"\nDone. ok={ok} err={err} company_matches={hits}")


if __name__ == "__main__":
    main()
