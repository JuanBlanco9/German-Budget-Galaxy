#!/usr/bin/env python3
"""East Lindsey DC: 12 monthly CSVs, hardcoded IDs from agent recon."""
import csv, time
from pathlib import Path
import requests

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / "data" / "uk" / "local_authorities" / "spend" / "east_lindsey"
DEST.mkdir(parents=True, exist_ok=True)
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"

# (year, mm, month_name, media_id, suffix)
URLS = [
    ("2024", "04", "april",     25026, "Apr_24"),
    ("2024", "05", "may",       25108, "May_24"),
    ("2024", "06", "june",      25291, "Jun_24"),
    ("2024", "07", "july",      25453, "Jul_24"),
    ("2024", "08", "august",    25585, "Aug_24"),
    ("2024", "09", "september", 25707, "Sep_24"),
    ("2024", "10", "october",   25842, "Oct_24"),
    ("2024", "11", "november",  26296, "Nov_24"),
    ("2024", "12", "december",  26515, "Dec_24"),
    ("2025", "01", "january",   26712, "Jan_25"),
    ("2025", "02", "february",  26908, "Feb_25"),
    ("2025", "03", "march",     27059, "Mar_25"),
]
SLUG_TPL = "{Month}-{Year}-CSV-File"

MONTHS = {"april":"April","may":"May","june":"June","july":"July","august":"August",
          "september":"September","october":"October","november":"November","december":"December",
          "january":"January","february":"February","march":"March"}

for year, mm, mname, mid, suf in URLS:
    slug = f"{MONTHS[mname]}-{year}-CSV-File"
    url = f"https://www.e-lindsey.gov.uk/media/{mid}/{slug}/CSV/EL_AP_Spend_Report_v2_{suf}.csv"
    dest = DEST / f"spending_{year}_{mm}_{mname}.csv"
    if dest.exists() and dest.stat().st_size > 500:
        print(f"  SKIP {dest.name}")
        continue
    try:
        r = requests.get(url, headers={"User-Agent": UA, "Accept": "text/csv"}, timeout=60)
        r.raise_for_status()
        # Re-encode to utf-8-sig
        try:
            text = r.content.decode("utf-8")
        except UnicodeDecodeError:
            text = r.content.decode("cp1252")
        dest.write_text(text, encoding="utf-8-sig")
        n = sum(1 for _ in open(dest, encoding="utf-8-sig")) - 1
        print(f"  {year}-{mm}: {n:>5} rows  {dest.name}")
    except Exception as ex:
        print(f"  FAIL {dest.name}: {ex}")
    time.sleep(0.5)
