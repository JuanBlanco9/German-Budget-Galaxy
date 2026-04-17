#!/usr/bin/env python3
"""
Plymouth City Council scraper - Spend > £500 FY 2024/25.

Discovery: files attached to /publication-scheme page (Drupal CMS).
Pattern: /sites/default/files/{YYYY-MM publish}/Payments-{Over|over}-500-{Month}-{YYYY}.{xls|xlsx|csv}
Publish folder = month AFTER spend month (Apr 2024 spend -> 2024-05/).
"""
import csv
import re
import time
from pathlib import Path
from urllib.parse import unquote, urljoin
import requests
import openpyxl

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / "data" / "uk" / "local_authorities" / "spend" / "plymouth"
DEST.mkdir(parents=True, exist_ok=True)
LANDING = "https://www.plymouth.gov.uk/publication-scheme"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"

MONTHS = {"April":"04","May":"05","June":"06","July":"07","August":"08","September":"09",
          "October":"10","November":"11","December":"12","January":"01","February":"02","March":"03"}


def parse_filename(fname: str):
    """Extract (year, mm, month_name, ext) from a Payments-Over-500 filename."""
    m = re.match(r"(?i)Payments[- ]Over[- ]500[- ]([A-Za-z]+)[- ](\d{4})(?:[-_].+)?\.(xlsx?|csv)", fname)
    if not m:
        return None
    month_name = m.group(1).capitalize()
    year = m.group(2)
    ext = m.group(3).lower()
    mm = MONTHS.get(month_name)
    if not mm:
        return None
    return year, mm, month_name.lower(), ext


def in_fy_2024_25(year: str, mm: str) -> bool:
    yi, mi = int(year), int(mm)
    if yi == 2024 and mi >= 4: return True
    if yi == 2025 and mi <= 3: return True
    return False


def xls_to_csv(src: Path, dest: Path):
    """Convert .xls or .xlsx to CSV (try openpyxl first; fall back for .xls)."""
    try:
        wb = openpyxl.load_workbook(src, read_only=True, data_only=True)
        ws = wb.active
        with open(dest, "w", newline="", encoding="utf-8-sig") as fh:
            w = csv.writer(fh)
            for row in ws.iter_rows(values_only=True):
                w.writerow(["" if v is None else v for v in row])
        wb.close()
        return True
    except Exception as ex:
        # Old .xls binary - try xlrd
        try:
            import xlrd
            book = xlrd.open_workbook(src)
            sh = book.sheet_by_index(0)
            with open(dest, "w", newline="", encoding="utf-8-sig") as fh:
                w = csv.writer(fh)
                for r in range(sh.nrows):
                    row = []
                    for c in range(sh.ncols):
                        v = sh.cell_value(r, c)
                        row.append(v)
                    w.writerow(row)
            return True
        except Exception as ex2:
            print(f"  ! XLS conversion failed for {src.name}: {ex} / {ex2}")
            return False


print(f"Fetching landing: {LANDING}")
r = requests.get(LANDING, headers={"User-Agent": UA}, timeout=60)
r.raise_for_status()
html = r.text
(DEST / "_publication_scheme.html").write_text(html, encoding="utf-8")
links = re.findall(r'href="(/sites/default/files/[^"]+\.(?:xlsx?|csv))"', html, re.I)
print(f"Total file URLs in publication-scheme: {len(links)}")

# Filter to FY 24/25 Payments-Over-500 files
keep = {}  # (year, mm) -> (url, ext)
for path in links:
    fname = unquote(path.rsplit("/", 1)[-1])
    parsed = parse_filename(fname)
    if not parsed:
        continue
    year, mm, month_name, ext = parsed
    if not in_fy_2024_25(year, mm):
        continue
    key = (year, mm)
    # Prefer csv > xlsx > xls
    rank = {"csv": 3, "xlsx": 2, "xls": 1}
    cur = keep.get(key)
    if cur is None or rank[ext] > rank[cur[2]]:
        keep[key] = (path, fname, ext, month_name)

print(f"FY 24/25 unique months: {len(keep)}\n")
for (year, mm), (path, fname, ext, mn) in sorted(keep.items()):
    url = urljoin("https://www.plymouth.gov.uk", path)
    dest_csv = DEST / f"spending_{year}_{mm}_{mn}.csv"
    if dest_csv.exists():
        print(f"  SKIP {dest_csv.name}")
        continue
    try:
        rr = requests.get(url, headers={"User-Agent": UA}, timeout=120)
        rr.raise_for_status()
        if ext == "csv":
            dest_csv.write_bytes(rr.content)
        else:
            tmp = DEST / f"_tmp.{ext}"
            tmp.write_bytes(rr.content)
            ok = xls_to_csv(tmp, dest_csv)
            tmp.unlink()
            if not ok:
                continue
        n = sum(1 for _ in open(dest_csv, encoding="utf-8-sig", errors="replace")) - 1
        print(f"  {year}-{mm} ({ext:>4}): {n:>5} rows  {dest_csv.name}")
    except Exception as ex:
        print(f"  FAIL {dest_csv.name}: {ex}")
    time.sleep(0.4)
