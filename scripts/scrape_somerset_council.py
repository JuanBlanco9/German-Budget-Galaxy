#!/usr/bin/env python3
"""
Somerset Council scraper.

Discovery: WP customfilter AJAX endpoint returns all 142 spend_over_500
posts in a single payload. Each links to a SharePoint Excel/CSV file. The
public share URL (`/:x:/s/SCCPublic/{token}?e=...`) hits a Microsoft auth
wall, but rewriting to `/sites/SCCPublic/_layouts/15/download.aspx?share={token}`
returns the file anonymously.

Filters to:
  - Somerset Council (the post-2023 unitary; pre-2023 entries are Mendip,
    Sedgemoor, Somerset West and Taunton, South Somerset, Somerset CC and
    are kept under their predecessor councils where applicable).
  - FY 23/24 onwards.
"""

import argparse
import json
import re
import sys
import time
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parents[1]
SPEND_DIR = ROOT / "data" / "uk" / "local_authorities" / "spend" / "somerset_council"
AJAX_URL = "https://www.somerset.gov.uk/wp-admin/admin-ajax.php"
LAYOUTS_TPL = "https://somersetcc.sharepoint.com/sites/SCCPublic/_layouts/15/download.aspx?share={token}"

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"


def fetch_directory() -> str:
    r = requests.post(
        AJAX_URL,
        data={
            "action": "customfilter",
            "post_type": "spend_over__500",
            "directory_type": "data-directory",
            "order": "DESC",
            "orderby": "date",
        },
        headers={"User-Agent": UA, "X-Requested-With": "XMLHttpRequest"},
        timeout=60,
    )
    r.raise_for_status()
    return r.text


def parse_entries(html: str):
    # Slice into per-block segments first so regex doesn't bleed across blocks
    segs = re.split(r'(?=<div id="\d+" class="result-block)', html)
    out = []
    for seg in segs:
        m_id = re.match(r'<div id="(\d+)" class="result-block', seg)
        if not m_id:
            continue
        bid = m_id.group(1)
        m_title = re.search(r'<h3 class="directory-title">([^<]+)</h3>', seg)
        if not m_title:
            continue
        m_council = re.search(r'<h4 class="col-md">Council</h4><p class="col-md">([^<]+)</p>', seg)
        m_url = re.search(r'<li><a href="([^"]+)">', seg)
        if not m_url:
            continue
        title = m_title.group(1).replace("&#8211;", "–").replace("&#8217;", "'").replace("&#163;", "£")
        out.append({
            "id": bid,
            "title": title.strip(),
            "council": (m_council.group(1).strip() if m_council else ""),
            "url": m_url.group(1),
        })
    return out


def share_token(url: str):
    m = re.search(r"/s/SCCPublic/([A-Za-z0-9_\-]+)", url)
    return m.group(1) if m else None


def slug_for(title: str) -> str:
    s = title.lower()
    s = re.sub(r"[^a-z0-9]+", "_", s)
    s = re.sub(r"_+", "_", s).strip("_")
    return s[:120]


def download(url: str, dest: Path) -> int:
    with requests.get(url, headers={"User-Agent": UA}, stream=True, timeout=120) as r:
        r.raise_for_status()
        with open(dest, "wb") as fh:
            n = 0
            for chunk in r.iter_content(chunk_size=65536):
                fh.write(chunk)
                n += len(chunk)
            return n


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--council-filter", default="Somerset Council",
                    help="Only download entries with this Council field (default 'Somerset Council' = unitary)")
    ap.add_argument("--from-fy", default="2023",
                    help="Only download titles mentioning this year or later (default 2023 = post-reorg)")
    ap.add_argument("--list-only", action="store_true")
    ap.add_argument("--force", action="store_true")
    args = ap.parse_args()

    SPEND_DIR.mkdir(parents=True, exist_ok=True)
    print(f"Fetching directory from {AJAX_URL}")
    html = fetch_directory()
    (SPEND_DIR / "_ajax_directory.html").write_text(html, encoding="utf-8")
    entries = parse_entries(html)
    print(f"Total entries in directory: {len(entries)}")

    # Filter
    keep = []
    for e in entries:
        if args.council_filter and e["council"] != args.council_filter:
            continue
        # Year filter — accept any year >= from_fy in the title
        years = re.findall(r"20\d{2}", e["title"])
        if years and max(int(y) for y in years) < int(args.from_fy):
            continue
        token = share_token(e["url"])
        if not token:
            print(f"  WARN no token: {e['url']}")
            continue
        e["token"] = token
        keep.append(e)
    print(f"After filter (council={args.council_filter!r}, year>={args.from_fy}): {len(keep)} entries\n")

    manifest = []
    for i, e in enumerate(keep, 1):
        slug = slug_for(e["title"])
        # Determine extension from `:x:` (xlsx/csv) vs `:b:` (binary/pdf) vs default
        kind = ":x:" if "/:x:/" in e["url"] else (":b:" if "/:b:/" in e["url"] else ":?:")
        # We don't know the actual ext until we download. Save with .bin first then rename.
        dl_url = LAYOUTS_TPL.format(token=e["token"])
        dest_tmp = SPEND_DIR / f"{slug}.download"
        manifest.append({"title": e["title"], "council": e["council"], "id": e["id"], "url": e["url"], "download_url": dl_url, "slug": slug, "kind": kind})
        if args.list_only:
            print(f"  [{i:3}] {e['title'][:80]}")
            print(f"        {dl_url}")
            continue
        if dest_tmp.exists() and not args.force:
            print(f"  [{i:3}] SKIP (exists): {slug}")
            continue
        try:
            n = download(dl_url, dest_tmp)
            print(f"  [{i:3}] {n:>12,} B  {slug}")
        except Exception as ex:
            print(f"  [{i:3}] FAIL: {slug} :: {ex}")
        time.sleep(0.4)

    (SPEND_DIR / "_manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(f"\nManifest: {SPEND_DIR/'_manifest.json'}")


if __name__ == "__main__":
    main()
