#!/usr/bin/env python3
"""Chelmsford CC: 12 FY24/25 monthly files (11 CSV + 1 XLSX), hardcoded URLs from landing scrape."""
import csv, time, re
from pathlib import Path
import requests, openpyxl

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / "data" / "uk" / "local_authorities" / "spend" / "chelmsford"
DEST.mkdir(parents=True, exist_ok=True)
UA = "Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36"

# FY 2024/25 URLs from landing scrape
URLS = [
    ("2024", "04", "april",     "https://www.chelmsford.gov.uk/media/3n4j0nxg/expenditure-over-gbp250-2024-04.csv"),
    ("2024", "05", "may",       "https://www.chelmsford.gov.uk/media/uaffajec/expenditure-over-gbp250-2024-05.csv"),
    ("2024", "06", "june",      "https://www.chelmsford.gov.uk/media/fcegkepd/expenditure-over-gbp250-june-2024.csv"),
    ("2024", "07", "july",      "https://www.chelmsford.gov.uk/media/aiylq4yl/expenditure-over-gbp250-2024-07.csv"),
    ("2024", "08", "august",    "https://www.chelmsford.gov.uk/media/o35gmh22/expenditure-over-gbp250-2024-08.csv"),
    ("2024", "09", "september", "https://www.chelmsford.gov.uk/media/1gqegbwd/expenditure-over-gbp250-2024-09.csv"),
    ("2024", "10", "october",   "https://www.chelmsford.gov.uk/media/gf5j2cu5/expenditure-over-gbp250-2024-10.xlsx"),
    ("2024", "11", "november",  "https://www.chelmsford.gov.uk/media/ixdfrnjd/expenditure-over-gbp250-2024-11.csv"),
    ("2024", "12", "december",  "https://www.chelmsford.gov.uk/media/e4zhn23c/expenditure-over-gbp250-2024-12.csv"),
    ("2025", "01", "january",   "https://www.chelmsford.gov.uk/media/tdzkp42o/expenditure-over-gbp250-2025-01.csv"),
    ("2025", "02", "february",  "https://www.chelmsford.gov.uk/media/pghdtryv/expenditure-over-250-2025-02.csv"),
    ("2025", "03", "march",     "https://www.chelmsford.gov.uk/media/hcoi0f0o/expenditure-over-250-2025-03.csv"),
]


def xlsx_to_csv(content: bytes, dest: Path):
    tmp = dest.with_suffix(".xlsx.tmp")
    tmp.write_bytes(content)
    wb = openpyxl.load_workbook(tmp, read_only=True, data_only=True)
    ws = wb.active
    with open(dest, "w", newline="", encoding="utf-8-sig") as fh:
        w = csv.writer(fh)
        for row in ws.iter_rows(values_only=True):
            w.writerow(["" if v is None else v for v in row])
    wb.close()
    tmp.unlink()


for year, mm, mname, url in URLS:
    dest = DEST / f"spending_{year}_{mm}_{mname}.csv"
    if dest.exists() and dest.stat().st_size > 500:
        print(f"  SKIP {dest.name}")
        continue
    try:
        r = requests.get(url, headers={"User-Agent": UA}, timeout=60)
        r.raise_for_status()
        if url.endswith(".xlsx"):
            xlsx_to_csv(r.content, dest)
        else:
            try:
                text = r.content.decode("utf-8")
            except UnicodeDecodeError:
                text = r.content.decode("cp1252")
            dest.write_text(text, encoding="utf-8-sig")
        n = sum(1 for _ in open(dest, encoding="utf-8-sig")) - 1
        print(f"  {year}-{mm}: {n:>5} rows  {dest.name}")
    except Exception as ex:
        print(f"  FAIL {dest.name}: {ex}")
    time.sleep(0.4)
