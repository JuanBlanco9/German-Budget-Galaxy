#!/usr/bin/env python3
"""
North Lincolnshire Council scraper. WordPress site with predictable-ish
/wp-content/uploads/{YYYY}/{MM}/Supplier-payments-{Month}-{YYYY}.csv URLs.
Filenames have inconsistent casing/ordering — hardcoded from agent discovery.

Known issues:
  - Trailing empty rows (up to 1M comma-only lines). Strip on download.
  - February 2025 has corrupted Amount column (Excel serial numbers).
  - December 2024 has malformed header (multiline Supplier Name header).
  - Encoding: cp1252/latin1 (£ sign).
"""
import csv, re, time
from pathlib import Path
import requests

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / "data" / "uk" / "local_authorities" / "spend" / "north_lincolnshire"
DEST.mkdir(parents=True, exist_ok=True)
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
BASE = "https://www.northlincs.gov.uk/wp-content/uploads"

URLS = [
    ("2024_04_april",     f"{BASE}/2024/05/Suplier-Payments-April-2024.csv"),
    ("2024_05_may",       f"{BASE}/2024/06/Supplier-Payments-May-2024.csv"),
    ("2024_06_june",      f"{BASE}/2024/07/Supplier-payments-June-2024.csv"),
    ("2024_07_july",      f"{BASE}/2024/08/Supplier-payments-July-2024.csv"),
    ("2024_08_august",    f"{BASE}/2024/09/Supplier-Payments-August-2024.csv"),
    ("2024_09_september", f"{BASE}/2024/10/Supplier-Payments-September-2024.csv"),
    ("2024_10_october",   f"{BASE}/2024/11/Supplier-Payments-October-2024.csv"),
    ("2024_11_november",  f"{BASE}/2024/12/Supplier-Payments-November-2024.csv"),
    ("2024_12_december",  f"{BASE}/2025/01/Supplier-payments-December-2024.csv"),
    ("2025_01_january",   f"{BASE}/2025/02/Supplier-Payments-January-2025.csv"),
    ("2025_02_february",  f"{BASE}/2025/03/February-2025-Supplier-payments.csv"),
    ("2025_03_march",     f"{BASE}/2025/05/Supplier-payments-March-2025.csv"),
]


def clean_csv(src: Path) -> int:
    raw = src.read_bytes()
    enc = "utf-8-sig" if raw.startswith(b"\xef\xbb\xbf") else "cp1252"
    text = raw.decode(enc, errors="replace")
    lines = text.splitlines()
    # Strip trailing empty/comma-only lines
    while lines and re.match(r'^[,\s]*$', lines[-1]):
        lines.pop()
    # Find header row
    header_idx = 0
    for i, line in enumerate(lines[:5]):
        if "transaction" in line.lower() and "supplier" in line.lower():
            header_idx = i
            break
    lines = lines[header_idx:]
    if not lines:
        return 0
    # Fix December multiline header: merge lines until we have 6+ fields
    if lines[0].count(",") < 4 and len(lines) > 1:
        lines[0] = lines[0].rstrip() + " " + lines[1].lstrip()
        lines.pop(1)
    # Normalize header
    hdr = lines[0]
    # Standardize to: Transaction number,Service Heads (T),Account (T),Transaction Date,Amount,Supplier Name
    hdr = re.sub(r'"[^"]*Redactions[^"]*"', 'Supplier Name', hdr)
    hdr = re.sub(r'["""]', '', hdr)
    lines[0] = hdr
    src.write_text("\n".join(lines) + "\n", encoding="utf-8-sig")
    return len(lines) - 1


for slug, url in URLS:
    dest = DEST / f"spending_{slug}.csv"
    if dest.exists() and dest.stat().st_size > 1000:
        print(f"  SKIP {dest.name}")
        continue
    try:
        r = requests.get(url, headers={"User-Agent": UA}, timeout=120)
        r.raise_for_status()
        dest.write_bytes(r.content)
        n = clean_csv(dest)
        print(f"  {slug}: {n:>5} rows  {dest.name}")
    except Exception as ex:
        print(f"  FAIL {dest.name}: {ex}")
    time.sleep(0.5)
