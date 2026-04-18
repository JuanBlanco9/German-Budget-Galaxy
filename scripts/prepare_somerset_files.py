#!/usr/bin/env python3
"""
Renames Somerset .download files to .csv/.xlsx based on detected type, then
converts any .xlsx into .csv (UTF-8 BOM, comma-separated, Sheet1) so the
council pipeline can ingest them uniformly.
"""
import csv
from pathlib import Path
import openpyxl

DIR = Path(r"D:\germany-ngo-map\data\uk\local_authorities\spend\somerset_council")


def is_xlsx(p: Path) -> bool:
    with open(p, "rb") as f:
        return f.read(4) == b"PK\x03\x04"


def is_csv(p: Path) -> bool:
    with open(p, "rb") as f:
        head = f.read(8)
    return head.startswith(b"\xef\xbb\xbf") or head[:1].decode("ascii", errors="ignore").isprintable()


def convert_xlsx(src: Path, dest: Path):
    # openpyxl validates by extension; rename first then convert
    tmp = src.with_suffix(".xlsx")
    src.rename(tmp)
    wb = openpyxl.load_workbook(tmp, read_only=True, data_only=True)
    ws = wb.active
    with open(dest, "w", newline="", encoding="utf-8-sig") as fh:
        w = csv.writer(fh)
        for row in ws.iter_rows(values_only=True):
            w.writerow(["" if v is None else v for v in row])
    wb.close()
    tmp.unlink()


def main():
    for src in sorted(DIR.glob("*.download")):
        if is_xlsx(src):
            dest = src.with_suffix(".csv")
            print(f"XLSX->CSV: {src.name}  ({src.stat().st_size:>12,} B)")
            convert_xlsx(src, dest)
        elif is_csv(src):
            dest = src.with_suffix(".csv")
            src.rename(dest)
            print(f"CSV    : {dest.name}  ({dest.stat().st_size:>12,} B)")
        else:
            print(f"SKIP   : {src.name}  (unknown type)")

    print(f"\nDone. Files in {DIR}:")
    for f in sorted(DIR.glob("*.csv")):
        with open(f, encoding="utf-8-sig") as fh:
            n = sum(1 for _ in fh) - 1
        print(f"  {n:>7} rows  {f.name}")


if __name__ == "__main__":
    main()
