#!/usr/bin/env python3
"""East Lindsey via Wayback replay (Cloudflare blocks AR)."""
import time
from pathlib import Path
import requests

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / "data" / "uk" / "local_authorities" / "spend" / "east_lindsey"
DEST.mkdir(parents=True, exist_ok=True)
UA = "Mozilla/5.0"

URLS = [
    ("2024", "04", "april",     25026, "April", "Apr_24"),
    ("2024", "05", "may",       25108, "May", "May_24"),
    ("2024", "06", "june",      25291, "June", "Jun_24"),
    ("2024", "07", "july",      25453, "July", "Jul_24"),
    ("2024", "08", "august",    25585, "August", "Aug_24"),
    ("2024", "09", "september", 25707, "September", "Sep_24"),
    ("2024", "10", "october",   25842, "October", "Oct_24"),
    ("2024", "11", "november",  26296, "November", "Nov_24"),
    ("2024", "12", "december",  26515, "December", "Dec_24"),
    ("2025", "01", "january",   26712, "January", "Jan_25"),
    ("2025", "02", "february",  26908, "February", "Feb_25"),
    ("2025", "03", "march",     27059, "March", "Mar_25"),
]

for year, mm, mname, mid, Mname, suf in URLS:
    orig = f"https://www.e-lindsey.gov.uk/media/{mid}/{Mname}-{year}-CSV-File/CSV/EL_AP_Spend_Report_v2_{suf}.csv"
    wb = f"https://web.archive.org/web/2025id_/{orig}"
    dest = DEST / f"spending_{year}_{mm}_{mname}.csv"
    if dest.exists() and dest.stat().st_size > 500:
        print(f"  SKIP {dest.name}")
        continue
    try:
        r = requests.get(wb, headers={"User-Agent": UA}, timeout=120)
        r.raise_for_status()
        try:
            text = r.content.decode("utf-8")
        except UnicodeDecodeError:
            text = r.content.decode("cp1252")
        dest.write_text(text, encoding="utf-8-sig")
        n = sum(1 for _ in open(dest, encoding="utf-8-sig")) - 1
        print(f"  {year}-{mm}: {n:>5} rows  {dest.name}")
    except Exception as ex:
        print(f"  FAIL {dest.name}: {ex}")
    time.sleep(1.5)
