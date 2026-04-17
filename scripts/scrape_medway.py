#!/usr/bin/env python3
"""
Medway Council scraper. URL pattern is /download/downloads/id/{ID}/spending_data_{month}_{YYYY}.xlsx.
IDs are non-sequential and non-monotonic — must be hard-coded from sitemap inspection.
Source: agent recon via sitemap.xml.
"""
import csv
from pathlib import Path
import requests
import openpyxl

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / "data" / "uk" / "local_authorities" / "spend" / "medway"
DEST.mkdir(parents=True, exist_ok=True)
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"

ID_MAP = {
    ("2024", "04", "april"):     8917,
    ("2024", "05", "may"):       8915,
    ("2024", "06", "june"):      8916,
    ("2024", "07", "july"):      9074,
    ("2024", "08", "august"):    9075,
    ("2024", "09", "september"): 9073,
    ("2024", "10", "october"):   9084,
    ("2024", "11", "november"):  9085,
    ("2024", "12", "december"):  9086,
    ("2025", "01", "january"):   9163,
    ("2025", "02", "february"):  9164,
    ("2025", "03", "march"):     9180,
}
URL_TPL = "https://www.medway.gov.uk/download/downloads/id/{id}/spending_data_{month}_{year}.xlsx"


def convert(src: Path, dest: Path):
    wb = openpyxl.load_workbook(src, read_only=True, data_only=True)
    ws = wb.active
    with open(dest, "w", newline="", encoding="utf-8-sig") as fh:
        w = csv.writer(fh)
        for row in ws.iter_rows(values_only=True):
            w.writerow(["" if v is None else v for v in row])
    wb.close()


for (year, mm, month), doc_id in ID_MAP.items():
    url = URL_TPL.format(id=doc_id, month=month, year=year)
    xlsx = DEST / f"spending_{year}_{mm}_{month}.xlsx"
    csv_dest = xlsx.with_suffix(".csv")
    if csv_dest.exists():
        print(f"  SKIP {csv_dest.name}")
        continue
    r = requests.get(url, headers={"User-Agent": UA}, timeout=60)
    r.raise_for_status()
    xlsx.write_bytes(r.content)
    convert(xlsx, csv_dest)
    xlsx.unlink()
    n = sum(1 for _ in open(csv_dest, encoding="utf-8-sig")) - 1
    print(f"  {year}-{mm}: {n:>5} rows  {csv_dest.name}")
