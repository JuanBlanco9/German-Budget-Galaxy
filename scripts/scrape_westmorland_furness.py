#!/usr/bin/env python3
"""
Westmorland and Furness scraper for FY 2024/25 spend > £250.

Source: localgov_services_page renders all CSV links inline at:
  https://www.westmorlandandfurness.gov.uk/your-council/finance/payments-suppliers/payments-over-ps250/spending-over-ps250-2024-2025

Same schema as Cumberland (11-col: company, coded supplier, Supplier Name,
Date, System Reference, Directorate Description, Directorate Area,
Expenditure Description, Type of Expenditure, Line Number, Line Amount).
Title row 1 to skip. All files utf-8-sig.

Filenames irregular — must scrape, not hardcode pattern.
Filter: keep only WF unitary files; skip SLDC legacy district files.
"""
import csv
import json
import re
import time
from pathlib import Path
from urllib.parse import unquote
import requests

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / "data" / "uk" / "local_authorities" / "spend" / "westmorland_furness"
DEST.mkdir(parents=True, exist_ok=True)
LANDING = "https://www.westmorlandandfurness.gov.uk/your-council/finance/payments-suppliers/payments-over-ps250/spending-over-ps250-2024-2025"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"


def categorize(filename: str) -> str:
    n = filename.lower()
    if "sldc" in n:
        return "legacy_sldc"
    if "trade" in n:
        return "trade"
    if "private" in n:
        return "private"
    if "support" in n:
        return "support"
    return "unknown"


def normalize(src: Path):
    """Skip title row 1, re-write as utf-8-sig."""
    raw = src.read_bytes()
    enc = "utf-8-sig" if raw.startswith(b"\xef\xbb\xbf") else "cp1252"
    with open(src, encoding=enc, newline="") as fh:
        rows = list(csv.reader(fh))
    if not rows:
        return 0
    # Find header row (look for "Supplier Name" or "Directorate Description")
    header_idx = 0
    for i, r in enumerate(rows[:5]):
        cells = [str(c).strip().lower() for c in r if c]
        if "supplier name" in cells or "directorate description" in cells:
            header_idx = i
            break
    rows = rows[header_idx:]
    rows[0] = [str(c).strip() for c in rows[0]]
    with open(src, "w", newline="", encoding="utf-8-sig") as fh:
        csv.writer(fh).writerows(rows)
    return len(rows) - 1


print(f"Fetching landing: {LANDING}")
r = requests.get(LANDING, headers={"User-Agent": UA}, timeout=60)
r.raise_for_status()
html = r.text
(DEST / "_landing.html").write_text(html, encoding="utf-8")
csv_paths = re.findall(r'href="(/sites/default/files/[^"]+\.csv)"', html)
csv_paths = list(dict.fromkeys(csv_paths))  # dedupe, preserve order
print(f"Landing has {len(csv_paths)} unique CSV URLs\n")

manifest = []
counts = {}
for path in csv_paths:
    fname = unquote(path.rsplit("/", 1)[-1])
    cat = categorize(fname)
    counts[cat] = counts.get(cat, 0) + 1
    if cat in ("legacy_sldc", "unknown"):
        continue
    slug = re.sub(r"[^a-zA-Z0-9._-]+", "_", fname).strip("_")
    dest = DEST / f"{cat}__{slug}"
    url = "https://www.westmorlandandfurness.gov.uk" + path
    manifest.append({"url": url, "category": cat, "slug": slug})
    if dest.exists():
        print(f"  SKIP {dest.name}")
        continue
    try:
        rr = requests.get(url, headers={"User-Agent": UA}, timeout=120)
        rr.raise_for_status()
        dest.write_bytes(rr.content)
        n = normalize(dest)
        print(f"  [{cat:>7}] {n:>6} rows  {dest.name}")
    except Exception as ex:
        print(f"  FAIL {dest.name}: {ex}")
    time.sleep(0.3)

print(f"\nCategory counts: {counts}")
(DEST / "_manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
