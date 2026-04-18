#!/usr/bin/env python3
"""
Normalize Cumberland's 36 monthly CSVs to a single canonical schema:
  - Strip title row 1 (keep only header + data)
  - Re-encode cp1252 → utf-8-sig
  - Filter to Company == 'CU' (current Cumberland unitary; drops legacy
    Copeland/Allerdale entries that share a sheet)

Schema (after normalization, all 36 files):
  Company, coded supplier, Supplier Name, Date, System Reference,
  Directorate Description, Directorate Area, Expenditure Description,
  Type of Expenditure, Line Number, Line Amount

The TRADE_SUPPLIERS files are cp1252 from source; PRIVATE_HOMES and
SUPPORT_PAYMENTS are utf-8-sig.
"""
import csv
from pathlib import Path

DIR = Path(r"D:\germany-ngo-map\data\uk\local_authorities\spend\cumberland_council")


def detect_encoding(p: Path) -> str:
    raw = p.read_bytes()
    if raw.startswith(b"\xef\xbb\xbf"):
        return "utf-8-sig"
    try:
        raw.decode("utf-8")
        return "utf-8"
    except UnicodeDecodeError:
        return "cp1252"


def normalize(src: Path):
    enc = detect_encoding(src)
    with open(src, encoding=enc, newline="") as fh:
        rows = list(csv.reader(fh))
    if not rows:
        return 0
    # Find header row: first row containing a cell that exactly matches one of
    # the canonical header tokens (case-insensitive).
    header_idx = 0
    canonical_tokens = {"company", "supplier name", "directorate description"}
    for i, r in enumerate(rows[:5]):
        cells = [str(c).strip().lower() for c in r if c is not None]
        if any(c in canonical_tokens for c in cells):
            header_idx = i
            break
    rows = rows[header_idx:]
    # Normalize header: lowercase doesn't matter to pipeline but strip and unify
    rows[0] = [str(c).strip() for c in rows[0]]
    # Filter rows where Company is 'CU' if we have a Company column
    if rows and rows[0] and rows[0][0].lower() == "company":
        kept = [rows[0]] + [r for r in rows[1:] if r and str(r[0]).strip().upper() == "CU"]
    else:
        kept = rows
    # Write back as utf-8-sig
    with open(src, "w", newline="", encoding="utf-8-sig") as fh:
        w = csv.writer(fh)
        w.writerows(kept)
    return len(kept) - 1


def main():
    total = 0
    for src in sorted(DIR.glob("*.csv")):
        if src.name.startswith("_"):
            continue
        n = normalize(src)
        print(f"  {n:>6} rows  {src.name}")
        total += n
    print(f"\nTotal kept: {total} rows")


if __name__ == "__main__":
    main()
