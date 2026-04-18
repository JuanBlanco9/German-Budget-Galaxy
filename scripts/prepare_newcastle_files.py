#!/usr/bin/env python3
"""
Newcastle upon Tyne — preprocess 12 monthly CSVs.

Source: cached at c:/tmp/newcastle_csv/{Month}_{Year}.csv (fetched via
Wayback if_ replay because newcastle.gov.uk is L3-blocked from AR).

Quirks handled:
  - Title row 0 + blank row 1 + header row 2 → skip 2 rows
  - latin-1 / cp1252 → re-encode utf-8-sig
  - Apr-Sep 2024: 10 cols; Oct 2024-Mar 2025: 12 cols (added Capital Code,
    Capital Code Name BEFORE the amount). Amount col is always
    'Total (excludes VAT)' — anchor by name, not position.
  - Directorate names changed mid-year (Children/Families merge,
    ASC + Prevention rename) — kept as-is, classifier handles.
"""
import csv
from pathlib import Path

SRC = Path(r"C:\tmp\newcastle_csv")
DEST = Path(r"D:\germany-ngo-map\data\uk\local_authorities\spend\newcastle_upon_tyne")
DEST.mkdir(parents=True, exist_ok=True)


def detect_encoding(p):
    raw = p.read_bytes()
    if raw.startswith(b"\xef\xbb\xbf"):
        return "utf-8-sig"
    try:
        raw.decode("utf-8")
        return "utf-8"
    except UnicodeDecodeError:
        return "cp1252"


def normalize(src: Path, dest: Path):
    enc = detect_encoding(src)
    with open(src, encoding=enc, newline="") as fh:
        rows = list(csv.reader(fh))
    if not rows:
        return 0, enc
    # Find header row: first row containing 'Supplier Name' or 'Directorate'
    header_idx = 0
    for i, r in enumerate(rows[:6]):
        cells = [str(c).strip().lower() for c in r if c]
        if any(c in ("supplier name", "directorate") for c in cells):
            header_idx = i
            break
    rows = rows[header_idx:]
    rows[0] = [str(c).strip() for c in rows[0]]
    # Pipeline expects column-name-based resolution; nothing further needed
    with open(dest, "w", newline="", encoding="utf-8-sig") as fh:
        w = csv.writer(fh)
        w.writerows(rows)
    return len(rows) - 1, enc


total = 0
for src in sorted(SRC.glob("*.csv")):
    # Slug: April_2024.csv -> spending_2024_04_april.csv
    name = src.stem  # April_2024
    parts = name.split("_")
    if len(parts) != 2:
        continue
    month_name, year = parts
    months = {"January":"01","February":"02","March":"03","April":"04","May":"05","June":"06",
              "July":"07","August":"08","September":"09","October":"10","November":"11","December":"12"}
    mm = months.get(month_name, "00")
    dest_name = f"spending_{year}_{mm}_{month_name.lower()}.csv"
    dest = DEST / dest_name
    n, enc = normalize(src, dest)
    print(f"  {n:>5} rows enc={enc:<10} {dest_name}")
    total += n
print(f"\nTotal kept: {total} rows")
