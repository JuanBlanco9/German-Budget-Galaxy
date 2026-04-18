#!/usr/bin/env python3
"""
procurement_ingest_contracts_finder.py

DRAFT — NOT WIRED.
Paginates the Contracts Finder OCDS Search API and produces a flat JSONL with
one row per (release, award, supplier) combination.

Output: data/procurement/contracts_flat.jsonl

Input: none — all queried live via cursor pagination.

Status:
- Standalone. Does not modify any existing pipeline file.
- Output lives in data/procurement/, which the active build_supplier_profiles
  script does not read yet.
- Ready to be wired into the main pipeline after team alignment.

Usage:
  python scripts/procurement_ingest_contracts_finder.py --year 2024
  python scripts/procurement_ingest_contracts_finder.py --from 2023-01-01 --to 2024-12-31
  python scripts/procurement_ingest_contracts_finder.py --year 2024 --limit-pages 10   # test run
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from datetime import date, datetime, timezone
from pathlib import Path
from urllib.parse import urlparse, parse_qs

import requests

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "data" / "procurement"
# Per-year output files to avoid overwriting. Aggregator reads all of them.
# Legacy single-file output kept for backward compatibility if no year flag used.
CURSOR_STATE = OUT_DIR / "_cursor_state.json"
LOG = OUT_DIR / "_ingest_log.json"

API_BASE = "https://www.contractsfinder.service.gov.uk/Published/Notices/OCDS/Search"
USER_AGENT = "budget-galaxy-procurement/0.1 (+github.com/JuanBlanco9/Budget-Galaxy)"
PAGE_SIZE = 100
RATE_SLEEP_S = 0.25  # polite; CF has no documented limit but 4 req/s is safe


def get_with_retry(url: str, params: dict | None = None, max_retries: int = 4) -> dict | None:
    backoff = 1.0
    session = requests.Session()
    session.headers.update({"User-Agent": USER_AGENT, "Accept": "application/json"})
    for _ in range(max_retries):
        try:
            r = session.get(url, params=params, timeout=60)
            if r.status_code == 429:
                wait = int(r.headers.get("Retry-After", 30))
                print(f"  rate-limited, sleeping {wait}s", flush=True)
                time.sleep(wait)
                continue
            if 500 <= r.status_code < 600:
                time.sleep(backoff)
                backoff *= 2
                continue
            r.raise_for_status()
            return r.json()
        except requests.RequestException as e:
            print(f"  retry after error: {type(e).__name__}: {e}", flush=True)
            time.sleep(backoff)
            backoff *= 2
    return None


def flatten_release(release: dict) -> list[dict]:
    """
    A single OCDS release can encode 0..N awards × 1..N suppliers per award.
    We emit one flat row per (release, award, supplier).
    Releases with no awards emit a single row with award fields null
    (useful to track tender-only notices without announced winners yet).
    """
    ocid = release.get("ocid")
    release_id = release.get("id")
    date_str = release.get("date")
    tags = release.get("tag") or []
    initiation = release.get("initiationType")

    tender = release.get("tender") or {}
    tender_classification = tender.get("classification") or {}
    cpv_code = tender_classification.get("id")
    cpv_label = tender_classification.get("description")

    buyer = release.get("buyer") or {}
    parties = release.get("parties") or []
    buyer_party = next((p for p in parties if "buyer" in (p.get("roles") or [])), None)
    buyer_identifier = (buyer_party or {}).get("identifier") or {}

    awards = release.get("awards") or []

    base_row = {
        "ocid": ocid,
        "release_id": release_id,
        "release_date": date_str,
        "tags": tags,
        "initiation_type": initiation,
        "tender_id": tender.get("id"),
        "tender_title": tender.get("title"),
        "tender_description": tender.get("description"),
        "tender_status": tender.get("status"),
        "tender_value_gbp": (tender.get("value") or {}).get("amount"),
        "tender_currency": (tender.get("value") or {}).get("currency"),
        "procurement_method": tender.get("procurementMethod"),
        "procurement_method_details": tender.get("procurementMethodDetails"),
        "procurement_category": tender.get("mainProcurementCategory"),
        "tender_period_start": (tender.get("tenderPeriod") or {}).get("startDate"),
        "tender_period_end": (tender.get("tenderPeriod") or {}).get("endDate"),
        "contract_period_start": (tender.get("contractPeriod") or {}).get("startDate"),
        "contract_period_end": (tender.get("contractPeriod") or {}).get("endDate"),
        "number_of_tenderers": tender.get("numberOfTenderers"),
        "cpv_code": cpv_code,
        "cpv_label": cpv_label,
        "suitability_sme": (tender.get("suitability") or {}).get("sme"),
        "suitability_vcse": (tender.get("suitability") or {}).get("vcse"),
        "buyer_id": buyer.get("id"),
        "buyer_name": buyer.get("name"),
        "buyer_scheme": buyer_identifier.get("scheme"),
        "buyer_identifier_id": buyer_identifier.get("id"),
        "buyer_locality": ((buyer_party or {}).get("address") or {}).get("locality"),
        "buyer_postcode": ((buyer_party or {}).get("address") or {}).get("postalCode"),
        "source_notice_url": None,  # set below when we find the html document
    }

    # grab the notice html url if present in any award's documents
    notice_url = None
    for a in awards:
        for d in (a.get("documents") or []):
            if d.get("documentType") == "awardNotice" and d.get("url"):
                notice_url = d["url"]
                break
        if notice_url:
            break
    base_row["source_notice_url"] = notice_url

    rows: list[dict] = []
    if not awards:
        # tender-only notice (no winner yet) — one row with null award fields
        rows.append({
            **base_row,
            "award_id": None,
            "award_status": None,
            "award_date": None,
            "award_date_published": None,
            "award_value_gbp": None,
            "award_currency": None,
            "award_contract_start": None,
            "award_contract_end": None,
            "supplier_scheme": None,
            "supplier_identifier_id": None,
            "supplier_ch_number": None,
            "supplier_name": None,
            "supplier_legal_name": None,
            "supplier_locality": None,
            "supplier_postcode": None,
            "supplier_country": None,
            "supplier_scale": None,
        })
        return rows

    for award in awards:
        award_suppliers = award.get("suppliers") or []
        for sup in (award_suppliers or [None]):
            sup_id = sup.get("id") if sup else None
            sup_party = next(
                (p for p in parties if p.get("id") == sup_id and "supplier" in (p.get("roles") or [])),
                None,
            ) if sup_id else None
            sup_identifier = (sup_party or {}).get("identifier") or {}
            ch_number = None
            if sup_identifier.get("scheme") == "GB-COH":
                ch_number = sup_identifier.get("id")
            rows.append({
                **base_row,
                "award_id": award.get("id"),
                "award_status": award.get("status"),
                "award_date": award.get("date"),
                "award_date_published": award.get("datePublished"),
                "award_value_gbp": (award.get("value") or {}).get("amount"),
                "award_currency": (award.get("value") or {}).get("currency"),
                "award_contract_start": (award.get("contractPeriod") or {}).get("startDate"),
                "award_contract_end": (award.get("contractPeriod") or {}).get("endDate"),
                "supplier_scheme": sup_identifier.get("scheme"),
                "supplier_identifier_id": sup_identifier.get("id"),
                "supplier_ch_number": ch_number,
                "supplier_name": (sup or {}).get("name") if sup else None,
                "supplier_legal_name": sup_identifier.get("legalName"),
                "supplier_locality": ((sup_party or {}).get("address") or {}).get("locality"),
                "supplier_postcode": ((sup_party or {}).get("address") or {}).get("postalCode"),
                "supplier_country": ((sup_party or {}).get("address") or {}).get("countryName"),
                "supplier_scale": ((sup_party or {}).get("details") or {}).get("scale"),
            })
    return rows


def load_cursor_state() -> dict:
    if CURSOR_STATE.exists():
        return json.loads(CURSOR_STATE.read_text(encoding="utf-8"))
    return {}


def save_cursor_state(state: dict) -> None:
    CURSOR_STATE.write_text(json.dumps(state, indent=2), encoding="utf-8")


def extract_cursor(next_url: str) -> str | None:
    if not next_url:
        return None
    q = parse_qs(urlparse(next_url).query)
    return (q.get("cursor") or [None])[0]


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--year", type=int, help="Convenience: ingest whole year (same as --from YYYY-01-01 --to YYYY-12-31)")
    ap.add_argument("--from", dest="date_from", help="publishedFrom YYYY-MM-DD")
    ap.add_argument("--to", dest="date_to", help="publishedTo YYYY-MM-DD")
    ap.add_argument("--limit-pages", type=int, default=None, help="Stop after N pages (testing)")
    ap.add_argument("--resume", action="store_true", help="Resume from saved cursor state")
    args = ap.parse_args()

    if args.year:
        date_from = f"{args.year}-01-01"
        date_to = f"{args.year}-12-31"
    elif args.date_from and args.date_to:
        date_from = args.date_from
        date_to = args.date_to
    else:
        print("Error: provide --year or both --from and --to", file=sys.stderr)
        sys.exit(1)

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    # per-year output to avoid overwriting. If args.year, use that;
    # else derive from date_from year.
    year_tag = args.year if args.year else date_from[:4]
    OUT = OUT_DIR / f"contracts_flat_{year_tag}.jsonl"

    # resume logic
    state_key = f"{date_from}__{date_to}"
    state = load_cursor_state()
    current_cursor = None
    page_counter = 0
    if args.resume and state.get(state_key):
        current_cursor = state[state_key].get("cursor")
        page_counter = state[state_key].get("pages_done", 0)
        print(f"Resuming from page {page_counter}, cursor={current_cursor[:30] if current_cursor else None}...", flush=True)

    mode = "a" if args.resume else "w"

    total_releases = 0
    total_rows = 0
    buyers_seen: set = set()
    suppliers_seen: set = set()
    ch_matches = 0
    t0 = time.time()

    with open(OUT, mode, encoding="utf-8") as fh:
        while True:
            page_counter += 1
            if args.limit_pages and page_counter > args.limit_pages:
                print(f"Reached --limit-pages {args.limit_pages}, stopping.", flush=True)
                break

            params = {
                "publishedFrom": date_from,
                "publishedTo": date_to,
                "limit": PAGE_SIZE,
                "stages": "award",  # restrict to awards (not tenders/cancellations) for now
            }
            if current_cursor:
                params["cursor"] = current_cursor

            time.sleep(RATE_SLEEP_S)
            data = get_with_retry(API_BASE, params=params)
            if not data:
                print(f"  Failed to fetch page {page_counter}; stopping.", flush=True)
                break

            releases = data.get("releases") or []
            if not releases:
                print(f"Page {page_counter}: no releases → end of results.", flush=True)
                break

            for release in releases:
                rows = flatten_release(release)
                total_releases += 1
                for row in rows:
                    fh.write(json.dumps(row, ensure_ascii=False) + "\n")
                    total_rows += 1
                    if row.get("buyer_id"):
                        buyers_seen.add(row["buyer_id"])
                    if row.get("supplier_identifier_id"):
                        suppliers_seen.add(row["supplier_identifier_id"])
                    if row.get("supplier_ch_number"):
                        ch_matches += 1
            fh.flush()

            next_link = (data.get("links") or {}).get("next")
            new_cursor = extract_cursor(next_link) if next_link else None

            # persist cursor state after each page
            state[state_key] = {
                "cursor": new_cursor,
                "pages_done": page_counter,
                "last_updated": datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z"),
                "releases_so_far": total_releases,
                "rows_so_far": total_rows,
            }
            save_cursor_state(state)

            if page_counter % 10 == 0 or not new_cursor:
                elapsed = time.time() - t0
                rate = total_releases / elapsed if elapsed else 0
                print(
                    f"[page {page_counter}] releases={total_releases} rows={total_rows} "
                    f"buyers={len(buyers_seen)} suppliers={len(suppliers_seen)} "
                    f"ch_matched={ch_matches} ({ch_matches/total_rows*100 if total_rows else 0:.1f}%) "
                    f"elapsed={elapsed:.0f}s rate={rate:.0f} rel/s",
                    flush=True,
                )

            if not new_cursor:
                print(f"\nReached end of results.", flush=True)
                break
            current_cursor = new_cursor

    # write run log
    log_entry = {
        "run_at": datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z"),
        "date_from": date_from,
        "date_to": date_to,
        "pages_processed": page_counter,
        "releases_ingested": total_releases,
        "flat_rows_written": total_rows,
        "unique_buyers": len(buyers_seen),
        "unique_suppliers": len(suppliers_seen),
        "rows_with_ch_number": ch_matches,
        "ch_coverage_pct": round(ch_matches / total_rows * 100, 2) if total_rows else 0,
        "output_file": str(OUT.relative_to(ROOT)),
        "status": "DRAFT — not wired to active pipeline",
    }
    existing_log = []
    if LOG.exists():
        existing_log = json.loads(LOG.read_text(encoding="utf-8"))
    existing_log.append(log_entry)
    LOG.write_text(json.dumps(existing_log, indent=2, ensure_ascii=False), encoding="utf-8")

    print("\n=== INGEST SUMMARY ===")
    for k, v in log_entry.items():
        print(f"  {k:<22} {v}")


if __name__ == "__main__":
    main()
