#!/usr/bin/env python3
"""
Central Bedfordshire Council scraper.

Discovery: spending data is paginated under
  https://www.centralbedfordshire.gov.uk/info/28/transparency/285/council_spending/{1..4}
Each page lists monthly SharePoint links labelled either "spending data"
(supplier register, what we want) or "P Card data" (procurement-card
transactions, much smaller, kept separate by the council and not what
the council/MHCLG totals describe).

The same SharePoint download.aspx rewrite that worked for Somerset works
here too:
  /:x:/s/Communications/{token}?e=...
  -> /sites/Communications/_layouts/15/download.aspx?share={token}
which returns the CSV anonymously.

This script:
  - fetches all 4 listing pages
  - extracts spending-data anchors only (skips P Card)
  - filters by --from-month / --to-month (default = full FY 2024/25)
  - downloads each via the rewrite

Note: handful of newest links use /:x:/r/sites/Communications/.../File.csv
with ?d= token instead of ?e=. Those are handled by deriving the token
from the ?d= GUID via _layouts download.aspx?SourceUrl form.
"""
import argparse
import json
import re
import sys
import time
from datetime import date
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parents[1]
SPEND_DIR = ROOT / "data" / "uk" / "local_authorities" / "spend" / "central_bedfordshire"
INDEX_TPL = "https://www.centralbedfordshire.gov.uk/info/28/transparency/285/council_spending/{p}"
LAYOUTS_TPL = "https://centralbedfordshirecouncil.sharepoint.com/sites/Communications/_layouts/15/download.aspx?share={token}"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

MONTHS = {m.lower(): i for i, m in enumerate(
    ["January","February","March","April","May","June","July","August","September","October","November","December"], start=1)}


def parse_label(text: str):
    """Return (kind, year, month) or None.
    kind in {'spending', 'pcard'}.
    """
    t = text.replace("&nbsp;", " ").strip()
    is_pcard = bool(re.search(r"\bP\s*Card\b", t, re.I))
    is_spend = bool(re.search(r"\bspending\s*data\b", t, re.I))
    if not (is_pcard or is_spend):
        return None
    m = re.search(r"(January|February|March|April|May|June|July|August|September|October|November|December)\s+(20\d{2})", t, re.I)
    if not m:
        return None
    month = MONTHS[m.group(1).lower()]
    year = int(m.group(2))
    return ("pcard" if is_pcard else "spending", year, month)


def fetch(url: str) -> str:
    r = requests.get(url, headers={"User-Agent": UA}, timeout=60)
    r.raise_for_status()
    return r.text


def extract_links(html: str):
    out = []
    for m in re.finditer(r'<a [^>]*href="([^"]*sharepoint[^"]*)"[^>]*>([^<]+)</a>', html):
        url, txt = m.group(1), m.group(2)
        info = parse_label(txt)
        if not info:
            continue
        kind, year, month = info
        # Token extraction: standard /s/ form
        tok_m = re.search(r"/(?:s|r/sites)/Communications/(?:[^/]+/)*?([A-Za-z0-9_\-]+)(?:\?|$)", url)
        token = tok_m.group(1) if tok_m else None
        if token and "." in token:  # Filename-style token (from /:x:/r/ form)
            token = None  # fall back to original URL
        out.append({"url": url, "label": txt.strip(), "kind": kind, "year": year, "month": month, "token": token})
    return out


def in_fy(item, fy_start_year: int):
    """UK FY: April Y -> March Y+1."""
    y, m = item["year"], item["month"]
    if y == fy_start_year and m >= 4: return True
    if y == fy_start_year + 1 and m <= 3: return True
    return False


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--fy-start-year", type=int, default=2024,
                    help="FY start (April). 2024 = FY 2024/25.")
    ap.add_argument("--include-pcard", action="store_true")
    ap.add_argument("--list-only", action="store_true")
    ap.add_argument("--force", action="store_true")
    args = ap.parse_args()

    SPEND_DIR.mkdir(parents=True, exist_ok=True)

    print("Fetching listing pages 1..4")
    all_items = []
    for p in (1, 2, 3, 4):
        html = fetch(INDEX_TPL.format(p=p))
        (SPEND_DIR / f"_index_p{p}.html").write_text(html, encoding="utf-8")
        items = extract_links(html)
        all_items.extend(items)
        print(f"  p{p}: {len(items)} candidate links")

    seen = set()
    keep = []
    for it in all_items:
        if not args.include_pcard and it["kind"] == "pcard":
            continue
        if not in_fy(it, args.fy_start_year):
            continue
        key = (it["kind"], it["year"], it["month"])
        if key in seen:
            continue
        seen.add(key)
        keep.append(it)

    print(f"\nFY {args.fy_start_year}/{(args.fy_start_year+1)%100:02} after filter: {len(keep)} files")
    keep.sort(key=lambda x: (x["year"], x["month"]))
    manifest = []
    for it in keep:
        if it["token"]:
            dl = LAYOUTS_TPL.format(token=it["token"])
        else:
            dl = it["url"]
        slug = f"{it['kind']}_{it['year']}_{it['month']:02}"
        dest = SPEND_DIR / f"{slug}.csv"
        manifest.append({**it, "download_url": dl, "slug": slug, "path": str(dest)})
        if args.list_only:
            print(f"  {slug}: {it['label'][:50]}\n         {dl}")
            continue
        if dest.exists() and not args.force:
            print(f"  SKIP {slug} (exists, {dest.stat().st_size} B)")
            continue
        try:
            r = requests.get(dl, headers={"User-Agent": UA}, timeout=120)
            r.raise_for_status()
            dest.write_bytes(r.content)
            print(f"  {slug}: {len(r.content):>10,} B")
        except Exception as ex:
            print(f"  FAIL {slug}: {ex}")
        time.sleep(0.4)

    (SPEND_DIR / "_manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(f"\nManifest: {SPEND_DIR/'_manifest.json'}")


if __name__ == "__main__":
    main()
