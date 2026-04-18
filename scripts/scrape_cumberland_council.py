#!/usr/bin/env python3
"""
Cumberland Council scraper for "Spend over £250" FY 2024/25.

Discovery (via Drupal JSON:API + Views):
  - JSON:API at /jsonapi/node/localgov_services_page revealed taxonomy term
    IDs for spend FYs:
       1287 = FY 2023/24
       1329 = FY 2024/25
       1433 = FY 2025/26
  - Drupal Views search at:
       /document-search?field_document_target_id=1329&page=N
    lists all CSV files (10 per page, ~7-8 pages for FY 24/25).
  - CSVs live at /sites/default/files/{YYYY-MM upload month}/{filename}.csv
    where filename is non-predictable (must scrape).

Categories within Cumberland (current unitary, prefix CU):
  - TRADE_SUPPLIERS (12/12 monthly — biggest)
  - SUPPORT_PAYMENTS (12/12)
  - PRIVATE_HOMES (12/12)
  - SCHOOLS_PCARD (9/12, missing Jan-Mar 2025)
Plus legacy entities (Copeland BC, Allerdale BC, TLG corporate p-card) which
use DIFFERENT schemas — kept out of scope for FY 24/25 unitary totals.

Schema (TRADE_SUPPLIERS, cp1252; PRIVATE_HOMES + SUPPORT_PAYMENTS, utf-8-sig):
  Row 1: title (skip)
  Row 2: header — Company,coded supplier,Supplier Name,Date,System Reference,
         Directorate Description,Directorate Area,Expenditure Description,
         Type of Expenditure,Line Number,Line Amount
  Rows 3+: data. Filter Company == 'CU' for current Cumberland.
"""
import argparse
import json
import re
import time
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parents[1]
SPEND_DIR = ROOT / "data" / "uk" / "local_authorities" / "spend" / "cumberland_council"
SEARCH_TPL = "https://www.cumberland.gov.uk/document-search?field_document_target_id={term}&page={page}"
TERM_BY_FY = {"2023/24": 1287, "2024/25": 1329, "2025/26": 1433}
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

CATEGORY_PATTERNS = {
    "trade":   re.compile(r"trade.?suppliers?", re.I),
    "private": re.compile(r"private.?home", re.I),
    "support": re.compile(r"support[._-]?related[._-]?payments?|support[._-]?payments?", re.I),
    "schools": re.compile(r"schools.?p.?card", re.I),
    "tlg":     re.compile(r"tlg|corporate.?p.?card", re.I),
    "legacy":  re.compile(r"copeland|allerdale|carlisle.*city|eden\b", re.I),
}


def fetch(url: str) -> str:
    r = requests.get(url, headers={"User-Agent": UA}, timeout=60)
    r.raise_for_status()
    return r.text


def categorize(filename: str) -> str:
    name = Path(filename).stem
    for cat, rx in CATEGORY_PATTERNS.items():
        if rx.search(name):
            return cat
    return "unknown"


def crawl_search(term_id: int):
    seen = {}
    for page in range(20):
        url = SEARCH_TPL.format(term=term_id, page=page)
        try:
            html = fetch(url)
        except Exception as ex:
            print(f"  page {page}: ERROR {ex}")
            break
        urls = re.findall(r'/sites/default/files/[^"\']+\.csv', html)
        urls = [u.replace("&amp;", "&") for u in urls]
        new = 0
        for u in urls:
            full = "https://www.cumberland.gov.uk" + u if u.startswith("/") else u
            if full not in seen:
                seen[full] = categorize(full)
                new += 1
        print(f"  page {page}: {len(urls)} csvs ({new} new)")
        if not urls:
            break
        time.sleep(0.3)
    return seen


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--fy", default="2024/25", choices=list(TERM_BY_FY.keys()))
    ap.add_argument("--include-legacy", action="store_true")
    ap.add_argument("--include-pcard", action="store_true")
    ap.add_argument("--list-only", action="store_true")
    ap.add_argument("--force", action="store_true")
    args = ap.parse_args()

    SPEND_DIR.mkdir(parents=True, exist_ok=True)
    term = TERM_BY_FY[args.fy]
    print(f"Crawling FY {args.fy} (term {term})")
    found = crawl_search(term)
    print(f"\nTotal: {len(found)} CSV URLs\n")

    by_cat = {}
    for url, cat in found.items():
        by_cat.setdefault(cat, []).append(url)
    for cat, urls in sorted(by_cat.items()):
        print(f"  {cat:>10}: {len(urls)} files")

    keep_cats = {"trade", "private", "support"}  # canonical 11-col schema
    if args.include_pcard:
        keep_cats.add("schools")
        keep_cats.add("tlg")
    if args.include_legacy:
        keep_cats.add("legacy")

    keep = [(u, c) for u, c in found.items() if c in keep_cats]
    print(f"\nKeeping {len(keep)} files in categories: {sorted(keep_cats)}\n")

    manifest = []
    for url, cat in sorted(keep):
        # filename = last path segment (decoded)
        from urllib.parse import unquote
        fname = unquote(url.rsplit("/", 1)[-1])
        slug = re.sub(r"[^a-zA-Z0-9._-]+", "_", fname).strip("_")
        dest = SPEND_DIR / f"{cat}__{slug}"
        manifest.append({"url": url, "category": cat, "slug": slug, "path": str(dest)})
        if args.list_only:
            print(f"  [{cat:>7}] {dest.name}")
            print(f"           {url}")
            continue
        if dest.exists() and not args.force:
            print(f"  SKIP {dest.name} ({dest.stat().st_size} B)")
            continue
        try:
            r = requests.get(url, headers={"User-Agent": UA}, timeout=120)
            r.raise_for_status()
            dest.write_bytes(r.content)
            print(f"  [{cat:>7}] {len(r.content):>10,} B  {dest.name}")
        except Exception as ex:
            print(f"  FAIL {dest.name}: {ex}")
        time.sleep(0.3)

    (SPEND_DIR / "_manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(f"\nManifest: {SPEND_DIR/'_manifest.json'}")


if __name__ == "__main__":
    main()
