#!/usr/bin/env python3
"""Stockton-on-Tees: scrape /payments-to-suppliers landing for 12 monthly CSVs."""
import re, time
from pathlib import Path
from urllib.parse import unquote
import requests

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / "data" / "uk" / "local_authorities" / "spend" / "stockton_on_tees"
DEST.mkdir(parents=True, exist_ok=True)
LANDING = "https://www.stockton.gov.uk/payments-to-suppliers"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36"

MONTHS = ["April","May","June","July","August","September","October","November","December","January","February","March"]


def fetch(url):
    r = requests.get(url, headers={"User-Agent": UA, "Referer": LANDING}, timeout=120)
    r.raise_for_status()
    return r.content


print(f"Fetching landing")
landing = requests.get(LANDING, headers={"User-Agent": UA}, timeout=60)
landing.raise_for_status()
html = landing.text
(DEST / "_landing.html").write_text(html, encoding="utf-8")

# Match all CSV anchors
csv_urls = re.findall(r'href="(https://www\.stockton\.gov\.uk/media/\d+/[^"]*\.csv\?m=\d+)"', html)
csv_urls = list(dict.fromkeys(csv_urls))
print(f"Found {len(csv_urls)} CSV URLs in landing\n")

# Filter to FY 24/25 (Apr 2024 - Mar 2025)
def parse_month_year(url):
    fname = unquote(url.rsplit("/", 1)[-1].split("?")[0])
    for m in MONTHS:
        if m in fname or m[:3] in fname:
            year_m = re.search(r"(20\d{2})", fname) or re.search(r"_(\d{2})\.", fname)
            if year_m:
                yr = year_m.group(1)
                if len(yr) == 2: yr = "20" + yr
                return m, yr
    return None, None


for url in csv_urls:
    m, year = parse_month_year(url)
    if not m or not year: continue
    # Get month index 1-12
    mm_map = {n:f"{i+1:02d}" for i,n in enumerate(["January","February","March","April","May","June","July","August","September","October","November","December"])}
    mm = mm_map.get(m, "00")
    # FY 24/25 filter
    in_fy = (year == "2024" and int(mm) >= 4) or (year == "2025" and int(mm) <= 3)
    if not in_fy: continue
    dest = DEST / f"spending_{year}_{mm}_{m.lower()}.csv"
    if dest.exists():
        print(f"  SKIP {dest.name}")
        continue
    try:
        content = fetch(url)
        dest.write_bytes(content)
        n = sum(1 for _ in open(dest, encoding="latin1")) - 1
        print(f"  {year}-{mm}: {n:>5} rows  {dest.name}")
    except Exception as ex:
        print(f"  FAIL {dest.name}: {ex}")
    time.sleep(0.5)
