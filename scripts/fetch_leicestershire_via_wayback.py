#!/usr/bin/env python3
"""Leicestershire CC: fetch 12 monthly CSVs via Wayback replay (Akamai CDN blocks programmatic access)."""
import time
from pathlib import Path
import requests

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / "data" / "uk" / "local_authorities" / "spend" / "leicestershire_county_council"
DEST.mkdir(parents=True, exist_ok=True)
UA = "Mozilla/5.0"

MONTHS = [
    ("2024", "05", "april-2024"),
    ("2024", "06", "may-2024"),
    ("2024", "07", "june-2024"),
    ("2024", "08", "july-2024"),
    ("2024", "09", "august-2024"),
    ("2024", "10", "september-2024"),
    ("2024", "11", "october-2024"),
    ("2024", "12", "november-2024"),
    ("2025", "01", "december-2024"),
    ("2025", "02", "january-2025"),
    ("2025", "03", "february-2025"),
    ("2025", "04", "march-2025"),
]

URL_TPL = "https://www.leicestershire.gov.uk/sites/default/files/{folder}/payments-to-suppliers-over-500-{month}.csv"


for folder_year, folder_mm, month_slug in MONTHS:
    folder = f"{folder_year}-{folder_mm}"
    orig = URL_TPL.format(folder=folder, month=month_slug)
    wb = f"https://web.archive.org/web/2025/{orig}"
    # Extract payment month for filename
    parts = month_slug.split("-")
    mname = parts[0]
    year = parts[1]
    dest = DEST / f"spending_{year}_{mname}.csv"
    if dest.exists() and dest.stat().st_size > 1000:
        print(f"  SKIP {dest.name}")
        continue
    try:
        r = requests.get(wb, headers={"User-Agent": UA}, timeout=120)
        r.raise_for_status()
        # Re-encode (may be cp1252 with £ signs)
        try:
            text = r.content.decode("utf-8")
        except UnicodeDecodeError:
            text = r.content.decode("cp1252")
        dest.write_text(text, encoding="utf-8-sig")
        n = sum(1 for _ in open(dest, encoding="utf-8-sig")) - 1
        print(f"  {year}-{mname}: {n:>5} rows  {dest.name}")
    except Exception as ex:
        print(f"  FAIL {dest.name}: {ex}")
    time.sleep(1.5)
