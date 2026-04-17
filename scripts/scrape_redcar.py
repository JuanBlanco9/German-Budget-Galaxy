#!/usr/bin/env python3
"""Redcar & Cleveland BC: scrape index for 12 monthly XLSX (Spend, not Credit Notes).
Two cols share 'Cost Centre' header — drop the code col, keep name col."""
import csv, re, time
from pathlib import Path
from urllib.parse import unquote
import requests, openpyxl

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / "data" / "uk" / "local_authorities" / "spend" / "redcar_cleveland"
DEST.mkdir(parents=True, exist_ok=True)
UA = "Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36"
LANDING = "https://www.redcar-cleveland.gov.uk/about-the-council/budget-and-accounts/invoices-over-500/financial-year-2024-2025"

MONTHS = ["April","May","June","July","August","September","October","November","December","January","February","March"]
MM = {n:f"{i+1:02d}" for i,n in enumerate(["January","February","March","April","May","June","July","August","September","October","November","December"])}


def convert_xlsx(src, dest):
    wb = openpyxl.load_workbook(src, read_only=True, data_only=True)
    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))
    wb.close()
    if not rows: return 0
    # Header has duplicate 'Cost Centre' - rename second one
    header = list(rows[0])
    seen = set()
    for i, h in enumerate(header):
        if h in seen:
            header[i] = f"{h} Name"
        seen.add(h)
    rows[0] = header
    with open(dest, "w", newline="", encoding="utf-8-sig") as fh:
        w = csv.writer(fh)
        w.writerows(rows)
    return len(rows) - 1


print(f"Fetching {LANDING}")
r = requests.get(LANDING, headers={"User-Agent": UA}, timeout=60)
r.raise_for_status()
html = r.text
(DEST / "_landing.html").write_text(html, encoding="utf-8")

# Find Over £500 SPEND links (skip Credit Notes)
links = re.findall(r'href="(/sites/default/files/[^"]+Over%20%C2%A3500%20Spend[^"]+\.xlsx)"', html)
links = list(dict.fromkeys(links))
print(f"Found {len(links)} Spend XLSX links\n")

for path in links:
    fname = unquote(path.rsplit("/", 1)[-1])
    # Extract month + year (handles "April 2024" or "April 24")
    m = re.search(r"(April|May|June|July|August|September|October|November|December|January|February|March)\s+(20\d{2}|2\d)", fname)
    if not m: continue
    mname = m.group(1)
    year = m.group(2)
    if len(year) == 2: year = "20" + year
    mm = MM[mname]
    in_fy = (year == "2024" and int(mm) >= 4) or (year == "2025" and int(mm) <= 3)
    if not in_fy: continue
    dest_csv = DEST / f"spending_{year}_{mm}_{mname.lower()}.csv"
    if dest_csv.exists():
        print(f"  SKIP {dest_csv.name}")
        continue
    url = "https://www.redcar-cleveland.gov.uk" + path
    try:
        rr = requests.get(url, headers={"User-Agent": UA}, timeout=60)
        rr.raise_for_status()
        tmp = DEST / "_tmp.xlsx"
        tmp.write_bytes(rr.content)
        n = convert_xlsx(tmp, dest_csv)
        tmp.unlink()
        print(f"  {year}-{mm}: {n:>5} rows  {dest_csv.name}")
    except Exception as ex:
        print(f"  FAIL {dest_csv.name}: {ex}")
    time.sleep(0.4)
