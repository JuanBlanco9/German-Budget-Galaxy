#!/usr/bin/env python3
"""
enrich_uk_suppliers_governance.py

Second-pass enrichment: for every unique CH company number in
supplier_enrichment.jsonl, fetch officers (directors/secretaries) and
persons with significant control (PSCs / UBOs).

Writes to data/recipients/uk/supplier_governance.jsonl, one line per
company_number. Resume-safe — re-running skips numbers already present.

Usage:
  CH_API_KEY="..." python scripts/enrich_uk_suppliers_governance.py
  CH_API_KEY="..." python scripts/enrich_uk_suppliers_governance.py --limit 50
  python scripts/enrich_uk_suppliers_governance.py --dry-run
"""

from __future__ import annotations

import argparse
import base64
import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import requests

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parents[1]
UK_DIR = ROOT / "data" / "recipients" / "uk"
SRC = UK_DIR / "supplier_enrichment.jsonl"
OUT = UK_DIR / "supplier_governance.jsonl"

CH_API = "https://api.company-information.service.gov.uk"
RATE_SLEEP_S = 0.11
USER_AGENT = "budget-galaxy-governance/0.1 (+github.com/JuanBlanco9/Budget-Galaxy)"


def auth_header(key: str) -> dict:
    b64 = base64.b64encode(f"{key}:".encode()).decode()
    return {
        "Authorization": f"Basic {b64}",
        "User-Agent": USER_AGENT,
        "Accept": "application/json",
    }


def get_with_retry(url: str, headers: dict, max_retries: int = 4) -> requests.Response | None:
    backoff = 1.0
    for attempt in range(max_retries):
        r = requests.get(url, headers=headers, timeout=30)
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


# ---------- slim officer / PSC records ----------

def slim_officer(o: dict) -> dict:
    """Keep only fields useful for a supplier-detail panel."""
    return {
        "name": o.get("name"),
        "role": o.get("officer_role"),
        "appointed_on": o.get("appointed_on"),
        "resigned_on": o.get("resigned_on"),
        "nationality": o.get("nationality"),
        "occupation": o.get("occupation"),
        "country_of_residence": o.get("country_of_residence"),
        "date_of_birth": o.get("date_of_birth"),  # dict with month/year only (day private)
        "address": {
            "locality": (o.get("address") or {}).get("locality"),
            "postal_code": (o.get("address") or {}).get("postal_code"),
            "country": (o.get("address") or {}).get("country"),
        } if o.get("address") else None,
    }


def slim_psc(p: dict) -> dict:
    kind = p.get("kind", "")
    return {
        "kind": kind,
        "name": p.get("name"),
        "name_elements": p.get("name_elements"),
        "nationality": p.get("nationality"),
        "country_of_residence": p.get("country_of_residence"),
        "natures_of_control": p.get("natures_of_control") or [],
        "notified_on": p.get("notified_on"),
        "ceased_on": p.get("ceased_on"),
        # for corporate PSCs — link back to parent company
        "identification": {
            "registration_number": (p.get("identification") or {}).get("registration_number"),
            "country_registered": (p.get("identification") or {}).get("country_registered"),
            "legal_authority": (p.get("identification") or {}).get("legal_authority"),
            "legal_form": (p.get("identification") or {}).get("legal_form"),
        } if p.get("identification") else None,
        "date_of_birth": p.get("date_of_birth"),
    }


# ---------- CH calls ----------

def fetch_officers(number: str, headers: dict) -> dict:
    """Get all officers (paginated). Returns {total_results, active[], resigned[]}."""
    active, resigned = [], []
    total = None
    start_index = 0
    items_per_page = 100
    while True:
        url = f"{CH_API}/company/{number}/officers?items_per_page={items_per_page}&start_index={start_index}&register_view=false"
        time.sleep(RATE_SLEEP_S)
        r = get_with_retry(url, headers)
        if not r:
            break
        body = r.json()
        total = body.get("total_results", 0)
        for o in body.get("items", []):
            s = slim_officer(o)
            (resigned if s.get("resigned_on") else active).append(s)
        start_index += items_per_page
        if start_index >= total:
            break
    return {"total_results": total or 0, "active": active, "resigned": resigned}


def fetch_psc(number: str, headers: dict) -> dict:
    """Get PSCs (UBOs). Returns {total_results, active[], ceased[], statements[]}."""
    active, ceased = [], []
    total = None
    start_index = 0
    items_per_page = 100
    while True:
        url = f"{CH_API}/company/{number}/persons-with-significant-control?items_per_page={items_per_page}&start_index={start_index}"
        time.sleep(RATE_SLEEP_S)
        r = get_with_retry(url, headers)
        if not r:
            break
        body = r.json()
        total = body.get("total_results", 0)
        for p in body.get("items", []):
            s = slim_psc(p)
            (ceased if s.get("ceased_on") else active).append(s)
        start_index += items_per_page
        if start_index >= total:
            break
    # also fetch PSC statements (e.g. "no PSC identified", "exempt", etc.)
    stmts_url = f"{CH_API}/company/{number}/persons-with-significant-control-statements"
    time.sleep(RATE_SLEEP_S)
    r = get_with_retry(stmts_url, headers)
    statements: list = []
    if r:
        for s in r.json().get("items", []):
            statements.append({
                "statement": s.get("statement"),
                "notified_on": s.get("notified_on"),
                "ceased_on": s.get("ceased_on"),
            })
    return {
        "total_results": total or 0,
        "active": active,
        "ceased": ceased,
        "statements": statements,
    }


# ---------- pipeline ----------

def load_done() -> set[str]:
    done: set[str] = set()
    if OUT.exists():
        with open(OUT, encoding="utf-8") as fh:
            for line in fh:
                try:
                    obj = json.loads(line)
                    if obj.get("company_number") and not obj.get("error"):
                        done.add(obj["company_number"])
                except json.JSONDecodeError:
                    continue
    return done


def extract_targets() -> list[dict]:
    """Read JSONL and return unique (company_number, company_name, rank, total_gbp) tuples."""
    seen: dict[str, dict] = {}
    with open(SRC, encoding="utf-8") as fh:
        for line in fh:
            r = json.loads(line)
            if r.get("error"):
                continue
            num = (r.get("company") or {}).get("company_number")
            if not num or num in seen:
                continue
            seen[num] = {
                "company_number": num,
                "company_name": (r.get("company") or {}).get("name") or r.get("display_name"),
                "rank": r["rank"],
                "total_gbp": r["total_gbp"],
            }
    return sorted(seen.values(), key=lambda x: x["rank"])


def enrich_one(target: dict, headers: dict) -> dict:
    now = datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")
    out = {
        "company_number": target["company_number"],
        "company_name": target["company_name"],
        "source_rank": target["rank"],
        "source_total_gbp": target["total_gbp"],
        "enriched_at": now,
        "officers": None,
        "psc": None,
        "error": None,
    }
    try:
        out["officers"] = fetch_officers(target["company_number"], headers)
        out["psc"] = fetch_psc(target["company_number"], headers)
    except requests.HTTPError as e:
        out["error"] = f"HTTPError {e.response.status_code}: {e.response.reason}"
    except Exception as e:
        out["error"] = f"{type(e).__name__}: {e}"
    return out


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--limit", type=int, default=None)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    key = os.environ.get("CH_API_KEY")
    if not args.dry_run and not key:
        print("Error: CH_API_KEY environment variable not set.", file=sys.stderr)
        sys.exit(1)

    headers = auth_header(key) if key else {}

    targets = extract_targets()
    if args.limit:
        targets = targets[: args.limit]

    done = load_done()
    todo = [t for t in targets if t["company_number"] not in done]

    print(f"Unique companies in source: {len(targets)}")
    print(f"Already enriched: {len(done)}")
    print(f"To process: {len(todo)}")
    print(f"Output: {OUT.relative_to(ROOT)}")

    if args.dry_run:
        print("\n-- DRY RUN --")
        for t in todo[:10]:
            print(f"  would fetch #{t['rank']:>4} {t['company_number']} {t['company_name']}")
        return

    if not todo:
        print("Nothing to do.")
        return

    t0 = time.time()
    ok = err = 0
    total_officers = total_pscs = 0
    with open(OUT, "a", encoding="utf-8") as fh:
        for i, target in enumerate(todo, start=1):
            r = enrich_one(target, headers)
            fh.write(json.dumps(r, ensure_ascii=False) + "\n")
            fh.flush()
            if r.get("error"):
                err += 1
            else:
                ok += 1
                total_officers += (r.get("officers") or {}).get("total_results", 0)
                total_pscs += (r.get("psc") or {}).get("total_results", 0)
            if i % 25 == 0 or i == len(todo):
                elapsed = time.time() - t0
                rate = i / elapsed if elapsed else 0
                eta = (len(todo) - i) / rate if rate else 0
                print(
                    f"[{i:>4}/{len(todo)}] {target['company_number']} ok={ok} err={err} "
                    f"officers_total={total_officers} pscs_total={total_pscs} "
                    f"elapsed={elapsed:.0f}s eta={eta:.0f}s",
                    flush=True,
                )

    print(f"\nDone. ok={ok} err={err} officers={total_officers} pscs={total_pscs}")


if __name__ == "__main__":
    main()
