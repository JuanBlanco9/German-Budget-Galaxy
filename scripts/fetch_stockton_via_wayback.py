#!/usr/bin/env python3
"""Fetch 12 Stockton-on-Tees monthly CSVs via Wayback id_ replay (Cloudflare blocks AR + Vultr Miami)."""
import re, time
from pathlib import Path
import requests

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / "data" / "uk" / "local_authorities" / "spend" / "stockton_on_tees"
DEST.mkdir(parents=True, exist_ok=True)
UA = "Mozilla/5.0"

# 12 monthly URLs (Apr 2024 - Mar 2025), discovered via Wayback Machine snapshot of landing page
ORIGS = [
    ("2024", "04", "april",     "https://www.stockton.gov.uk/media/6457/Payments-to-suppliers-April-2024/excel/2._Over__500_Spend_Report_April_24.csv"),
    ("2024", "05", "may",       "https://www.stockton.gov.uk/media/6615/Payments-to-suppliers-May-2024/excel/Payments_to_suppliers_-_May_2024.csv"),
    ("2024", "06", "june",      "https://www.stockton.gov.uk/media/6743/Payment-to-suppliers-June-2024/excel/2._Over__500_Spend_report_June_2024.csv"),
    ("2024", "07", "july",      "https://www.stockton.gov.uk/media/6878/Payment-to-suppliers-July-2024/excel/2._Over__500_Spend_Report_July_2024.csv"),
    ("2024", "08", "august",    "https://www.stockton.gov.uk/media/6990/Payments-to-suppliers-August-2024/excel/Payments_to_suppliers_-_August_2024.csv"),
    ("2024", "09", "september", "https://www.stockton.gov.uk/media/7136/Payments-to-suppliers-September-2024/excel/Payments_to_suppliers_-_September_2024.csv"),
    ("2024", "10", "october",   "https://www.stockton.gov.uk/media/7211/Payments-to-suppliers-October-2024/excel/2._Over__500_Spend_Report_-_Oct_24.csv"),
    ("2024", "11", "november",  "https://www.stockton.gov.uk/media/7429/Payments-to-suppliers-November-2024/excel/2._Over__500_Spend_Report_-_Nov_24.csv"),
    ("2024", "12", "december",  "https://www.stockton.gov.uk/media/7601/Payments-to-suppliers-December-2024/excel/2._Over__500_Spend_Report_-_Dec_24.csv"),
    ("2025", "01", "january",   "https://www.stockton.gov.uk/media/7687/Payment-to-suppliers-January-2025/excel/2._Over__500_Spend_Report_Jan_2025.csv"),
    ("2025", "02", "february",  "https://www.stockton.gov.uk/media/7764/Payments-to-suppliers-February-2025/excel/2._Over__500_Spend_Report_Feb_25.csv"),
    ("2025", "03", "march",     "https://www.stockton.gov.uk/media/7886/Payments-to-suppliers-March-2025/excel/Payments_to_suppliers_-_March_2025.csv"),
]


def fetch_via_wayback(orig: str) -> bytes:
    wb = f"https://web.archive.org/web/2025id_/{orig}"
    r = requests.get(wb, headers={"User-Agent": UA}, timeout=120)
    r.raise_for_status()
    return r.content


for year, mm, mname, orig in ORIGS:
    dest = DEST / f"spending_{year}_{mm}_{mname}.csv"
    if dest.exists() and dest.stat().st_size > 1000:
        print(f"  SKIP {dest.name}")
        continue
    try:
        content = fetch_via_wayback(orig)
        # Re-encode cp1252 -> utf-8-sig (Stockton uses extended-ASCII)
        try:
            text = content.decode("cp1252")
        except UnicodeDecodeError:
            text = content.decode("latin-1")
        dest.write_text(text, encoding="utf-8-sig")
        n = sum(1 for _ in open(dest, encoding="utf-8-sig")) - 1
        print(f"  {year}-{mm}: {n:>5} rows  {dest.name}")
    except Exception as ex:
        print(f"  FAIL {dest.name}: {ex}")
    time.sleep(1.5)
