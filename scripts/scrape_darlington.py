#!/usr/bin/env python3
"""Darlington BC: scrape spending-data + previous-years pages for 12 monthly CSVs.
File header is on row 6 (rows 1-5 are decorative). Per-file encoding sniffing.
"""
import csv, re, time
from pathlib import Path
import requests

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / "data" / "uk" / "local_authorities" / "spend" / "darlington_borough_council"
DEST.mkdir(parents=True, exist_ok=True)
UA = "Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36"
LANDINGS = [
    "https://www.darlington.gov.uk/the-council/council-information/financial-information/spending-data/",
    "https://www.darlington.gov.uk/the-council/council-information/financial-information/previous-years-spending-data/",
]


def normalize(src: Path):
    """Skip decorative rows 1-5; row 6 is header."""
    raw = src.read_bytes()
    enc = "utf-8-sig" if raw.startswith(b"\xef\xbb\xbf") else "iso-8859-1"
    with open(src, encoding=enc, newline="") as fh:
        rows = list(csv.reader(fh))
    if not rows:
        return 0
    # Find header: first row containing 'Supplier' AND 'Transaction'
    header_idx = 0
    for i, r in enumerate(rows[:10]):
        cells = [str(c).strip().lower() for c in r if c]
        if any("supplier" == c for c in cells) and any("directorate" in c for c in cells):
            header_idx = i
            break
    rows = rows[header_idx:]
    rows[0] = [str(c).strip() for c in rows[0]]
    with open(src, "w", newline="", encoding="utf-8-sig") as fh:
        csv.writer(fh).writerows(rows)
    return len(rows) - 1


# Find all CSV URLs in both landings
seen = {}
for landing in LANDINGS:
    print(f"Fetching {landing}")
    r = requests.get(landing, headers={"User-Agent": UA}, timeout=60)
    r.raise_for_status()
    html = r.text
    csvs = re.findall(r'href="(/media/[a-z0-9]{8}/transactions-over-500-([a-z]+)-(\d{4})\.csv)"', html)
    print(f"  {len(csvs)} CSVs")
    for path, mname, year in csvs:
        seen[(mname.lower(), year)] = path

# FY 24/25 only
mm_map = {n:f"{i+1:02d}" for i,n in enumerate(["january","february","march","april","may","june","july","august","september","october","november","december"])}

for (mname, year), path in sorted(seen.items()):
    mm = mm_map[mname]
    in_fy = (year == "2024" and int(mm) >= 4) or (year == "2025" and int(mm) <= 3)
    if not in_fy: continue
    dest = DEST / f"spending_{year}_{mm}_{mname}.csv"
    if dest.exists():
        print(f"  SKIP {dest.name}")
        continue
    url = "https://www.darlington.gov.uk" + path
    try:
        rr = requests.get(url, headers={"User-Agent": UA}, timeout=60)
        rr.raise_for_status()
        dest.write_bytes(rr.content)
        n = normalize(dest)
        print(f"  {year}-{mm}: {n:>5} rows  {dest.name}")
    except Exception as ex:
        print(f"  FAIL {dest.name}: {ex}")
    time.sleep(0.4)
