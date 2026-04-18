#!/usr/bin/env python3
"""
enrich_uk_suppliers_ubo.py

Third-pass enrichment: walks the PSC (Persons with Significant Control) chain
upward from each supplier until it reaches a terminal node — an individual,
a government body, a foreign entity, a listed PLC, or a company with no PSC.

Every hop carries a source citation (CH filing URL + notified_on date).

Input:  data/recipients/uk/supplier_governance.jsonl
Output: data/recipients/uk/supplier_ubo.jsonl  (one line per company)
Cache:  data/recipients/uk/psc_cache.json     (so reruns don't re-query)

Usage:
  CH_API_KEY="..." python scripts/enrich_uk_suppliers_ubo.py
  CH_API_KEY="..." python scripts/enrich_uk_suppliers_ubo.py --limit 50
  python scripts/enrich_uk_suppliers_ubo.py --dry-run
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

import requests

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parents[1]
UK_DIR = ROOT / "data" / "recipients" / "uk"
GOV = UK_DIR / "supplier_governance.jsonl"
OUT = UK_DIR / "supplier_ubo.jsonl"
PSC_CACHE_FILE = UK_DIR / "psc_cache.json"
PROFILE_CACHE_FILE = UK_DIR / "profile_cache.json"

CH_API = "https://api.company-information.service.gov.uk"
CH_PUBLIC = "https://find-and-update.company-information.service.gov.uk"
RATE_SLEEP_S = 0.11
USER_AGENT = "budget-galaxy-ubo/0.1 (+github.com/JuanBlanco9/Budget-Galaxy)"
MAX_CHAIN_DEPTH = 10

UK_JUR_RE = re.compile(
    r"\b(united\s+kingdom|uk|england|wales|scotland|northern\s+ireland|great\s+britain|gb)\b",
    re.IGNORECASE,
)
CH_NUMBER_RE = re.compile(r"^[A-Z]{0,2}\d{6,8}$")  # matches 01234567 and NI012345


def normalize_jurisdiction(s: str | None) -> str:
    if not s:
        return "unknown"
    if UK_JUR_RE.search(s):
        return "uk"
    return s.strip()


def clean_ch_number(n: str | None) -> str | None:
    if not n:
        return None
    n = n.strip().upper().replace(" ", "")
    # sometimes comes with prefix like "Company Number: 01234567"
    m = re.search(r"([A-Z]{0,2}\d{6,8})", n)
    if m:
        cand = m.group(1)
        # pad to 8 digits if pure numeric shorter (CH numbers can be 6-8 chars)
        if cand.isdigit() and len(cand) < 8:
            cand = cand.zfill(8)
        return cand
    return None


# ------------------------------ HTTP ------------------------------

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


# ------------------------------ caches ------------------------------

def load_json(path: Path) -> dict:
    if path.exists():
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            return {}
    return {}


def save_json(path: Path, data: dict) -> None:
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
    tmp.replace(path)


class ChClient:
    def __init__(self, headers: dict, psc_cache: dict, profile_cache: dict):
        self.headers = headers
        self.psc_cache = psc_cache
        self.profile_cache = profile_cache
        self.api_calls = 0

    def get_psc(self, number: str) -> dict:
        """Return {active[], ceased[], statements[]} — cached by number."""
        if number in self.psc_cache:
            return self.psc_cache[number]
        active, ceased = [], []
        start_index, items_per_page, total = 0, 100, None
        while True:
            url = (
                f"{CH_API}/company/{number}/persons-with-significant-control"
                f"?items_per_page={items_per_page}&start_index={start_index}"
            )
            time.sleep(RATE_SLEEP_S)
            self.api_calls += 1
            r = get_with_retry(url, self.headers)
            if not r:
                break
            body = r.json()
            total = body.get("total_results", 0)
            for p in body.get("items", []):
                slim = {
                    "kind": p.get("kind"),
                    "name": p.get("name"),
                    "nationality": p.get("nationality"),
                    "country_of_residence": p.get("country_of_residence"),
                    "natures_of_control": p.get("natures_of_control") or [],
                    "notified_on": p.get("notified_on"),
                    "ceased_on": p.get("ceased_on"),
                    "identification": p.get("identification"),
                    "links": p.get("links"),
                    "date_of_birth": p.get("date_of_birth"),
                }
                (ceased if slim["ceased_on"] else active).append(slim)
            start_index += items_per_page
            if start_index >= (total or 0):
                break
        # fetch statements
        stmts_url = f"{CH_API}/company/{number}/persons-with-significant-control-statements"
        time.sleep(RATE_SLEEP_S)
        self.api_calls += 1
        r = get_with_retry(stmts_url, self.headers)
        statements = []
        if r:
            for s in r.json().get("items", []):
                statements.append({
                    "statement": s.get("statement"),
                    "notified_on": s.get("notified_on"),
                    "ceased_on": s.get("ceased_on"),
                })
        result = {"active": active, "ceased": ceased, "statements": statements, "total": total or 0}
        self.psc_cache[number] = result
        return result

    def get_profile(self, number: str) -> dict | None:
        if number in self.profile_cache:
            return self.profile_cache[number]
        url = f"{CH_API}/company/{number}"
        time.sleep(RATE_SLEEP_S)
        self.api_calls += 1
        r = get_with_retry(url, self.headers)
        if not r:
            self.profile_cache[number] = None
            return None
        body = r.json()
        slim = {
            "company_number": body.get("company_number"),
            "company_name": body.get("company_name"),
            "type": body.get("type"),
            "status": body.get("company_status"),
            "jurisdiction": body.get("jurisdiction"),
            "date_of_creation": body.get("date_of_creation"),
        }
        self.profile_cache[number] = slim
        return slim


# ------------------------------ chain walk ------------------------------

def psc_source(from_company: str, psc: dict) -> dict:
    """Build a citable source record for a PSC."""
    link = ((psc.get("links") or {}).get("self") or "")
    url = f"{CH_PUBLIC}{link}" if link.startswith("/") else f"{CH_PUBLIC}/company/{from_company}/persons-with-significant-control"
    return {
        "type": "ch_psc",
        "from_company": from_company,
        "notified_on": psc.get("notified_on"),
        "url": url,
    }


def hop_from_psc(step: int, from_company: str, psc: dict) -> dict:
    return {
        "step": step,
        "from_company": from_company,
        "name": psc.get("name"),
        "kind": psc.get("kind"),
        "natures_of_control": psc.get("natures_of_control"),
        "notified_on": psc.get("notified_on"),
        "source": psc_source(from_company, psc),
        "terminal": False,
        "resolution": None,
    }


def walk_chain(client: ChClient, start_number: str, start_psc: dict, visited: set[str], depth: int = 1) -> list[list[dict]]:
    """
    Recursively walk PSCs upward. Returns a list of chains, each a list of hop dicts.
    A single PSC at the current level may branch if the parent has multiple active PSCs.
    """
    hop = hop_from_psc(depth, start_number, start_psc)
    kind = (start_psc.get("kind") or "").lower()

    # terminal: individual
    if "individual" in kind:
        hop["terminal"] = True
        hop["resolution"] = "individual"
        return [[hop]]

    # terminal: govt / legal person
    if "legal-person" in kind or "legal person" in kind:
        hop["terminal"] = True
        hop["resolution"] = "government"
        return [[hop]]

    # corporate — try to walk up
    ident = start_psc.get("identification") or {}
    jur = normalize_jurisdiction(ident.get("country_registered"))
    parent_number = clean_ch_number(ident.get("registration_number")) if jur == "uk" else None

    if jur != "uk":
        hop["terminal"] = True
        hop["resolution"] = "foreign_unresolved"
        hop["jurisdiction"] = ident.get("country_registered")
        hop["parent_registration_number"] = ident.get("registration_number")
        return [[hop]]

    if not parent_number:
        hop["terminal"] = True
        hop["resolution"] = "no_registration_number"
        hop["parent_registration_number_raw"] = ident.get("registration_number")
        return [[hop]]

    if parent_number in visited:
        hop["terminal"] = True
        hop["resolution"] = "cycle_detected"
        hop["parent_company_number"] = parent_number
        return [[hop]]

    if depth >= MAX_CHAIN_DEPTH:
        hop["terminal"] = True
        hop["resolution"] = "max_depth_reached"
        hop["parent_company_number"] = parent_number
        return [[hop]]

    hop["parent_company_number"] = parent_number

    # check if parent is a PLC (might be listed)
    profile = client.get_profile(parent_number)
    if profile:
        hop["parent_type"] = profile.get("type")
        if profile.get("type") == "plc":
            hop["note"] = "parent is PLC — possibly publicly listed"

    # fetch parent's PSCs and recurse
    parent_pscs = client.get_psc(parent_number)
    if not parent_pscs["active"]:
        hop["terminal"] = True
        if parent_pscs["statements"]:
            stmt_labels = [s.get("statement") for s in parent_pscs["statements"]]
            hop["resolution"] = "unresolved_statement"
            hop["statements"] = stmt_labels
        else:
            hop["resolution"] = "no_psc_data"
        return [[hop]]

    # branch across parent's active PSCs
    all_sub_chains: list[list[dict]] = []
    new_visited = visited | {parent_number}
    for sub_psc in parent_pscs["active"]:
        sub_chains = walk_chain(client, parent_number, sub_psc, new_visited, depth + 1)
        for sub in sub_chains:
            all_sub_chains.append([hop] + sub)
    return all_sub_chains or [[hop]]


# ------------------------------ main ------------------------------

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


def summarize_resolution(chains: list[list[dict]]) -> str:
    """One-word overall resolution for the whole company."""
    if not chains:
        return "no_psc"
    resolutions = {c[-1].get("resolution") for c in chains}
    if resolutions == {"individual"}:
        return "individual"
    if resolutions == {"government"}:
        return "government"
    if resolutions <= {"individual", "government"}:
        return "mixed_clear"
    if "foreign_unresolved" in resolutions:
        return "partial_foreign" if (resolutions & {"individual", "government"}) else "foreign_unresolved"
    if "unresolved_statement" in resolutions or "no_psc_data" in resolutions:
        return "partial_unresolved"
    return "partial_unresolved"


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--limit", type=int, default=None)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    key = os.environ.get("CH_API_KEY")
    if not args.dry_run and not key:
        print("Error: CH_API_KEY not set.", file=sys.stderr)
        sys.exit(1)

    # load governance rows
    gov_rows = []
    with open(GOV, encoding="utf-8") as fh:
        for line in fh:
            r = json.loads(line)
            if not r.get("error") and r.get("company_number"):
                gov_rows.append(r)
    gov_rows.sort(key=lambda r: r["source_rank"])

    if args.limit:
        gov_rows = gov_rows[: args.limit]

    done = load_done()
    todo = [r for r in gov_rows if r["company_number"] not in done]

    print(f"Governance rows: {len(gov_rows)}")
    print(f"Already UBO-enriched: {len(done)}")
    print(f"To process: {len(todo)}")
    print(f"Output: {OUT.relative_to(ROOT)}")

    if args.dry_run:
        print("\n-- DRY RUN --")
        for r in todo[:10]:
            active = len(r["psc"]["active"])
            print(f"  would walk #{r['source_rank']:>4} {r['company_number']} ({r['company_name'][:40]}) pscs={active}")
        return

    if not todo:
        print("Nothing to do.")
        return

    headers = auth_header(key)
    psc_cache = load_json(PSC_CACHE_FILE)
    profile_cache = load_json(PROFILE_CACHE_FILE)
    client = ChClient(headers, psc_cache, profile_cache)

    # seed PSC cache from the governance pass — avoids re-querying the supplier itself
    for r in gov_rows:
        client.psc_cache.setdefault(r["company_number"], {
            "active": [
                {
                    "kind": p.get("kind"),
                    "name": p.get("name"),
                    "natures_of_control": p.get("natures_of_control"),
                    "notified_on": p.get("notified_on"),
                    "ceased_on": p.get("ceased_on"),
                    "identification": p.get("identification"),
                    "links": None,
                }
                for p in r["psc"]["active"]
            ],
            "ceased": [],
            "statements": r["psc"].get("statements", []),
            "total": r["psc"]["total_results"],
        })

    t0 = time.time()
    ok = err = 0
    res_counter: dict[str, int] = {}
    chain_depths: list[int] = []

    with open(OUT, "a", encoding="utf-8") as fh:
        for i, r in enumerate(todo, start=1):
            now = datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")
            result = {
                "company_number": r["company_number"],
                "company_name": r["company_name"],
                "source_rank": r["source_rank"],
                "source_total_gbp": r["source_total_gbp"],
                "enriched_at": now,
                "direct_psc_count": len(r["psc"]["active"]),
                "ubo_chains": [],
                "overall_resolution": None,
                "api_calls_used": 0,
                "error": None,
            }
            calls_before = client.api_calls
            try:
                all_chains: list[list[dict]] = []
                for direct_psc in r["psc"]["active"]:
                    chains = walk_chain(client, r["company_number"], direct_psc, visited={r["company_number"]}, depth=1)
                    all_chains.extend(chains)
                # Handle companies with no active PSC — encode as a single "chain" with no_psc resolution
                if not r["psc"]["active"]:
                    stmts = r["psc"].get("statements", [])
                    all_chains = [[{
                        "step": 0,
                        "from_company": r["company_number"],
                        "terminal": True,
                        "resolution": "no_psc_identified" if stmts else "no_psc_data",
                        "statements": [s.get("statement") for s in stmts],
                    }]]
                result["ubo_chains"] = all_chains
                result["overall_resolution"] = summarize_resolution(all_chains)
                for c in all_chains:
                    chain_depths.append(len(c))
                res_counter[result["overall_resolution"]] = res_counter.get(result["overall_resolution"], 0) + 1
                ok += 1
            except Exception as e:
                result["error"] = f"{type(e).__name__}: {e}"
                err += 1
            result["api_calls_used"] = client.api_calls - calls_before
            fh.write(json.dumps(result, ensure_ascii=False) + "\n")
            fh.flush()

            if i % 25 == 0 or i == len(todo):
                elapsed = time.time() - t0
                rate = i / elapsed if elapsed else 0
                eta = (len(todo) - i) / rate if rate else 0
                # flush caches periodically
                save_json(PSC_CACHE_FILE, client.psc_cache)
                save_json(PROFILE_CACHE_FILE, client.profile_cache)
                print(
                    f"[{i:>4}/{len(todo)}] {r['company_number']} ok={ok} err={err} "
                    f"api_calls={client.api_calls} elapsed={elapsed:.0f}s eta={eta:.0f}s",
                    flush=True,
                )

    save_json(PSC_CACHE_FILE, client.psc_cache)
    save_json(PROFILE_CACHE_FILE, client.profile_cache)
    print(f"\nDone. ok={ok} err={err} total_api_calls={client.api_calls}")
    print(f"\nOverall resolution distribution:")
    for k, v in sorted(res_counter.items(), key=lambda x: -x[1]):
        print(f"  {k:<25} {v:>4}")
    if chain_depths:
        print(f"\nChain depths: min={min(chain_depths)} max={max(chain_depths)} "
              f"median={sorted(chain_depths)[len(chain_depths)//2]} avg={sum(chain_depths)/len(chain_depths):.1f}")


if __name__ == "__main__":
    main()
