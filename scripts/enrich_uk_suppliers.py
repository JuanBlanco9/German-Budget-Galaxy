#!/usr/bin/env python3
"""
enrich_uk_suppliers.py

Reads data/recipients/uk/supplier_ranking_classified.json, filters
ch_eligible=True, and enriches each supplier with Companies House data:
  - company number (best-match search)
  - registered office, status, SIC codes, incorporation date
  - latest accounts filing metadata + downloaded PDF

Output:
  data/recipients/uk/supplier_enrichment.jsonl       (one line per supplier)
  data/recipients/uk/supplier_financials/*.pdf       (accounts PDFs)
  data/recipients/uk/enrichment_progress.json        (checkpoint file)

Resume-safe: re-running skips ranks already present in the JSONL.

Usage:
  CH_API_KEY="..." python scripts/enrich_uk_suppliers.py --limit 100
  CH_API_KEY="..." python scripts/enrich_uk_suppliers.py          # full run
  python scripts/enrich_uk_suppliers.py --dry-run                  # no API
  CH_API_KEY="..." python scripts/enrich_uk_suppliers.py --no-pdf  # metadata only
"""

from __future__ import annotations

import argparse
import base64
import json
import os
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote

import requests

# fix Windows cp1252 stdout for £ symbol
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parents[1]
UK_DIR = ROOT / "data" / "recipients" / "uk"
CLASSIFIED = UK_DIR / "supplier_ranking_classified.json"
OUT_JSONL = UK_DIR / "supplier_enrichment.jsonl"
PROGRESS = UK_DIR / "enrichment_progress.json"
PDF_DIR = UK_DIR / "supplier_financials"

CH_API = "https://api.company-information.service.gov.uk"
RATE_SLEEP_S = 0.11  # under 600/min with safety margin
USER_AGENT = "budget-galaxy-enrichment/0.1 (+github.com/JuanBlanco9/Budget-Galaxy)"

NORMALIZE_STRIP = re.compile(
    r"\b(limited|ltd\.?|plc|llp|llc|inc\.?|incorporated|corp\.?|corporation|"
    r"company|co\.?|the|uk)\b",
    re.IGNORECASE,
)
NON_WORD_RE = re.compile(r"[^\w\s]")
WS_RE = re.compile(r"\s+")


# ------------------------------- HTTP utils -------------------------------

def auth_header(key: str) -> dict:
    b64 = base64.b64encode(f"{key}:".encode()).decode()
    return {
        "Authorization": f"Basic {b64}",
        "User-Agent": USER_AGENT,
        "Accept": "application/json",
    }


def get_with_retry(url: str, headers: dict, stream: bool = False, max_retries: int = 4) -> requests.Response | None:
    """GET with backoff on 429/5xx. Returns None on 404. Raises on other errors."""
    backoff = 1.0
    for attempt in range(max_retries):
        r = requests.get(url, headers=headers, stream=stream, timeout=30, allow_redirects=True)
        if r.status_code == 404:
            return None
        if r.status_code == 429:
            wait = int(r.headers.get("Retry-After", 60))
            print(f"  rate-limited, sleeping {wait}s", flush=True)
            time.sleep(wait)
            continue
        if 500 <= r.status_code < 600:
            time.sleep(backoff)
            backoff *= 2
            continue
        r.raise_for_status()
        return r
    return None


# ------------------------------- matching -------------------------------

def norm_match(s: str) -> str:
    s = NON_WORD_RE.sub(" ", (s or "").lower())
    s = NORMALIZE_STRIP.sub(" ", s)
    return WS_RE.sub(" ", s).strip()


def score_match(query: str, candidate: str) -> str:
    q = norm_match(query)
    c = norm_match(candidate)
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
    if overlap >= 0.45:
        return "medium_overlap"
    return "low"


# ------------------------------- CH calls -------------------------------

def ch_search(name: str, headers: dict) -> dict | None:
    q = WS_RE.sub(" ", name.strip())[:140]
    url = f"{CH_API}/search/companies?q={quote(q)}&items_per_page=5"
    time.sleep(RATE_SLEEP_S)
    r = get_with_retry(url, headers)
    if not r:
        return None
    items = r.json().get("items", [])
    if not items:
        return None
    # prefer active companies over dissolved when score is tied
    status_rank = {"active": 0, "open": 0}
    rank = {"exact": 0, "prefix": 1, "high_overlap": 2, "medium_overlap": 3, "low": 4}
    scored = [
        (
            rank[score_match(name, it.get("title", ""))],
            status_rank.get(it.get("company_status"), 9),
            it,
        )
        for it in items
    ]
    scored.sort(key=lambda t: (t[0], t[1]))
    best_rank, _, best = scored[0]
    best_score = [k for k, v in rank.items() if v == best_rank][0]
    return {
        "match_quality": best_score,
        "company_number": best.get("company_number"),
        "title": best.get("title"),
        "company_status": best.get("company_status"),
        "address": best.get("address_snippet"),
        "candidates_returned": len(items),
    }


def ch_profile(number: str, headers: dict) -> dict | None:
    url = f"{CH_API}/company/{number}"
    time.sleep(RATE_SLEEP_S)
    r = get_with_retry(url, headers)
    return r.json() if r else None


def ch_filing_history(number: str, headers: dict) -> list[dict]:
    url = f"{CH_API}/company/{number}/filing-history?category=accounts&items_per_page=10"
    time.sleep(RATE_SLEEP_S)
    r = get_with_retry(url, headers)
    if not r:
        return []
    return r.json().get("items", [])


def download_accounts_pdf(filing: dict, headers: dict, out_path: Path) -> int | None:
    doc_meta_url = filing.get("links", {}).get("document_metadata")
    if not doc_meta_url:
        return None
    time.sleep(RATE_SLEEP_S)
    r = get_with_retry(doc_meta_url, headers)
    if not r:
        return None
    meta = r.json()
    content_url = meta.get("links", {}).get("document")
    if not content_url:
        return None
    time.sleep(RATE_SLEEP_S)
    pdf_headers = {**headers, "Accept": "application/pdf"}
    r = get_with_retry(content_url, pdf_headers, stream=True)
    if not r:
        return None
    tmp = out_path.with_suffix(".pdf.part")
    with open(tmp, "wb") as f:
        for chunk in r.iter_content(chunk_size=65536):
            if chunk:
                f.write(chunk)
    tmp.replace(out_path)
    return out_path.stat().st_size


# ------------------------------- pipeline -------------------------------

ACCEPT_MATCH_QUALITIES = {"exact", "prefix"}
REVIEW_MATCH_QUALITIES = {"high_overlap"}
# medium_overlap and low are treated as errors: they almost always miss semantically


def enrich_one(supplier: dict, headers: dict, download_pdf: bool) -> dict:
    name = supplier["display_name"]
    now = datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")
    result = {
        "rank": supplier["rank"],
        "display_name": name,
        "norm_key": supplier["norm_key"],
        "category": supplier["category"],
        "total_gbp": supplier["total_gbp"],
        "depts": supplier["depts"],
        "n_variants": supplier["n_variants"],
        "variants": supplier["variants"][:5],
        "enriched_at": now,
        "ch_match": None,
        "company": None,
        "accounts": None,
        "needs_review": False,
        "error": None,
    }
    try:
        match = ch_search(name, headers)
        if not match:
            result["error"] = "no_search_results"
            return result
        result["ch_match"] = match
        mq = match["match_quality"]
        if mq not in ACCEPT_MATCH_QUALITIES and mq not in REVIEW_MATCH_QUALITIES:
            # medium_overlap / low → almost always wrong (e.g. HOMES ENGLAND → ALDERLEY HOMES)
            result["error"] = f"weak_match_{mq}"
            return result
        if mq in REVIEW_MATCH_QUALITIES:
            # accept metadata but skip PDF — avoids wasting bytes on a questionable entity
            result["needs_review"] = True
            download_pdf = False

        profile = ch_profile(match["company_number"], headers)
        if profile:
            result["company"] = {
                "company_number": profile.get("company_number"),
                "name": profile.get("company_name"),
                "status": profile.get("company_status"),
                "type": profile.get("type"),
                "jurisdiction": profile.get("jurisdiction"),
                "date_of_creation": profile.get("date_of_creation"),
                "sic_codes": profile.get("sic_codes"),
                "registered_office": profile.get("registered_office_address"),
                "last_accounts": (profile.get("accounts") or {}).get("last_accounts"),
                "next_accounts_due": (profile.get("accounts") or {}).get("next_due"),
            }

        filings = ch_filing_history(match["company_number"], headers)
        if filings:
            latest = filings[0]
            acc = {
                "transaction_id": latest.get("transaction_id"),
                "date": latest.get("date"),
                "action_date": latest.get("action_date"),
                "type": latest.get("type"),
                "description": latest.get("description"),
                "pdf_path": None,
                "pdf_bytes": None,
            }
            if download_pdf:
                number = match["company_number"]
                pdf_name = f"{number}_{latest.get('date', 'unknown')}.pdf"
                pdf_path = PDF_DIR / pdf_name
                if pdf_path.exists() and pdf_path.stat().st_size > 0:
                    acc["pdf_path"] = str(pdf_path.relative_to(ROOT)).replace("\\", "/")
                    acc["pdf_bytes"] = pdf_path.stat().st_size
                else:
                    try:
                        size = download_accounts_pdf(latest, headers, pdf_path)
                        if size:
                            acc["pdf_path"] = str(pdf_path.relative_to(ROOT)).replace("\\", "/")
                            acc["pdf_bytes"] = size
                    except Exception as e:
                        acc["download_error"] = f"{type(e).__name__}: {e}"
            result["accounts"] = acc
    except requests.HTTPError as e:
        result["error"] = f"HTTPError {e.response.status_code}: {e.response.reason}"
    except Exception as e:
        result["error"] = f"{type(e).__name__}: {e}"
    return result


def load_completed_ranks() -> set[int]:
    """Read existing JSONL to find already-enriched ranks. Resume-safe by default."""
    done: set[int] = set()
    if OUT_JSONL.exists():
        with open(OUT_JSONL, encoding="utf-8") as fh:
            for line in fh:
                try:
                    obj = json.loads(line)
                    if obj.get("rank") is not None and not obj.get("error"):
                        done.add(obj["rank"])
                except json.JSONDecodeError:
                    continue
    return done


def save_progress(progress: dict) -> None:
    PROGRESS.write_text(json.dumps(progress, indent=2), encoding="utf-8")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--limit", type=int, default=None, help="Process only top-N CH-eligible")
    ap.add_argument("--dry-run", action="store_true", help="No API calls; preview only")
    ap.add_argument("--no-pdf", action="store_true", help="Skip PDF downloads (metadata only)")
    ap.add_argument("--redo-errors", action="store_true", help="Retry rows that previously errored")
    args = ap.parse_args()

    key = os.environ.get("CH_API_KEY")
    if not args.dry_run and not key:
        print("Error: CH_API_KEY environment variable not set.", file=sys.stderr)
        sys.exit(1)

    headers = auth_header(key) if key else {}
    PDF_DIR.mkdir(parents=True, exist_ok=True)

    data = json.loads(CLASSIFIED.read_text(encoding="utf-8"))
    eligible = [s for s in data["suppliers"] if s["ch_eligible"]]
    # already sorted by rank (= spend desc)
    if args.limit:
        eligible = eligible[: args.limit]

    done = load_completed_ranks() if not args.redo_errors else set()
    to_process = [s for s in eligible if s["rank"] not in done]

    total_eligible_spend = sum(s["total_gbp"] for s in eligible)
    todo_spend = sum(s["total_gbp"] for s in to_process)

    print(f"CH-eligible in scope: {len(eligible):,} (£{total_eligible_spend/1e9:.2f}B)")
    print(f"Already enriched: {len(done):,}")
    print(f"To process: {len(to_process):,} (£{todo_spend/1e9:.2f}B)")
    print(f"JSONL: {OUT_JSONL.relative_to(ROOT)}")
    print(f"PDFs: {PDF_DIR.relative_to(ROOT)}")

    if args.dry_run:
        print("\n-- DRY RUN -- no API calls")
        for s in to_process[:10]:
            print(f"  would enrich #{s['rank']:>4} ({s['category']}): {s['display_name']}")
        return

    if not to_process:
        print("Nothing to do.")
        return

    progress = {
        "started_at": datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z"),
        "last_rank": None,
        "ok": 0,
        "err": 0,
        "pdfs": 0,
        "pdf_bytes_total": 0,
    }

    t0 = time.time()
    with open(OUT_JSONL, "a", encoding="utf-8") as fh:
        for i, s in enumerate(to_process, start=1):
            r = enrich_one(s, headers, download_pdf=not args.no_pdf)
            fh.write(json.dumps(r, ensure_ascii=False) + "\n")
            fh.flush()

            if r.get("error"):
                progress["err"] += 1
            else:
                progress["ok"] += 1
            pdf_b = (r.get("accounts") or {}).get("pdf_bytes") or 0
            if pdf_b:
                progress["pdfs"] += 1
                progress["pdf_bytes_total"] += pdf_b
            progress["last_rank"] = s["rank"]

            if i % 10 == 0 or i == len(to_process):
                elapsed = time.time() - t0
                rate = i / elapsed if elapsed else 0
                eta = (len(to_process) - i) / rate if rate else 0
                save_progress(progress)
                print(
                    f"[{i:>4}/{len(to_process)}] rank={s['rank']:>4} "
                    f"ok={progress['ok']} err={progress['err']} "
                    f"pdfs={progress['pdfs']} ({progress['pdf_bytes_total']/1e6:.0f}MB) "
                    f"elapsed={elapsed:.0f}s eta={eta:.0f}s",
                    flush=True,
                )

    save_progress(progress)
    print(
        f"\nDone. ok={progress['ok']} err={progress['err']} "
        f"pdfs={progress['pdfs']} total={progress['pdf_bytes_total']/1e6:.1f}MB"
    )


if __name__ == "__main__":
    main()
