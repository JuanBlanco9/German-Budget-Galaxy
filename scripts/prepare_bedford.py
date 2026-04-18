#!/usr/bin/env python3
"""Bedford BC: convert 12 cached XLSX to CSV (sheet 'Payments > £250')."""
import csv, re
from pathlib import Path
import openpyxl

SRC = Path(r"C:\tmp\bedford_fy2425")
DEST = Path(r"D:\germany-ngo-map\data\uk\local_authorities\spend\bedford_borough_council")
DEST.mkdir(parents=True, exist_ok=True)

MONTHS = {"april":"04","may":"05","june":"06","july":"07","august":"08","september":"09",
          "october":"10","november":"11","december":"12","january":"01","february":"02","march":"03"}


def parse_filename(fname):
    m = re.search(r"(april|may|june|july|august|september|october|november|december|january|february|march)-(\d{4})", fname.lower())
    if not m: return None
    return MONTHS[m.group(1)], m.group(1), m.group(2)


for src in sorted(SRC.glob("*.xlsx")):
    parsed = parse_filename(src.name)
    if not parsed: continue
    mm, mname, year = parsed
    dest = DEST / f"spending_{year}_{mm}_{mname}.csv"
    wb = openpyxl.load_workbook(src, read_only=True, data_only=True)
    ws = wb.active
    with open(dest, "w", newline="", encoding="utf-8-sig") as fh:
        w = csv.writer(fh)
        for row in ws.iter_rows(values_only=True):
            w.writerow(["" if v is None else v for v in row])
    wb.close()
    n = sum(1 for _ in open(dest, encoding="utf-8-sig")) - 1
    print(f"  {year}-{mm}: {n:>5} rows  {dest.name}")
