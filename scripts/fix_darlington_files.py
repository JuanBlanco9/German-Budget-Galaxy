#!/usr/bin/env python3
"""Re-normalize Darlington CSVs: header is on row 6 (typo 'Directotate'), data starts row 7.
Drop empty col 0 (INSERTED DETAIL marker) + col 1 (always blank).
Also handle Mar 2025 schema (added Payment Date col)."""
import csv
from pathlib import Path

DIR = Path(r"D:\germany-ngo-map\data\uk\local_authorities\spend\darlington_borough_council")


for src in sorted(DIR.glob("*.csv")):
    raw = src.read_bytes()
    enc = "utf-8-sig" if raw.startswith(b"\xef\xbb\xbf") else "iso-8859-1"
    with open(src, encoding=enc, newline="") as fh:
        rows = list(csv.reader(fh))
    if not rows:
        continue
    # Find header row containing "Supplier" (handles typo Directotate too)
    header_idx = -1
    for i, r in enumerate(rows[:10]):
        cells = [str(c).strip().lower() for c in r]
        if "supplier" in cells and ("directotate" in cells or "directorate" in cells):
            header_idx = i
            break
    if header_idx < 0:
        print(f"  ! header not found in {src.name}, first 6 rows:")
        for i, r in enumerate(rows[:6]): print(f"    [{i}] {r[:8]}")
        continue
    # Drop first 2 empty columns (col 0 = INSERTED DETAIL marker, col 1 = blank)
    cleaned = []
    for r in rows[header_idx:]:
        cleaned.append(r[2:])
    cleaned[0] = [str(c).strip() for c in cleaned[0]]
    # Fix typo 'Directotate' -> 'Directorate'
    cleaned[0] = ["Directorate" if c.lower() == "directotate" else c for c in cleaned[0]]
    with open(src, "w", newline="", encoding="utf-8-sig") as fh:
        csv.writer(fh).writerows(cleaned)
    n = len(cleaned) - 1
    print(f"  {n:>5} rows  cols={cleaned[0][:4]}  {src.name}")
